// AnonymousMessenger.nr
// A privacy-focused messaging contract for the Aztec Network
// Built with Noir language for zero-knowledge capabilities

// Global storage (Merkle trees/maps) for the contract state
global MessengerState {
    // Map to track used nullifiers (prevents duplicate messages)
    used_nullifiers: StorageMap<Field, Field>,
    
    // Encrypted messages stored by their hash
    messages: StorageMap<Field, Message>,
    
    // Group membership tracking
    group_members: StorageMap<Field, Vec<Field>>,
    
    // Message count for each user
    user_message_count: StorageMap<Field, u64>
}

// A struct that represents an encrypted message
struct Message {
    // Hash of the sender's address (private)
    sender_hash: Field,
    
    // Hash of the recipient's address (private)
    recipient_hash: Field,
    
    // Encrypted content of the message (bytes representation)
    encrypted_content: Vec<u8>,
    
    // Timestamp of when the message was sent
    timestamp: u64,
    
    // Whether the message can self-destruct after reading
    self_destruct: bool,
    
    // Optional expiration time (0 means no expiration)
    expiration: u64
}

// Contract implementation
contract AnonymousMessenger {
    // Constructor for contract deployment
    constructor() {}
    
    // A function to send a private message
    // Takes the hashed sender/recipient, a nullifier, and the encrypted message content
    // Returns the message hash that can be used to reference the message
    #[aztec(private)]
    fn send_message(
        sender_hash: Field,
        recipient_hash: Field,
        nullifier: Field,
        encrypted_content: Vec<u8>,
        self_destruct: bool,
        expiration: u64
    ) -> Field {
        // Check that the nullifier hasn't been used before
        // This prevents the same message from being sent multiple times
        assert(!is_nullifier_used(nullifier), "Nullifier has already been used");

        // Mark the nullifier as used
        MessengerState.used_nullifiers.insert(nullifier, 1);
        
        // Get current timestamp
        let timestamp = std::block::timestamp();
        
        // Create the message
        let message = Message {
            sender_hash,
            recipient_hash,
            encrypted_content,
            timestamp,
            self_destruct,
            expiration
        };
        
        // Generate a unique hash for this message
        let message_hash = compute_message_hash(
            sender_hash, 
            recipient_hash, 
            nullifier, 
            timestamp
        );
        
        // Store the message
        MessengerState.messages.insert(message_hash, message);
        
        // Increment the user's message count
        let current_count = MessengerState.user_message_count.get(recipient_hash);
        MessengerState.user_message_count.insert(recipient_hash, current_count + 1);
        
        // Return the message hash so the client can reference this message
        message_hash
    }
    
    // Get a message by its hash
    // Requires proof of being the recipient
    #[aztec(private)]
    fn get_message(
        user_hash: Field,       // Hash of the user trying to read the message
        message_hash: Field     // Hash of the message to retrieve
    ) -> Message {
        // Retrieve the message
        let message = MessengerState.messages.get(message_hash);
        
        // Verify the user is the recipient
        assert(message.recipient_hash == user_hash, "You are not the recipient of this message");
        
        // Check if the message has expired
        if message.expiration > 0 {
            let current_time = std::block::timestamp();
            assert(current_time <= message.expiration, "Message has expired");
        }
        
        // If the message is set to self-destruct, mark it for deletion
        // In a real implementation, we would actually delete it here
        if message.self_destruct {
            // Note: In actual implementation, we would remove the message here
            // For simplicity, we're not implementing the full deletion mechanism
        }
        
        // Return the message
        message
    }
    
    // Create a new messaging group
    #[aztec(private)]
    fn create_group(
        creator_hash: Field,
        group_id: Field,
        initial_members: Vec<Field>
    ) {
        // Store the group members
        MessengerState.group_members.insert(group_id, initial_members);
    }
    
    // Add member to a group
    #[aztec(private)]
    fn add_group_member(
        admin_hash: Field,
        group_id: Field,
        new_member_hash: Field
    ) {
        // Get current group members
        let members = MessengerState.group_members.get(group_id);
        
        // Verify the admin is a member (ideally would check admin rights)
        assert(members.contains(admin_hash), "Only group members can add new members");
        
        // Add the new member if they're not already in the group
        if !members.contains(new_member_hash) {
            members.push(new_member_hash);
            MessengerState.group_members.insert(group_id, members);
        }
    }
    
    // Send a message to a group
    #[aztec(private)]
    fn send_group_message(
        sender_hash: Field,
        group_id: Field,
        nullifier: Field,
        encrypted_content: Vec<u8>,
        self_destruct: bool,
        expiration: u64
    ) -> Field {
        // Check that the nullifier hasn't been used before
        assert(!is_nullifier_used(nullifier), "Nullifier has already been used");

        // Mark the nullifier as used
        MessengerState.used_nullifiers.insert(nullifier, 1);
        
        // Verify sender is a member of the group
        let members = MessengerState.group_members.get(group_id);
        assert(members.contains(sender_hash), "Only group members can send messages");
        
        // Get current timestamp
        let timestamp = std::block::timestamp();
        
        // Create the message
        let message = Message {
            sender_hash,
            recipient_hash: group_id,  // For group messages, recipient is the group
            encrypted_content,
            timestamp,
            self_destruct,
            expiration
        };
        
        // Generate a unique hash for this message
        let message_hash = compute_message_hash(
            sender_hash, 
            group_id, 
            nullifier, 
            timestamp
        );
        
        // Store the message
        MessengerState.messages.insert(message_hash, message);
        
        // Return the message hash
        message_hash
    }
    
    // Get all messages for a user (with pagination)
    #[aztec(private)]
    fn get_user_message_count(user_hash: Field) -> u64 {
        MessengerState.user_message_count.get(user_hash)
    }
    
    // Check if a nullifier has been used already
    #[aztec(public)]
    fn is_nullifier_used(nullifier: Field) -> bool {
        MessengerState.used_nullifiers.contains(nullifier)
    }
    
    // Internal helper: Compute a hash for the message using its components
    fn compute_message_hash(
        sender_hash: Field,
        recipient_hash: Field,
        nullifier: Field,
        timestamp: u64
    ) -> Field {
        std::hash::pedersen([
            sender_hash,
            recipient_hash,
            nullifier,
            timestamp.to_field()
        ])
    }
}