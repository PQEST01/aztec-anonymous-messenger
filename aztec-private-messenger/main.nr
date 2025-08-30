
use dep::aztec::prelude::*;
use dep::aztec::{
    protocol_types::address::AztecAddress,
    note::{
        note_header::NoteHeader,
        note_interface::NoteInterface,
        utils::compute_note_hash_for_consumption,
    },
    oracle::{
        nullifier_key::get_nullifier_secret_key,
        get_public_key::get_public_key,
    },
    log::emit_encrypted_log,
    state_vars::{PrivateSet, Map},
    hash::pedersen_hash,
    context::PrivateContext,
};

// Message note structure for private messaging with 1024 character support
#[aztec(note)]
struct MessageNote {
    // Owner must be the recipient so they can nullify/spend the note
    owner: AztecAddress,
    // From / To
    sender: AztecAddress,
    recipient: AztecAddress,
    // Real plaintext length in characters/bytes as agreed by the client
    // Must be <= 1024
    msg_len: u32,
    // Message content fields for up to 1024 characters
    part0: Field,
    part1: Field,
    part2: Field,
    part3: Field,
}

impl MessageNote {
    pub fn new(
        owner: AztecAddress,
        sender: AztecAddress,
        recipient: AztecAddress,
        msg_len: u32,
        part0: Field,
        part1: Field,
        part2: Field,
        part3: Field,
    ) -> Self {
        Self {
            owner,
            sender,
            recipient,
            msg_len,
            part0,
            part1,
            part2,
            part3,
            header: NoteHeader::empty(),
        }
    }
}

impl NoteInterface<9> for MessageNote {
    fn compute_note_content_hash(self) -> Field {
        pedersen_hash([
            self.owner.to_field(),
            self.sender.to_field(),
            self.recipient.to_field(),
            self.msg_len as Field,
            self.part0,
            self.part1,
            self.part2,
            self.part3,
        ])
    }

    fn compute_nullifier(self, context: &mut PrivateContext) -> Field {
        let note_hash_for_nullify = compute_note_hash_for_consumption(self);
        let secret = context.request_nullifier_secret_key(self.owner);
        pedersen_hash([
            note_hash_for_nullify,
            secret.high,
            secret.low,
        ])
    }

    fn compute_nullifier_without_context(self) -> Field {
        let note_hash_for_nullify = compute_note_hash_for_consumption(self);
        let secret = get_nullifier_secret_key(self.owner);
        pedersen_hash([
            note_hash_for_nullify,
            secret.high,
            secret.low,
        ])
    }

    fn serialize_content(self) -> [Field; 9] {
        [
            self.owner.to_field(),
            self.sender.to_field(),
            self.recipient.to_field(),
            self.msg_len as Field,
            self.part0,
            self.part1,
            self.part2,
            self.part3,
            0, // padding
        ]
    }

    fn deserialize_content(serialized: [Field; 9]) -> Self {
        Self {
            owner: AztecAddress::from_field(serialized[0]),
            sender: AztecAddress::from_field(serialized[1]),
            recipient: AztecAddress::from_field(serialized[2]),
            msg_len: serialized[3] as u32,
            part0: serialized[4],
            part1: serialized[5],
            part2: serialized[6],
            part3: serialized[7],
            header: NoteHeader::empty(),
        }
    }

    fn get_header(self) -> NoteHeader {
        self.header
    }

    fn set_header(&mut self, header: NoteHeader) {
        self.header = header;
    }

    fn broadcast(self, context: &mut PrivateContext, slot: Field) {
        let encryption_pub_key = get_public_key(self.recipient);
        emit_encrypted_log(
            context,
            (*context).this_address(),
            slot,
            Self::get_note_type_id(),
            encryption_pub_key,
            self.serialize_content(),
        );
    }

    fn get_note_type_id() -> Field {
        1337001 // Unique type ID for MessageNote
    }
}

#[aztec(contract)]
contract PrivateMessenger {
    use crate::MessageNote;

    // Per-recipient inbox: a private set of MessageNote per recipient
    #[aztec(storage)]
    struct Storage {
        inbox: Map<AztecAddress, PrivateSet<MessageNote>>,
    }

    #[aztec(private)]
    #[aztec(initializer)]
    fn constructor() {
        // Empty constructor - contract is ready to use
    }

    // Send a private message:
    // - recipient: target address
    // - msg_len: declared message length, must be <= 1024
    // - part0..part3: message content segments prepared off-chain
    #[aztec(private)]
    fn send_message(
        recipient: AztecAddress,
        msg_len: u32,
        part0: Field,
        part1: Field,
        part2: Field,
        part3: Field,
    ) -> Field {
        // Enforce upper bound: support messages up to 1024 characters
        assert(msg_len <= 1024, "Message length cannot exceed 1024 characters");

        // Sender (available in private context)
        let sender: AztecAddress = context.msg_sender();

        // Construct the note
        let mut message = MessageNote::new(
            recipient, // owner is recipient
            sender,
            recipient,
            msg_len,
            part0,
            part1,
            part2,
            part3,
        );

        // Insert into recipient inbox with encryption
        storage.inbox.at(recipient).insert(&mut message, true);

        // Return message ID for tracking (using part0 as message ID)
        part0
    }

    // Get messages for the calling user (limited for gas efficiency)
    #[aztec(private)]
    fn get_my_messages(limit: Field) -> [MessageNote; 10] {
        let user = context.msg_sender();
        let mut options = NoteGetterOptions::new();
        options = options.set_limit(limit as u32);
        
        let notes = storage.inbox.at(user).get_notes(options);
        let mut messages: [MessageNote; 10] = [
            MessageNote::new(
                AztecAddress::zero(),
                AztecAddress::zero(),
                AztecAddress::zero(),
                0,
                0,
                0,
                0,
                0,
            ); 10
        ];
        
        for i in 0..10 {
            if i < notes.len() {
                messages[i] = notes[i];
            }
        }
        
        messages
    }

    // Get messages from a specific sender
    #[aztec(private)]
    fn get_messages_from_sender(sender_address: AztecAddress, limit: Field) -> [MessageNote; 5] {
        let user = context.msg_sender();
        let mut options = NoteGetterOptions::new();
        options = options.set_limit(limit as u32);
        
        let all_notes = storage.inbox.at(user).get_notes(options);
        let mut filtered_messages: [MessageNote; 5] = [
            MessageNote::new(
                AztecAddress::zero(),
                AztecAddress::zero(),
                AztecAddress::zero(),
                0,
                0,
                0,
                0,
                0,
            ); 5
        ];
        
        let mut count = 0;
        for i in 0..all_notes.len() {
            if (count < 5) & (all_notes[i].sender == sender_address) {
                filtered_messages[count] = all_notes[i];
                count += 1;
            }
        }
        
        filtered_messages
    }

    // Get total message count for user
    #[aztec(private)]
    fn get_message_count() -> Field {
        let user = context.msg_sender();
        let mut options = NoteGetterOptions::new();
        options = options.set_limit(100);
        
        let notes = storage.inbox.at(user).get_notes(options);
        notes.len() as Field
    }

    // Delete a specific message by searching for part0 (message ID)
    #[aztec(private)]
    fn delete_message(message_id: Field) {
        let user = context.msg_sender();
        let mut options = NoteGetterOptions::new();
        options = options.set_limit(100);
        
        let notes = storage.inbox.at(user).get_notes(options);
        for i in 0..notes.len() {
            if notes[i].part0 == message_id {
                storage.inbox.at(user).remove(notes[i]);
                break;
            }
        }
    }

    // Check if contract is working (ping function)
    #[aztec(private)]
    fn ping() -> Field {
        20250811 // Current date as confirmation
    }

    // Get inbox size (number of messages)
    #[aztec(private)]
    fn get_inbox_size() -> Field {
        let user = context.msg_sender();
        let mut options = NoteGetterOptions::new();
        options = options.set_limit(1000); // Higher limit for accurate count
        
        let notes = storage.inbox.at(user).get_notes(options);
        notes.len() as Field
    }
}
