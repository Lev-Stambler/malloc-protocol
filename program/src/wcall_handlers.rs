//! Solana Utility functions

use crate::instruction::{ProgState, WCall};
use solana_program::{program_error::ProgramError, entrypoint::ProgramResult, program_option::COption, pubkey::Pubkey};
use spl_token::instruction::{transfer, approve};

fn transfer_into_basket_approve_for_wcall(tok_id: &Pubkey, source_account: &Pubkey,
    malloc_prog: &Pubkey, wcall_addr: &Pubkey, amount: u64) -> ProgramResult {
  transfer(tok_id, source_account, malloc_prog, malloc_prog, &vec![malloc_prog], amount)?;
  approve(tok_id, malloc_prog, wcall_addr, malloc_prog, &vec![malloc_prog], amount)?;
  
  Ok(())
}

fn enact_wcall(prog_id: &Pubkey, wcall_caller: &Pubkey, prog_state: &ProgState, 
    wcall: WCall, amount: u64) -> ProgramResult {
    match wcall {
        WCall::Simple {
            wcall: wcall_addr,
            input
        } => {
          let tok_addr = prog_state.supported_wrapped_call_inputs.get(&input).
                ok_or(ProgramError::InvalidInstructionData)?;

          transfer_into_basket_approve_for_wcall(tok_addr, wcall_caller, prog_id, &wcall_addr,
              amount)?;
          // TODO: enact the wcall
        },
        WCall::Chained {
          wcall: wcall_addr,
          callback_basket,
          input,
          output
        } => {
          let tok_addr = prog_state.supported_wrapped_call_inputs.get(&input).
                ok_or(ProgramError::InvalidInstructionData)?;
          transfer_into_basket_approve_for_wcall(tok_addr, wcall_caller, prog_id, &wcall_addr,
              amount)?;
          // TODO: enact the wcall
          let out_tok_addr = prog_state.supported_wrapped_call_inputs.get(&input).
                ok_or(ProgramError::InvalidInstructionData)?;
          // TODO: get amount of out token to put back into chained basket
          // TODO: put back into basket
        }
    };
  Ok(())
}

