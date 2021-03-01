//! Program state processor
use crate::instruction::{
    self, Basket, BasketEntry, ProgInstruction, ProgState, WCall, WCallEntry, WCallInputEntry,
};
use solana_program::{
    account_info::{Account, AccountInfo, next_account_info},
    entrypoint::ProgramResult,
    msg,
    program::invoke,
    program_error::ProgramError,
    program_option::COption,
    program_pack::{IsInitialized, Pack},
    pubkey::Pubkey,
};
use std::str::from_utf8;

const TOKEN_PROG_ID: &'static str = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
type EnactBasketResult = std::result::Result<usize, ProgramError>;

fn process_register_call<'a, 'b>(
    sender: &Pubkey,
    prog_state: &mut ProgState,
    program_info: &'a AccountInfo<'a>,
    name: String,
    wcall: WCall,
    associated_accounts_infos: Vec<AccountInfo>,
) -> ProgramResult {
    if let Some(_entry) = prog_state
        .wrapped_calls
        .iter()
        .find(|entry| name == entry.name)
    {
        msg!("MALLOC LOG: This name already exists as a registered call");
        return Err(ProgramError::InvalidInstructionData);
    }
    msg!(
        "Got {:?} associated accounts through account infos",
        associated_accounts_infos.len()
    );
    // TODO: if it's not in there, do we want the user to allow for adding this?
    let updated_wcall = if associated_accounts_infos.len() > 0 {
        let associated_account_is_writable = associated_accounts_infos.iter()
            .map(|info| if info.is_writable { 1 } else { 0 })
            .collect();
        let associated_accounts = associated_accounts_infos.iter().map(|info| *info.key).collect();
        let associated_account_is_signer = associated_accounts_infos.iter()
            .map(|info| if info.is_signer { 1 } else { 0 })
            .collect();

        match wcall {
            WCall::Simple { wcall, ref input, .. } => WCall::Simple {
                wcall,
                input: input.to_string(),
                associated_accounts,
                associated_account_is_signer,
                associated_account_is_writable,
            },
            WCall::Chained {
                wcall,
                ref callback_basket,
                ref input,
                ref output,
                ..
            } => WCall::Chained {
                wcall,
                input: input.to_string(),
                associated_accounts,
                associated_account_is_signer,
                associated_account_is_writable,
                output: output.to_string(),
                callback_basket: callback_basket.to_string(),
            },
        }
    } else {
        wcall
    };

    let call_input = match updated_wcall {
        WCall::Simple { ref input, .. } => input,
        WCall::Chained { ref input, .. } => input,
    };

    if let None = prog_state
        .supported_wrapped_call_inputs
        .iter()
        .find(|entry| &entry.name == call_input)
    {
        msg!("MALLOC LOG: The w-call's inputs must be supported");
        return Err(ProgramError::InvalidInstructionData);
    }
    let _ = prog_state.wrapped_calls.push(WCallEntry {
        name: name.clone(),
        wcall: updated_wcall,
    });
    msg!("MALLOC LOG: registered call '{}'", name);
    Ok(())
}

fn process_new_supported_wrapped_call_input<'a>(
    prog_state: &mut ProgState,
    program_info: &'a AccountInfo<'a>,
    input_name: String,
    input_address: Pubkey,
) -> ProgramResult {
    if let None = prog_state
        .supported_wrapped_call_inputs
        .iter()
        .find(|entry| entry.name == input_name)
    {
        prog_state
            .supported_wrapped_call_inputs
            .push(WCallInputEntry {
                name: input_name.clone(),
                input: input_address,
            });
    } else {
        msg!("MALLOC LOG: This input has already been registered");
        return Err(ProgramError::InvalidInstructionData);
    }
    msg!("MALLOC LOG: registered new call input '{}'", input_name);
    Ok(())
}

fn process_enact_basket<'a>(
    prog_state: &mut ProgState,
    basket_name: String,
    remaining_accounts: &'a [AccountInfo<'a>],
    _start_idx: usize,
    token_program_id: &Pubkey,
    spl_account: AccountInfo<'a>,
    caller_account: AccountInfo<'a>,
    rent_amount: u64,
) -> EnactBasketResult {
    msg!("MALLOC LOG: ENACTING BASKET {}", basket_name);
    let basket = prog_state
        .baskets
        .iter()
        .find(|entry| basket_name == entry.name)
        .ok_or(ProgramError::Custom(144))?
        .basket
        .clone();

    let mut start_idx: usize = _start_idx;

    let malloc_input = &remaining_accounts[start_idx];
    start_idx += 1;
    let malloc_spl_account: spl_token::state::Account =
        Pack::unpack(malloc_input.data.borrow().as_ref())?;
    let mut amount_input = malloc_spl_account.amount;
    // Deal with unknown rent sizes for the account
    if let COption::Some(rent_res) = malloc_spl_account.is_native {
        msg!("Its a native token! rent res of {}", rent_res);
        amount_input -= rent_amount;
        amount_input += rent_res;
    }
    msg!("Amount input of {}", amount_input);
    let mut amount_remaining = amount_input;

    msg!(
        "Starting idx: {} remaining_accounts size: {}",
        start_idx,
        remaining_accounts.len()
    );
    let spl_ref = &spl_account;
    for i in 0..basket.calls.len() {
        let call_name = basket.calls[i].clone();
        let split_amount = basket.splits[i];

        // Handle fund approval
        // TODO: how to handle rounding errors, I.e. a small amount may be left
        // due to rounding errors after everything completes
        // TODO: overflows?
        let amount_approve = amount_input * split_amount / 1_000;
        if amount_remaining < amount_approve {
            msg!("MALLOC LOG: Overdrawing funds somehow!");
            return Err(ProgramError::InvalidInstructionData);
        }
        amount_remaining -= amount_approve;
        let split_account = remaining_accounts[start_idx + 1].to_owned();
        // The owner of the source must be present in the signer
        // TODO: invoke
        msg!("Approving {} for WCALL", amount_approve);
        let approve_inst = spl_token::instruction::approve(
            token_program_id,
            malloc_input.key,
            split_account.key,
            caller_account.key,
            &vec![malloc_input.key, caller_account.key],
            amount_approve,
        )
        .map_err(|e| ProgramError::Custom(10))?;
        msg!("Calling invoke to approve");
        let accounts_for_approve = &[
            spl_account.to_owned(),
            malloc_input.to_owned(),
            split_account,
            caller_account.to_owned(),
        ];
        invoke(&approve_inst, accounts_for_approve).map_err(|e| ProgramError::Custom(11))?;
        msg!("Approved is invoked");

        let wcall = prog_state
            .wrapped_calls
            .iter()
            .find(|entry| call_name == entry.name)
            .ok_or(ProgramError::InvalidInstructionData)?
            .wcall.clone();

        match wcall {
            WCall::Simple {
                wcall,
                associated_accounts: associated_accounts_pubkeys,
                ..
            } => {
                msg!(
                    "Starting idx: {} remaining_accounts size: {}",
                    start_idx,
                    remaining_accounts.len()
                );
                let (inp_accounts, idx_advance) =
                    crate::wcall_handlers::get_accounts_for_enact_basket_wcall(
                        remaining_accounts,
                        start_idx,
                        associated_accounts_pubkeys.len(),
                        malloc_input,
                        spl_account.to_owned(),
                    );
                start_idx += idx_advance;
                crate::wcall_handlers::enact_wcall(&wcall, &inp_accounts, amount_approve)?;
            }
            WCall::Chained {
                wcall,
                associated_accounts: associated_accounts_pubkeys,
                callback_basket,
                ..
            } => {
                // + 2 because 1 for exec account 1 for split account
                msg!(
                    "Starting idx: {} remaining_accounts size: {}",
                    start_idx,
                    remaining_accounts.len()
                );
                let (mut inp_accounts, idx_advance) =
                    crate::wcall_handlers::get_accounts_for_enact_basket_wcall(
                        remaining_accounts,
                        start_idx,
                        associated_accounts_pubkeys.len(),
                        malloc_input,
                        spl_account.to_owned(),
                    );
                start_idx += idx_advance;
                // Push the output account
                inp_accounts.push(remaining_accounts[start_idx].clone());
                crate::wcall_handlers::enact_wcall(&wcall, &inp_accounts, amount_approve)?;
                let new_start_idx = process_enact_basket(
                    prog_state,
                    callback_basket.to_owned(),
                    remaining_accounts,
                    start_idx,
                    token_program_id,
                    spl_account.to_owned(),
                    caller_account.to_owned(),
                    rent_amount,
                )?;
                // TODO: ??? no clue why tbh
                // Account for off by 1 created by double counting the output
                start_idx = new_start_idx - 1;
            }
        };
    }
    // invoke(&instruction, accounts)?;
    msg!("MALLOC LOG: enacted basket '{}'", basket_name);
    Ok(start_idx)
}

fn process_init_malloc<'a>(program_info: &'a AccountInfo<'a>) -> ProgramResult {
    if let Ok(_) = ProgState::unpack(&program_info.data.borrow()) {
        return Err(ProgramError::InvalidInstructionData);
    }
    let new_state = ProgState::new();
    ProgState::pack(&new_state, &mut program_info.data.borrow_mut())?;
    // msg!("MALLOC LOG: init malloc done: {:02X?}!", &program_info.data.borrow()[0..20]);
    ProgState::unpack(&program_info.data.borrow()).map_err(|e| {
        msg!("MALLOC LOG: post-init check failed: {}", e);
        e
    })?;
    
    Ok(())
}

fn process_create_basket<'a>(
    prog_state: &mut ProgState,
    program_info: &'a AccountInfo<'a>,
    name: String,
    calls: Vec<String>,
    splits: Vec<u64>,
    input: String,
) -> ProgramResult {
    // TODO: checking
    msg!("Creating malloc basket");
    let new_basket = Basket::new(calls, splits, Pubkey::default(), input);
    prog_state.baskets.push(BasketEntry {
        name: name.clone(),
        basket: new_basket,
    });
    msg!("MALLOC LOG: created new basket '{}'", name);
    Ok(())
}

/// Instruction processor
/// The first account is an account associated with the sender. The second account
/// is the account associated with the contract
// TODO: where does this second account come from? Maybe there has to be an init
// instruction which creates a new account with the _program_id as the owner? (Or maybe there is j one made on a frontend
// and thats j what is used)
pub fn process_instruction<'a>(
    _program_id: &Pubkey,
    accounts: &'a [AccountInfo<'a>],
    input: &[u8],
) -> ProgramResult {
    /* let account_info_iter = &mut accounts.iter();
    for (i, account) in account_info_iter.enumerate() {
        msg!(
            "account {}: pubkey={}, is_signer={}, is_writable={}",
            i,
            account.key,
            account.is_signer,
            account.is_writable,
        );
    }
    */
    let account_info_iter = &mut accounts.iter();
    let program_info = next_account_info(account_info_iter)?;

    let instruction = ProgInstruction::unpack(input)?;
    if let ProgInstruction::InitMalloc {} = instruction {
        //msg!("MALLOC LOG: InitMalloc");
        process_init_malloc(program_info)?;
        return Ok(());
    }

    let mut prog_state = ProgState::unpack(&program_info.data.borrow())?;

    let account_info = account_info_iter
        .next()
        .ok_or(ProgramError::NotEnoughAccountKeys)?;

    match instruction {
        ProgInstruction::RegisterCall {
            call_name: name,
            wcall_enum: wcall,
        } => {
            // TODO: this is an implementation for accessing memory picked up from https://github.com/solana-labs/solana-program-library/tree/master/memo
            // not sure if its right
            // let prog_data_ptr = (&program_info.data.borrow()).as_ref().as_ptr() as *mut u8;
            let associated_accounts = &accounts[2..];
            process_register_call(
                account_info.owner,
                &mut prog_state,
                program_info,
                name,
                wcall,
                associated_accounts.to_owned()
            )?
        }
        ProgInstruction::EnactBasket {
            basket_name,
            rent_given,
        } => {
            // from https://explorer.solana.com/address/TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA?cluster=devnet
            let spl_account: &'a AccountInfo<'a> = account_info_iter
                .next()
                .ok_or(ProgramError::NotEnoughAccountKeys)?;
            let spl_token_prog = Pubkey::new(&vec![
                6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206, 235, 121, 172, 28,
                180, 133, 237, 95, 91, 55, 145, 58, 140, 245, 133, 126, 255, 0, 169,
            ]);
            process_enact_basket(
                &mut prog_state,
                basket_name,
                &accounts[3..],
                0,
                &spl_token_prog,
                spl_account.to_owned(),
                account_info.to_owned(),
                rent_given,
            )?;
        }
        ProgInstruction::InitMalloc {} => (),
        ProgInstruction::CreateBasket {
            name,
            calls,
            splits,
            input,
        } => process_create_basket(&mut prog_state, program_info, name, calls, splits, input)?,
        ProgInstruction::NewSupportedWCallInput {
            input_name,
            input_address,
        } => process_new_supported_wrapped_call_input(
            &mut prog_state,
            program_info,
            input_name,
            input_address,
        )?,
    };
    ProgState::pack(&prog_state, &mut program_info.data.borrow_mut())?;
    Ok(())
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
