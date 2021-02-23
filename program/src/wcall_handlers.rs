//! Solana Utility functions

use crate::instruction::{ProgState, WCall};
use solana_program::{
    entrypoint::ProgramResult, program::invoke_signed, program_error::ProgramError,
    program_option::COption, pubkey::Pubkey,
    account_info::AccountInfo,
    instruction::{AccountMeta, Instruction},
    program::invoke
};

pub fn enact_wcall_simple(
  program_id: &Pubkey,
  inp_accounts: &[AccountInfo]
) -> ProgramResult {
    // TODO: in the future we could pass data arround as well
    let data: Vec<u8> = Vec::new();
    // TODO: ?
    let account_metas: Vec<AccountMeta> = Vec::new();
    let inact_inst = Instruction::new(program_id.to_owned(), &data, account_metas);
    let account_infos: Vec<AccountInfo> = vec![];
    invoke(&inact_inst, &inp_accounts);

    Ok(())
}

pub fn enact_wcall_chained(
  program_id: &Pubkey,
  exec_account: AccountInfo,
  split_account: AccountInfo,
  associated_accounts: Vec<AccountInfo>,
  output_account: AccountInfo
) -> ProgramResult {
    Ok(())
}

