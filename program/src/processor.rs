//! Program state processor
use crate::instruction::{
    Basket, BasketEntry, ProgInstruction, ProgState, WCall, WCallEntry, WCallInputEntry,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::invoke,
    program_error::ProgramError,
    program_option::COption,
    program_pack::Pack,
    pubkey::Pubkey,
};

const TOKEN_PROG_ID: &'static [u8; 32] = &[
    6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206, 235, 121, 172, 28, 180, 133, 237,
    95, 91, 55, 145, 58, 140, 245, 133, 126, 255, 0, 169,
];

type InvokeBasketResult = std::result::Result<usize, ProgramError>;

fn process_new_call<'a>(
    prog_state: &mut ProgState,
    name: &str,
    wcall: WCall,
    associated_accounts_infos: Vec<AccountInfo>,
) -> ProgramResult {
    if let Some(_) = prog_state
        .wrapped_calls
        .iter()
        .find(|entry| name == entry.name)
    {
        msg!("MALLOC LOG: WCall already exists");
        return Err(ProgramError::InvalidInstructionData);
    }
    msg!(
        "Got {:?} associated accounts through account infos",
        associated_accounts_infos.len()
    );
    // TODO: if it's not in there, do we want the user to allow for adding this?
    let updated_wcall = if associated_accounts_infos.len() > 0 {
        let associated_account_is_writable = associated_accounts_infos
            .iter()
            .map(|info| if info.is_writable { 1 } else { 0 })
            .collect();
        let associated_accounts = associated_accounts_infos
            .iter()
            .map(|info| *info.key)
            .collect();
        let associated_account_is_signer = associated_accounts_infos
            .iter()
            .map(|info| if info.is_signer { 1 } else { 0 })
            .collect();

        match wcall {
            WCall::Simple {
                wcall, ref input, ..
            } => WCall::Simple {
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
        .supported_inputs
        .iter()
        .find(|entry| &entry.name == call_input)
    {
        msg!("MALLOC LOG: The w-call's inputs must be supported");
        return Err(ProgramError::InvalidInstructionData);
    }
    let _ = prog_state.wrapped_calls.push(WCallEntry {
        name: name.to_string(),
        wcall: updated_wcall,
    });
    msg!("MALLOC LOG: registered call '{}'", name);
    Ok(())
}

fn process_new_call_input<'a>(
    prog_state: &mut ProgState,
    input_name: String,
    input_address: Pubkey,
) -> ProgramResult {
    if let None = prog_state
        .supported_inputs
        .iter()
        .find(|entry| entry.name == input_name)
    {
        prog_state.supported_inputs.push(WCallInputEntry {
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

fn get_approve_ammount<'a>(
    malloc_spl_account: &spl_token::state::Account,
    rent_amount: u64,
) -> u64 {
    let mut amount_input = malloc_spl_account.amount;
    // Deal with unknown rent sizes for the account
    if let COption::Some(rent_res) = malloc_spl_account.is_native {
        msg!("Its a native token! rent res of {}", rent_res);
        amount_input -= rent_amount;
        amount_input += rent_res;
    }
    msg!("Amount input of {}", amount_input);
    amount_input
}

fn invoke_basket_approve<'a>(
    amount: u64,
    token_program_id: &Pubkey,
    malloc_input_account: &AccountInfo<'a>,
    split_account: &AccountInfo<'a>,
    spl_account: &AccountInfo<'a>,
    caller_account: &AccountInfo<'a>,
) -> ProgramResult {
    // The owner of the source must be present in the signer
    msg!("Approving {} for WCALL", amount);
    let approve_insn = spl_token::instruction::approve(
        token_program_id,
        malloc_input_account.key,
        split_account.key,
        caller_account.key,
        &[malloc_input_account.key, caller_account.key],
        amount,
    )
    .map_err(|_| ProgramError::Custom(10))?;

    msg!("Calling invoke to approve");
    let accounts_for_approve = &[
        spl_account.to_owned(),
        malloc_input_account.to_owned(),
        split_account.to_owned(),
        caller_account.to_owned(),
    ];
    invoke(&approve_insn, accounts_for_approve).map_err(|e| {
        msg!("MALLOC LOG: failed to invoke: {}", e);
        ProgramError::Custom(11)
    })?;
    Ok(())
}

fn process_invoke_basket<'a>(
    prog_state: &ProgState,
    basket_name: String,
    remaining_accounts: &'a [AccountInfo<'a>],
    mut start_idx: usize,
    token_program_id: &Pubkey,
    spl_account: &AccountInfo<'a>,
    caller_account: &AccountInfo<'a>,
    rent_amount: u64,
) -> InvokeBasketResult {
    msg!("MALLOC LOG: INVOKING BASKET {}", basket_name);
    let basket = &prog_state
        .baskets
        .iter()
        .find(|entry| basket_name == entry.name)
        .ok_or(ProgramError::Custom(144))?
        .basket;

    let malloc_input_account = &remaining_accounts[start_idx];
    start_idx += 1;
    let malloc_spl_account: spl_token::state::Account =
        Pack::unpack(&malloc_input_account.try_borrow_data()?)?;

    let amount_input = get_approve_ammount(&malloc_spl_account, rent_amount);
    let mut amount_remaining = amount_input;

    msg!(
        "Starting idx: {} remaining_accounts size: {}",
        start_idx,
        remaining_accounts.len()
    );
    for i in 0..(&basket.calls).len() {
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

        let split_account = &remaining_accounts[start_idx + 1];

        invoke_basket_approve(
            amount_approve,
            token_program_id,
            malloc_input_account,
            split_account,
            spl_account,
            caller_account,
        )?;
        msg!("Approve invoked");

        let wcall = &prog_state
            .wrapped_calls
            .iter()
            .find(|entry| call_name == entry.name)
            .ok_or(ProgramError::InvalidInstructionData)?
            .wcall;

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
                    crate::wcall_handlers::get_accounts_for_wcall_invocation(
                        remaining_accounts,
                        start_idx,
                        associated_accounts_pubkeys.len(),
                        malloc_input_account,
                        spl_account,
                    );
                start_idx += idx_advance;
                crate::wcall_handlers::invoke_wcall(&wcall, &inp_accounts, amount_approve)?;
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
                    crate::wcall_handlers::get_accounts_for_wcall_invocation(
                        remaining_accounts,
                        start_idx,
                        associated_accounts_pubkeys.len(),
                        malloc_input_account,
                        spl_account,
                    );
                start_idx += idx_advance;
                // Push the output account
                inp_accounts.push(remaining_accounts[start_idx].clone());
                crate::wcall_handlers::invoke_wcall(&wcall, &inp_accounts, amount_approve)?;
                let recurse_ret = {
                    process_invoke_basket(
                        prog_state,
                        callback_basket.to_owned(),
                        remaining_accounts,
                        start_idx,
                        token_program_id,
                        spl_account,
                        caller_account,
                        rent_amount,
                    )
                };
                let new_start_idx = recurse_ret?;
                // TODO: ??? no clue why tbh
                // Account for off by 1 created by double counting the output
                start_idx = new_start_idx - 1;
            }
        };
    }
    // invoke(&instruction, accounts)?;
    msg!("MALLOC LOG: invoked basket '{}'", basket_name);
    Ok(start_idx)
}

fn process_init_malloc<'a>(program_info: &'a AccountInfo<'a>) -> Result<ProgState, ProgramError> {
    let current_contents = program_info.try_borrow_data()?;
    if let Ok(_) = ProgState::unpack(current_contents.as_ref()) {
        return Err(ProgramError::InvalidInstructionData);
    }
    let mut new_state = ProgState::new();
    new_state.nonce = 12;
    msg!("MALLOC LOG: init malloc done!");
    Ok(new_state)
}

fn process_create_basket<'a>(
    prog_state: &mut ProgState,
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
    let account_info_iter = &mut accounts.iter();
    let program_info = next_account_info(account_info_iter)?;

    let instruction = ProgInstruction::unpack(input)?;
    if let ProgInstruction::InitMalloc {} = instruction {
        //msg!("MALLOC LOG: InitMalloc");
        let prog_state = process_init_malloc(program_info)?;
        return prog_state.pack(&mut program_info.try_borrow_mut_data()?);
    }

    let mut prog_state = ProgState::unpack(&program_info.try_borrow_data()?.as_ref())?;

    let account_info = account_info_iter
        .next()
        .ok_or(ProgramError::NotEnoughAccountKeys)?;

    match instruction {
        ProgInstruction::NewCall {
            call_name: name,
            wcall_enum: wcall,
        } => {
            // not sure if its right
            let associated_accounts = &accounts[2..];
            process_new_call(
                &mut prog_state,
                &name,
                wcall,
                associated_accounts.to_owned(),
            )?;
            prog_state.pack(&mut program_info.try_borrow_mut_data()?)?;
        }
        ProgInstruction::InvokeBasket {
            basket_name,
            rent_given,
        } => {
            // from https://explorer.solana.com/address/TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA?cluster=devnet
            let spl_account: &'a AccountInfo<'a> = next_account_info(account_info_iter)?;
            let spl_token_prog = Pubkey::new(TOKEN_PROG_ID);
            let _ = process_invoke_basket(
                &mut prog_state,
                basket_name,
                &accounts[3..],
                0,
                &spl_token_prog,
                spl_account,
                account_info,
                rent_given,
            )?;
        }
        ProgInstruction::InitMalloc {} => {}
        ProgInstruction::CreateBasket {
            name,
            calls,
            splits,
            input,
        } => {
            process_create_basket(&mut prog_state, name, calls, splits, input)?;
            prog_state.pack(&mut program_info.try_borrow_mut_data()?)?;
        }
        ProgInstruction::NewCallInput {
            input_name,
            input_address,
        } => {
            process_new_call_input(&mut prog_state, input_name, input_address)?;
            prog_state.pack(&mut program_info.try_borrow_mut_data()?)?;
        }
    };
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_program::{
        account_info::IntoAccountInfo, program_error::ProgramError, pubkey::Pubkey,
    };
    use solana_sdk::account::Account;
}
