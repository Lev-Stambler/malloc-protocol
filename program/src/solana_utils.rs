//! Solana Utility functions

use solana_program::{program_error::ProgramError, program_option::COption, pubkey::Pubkey};

pub  const pub_key_size: usize = 32;

pub fn unpack_pubkey(input: &[u8]) -> Result<(Pubkey, &[u8]), ProgramError> {
    if input.len() >= pub_key_size {
        let (key, rest) = input.split_at(pub_key_size);
        let pk = Pubkey::new(key);
        Ok((pk, rest))
    } else {
        Err(ProgramError::InvalidInstructionData.into())
    }
}

pub fn unpack_pubkey_corret_len(input: &[u8]) -> Result<Pubkey, ProgramError> {
    let unpack_ret = unpack_pubkey(input)?;
    if unpack_ret.1.len() > 0 {
        Err(ProgramError::InvalidInstructionData.into())
    } else {
        Ok(unpack_ret.0)
    }
}

pub fn unpack_pubkey_option(input: &[u8]) -> Result<(COption<Pubkey>, &[u8]), ProgramError> {
    match input.split_first() {
        Option::Some((&0, rest)) => Ok((COption::None, rest)),
        Option::Some((&1, rest)) if rest.len() >= 32 => {
            let (key, rest) = rest.split_at(32);
            let pk = Pubkey::new(key);
            Ok((COption::Some(pk), rest))
        }
        _ => Err(ProgramError::InvalidInstructionData.into())
    }
}

pub fn pack_pubkey_option(value: &COption<Pubkey>, buf: &mut Vec<u8>) {
    match *value {
        COption::Some(ref key) => {
            buf.push(1);
            buf.extend_from_slice(&key.to_bytes());
        }
        COption::None => buf.push(0),
    }
}

