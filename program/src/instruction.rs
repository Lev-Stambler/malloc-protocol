//! Instruction types

// use crate::error::TokenError;
use borsh::{BorshDeserialize, BorshSerialize};
use byteorder::ByteOrder;
use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, instruction::{AccountMeta, Instruction}, msg, program_error::ProgramError, program_option::COption, pubkey::Pubkey, sysvar};
use std::{convert::TryInto, hash::Hash};
use std::{mem::size_of, slice::from_raw_parts_mut};

type WCallAddr = Pubkey;
type WCallName = String;
type WCallInputName = String;
type BasketName = String;

/// Minimum number of multisignature signers (min N)
pub const MIN_SIGNERS: usize = 1;
/// Maximum number of multisignature signers (max N)
pub const MAX_SIGNERS: usize = 11;

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub enum WCall {
    Simple {
        wcall: WCallAddr,
        input: WCallInputName,
        associated_accounts: Vec<Pubkey>,
        associated_account_is_writable: Vec<u8>,
        associated_account_is_signer: Vec<u8>,
    },
    Chained {
        wcall: WCallAddr,
        callback_basket: BasketName,
        input: WCallInputName,
        output: WCallInputName,
        associated_accounts: Vec<Pubkey>,
        // ! these use u8's for probably poor reasons
        // marks whether or not corresponding associated account needs to be writable
        associated_account_is_writable: Vec<u8>,
        // marks whether or not corresponding
        associated_account_is_signer: Vec<u8>,
    },
}

#[derive(BorshSerialize, BorshDeserialize, Default)]
pub struct Basket {
    /// The calls that the basket makes
    pub calls: Vec<WCallName>,
    /// the proportional split of every element in calls such that all elems
    /// sum to 1_000
    pub splits: Vec<u64>,
    /// the basket's creator
    pub creator: Pubkey,
    /// the input SPL type address
    pub input: WCallInputName,
}

#[derive(BorshSerialize, BorshDeserialize)]
pub struct WCallEntry {
    pub(crate) name: WCallName,
    pub(crate) wcall: WCall,
}

#[derive(BorshSerialize, BorshDeserialize, Default)]
pub struct BasketEntry {
    pub(crate) name: BasketName,
    pub(crate) basket: Basket,
}

#[derive(BorshSerialize, BorshDeserialize, Default)]
pub struct WCallInputEntry {
    pub(crate) name: WCallInputName,
    pub(crate) input: Pubkey,
}

/// The program state
#[derive(BorshSerialize, BorshDeserialize, Default)]
pub struct ProgState {
    /// A map of all names to pubkeys for the calls
    pub wrapped_calls: Vec<WCallEntry>,
    /// All the baskets with the basket name as a key
    pub baskets: Vec<BasketEntry>,
    /// map from WCallName to input it takes
    pub supported_wrapped_call_inputs: Vec<WCallInputEntry>,
    pub nonce: u8
}

/// Instructions supported by the token program.
#[repr(C)]
#[derive(Clone, Debug, PartialEq, BorshSerialize, BorshDeserialize)]
pub enum ProgInstruction {
    /// If extra account infos are passed in, they are counted as the associated_accounts
    RegisterCall {
        call_name: WCallName,
        wcall_enum: WCall,
    },
    CreateBasket {
        name: BasketName,
        calls: Vec<WCallName>,
        splits: Vec<u64>,
        input: WCallInputName,
    },
    ///
    /// Accounts expected:
    /// program_info, malloc_input, w[0][0]' executable, w[0][0] split account,
    /// w[0][0] associated accounts, w[0][0] output account if chained, w[0][1] split account
    /// w[0][1]'s associated account, w[0][1] out if chained, (w[0][2]... if w[0][1]) chained,..
    /// w[1][0]...
    EnactBasket {
        basket_name: BasketName,
        rent_given: u64,
    },

    NewSupportedWCallInput {
        input_name: String,
        input_address: Pubkey,
    },
    InitMalloc {},
}

impl Basket {
    pub fn new(calls: Vec<String>, splits: Vec<u64>, creator: Pubkey, input: String) -> Self {
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
            wrapped_calls: Vec::new(),
            baskets: Vec::new(),
            supported_wrapped_call_inputs: Vec::new(),
            nonce: 1
        }
    }

    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let size = byteorder::BigEndian::read_u32(&input[0..4]) as usize;
        let body = &input[4..(4+size)];
        Self::try_from_slice(body).map_err(|e| {
            msg!("MALLOC LOG: Error parsing state data {:?}. Length of inp is {}", e, size);
            ProgramError::InvalidInstructionData
        })
    }

    /// Packs a [ProgInstruction](enum.ProgInstruction.html) into JSON.
    pub fn pack(&self, dst: &mut [u8]) -> ProgramResult {
        // TODO: better error handling?
        let buf = self.try_to_vec()?;
        let len = (buf.len() as u32).to_be_bytes();
        dst[0..4].copy_from_slice(&len);
        dst[4..buf.len() + 4].copy_from_slice(buf.as_slice());
        Ok(())
    }
}

impl ProgInstruction {
    // TODO: make use of something more efficient than JSON
    /// Using json packing
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        msg!("Number of bytes on input {}", input.len());
        Self::try_from_slice(input).map_err(|e| {
            msg!("MALLOC LOG: Error parsing input data {:?}", e);
            ProgramError::InvalidInstructionData
        })
    }

    /// Packs a [ProgInstruction](enum.ProgInstruction.html) into JSON.
    pub fn pack(&self) -> Vec<u8> {
        // TODO: better error handling?
        self.try_to_vec().unwrap()
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_instruction_packing() {}
}
