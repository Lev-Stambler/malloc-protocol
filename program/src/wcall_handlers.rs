use byteorder::{BigEndian, WriteBytesExt};
use solana_program::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    instruction::{AccountMeta, Instruction},
    msg,
    program::invoke,
    pubkey::Pubkey,
};

/// @res the 0th account is the wcall_exec account, 1st for malloc input, 2nd for spl_prog, the
/// rest for associated_accounts
pub fn get_accounts_for_wcall_invocation<'a>(
    accounts_remaining: &[AccountInfo<'a>],
    start_idx: usize,
    numb_associated_accounts: usize,
    malloc_input: &AccountInfo<'a>,
    spl_prog: &AccountInfo<'a>,
) -> (Vec<AccountInfo<'a>>, usize) {
    // TODO: check to ensure associated_accounts_pubkeys is correct
    //
    // + 2 because 1 for exec account 1 for split account
    let mut inp_accounts =
        (accounts_remaining[start_idx..(numb_associated_accounts + start_idx + 2)]).to_vec();
    // Add the malloc input account to after the exec account
    inp_accounts.insert(1, malloc_input.to_owned());
    inp_accounts.insert(2, spl_prog.to_owned());
    (inp_accounts, (numb_associated_accounts + 2))
}

pub fn invoke_wcall(
    program_id: &Pubkey,
    inp_accounts: &[AccountInfo],
    amount: u64,
) -> ProgramResult {
    // TODO: in the future we could pass data arround as well
    // TODO: ?
    //let account_metas: Vec<AccountMeta> = Vec::new();
    let mut data: Vec<u8> = vec![];
    msg!("Ammount approve of {}", amount);
    data.write_u64::<BigEndian>(amount).unwrap();
    msg!("Ammount approve of {:?}", data);

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
    invoke(&inact_inst, inp_accounts)?;
    Ok(())
}
