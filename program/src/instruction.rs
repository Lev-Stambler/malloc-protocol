//! Instruction types

// use crate::error::TokenError;
use borsh::{BorshDeserialize, BorshSerialize};
use byteorder::{BigEndian, ByteOrder};
use solana_program::{entrypoint::ProgramResult, msg, program_error::ProgramError, pubkey::Pubkey};

type WCallAddr = Pubkey;
type WCallName = String;
type WCallInputName = String;
type BasketName = String;

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
    pub supported_inputs: Vec<WCallInputEntry>,
    pub nonce: u8,
}

/// Instructions supported by the token program.
#[repr(C)]
#[derive(Clone, Debug, PartialEq, BorshSerialize, BorshDeserialize)]
pub enum ProgInstruction {
    /// NewCall registers a new WCall.
    /// If extra account infos are passed in, they are counted as the associated_accounts
    ///
    /// Accounts expected
    /// program_account (W) - program state account
    /// associated_accounts - accounts that the new WCall expects, in the order it expects them
    NewCall {
        call_name: WCallName,
        wcall_enum: WCall,
    },

    /// CreateBasket creates a new basket
    ///
    /// program_account (W) - program state account
    CreateBasket {
        name: BasketName,
        calls: Vec<WCallName>,
        splits: Vec<u64>,
        input: WCallInputName,
    },

    /// InvokeBasket "Invokes" a basket by sending it its input money, splitting it,
    /// and performing any cross-contract-calls it says to do
    ///
    /// Accounts expected:
    /// program_account, malloc_input_account, w[0][0]'s executable_account, w[0][0]'s split_account,
    /// w[0][0]'s associated_accounts, w[0][0] output_account (if w[0][0] chained), w[0][1] split_account,
    /// w[0][1]'s associated_account, w[0][1] output_account (if w[0][1] chained), (w[0][2]... if w[0][1]) chained,..
    /// w[1][0]...
    InvokeBasket {
        basket_name: BasketName,
        rent_given: u64,
    },

    /// NewCallInput tells Malloc about a new supported input token that can be used by Baskets and WCalls
    /// NewCallInput
    ///
    NewCallInput {
        input_name: String,
        input_address: Pubkey,
    },

    /// InitMalloc intializes a new Malloc Protocol program state
    ///
    /// Accounts expected
    /// program_info (W) - empty account to write state to
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
            supported_inputs: Vec::new(),
            nonce: 1,
        }
    }

    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let size = BigEndian::read_u32(&input[0..4]) as usize;
        let body = &input[4..(4 + size)];
        Self::try_from_slice(body).map_err(|e| {
            msg!(
                "MALLOC LOG: Error parsing state data {:?}. Length of inp is {}",
                e,
                size
            );
            ProgramError::InvalidInstructionData
        })
    }

    pub fn pack(&self, dst: &mut [u8]) -> ProgramResult {
        let buf = self.try_to_vec()?;
        let len = (buf.len() as u32).to_be_bytes();
        dst[0..4].copy_from_slice(&len);
        dst[4..buf.len() + 4].copy_from_slice(buf.as_slice());
        Ok(())
    }
}

impl ProgInstruction {
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        msg!("Number of bytes on input {}", input.len());
        Self::try_from_slice(input).map_err(|e| {
            msg!("MALLOC LOG: Error parsing input data {:?}", e);
            ProgramError::InvalidInstructionData
        })
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_instruction_packing() {}
}
