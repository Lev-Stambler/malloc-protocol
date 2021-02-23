//! Solana Utility functions

use crate::instruction::{ProgState, WCall};
use solana_program::{
    entrypoint::ProgramResult, program::invoke_signed, program_error::ProgramError,
    program_option::COption, pubkey::Pubkey,
};
use spl_token::instruction::{approve, transfer};

fn transfer_into_basket_approve_for_wcall(
    tok_id: &Pubkey,
    source_account: &Pubkey,
    malloc_prog: &Pubkey,
    wcall_addr: &Pubkey,
    amount: u64,
) -> ProgramResult {
    let malloc_token_account = &Pubkey::create_program_address(&[b"malloc"], malloc_prog)?;
    let wcall_token_account = &Pubkey::create_program_address(&[b"wcall"], wcall_addr)?;
    let insn = transfer(
        tok_id,
        source_account,
        malloc_token_account,
        malloc_token_account,
        &vec![malloc_token_account],
        amount,
    )?;

    invoke_signed(&insn, &[], &[&[b"malloc_token_account"]])?;

    let insn = approve(
        tok_id,
        malloc_token_account,
        wcall_token_account,
        malloc_token_account,
        &vec![malloc_token_account],
        amount,
    )?;
    invoke_signed(&insn, &[], &[&[b"malloc_token_account"]])?;

    Ok(())
}

fn enact_wcall(
    prog_id: &Pubkey,
    wcall_caller: &Pubkey,
    prog_state: &ProgState,
    wcall: WCall,
    amount: u64,
) -> ProgramResult {
    match wcall {
        WCall::Simple {
            wcall: wcall_addr,
            input,
            associated_accounts,
        } => {
            let tok_addr = prog_state
                .supported_wrapped_call_inputs
                .get(&input)
                .ok_or(ProgramError::InvalidInstructionData)?;

            transfer_into_basket_approve_for_wcall(
                tok_addr,
                wcall_caller,
                prog_id,
                &wcall_addr,
                amount,
            )?;
            // TODO: enact the wcall
        }
        WCall::Chained {
            wcall: wcall_addr,
            callback_basket,
            input,
            output,
            associated_accounts
        } => {
            let tok_addr = prog_state
                .supported_wrapped_call_inputs
                .get(&input)
                .ok_or(ProgramError::InvalidInstructionData)?;
            transfer_into_basket_approve_for_wcall(
                tok_addr,
                wcall_caller,
                prog_id,
                &wcall_addr,
                amount,
            )?;
            // TODO: enact the wcall
            let out_tok_addr = prog_state
                .supported_wrapped_call_inputs
                .get(&input)
                .ok_or(ProgramError::InvalidInstructionData)?;
            // TODO: get amount of out token to put back into chained basket
            // TODO: put back into basket
        }
    };
    Ok(())
}
