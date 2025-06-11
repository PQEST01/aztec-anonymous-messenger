use dep::aztec::macros::aztec;

#[aztec]
pub contract PrivateMessage {
    use dep::aztec::{
        macros::{
            functions::{initializer, public, private},
            storage::storage,
        },
        prelude::{AztecAddress, Map, PublicMutable, PublicImmutable},
        protocol_types::traits::ToField,
    };

    #[storage]
    struct Storage<Context> {
        // Message content storage (hash encrypted)
        messages: Map<Field, PublicMutable<Field, Context>, Context>,
        // Message recipients 
        recipients: Map<Field, PublicMutable<AztecAddress, Context>, Context>,
        // Message timestamps  
        timestamps: Map<Field, PublicMutable<u64, Context>, Context>,
        // Message senders
        senders: Map<Field, PublicMutable<AztecAddress, Context>, Context>,
        // Public counter for demo statistics
        message_count: PublicMutable<u64, Context>,
        // Total users who sent messages
        unique_senders: PublicMutable<u64, Context>,
        // Contract owner
        owner: PublicImmutable<AztecAddress, Context>,
        // Default recipient for demo
        default_recipient: PublicImmutable<AztecAddress, Context>,
        // Contract initialization status
        is_initialized: PublicMutable<bool, Context>,
    }

    #[public]
    #[initializer]
    fn constructor(owner: AztecAddress, default_recipient: AztecAddress) {
        storage.owner.initialize(owner);
        storage.default_recipient.initialize(default_recipient);
        storage.message_count.write(0);
        storage.unique_senders.write(0);
        storage.is_initialized.write(true);
    }

    // MAIN DEMO FUNCTION: Send message to default recipient
    #[public]
    fn send_demo_message(content_hash: Field, message_id: Field) {
        let sender = context.msg_sender();
        let recipient = storage.default_recipient.read();
        let timestamp = context.timestamp();
        
        // Store complete message data
        storage.messages.at(message_id).write(content_hash);
        storage.recipients.at(message_id).write(recipient);
        storage.senders.at(message_id).write(sender);
        storage.timestamps.at(message_id).write(timestamp);
    }

    // Send message to custom recipient
    #[public]
    fn send_message(recipient: AztecAddress, content_hash: Field, message_id: Field) {
        let sender = context.msg_sender();
        let timestamp = context.timestamp();
        
        // Store complete message data
        storage.messages.at(message_id).write(content_hash);
        storage.recipients.at(message_id).write(recipient);
        storage.senders.at(message_id).write(sender);
        storage.timestamps.at(message_id).write(timestamp);
    }

    // Increment message counter (separate function to avoid destinations error)
    #[public]
    fn increment_message_count() {
        let current = storage.message_count.read();
        storage.message_count.write(current + 1);
    }

    // Increment unique senders count
    #[public]
    fn increment_unique_senders() {
        let current = storage.unique_senders.read();
        storage.unique_senders.write(current + 1);
    }

    // GET FUNCTIONS - ALL PUBLIC (can read public storage)
    
    // Get message content by ID
    #[public]
    fn get_message(message_id: Field) -> Field {
        storage.messages.at(message_id).read()
    }

    // Get message recipient by ID
    #[public]
    fn get_message_recipient(message_id: Field) -> AztecAddress {
        storage.recipients.at(message_id).read()
    }

    // Get message sender by ID
    #[public]
    fn get_message_sender(message_id: Field) -> AztecAddress {
        storage.senders.at(message_id).read()
    }

    // Get message timestamp by ID
    #[public]
    fn get_message_timestamp(message_id: Field) -> u64 {
        storage.timestamps.at(message_id).read()
    }

    // Get complete message info as separate fields
    #[public]
    fn get_message_content(message_id: Field) -> Field {
        storage.messages.at(message_id).read()
    }

    #[public]
    fn get_message_recipient_field(message_id: Field) -> Field {
        storage.recipients.at(message_id).read().to_field()
    }

    #[public]
    fn get_message_sender_field(message_id: Field) -> Field {
        storage.senders.at(message_id).read().to_field()
    }

    #[public]
    fn get_message_timestamp_field(message_id: Field) -> u64 {
        storage.timestamps.at(message_id).read()
    }

    // Get total messages sent
    #[public]
    fn get_total_messages() -> u64 {
        storage.message_count.read()
    }

    // Get unique senders count
    #[public]
    fn get_unique_senders() -> u64 {
        storage.unique_senders.read()
    }

    // Get contract owner
    #[public]
    fn get_owner() -> AztecAddress {
        storage.owner.read()
    }

    // Get default recipient
    #[public]
    fn get_default_recipient() -> AztecAddress {
        storage.default_recipient.read()
    }

    // Check if message exists
    #[public]
    fn message_exists(message_id: Field) -> bool {
        let content = storage.messages.at(message_id).read();
        content != 0
    }

    // Check if contract is properly initialized
    #[public]
    fn get_initialization_status() -> bool {
        storage.is_initialized.read()
    }

    // Get contract version
    #[public]
    fn get_version() -> u64 {
        1
    }

    // Get contract statistics - separate functions instead of array
    #[public]
    fn get_total_message_count() -> u64 {
        storage.message_count.read()
    }

    #[public]
    fn get_total_unique_senders() -> u64 {
        storage.unique_senders.read()
    }

    // Verify sender permissions (demo utility)
    #[public]
    fn verify_sender(sender: AztecAddress) -> bool {
        // For demo: all senders are allowed
        !sender.is_zero()
    }

    // Get demo recipient address as field
    #[public]
    fn get_demo_recipient_field() -> Field {
        storage.default_recipient.read().to_field()
    }

    // Get demo message count
    #[public]
    fn get_demo_message_count() -> u64 {
        storage.message_count.read()
    }
}