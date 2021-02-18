#![deny(missing_docs)]
// #![forbid(unsafe_code)]

//! A program that accepts a string of encoded characters and verifies that it parses,
//! while verifying and logging signers. Currently handles UTF-8 characters.

mod entrypoint;
pub mod error;
mod instruction;
pub mod processor;
mod solana_utils;

// Export current sdk types for downstream users building with a different sdk version
pub use solana_program;
use solana_program::{
    instruction::{AccountMeta, Instruction},
    program_error::ProgramError,
    pubkey::Pubkey,
};

solana_program::declare_id!("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
