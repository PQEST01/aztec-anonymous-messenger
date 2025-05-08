use dep::aztec::macros::aztec;

#[aztec]
pub contract PrivateMessenger {
    // Import Aztec libraries and dependencies
    use dep::aztec::{
        context::{PrivateContext, PublicContext},
        event::event_interface::EventInterface,
        macros::{
            events::event,
            functions::{initializer, internal, private, public, utility},
            storage::storage,
        },
        messages::logs::{
            note::{encode_and_encrypt_note, encode_and_encrypt_note_unconstrained},
            event::encode_and_encrypt_event_unconstrained,
        },
        note::{
            note_getter_options::SortOrder, 
            note_interface::NoteProperties,
        },
        oracle::utils::keccak256,
        prelude::{AztecAddress, Map, PrivateSet, PublicImmutable, PublicMutable},
        protocol_types::{
            constants::MAX_NOTE_HASH_READ_REQUESTS_PER_CALL,
            traits::Serialize,
            traits::{Hash, ToField},
            address::AztecAddress,
        },
        utils::comparison::Comparator,
    };
    use std::ops::Add;

    // Message Note defining the structure of private messages
    struct MessageNote {
        sender: AztecAddress,
        recipient: AztecAddress,
        content_hash: Field, // Hash of encrypted content
        timestamp: u64,
        self_destruct: bool,
        delete_after_seconds: u64,
    }

    impl MessageNote {
        pub fn new(
            sender: AztecAddress, 
            recipient: AztecAddress, 
            content_hash: Field,
            timestamp: u64,
            self_destruct: bool,
            delete_after_seconds: u64
        ) -> Self {
            Self { 
                sender, 
                recipient, 
                content_hash, 
                timestamp,
                self_destruct,
                delete_after_seconds
            }
        }

        pub fn properties() -> NoteProperties {
            NoteProperties {
                fields: [
                    Field::from_le_bytes(b"sender"),
                    Field::from_le_bytes(b"recipient"),
                    Field::from_le_bytes(b"content_hash"),
                    Field::from_le_bytes(b"timestamp"),
                    Field::from_le_bytes(b"self_destruct"),
                    Field::from_le_bytes(b"delete_after_seconds"),
                ],
            }
        }

        pub fn get_sender(&self) -> AztecAddress {
            self.sender
        }

        pub fn get_recipient(&self) -> AztecAddress {
            self.recipient
        }

        pub fn get_content_hash(&self) -> Field {
            self.content_hash
        }

        pub fn get_timestamp(&self) -> u64 {
            self.timestamp
        }

        pub fn is_self_destruct(&self) -> bool {
            self.self_destruct
        }

        pub fn get_delete_after_seconds(&self) -> u64 {
            self.delete_after_seconds
        }
    }

    // Group structure to manage messaging groups
    struct Group {
        name: Field, // Hash of encrypted group name
        creator: AztecAddress,
        created_at: u64,
    }

    impl Group {
        pub fn new(name: Field, creator: AztecAddress, created_at: u64) -> Self {
            Self { name, creator, created_at }
        }
    }

    // Event for tracking messages read status
    #[derive(Serialize)]
    #[event]
    struct MessageRead {
        message_id: Field,
        reader: AztecAddress,
        timestamp: u64,
    }

    // Event for tracking message destruction
    #[derive(Serialize)]
    #[event]
    struct MessageDestroyed {
        message_id: Field,
        destroyer: AztecAddress,
        timestamp: u64,
    }

    // Contract storage
    #[storage]
    struct Storage<Context> {
        admin: PublicMutable<AztecAddress, Context>,
        // Private messages
        messages: PrivateSet<MessageNote, Context>,
        // Mapping from group ID to Group info
        groups: Map<Field, PublicMutable<Group, Context>, Context>,
        // Mapping from group ID to members
        group_members: Map<Field, PrivateSet<AztecAddress, Context>, Context>,
        // Message read status - tracks if a message has been read
        message_read_status: Map<Field, PublicMutable<bool, Context>, Context>,
        // Mapping message_id -> read_timestamp for timed destruction
        read_timestamps: Map<Field, PublicMutable<u64, Context>, Context>,
        // Flag for destroyed messages
        destroyed_messages: Map<Field, PublicMutable<bool, Context>, Context>,
    }

    // Initialize the contract with an admin
    #[public]
    #[initializer]
    fn constructor(admin: AztecAddress) {
        storage.admin.write(admin);
    }

    // Create a new messaging group
    #[private]
    fn create_group(name: Field, members: [AztecAddress; 10]) {
        let creator = context.msg_sender();
        let timestamp = context.block_timestamp();
        
        // Generate a unique group ID
        let group_id = hash_group_id(creator, name, timestamp);
        
        // Create and store the group
        let group = Group::new(name, creator, timestamp);
        
        // Store group information publicly
        PrivateMessenger::at(context.this_address())
            ._store_group_public(group_id, group)
            .enqueue(&mut context);
        
        // Add creator as a member
        add_member_to_group(group_id, creator);
        
        // Add other members
        for i in 0..10 {
            if !members[i].is_zero() {
                add_member_to_group(group_id, members[i]);
            }
        }
    }
    
    // Helper function to add a member to a group
    #[private]
    fn add_member_to_group(group_id: Field, member: AztecAddress) {
        if !member.is_zero() {
            storage.group_members.at(group_id).insert(member);
        }
    }
    
    // Store group information in public storage
    #[public]
    #[internal]
    fn _store_group_public(group_id: Field, group: Group) {
        storage.groups.at(group_id).write(group);
    }
    
    // Function to hash group ID deterministically
    #[contract_library_method]
    fn hash_group_id(creator: AztecAddress, name: Field, timestamp: u64) -> Field {
        let mut hasher = keccak256::new();
        hasher.update(creator.to_field());
        hasher.update(name);
        hasher.update(timestamp as Field);
        hasher.finalize()
    }

    // Send a private message to a recipient
    #[private]
    fn send_message(
        recipient: AztecAddress, 
        content_hash: Field, 
        self_destruct: bool,
        delete_after_seconds: u64
    ) -> Field {
        let sender = context.msg_sender();
        let timestamp = context.block_timestamp();
        
        // Create message note
        let message = MessageNote::new(
            sender, 
            recipient, 
            content_hash, 
            timestamp,
            self_destruct,
            delete_after_seconds
        );
        
        // Generate a unique message ID
        let message_id = compute_message_id(sender, recipient, content_hash, timestamp);
        
        // Store the message in private storage
        storage.messages.insert(message).emit(
            encode_and_encrypt_note_unconstrained(
                &mut context,
                recipient, // encrypt for recipient
                sender,    // sender context
            )
        );
        
        // Initialize read status as false (unread)
        PrivateMessenger::at(context.this_address())
            ._init_message_status(message_id, false)
            .enqueue(&mut context);
            
        // Return message ID for reference
        message_id
    }
    
    // Send a message to a group
    #[private]
    fn send_group_message(
        group_id: Field,
        content_hash: Field,
        self_destruct: bool,
        delete_after_seconds: u64
    ) -> Field {
        let sender = context.msg_sender();
        let timestamp = context.block_timestamp();
        
        // Check if group exists
        assert(!storage.groups.at(group_id).read().creator.is_zero(), "Group does not exist");
        
        // Check if sender is a group member
        // Note: In a full implementation, we would check if sender is in the group's member list
        
        // Generate a unique message ID for the group message
        let message_id = compute_message_id(sender, AztecAddress::from_field(group_id), content_hash, timestamp);
        
        // Create message note
        let message = MessageNote::new(
            sender, 
            AztecAddress::from_field(group_id),  // Use group_id as recipient
            content_hash, 
            timestamp,
            self_destruct,
            delete_after_seconds
        );
        
        // Store the message in private storage
        // In a real implementation, we would encrypt for all group members
        storage.messages.insert(message).emit(
            encode_and_encrypt_note_unconstrained(
                &mut context,
                sender, // for now, encrypt only for sender
                sender, // sender context
            )
        );
        
        // Initialize read status as false (unread)
        PrivateMessenger::at(context.this_address())
            ._init_message_status(message_id, false)
            .enqueue(&mut context);
            
        message_id
    }
    
    // Initialize message status in public storage
    #[public]
    #[internal]
    fn _init_message_status(message_id: Field, read: bool) {
        storage.message_read_status.at(message_id).write(read);
        storage.destroyed_messages.at(message_id).write(false);
    }
    
    // Compute a unique message ID
    #[contract_library_method]
    fn compute_message_id(sender: AztecAddress, recipient: AztecAddress, content_hash: Field, timestamp: u64) -> Field {
        let mut hasher = keccak256::new();
        hasher.update(sender.to_field());
        hasher.update(recipient.to_field());
        hasher.update(content_hash);
        hasher.update(timestamp as Field);
        hasher.finalize()
    }

    // Mark a message as read
    #[private]
    fn mark_as_read(message_id: Field) {
        let reader = context.msg_sender();
        let current_time = context.block_timestamp();
        
        // Mark message as read in public storage
        PrivateMessenger::at(context.this_address())
            ._mark_read_public(message_id, reader, current_time)
            .enqueue(&mut context);
        
        // Emit private event for message read
        MessageRead { 
            message_id, 
            reader, 
            timestamp: current_time 
        }.emit(
            encode_and_encrypt_event_unconstrained(
                &mut context,
                reader,  // encrypt for reader
                reader,  // reader context
            )
        );
        
        // Check if message has self-destruct enabled
        // In a full implementation, we would fetch the message and check its self_destruct flag
        // For now, this is simplified
    }
    
    // Public function to update read status
    #[public]
    #[internal]
    fn _mark_read_public(message_id: Field, reader: AztecAddress, timestamp: u64) {
        storage.message_read_status.at(message_id).write(true);
        storage.read_timestamps.at(message_id).write(timestamp);
        
        // Check for timed self-destruct
        // If the message has timed self-destruct, schedule its destruction
        // This could be implemented as a scheduled task in a full application
    }
    
    // Destroy/delete a message
    #[private]
    fn destroy_message(message_id: Field) {
        let destroyer = context.msg_sender();
        let current_time = context.block_timestamp();
        
        // Mark message as destroyed in public storage
        PrivateMessenger::at(context.this_address())
            ._destroy_message_public(message_id)
            .enqueue(&mut context);
        
        // Emit event for message destruction
        MessageDestroyed { 
            message_id, 
            destroyer, 
            timestamp: current_time 
        }.emit(
            encode_and_encrypt_event_unconstrained(
                &mut context,
                destroyer,  // encrypt for destroyer
                destroyer,  // destroyer context
            )
        );
    }
    
    // Public function to mark message as destroyed
    #[public]
    #[internal]
    fn _destroy_message_public(message_id: Field) {
        storage.destroyed_messages.at(message_id).write(true);
    }
    
    // Check if a message has been read
    #[utility]
    unconstrained fn is_message_read(message_id: Field) -> bool {
        storage.message_read_status.at(message_id).read()
    }
    
    // Check if a message has been destroyed
    #[utility]
    unconstrained fn is_message_destroyed(message_id: Field) -> bool {
        storage.destroyed_messages.at(message_id).read()
    }
    
    // Get message read timestamp
    #[utility]
    unconstrained fn get_read_timestamp(message_id: Field) -> u64 {
        storage.read_timestamps.at(message_id).read()
    }
    
    // Check if user is a member of a group
    #[utility]
    unconstrained fn is_group_member(group_id: Field, member: AztecAddress) -> bool {
        // In a full implementation, we would check the group's member list
        // This is a simplified version
        true
    }
    
    // Check if a user is the admin
    #[utility]
    unconstrained fn is_admin(user: AztecAddress) -> bool {
        storage.admin.read().eq(user)
    }
}