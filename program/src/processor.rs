//! Program state processor

use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
    pubkey::Pubkey,
};
use std::str::from_utf8;

use crate::instruction::{self, ProgInstruction};

fn process_register_call(sender: &Pubkey, from: String, to: &Pubkey) -> ProgramResult {
    Ok(())
}

fn process_enact_basket(sender: &Pubkey, basket_name: String) -> ProgramResult {
    Ok(())
}
/// Instruction processor
pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    input: &[u8],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let account_info = account_info_iter
        .next()
        .ok_or(ProgramError::NotEnoughAccountKeys)?;
    if let Some(address) = account_info.signer_key() {
        if address != account_info.owner {
            return Err(ProgramError::MissingRequiredSignature);
        }
    } else {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let instruction = ProgInstruction::unpack(input)?;

    match instruction {
        ProgInstruction::RegisterCall { from, to } => {
            process_register_call(account_info.owner, from, to)
        }
        ProgInstruction::EnactBasket { basket_name } => {
            process_enact_basket(account_info.owner, basket_name)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_program::{
        account_info::IntoAccountInfo, program_error::ProgramError, pubkey::Pubkey,
    };
    use solana_sdk::account::Account;

    #[test]
    fn test_utf8_memo() {
        let program_id = Pubkey::new(&[0; 32]);

        let string = b"letters and such";
        assert_eq!(Ok(()), process_instruction(&program_id, &[], string));

        let emoji = "🐆".as_bytes();
        let bytes = [0xF0, 0x9F, 0x90, 0x86];
        assert_eq!(emoji, bytes);
        assert_eq!(Ok(()), process_instruction(&program_id, &[], &emoji));

        let mut bad_utf8 = bytes;
        bad_utf8[3] = 0xFF; // Invalid UTF-8 byte
        assert_eq!(
            Err(ProgramError::InvalidInstructionData),
            process_instruction(&program_id, &[], &bad_utf8)
        );
    }

    #[test]
    fn test_signers() {
        let program_id = Pubkey::new(&[0; 32]);
        let memo = "🐆".as_bytes();

        let pubkey0 = Pubkey::new_unique();
        let pubkey1 = Pubkey::new_unique();
        let pubkey2 = Pubkey::new_unique();
        let mut account0 = Account::default();
        let mut account1 = Account::default();
        let mut account2 = Account::default();

        let signed_account_infos = vec![
            (&pubkey0, true, &mut account0).into_account_info(),
            (&pubkey1, true, &mut account1).into_account_info(),
            (&pubkey2, true, &mut account2).into_account_info(),
        ];
        assert_eq!(
            Ok(()),
            process_instruction(&program_id, &signed_account_infos, memo)
        );

        assert_eq!(Ok(()), process_instruction(&program_id, &[], memo));

        let unsigned_account_infos = vec![
            (&pubkey0, false, &mut account0).into_account_info(),
            (&pubkey1, false, &mut account1).into_account_info(),
            (&pubkey2, false, &mut account2).into_account_info(),
        ];
        assert_eq!(
            Err(ProgramError::MissingRequiredSignature),
            process_instruction(&program_id, &unsigned_account_infos, memo)
        );

        let partially_signed_account_infos = vec![
            (&pubkey0, true, &mut account0).into_account_info(),
            (&pubkey1, false, &mut account1).into_account_info(),
            (&pubkey2, true, &mut account2).into_account_info(),
        ];
        assert_eq!(
            Err(ProgramError::MissingRequiredSignature),
            process_instruction(&program_id, &partially_signed_account_infos, memo)
        );
    }
}
