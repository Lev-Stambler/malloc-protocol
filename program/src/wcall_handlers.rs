//! Solana Utility functions

use crate::instruction::{ProgState, WCall};
use solana_program::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    instruction::{AccountMeta, Instruction},
    program::invoke,
    program::invoke_signed,
    program_error::ProgramError,
    program_option::COption,
    pubkey::Pubkey,
};

pub fn enact_wcall_simple(program_id: &Pubkey, inp_accounts: &[AccountInfo]) -> ProgramResult {
    // TODO: in the future we could pass data arround as well
    let data: Vec<u8> = Vec::new();
    // TODO: ?
    //let account_metas: Vec<AccountMeta> = Vec::new();
    let inact_inst = Instruction::new(
        program_id.to_owned(),
        &data,
        inp_accounts
            .iter()
            .map(|account| AccountMeta {
                pubkey: account.key.to_owned(),
                is_signer: account.is_signer,
                is_writable: account.is_writable,
            })
            .collect(),
    );
    /*
    let account_infos: Vec<AccountInfo> = vec![];
    solana_program::msg!("MALLOC LOG: calling {:?}", program_id);
    solana_program::msg!("MALLOC LOG: calling with {} number of accounts", inp_accounts.len());
    */
    solana_program::msg!(
        "MALLOC LOG: calling with {:?} {:?} {:?}",
        inp_accounts[0].key,
        inp_accounts[1].key,
        inp_accounts[2].key
    );
    invoke(&inact_inst, inp_accounts)?;
    Ok(())
}

pub fn enact_wcall_chained(
    program_id: &Pubkey,
    exec_account: AccountInfo,
    split_account: AccountInfo,
    associated_accounts: Vec<AccountInfo>,
    output_account: AccountInfo,
) -> ProgramResult {
    Ok(())
}
