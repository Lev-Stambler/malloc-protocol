#![deny(missing_docs)]
// #![forbid(unsafe_code)]

//! Malloc Protocol is a DeFi composability and automation layer built on the Solana Blockchain.

/// Malloc does two things:
/// * partition an amount of SPL tokens according to user-defined percentages
/// * send those SPL tokens to other on-chain programs
///
/// In a way, Malloc Protocol can be thought of as a protocol for defining and composing "higher-order smart-contracts"
///
/// Malloc Protocol defines the following constructs
/// * Basket - A data structure that specifies an "Input" and contains a set of percentages, each associated with an identifier for a "WCall". When invkoed, a basket is given an amount of its "Input", partitions that input into "splits" according to the percentages, and invokes a WCall using each split as an input.
/// * WCall ("Wrapped Call") - A data structure that is more or less a function signature for a Solana cross-program invocation. It specifies the destination program ID, what SPL token it takes as input, and all accounts it requires, referred to as "Associated Accounts". There are two kinds of WCalls - chained and simple. chained calls produce an "output" SPL token that can be used to invoke another basket - simple calls aren't. Continuing with the "function" analogy, chained WCalls are like recursive functions, while simple WCalls are not recursive.
/// * Input - the SPL token that a WCall consumes. Think of this as the "input type" for a WCall. The "output" of a chained call is itself an "Input".
mod entrypoint;
pub mod error;
mod instruction;
pub mod processor;
mod wcall_handlers;

// Export current sdk types for downstream users building with a different sdk version
pub use solana_program;

solana_program::declare_id!("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
