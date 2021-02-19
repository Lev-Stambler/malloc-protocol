//! Instruction types

// use crate::error::TokenError;
use serde::{Deserialize, Serialize};
use serde_json::to_vec;
use solana_program::{
    instruction::{AccountMeta, Instruction},
    msg,
    program_error::ProgramError,
    program_option::COption,
    pubkey::Pubkey,
    sysvar,
};
use std::{collections::{BTreeMap, HashMap}, convert::TryInto, hash::Hash};
use std::{mem::size_of, slice::from_raw_parts_mut};

/// Minimum number of multisignature signers (min N)
pub const MIN_SIGNERS: usize = 1;
/// Maximum number of multisignature signers (max N)
pub const MAX_SIGNERS: usize = 11;

#[derive(Serialize, Deserialize, Default)]
pub struct Basket {
    /// The calls that the basket makes
    pub calls: Vec<String>,
    /// the proportional split of every element in calls such that all elems
    /// sum to 1_000
    pub splits: Vec<i32>,
    /// the basket's creator
    pub creator: Pubkey,
    /// the input SPL type address
    pub input: String,
}
/// The program state
#[derive(Serialize, Deserialize, Default)]
pub struct ProgState {
    /// A map of all names to pubkeys for the calls
    /// TODO: make more efficient than std HashMap
    pub wrapped_call_addrs: BTreeMap<String, Pubkey>,
    /// All the baskets with the basket name as a key
    pub baskets: BTreeMap<String, Basket>,
    /// All the supported outputs that pipe into the wrapped calls
    pub supported_wrapped_call_inputs: BTreeMap<String, Pubkey>,
}

/// Instructions supported by the token program.
#[repr(C)]
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum ProgInstruction {
    RegisterCall {
        call_input: String,
        call_name: String,
        to: Pubkey,
    },
    CreateBasket {
        name: String,
        calls: Vec<String>,
        splits: Vec<i32>,
    },
    EnactBasket {
        basket_name: String,
    },
    InitMalloc {},
}

impl Basket {
    pub fn new(calls: Vec<String>, splits: Vec<i32>, creator: Pubkey, input: String) -> Self {
        Basket {
            calls,
            splits,
            creator,
            input,
        }
    }
}

impl ProgState {
    pub fn new() -> Self {
        // TODO: checks
        ProgState {
            wrapped_call_addrs: BTreeMap::default(),
            baskets: BTreeMap::default(),
            supported_wrapped_call_inputs: BTreeMap::default()
        }
    }

    pub fn write_new_prog_state(&self, data_ptr: *mut u8) -> Result<(), ProgramError> {
        unsafe {
            let encoded = self.pack();
            let data = from_raw_parts_mut(data_ptr, encoded.len());
            data.copy_from_slice(encoded.as_slice());
        };
        Ok(())
    }

    // TODO: make use of something more efficient than JSON
    /// Using json packing
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        serde_json::from_slice(input).map_err(|e| {
            msg!("Error parsing input data {:?}", e);
            ProgramError::InvalidInstructionData
        })
    }

    /// Packs a [ProgInstruction](enum.ProgInstruction.html) into JSON.
    pub fn pack(&self) -> Vec<u8> {
        // TODO: better error handling?
        serde_json::to_vec(self).unwrap()
    }
}
impl ProgInstruction {
    // TODO: make use of something more efficient than JSON
    /// Using json packing
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        serde_json::from_slice(input).map_err(|e| {
            msg!("Error parsing input data {:?}", e);
            ProgramError::InvalidInstructionData
        })
    }

    /// Packs a [ProgInstruction](enum.ProgInstruction.html) into JSON.
    pub fn pack(&self) -> Vec<u8> {
        // TODO: better error handling?
        serde_json::to_vec(self).unwrap()
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_instruction_packing() {}
}
