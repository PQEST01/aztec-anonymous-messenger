// src/main.nr
// Make the Aztec contract attribute available as #[aztec]
use dep::aztec::macros::aztec;

#[aztec]
pub contract PrivateMessenger {
    // Import attributes & types INSIDE the contract scope (correct visibility)
    use dep::aztec::macros::{
        functions::{initializer, private, utility},
        notes::note,           // #[note] for custom note structs
        storage::storage,      // #[storage] attribute; generates the `storage` binding
    };

    use dep::aztec::prelude::{AztecAddress, Map};
    use dep::aztec::state_vars::PrivateSet;
    use dep::aztec::messages::logs::note::encode_and_encrypt_note;
    use dep::aztec::note::note_viewer_options::NoteViewerOptions;

    use std::collections::bounded_vec::BoundedVec;
    use std::meta::derive; // enables #[derive(Eq)]

    // ---------------- Note definition ----------------
    // A private message note owned by the recipient.
    // #[note] provides required Aztec note traits; we also derive Eq for set operations.
    #[note]
    #[derive(Eq)]
    pub struct MessageNote {
        owner: AztecAddress,   // recipient / note owner (packs to 1 Field)
        sender: AztecAddress,  // who sent it (packs to 1 Field)
        // Free-form payload split into four Field chunks (pack/unpack off-chain)
        p0: Field,
        p1: Field,
        p2: Field,
        p3: Field,
    }

    impl MessageNote {
        pub fn new(owner: AztecAddress, sender: AztecAddress, p0: Field, p1: Field, p2: Field, p3: Field) -> Self {
            Self { owner, sender, p0, p1, p2, p3 }
        }
    }

    // ---------------- Storage layout ----------------
    #[storage]
    pub struct Storage<Context> {
        // Inbox per recipient address: address -> set of MessageNote
        inbox: Map<AztecAddress, PrivateSet<MessageNote, Context>, Context>,
    }

    // ---------------- Initializer ----------------
    #[initializer]
    #[private]
    fn init() { }

    // ---------------- Private entrypoint ----------------
    /// Insert a private message note for `to` and emit an encrypted discovery log
    /// so wallets can discover and decrypt it.
    #[private]
    fn send_message(to: AztecAddress, p0: Field, p1: Field, p2: Field, p3: Field) {
        let sender = context.msg_sender();
        let note = MessageNote::new(to, sender, p0, p1, p2, p3);

        storage
            .inbox
            .at(to)
            .insert(note)
            .emit(encode_and_encrypt_note(&mut context, sender, to));
    }

    // ---------------- Read helper (unconstrained) ----------------
    /// Return up to 10 messages for `owner`, starting at `offset`.
    /// NoteViewerOptions<T, N> expects N = packed field length of T.
    /// For MessageNote: owner(1) + sender(1) + p0..p3(4) = 6.
    /// view_notes returns BoundedVec<MessageNote, 10>.
    #[utility]
    unconstrained fn get_messages(owner: AztecAddress, offset: u32)
        -> pub BoundedVec<MessageNote, 10>
    {
        // Two generics: <MessageNote, 6> (packed length), NOT the page size.
        let mut opts: NoteViewerOptions<MessageNote, 6> =
            NoteViewerOptions::<MessageNote, 6>::new();

        // limit must be a compile-time literal; offset is runtime
        opts = opts.set_limit(10u32).set_offset(offset);

        storage.inbox.at(owner).view_notes(opts)
    }

    // Optional health check utility
    #[utility]
    unconstrained fn ping() -> pub Field { 20250818 }
}
