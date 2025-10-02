use dep::aztec::macros::aztec;

#[aztec]
pub contract PrivateMessenger {
    // Import necessary types from Aztec
    use dep::aztec::prelude::{
        AztecAddress, 
        Map, 
        PrivateSet, 
        PublicMutable,
    };
    use dep::aztec::protocol_types::traits::{Deserialize, Serialize, ToField};
    use dep::aztec::macros::{
        events::event,
        functions::{initializer, internal, private, public, utility},
        storage::storage,
    };
    use dep::aztec::event::event_interface::EventInterface;

    // Message Note structure
    #[derive(Serialize, Deserialize)]
    pub struct MessageNote {
        sender: AztecAddress,
        recipient: AztecAddress,
        content_hash: Field,
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
    }

    // Group structure
    #[derive(Serialize, Deserialize)]
    pub struct Group {
        name: Field,
        creator: AztecAddress,
        created_at: u64,
    }

    impl Group {
        pub fn new(name: Field, creator: AztecAddress, created_at: u64) -> Self {
            Self { name, creator, created_at }
        }
    }

    // Event for tracking message read status
    #[derive(Serialize)]
    #[event]
    pub struct MessageRead {
        message_id: Field,
        reader: AztecAddress,
        timestamp: u64,
    }

    // Event for tracking message destruction
    #[derive(Serialize)]
    #[event]
    pub struct MessageDestroyed {
        message_id: Field,
        destroyer: AztecAddress,
        timestamp: u64,
    }

    // Contract storage
    #[storage]
    struct Storage<Context> {
        // Admin of the messenger
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
    fn create_group(name: Field, members: [AztecAddress; 10]) -> pub Field {
        let creator = context.msg_sender();
        
        // Generate a unique group ID
        let group_id = compute_group_id(creator, name);
        
        // Create and store the group
        let group = Group::new(name, creator, 0);
        
        // Store group information publicly
        PrivateMessenger::at(context.this_address())
            ._store_group_public(group_id, group)
            .enqueue(&mut context);
        
        // Add creator as a member
        _add_member_to_group(group_id, creator);
        
        // Add other members
        for i in 0..10 {
            if !members[i].is_zero() {
                _add_member_to_group(group_id, members[i]);
            }
        }
        
        group_id
    }
    
    // Add a member to a group
    #[private]
    fn _add_member_to_group(group_id: Field, member: AztecAddress) {
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
    
    // Generate a unique group ID
    #[private]
    fn compute_group_id(creator: AztecAddress, name: Field) -> Field {
        let creator_field = creator.to_field();
        std::hash::pedersen_hash([creator_field, name])
    }

    // Send a private message to a recipient
    #[private]
    fn send_message(
        recipient: AztecAddress, 
        content_hash: Field, 
        self_destruct: bool,
        delete_after_seconds: u64
    ) -> pub Field {
        let sender = context.msg_sender();
        
        // Create message note
        let message = MessageNote::new(
            sender, 
            recipient, 
            content_hash, 
            0, 
            self_destruct,
            delete_after_seconds
        );
        
        // Generate a unique message ID
        let message_id = compute_message_id(sender, recipient, content_hash);
        
        // Store the message in private storage
        storage.messages.insert(message);
        
        // Initialize read status as false (unread)
        PrivateMessenger::at(context.this_address())
            ._init_message_status(message_id, false)
            .enqueue(&mut context);
            
        message_id
    }
    
    // Send a message to a group
    #[private]
    fn send_group_message(
        group_id: Field,
        content_hash: Field,
        self_destruct: bool,
        delete_after_seconds: u64
    ) -> pub Field {
        let sender = context.msg_sender();
        
        // Check if group exists
        let group_exists = storage.groups.at(group_id).exists();
        assert(group_exists, "Group does not exist");
        
        // Generate a unique message ID for the group message
        let message_id = compute_message_id(sender, AztecAddress::zero(), content_hash);
        
        // Create message note
        let message = MessageNote::new(
            sender, 
            AztecAddress::zero(),
            content_hash, 
            0,
            self_destruct,
            delete_after_seconds
        );
        
        // Store the message in private storage
        storage.messages.insert(message);
        
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
    
    // Generate a unique message ID
    #[private]
    fn compute_message_id(sender: AztecAddress, recipient: AztecAddress, content_hash: Field) -> Field {
        let sender_field = sender.to_field();
        let recipient_field = recipient.to_field();
        std::hash::pedersen_hash([sender_field, recipient_field, content_hash])
    }

    // Mark a message as read
    #[private]
    fn mark_as_read(message_id: Field) -> pub bool {
        let reader = context.msg_sender();
        
        // Mark message as read in public storage
        PrivateMessenger::at(context.this_address())
            ._mark_read_public(message_id, reader)
            .enqueue(&mut context);
            
        true
    }
    
    // Public function to update read status
    #[public]
    #[internal]
    fn _mark_read_public(message_id: Field, reader: AztecAddress) {
        storage.message_read_status.at(message_id).write(true);
        storage.read_timestamps.at(message_id).write(0);
        
        // Create and emit an event
        let read_event = MessageRead {
            message_id,
            reader,
            timestamp: 0,
        };
        read_event.emit();
    }
    
    // Destroy/delete a message
    #[private]
    fn destroy_message(message_id: Field) -> pub bool {
        // Mark message as destroyed in public storage
        PrivateMessenger::at(context.this_address())
            ._destroy_message_public(message_id)
            .enqueue(&mut context);
            
        true
    }
    
    // Public function to mark message as destroyed
    #[public]
    #[internal]
    fn _destroy_message_public(message_id: Field) {
        storage.destroyed_messages.at(message_id).write(true);
        
        // Create and emit an event
        let destroyer = context.msg_sender();
        let destroy_event = MessageDestroyed {
            message_id,
            destroyer,
            timestamp: 0,
        };
        destroy_event.emit();
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
        storage.group_members.at(group_id).contains(member)
    }
    
    // Check if a user is the admin
    #[utility]
    unconstrained fn is_admin(user: AztecAddress) -> bool {
        storage.admin.read().eq(user)
    }
}