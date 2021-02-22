//! Program state processor
use crate::instruction::{self, ProgInstruction, ProgState, Basket, WCall};
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
    pubkey::Pubkey,
};
use std::str::from_utf8;

fn process_register_call(
    sender: &Pubkey,
    prog_state: &mut ProgState,
    program_data: *mut u8,
    call_input: String,
    name: String,
    wcall: WCall,
) -> ProgramResult {
    if let Some(_addr) = prog_state.wrapped_calls.get(&name) {
        msg!("This name already exists as a registered call");
        return Err(ProgramError::InvalidInstructionData);
    }
    // TODO: if it's not in there, do we want the user to allow for adding this?
    if let None = prog_state.supported_wrapped_call_inputs.get(&call_input) {
        msg!("The w-call's inputs must be supported");
        return Err(ProgramError::InvalidInstructionData);
    }
    let _ = prog_state.wrapped_calls.insert(name, wcall);
    prog_state.write_new_prog_state(program_data)?;
    Ok(())
}

fn process_enact_basket(
    sender: &Pubkey,
    prog_state: &ProgState,
    basket_name: String,
) -> ProgramResult {
    // TODO: impl me
    Ok(())
}

fn process_init_malloc(program_data: *mut u8, program_inp: &[u8]) -> ProgramResult {
    if let Ok(_) = ProgState::unpack(program_inp) {
        return Err(ProgramError::InvalidInstructionData);
    }
    let new_state = ProgState::new();
    let _ = new_state.write_new_prog_state(program_data);
    Ok(())
}

fn process_create_basket(
    prog_state: &mut ProgState,
    program_data: *mut u8,
    name: String, calls: Vec<String>, splits: Vec<i32>) -> ProgramResult {
    // TODO: checking
    let new_basket = Basket::new(calls, splits, Pubkey::default(), "MY_INPUT".to_string());
    prog_state.baskets.insert(name, new_basket);
    Ok(())
}

/// Instruction processor
/// The first account is an account associated with the sender. The second account
/// is the account associated with the contract
// TODO: where does this second account come from? Maybe there has to be an init
// instruction which creates a new account with the _program_id as the owner? (Or maybe there is j one made on a frontend
// and thats j what is used)
pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    input: &[u8],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let program_info = account_info_iter
        .next()
        .ok_or(ProgramError::NotEnoughAccountKeys)?;

    let instruction = ProgInstruction::unpack(input)?;
    if let ProgInstruction::InitMalloc {} = instruction {
        let prog_data_ptr = (&program_info.data.borrow()).as_ref().as_ptr() as *mut u8;
        return process_init_malloc(prog_data_ptr, &program_info.data.borrow().as_ref());
    }

    // msg!("PROCESS: got program main state with data {:?}", &program_info.data.borrow());
    let mut prog_state = ProgState::unpack(&program_info.data.borrow())?;

    let account_info = account_info_iter
        .next()
        .ok_or(ProgramError::NotEnoughAccountKeys)?;
    //if let Some(address) = account_info.signer_key() {
    //    if address != account_info.owner {
    //        return Err(ProgramError::MissingRequiredSignature);
    //    }
    //} else {
    //    return Err(ProgramError::MissingRequiredSignature);
    //}



    match instruction {
        ProgInstruction::RegisterCall {
            call_input,
            call_name: name,
            wcall,
        } => {
            // TODO: this is an implementation for accessing memory picked up from https://github.com/solana-labs/solana-program-library/tree/master/memo
            // not sure if its right
            let prog_data_ptr = (&program_info.data.borrow()).as_ref().as_ptr() as *mut u8;
            process_register_call(
                account_info.owner,
                &mut prog_state,
                prog_data_ptr,
                call_input,
                name,
                wcall,
            )
        }
        ProgInstruction::EnactBasket { basket_name } => {
            process_enact_basket(account_info.owner, &prog_state, basket_name)
        }
        ProgInstruction::InitMalloc {} => {
            Ok(())
        }
        ProgInstruction::CreateBasket {
            name,
            calls,
            splits,
        } => {
            let prog_data_ptr = (&program_info.data.borrow()).as_ref().as_ptr() as *mut u8;
            process_create_basket(&mut prog_state, prog_data_ptr, name, calls, splits)
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

    // #[test]
    // fn test_utf8_memo() {
    //     let program_id = Pubkey::new(&[0; 32]);

    //     let string = b"letters and such";
    //     assert_eq!(Ok(()), process_instruction(&program_id, &[], string));

    //     let emoji = "🐆".as_bytes();
    //     let bytes = [0xF0, 0x9F, 0x90, 0x86];
    //     assert_eq!(emoji, bytes);
    //     assert_eq!(Ok(()), process_instruction(&program_id, &[], &emoji));

    //     let mut bad_utf8 = bytes;
    //     bad_utf8[3] = 0xFF; // Invalid UTF-8 byte
    //     assert_eq!(
    //         Err(ProgramError::InvalidInstructionData),
    //         process_instruction(&program_id, &[], &bad_utf8)
    //     );
    // }

    // #[test]
    // fn test_signers() {
    //     let program_id = Pubkey::new(&[0; 32]);
    //     let memo = "🐆".as_bytes();

    //     let pubkey0 = Pubkey::new_unique();
    //     let pubkey1 = Pubkey::new_unique();
    //     let pubkey2 = Pubkey::new_unique();
    //     let mut account0 = Account::default();
    //     let mut account1 = Account::default();
    //     let mut account2 = Account::default();

    //     let signed_account_infos = vec![
    //         (&pubkey0, true, &mut account0).into_account_info(),
    //         (&pubkey1, true, &mut account1).into_account_info(),
    //         (&pubkey2, true, &mut account2).into_account_info(),
    //     ];
    //     assert_eq!(
    //         Ok(()),
    //         process_instruction(&program_id, &signed_account_infos, memo)
    //     );

    //     assert_eq!(Ok(()), process_instruction(&program_id, &[], memo));

    //     let unsigned_account_infos = vec![
    //         (&pubkey0, false, &mut account0).into_account_info(),
    //         (&pubkey1, false, &mut account1).into_account_info(),
    //         (&pubkey2, false, &mut account2).into_account_info(),
    //     ];
    //     assert_eq!(
    //         Err(ProgramError::MissingRequiredSignature),
    //         process_instruction(&program_id, &unsigned_account_infos, memo)
    //     );

    //     let partially_signed_account_infos = vec![
    //         (&pubkey0, true, &mut account0).into_account_info(),
    //         (&pubkey1, false, &mut account1).into_account_info(),
    //         (&pubkey2, true, &mut account2).into_account_info(),
    //     ];
    //     assert_eq!(
    //         Err(ProgramError::MissingRequiredSignature),
    //         process_instruction(&program_id, &partially_signed_account_infos, memo)
    //     );
    // }
}
