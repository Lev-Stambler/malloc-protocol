"use strict";
exports.__esModule = true;
//@ts-ignore
var solana_web3 = require("@solana/web3.js");
var progId = "25wixzoUEfkg5hQTUU9PBZJRJHF2duxZtxMDPkwAsksr";
//@ts-ignore
function initMalloc(connection, account) {
    // const instructionInit = new solana_web3.TransactionInstruction({
    //   keys: [],
    //   programId: new solana_web3.PublicKey(progId),
    //   data: Buffer.from(JSON.stringify({})),
    // });
    var data_account = new solana_web3.Account();
    console.log("new data account:", data_account.publicKey.toBase58());
    var createAccountTransaction = solana_web3.SystemProgram.createAccount({
        fromPubkey: account.publicKey,
        newAccountPubkey: data_account.publicKey,
        lamports: 10000,
        space: 1024,
        programId: new solana_web3.PublicKey(progId)
    });
    solana_web3
        .sendAndConfirmTransaction(connection, new solana_web3.Transaction().add(createAccountTransaction), [account, data_account], {
        skipPreflight: true,
        commitment: "singleGossip"
    })
        .then(function () {
        console.log("done");
    })["catch"](function (e) {
        console.log("error", e);
    });
}
function main() {
    var connection = new solana_web3.Connection("http://127.0.0.1:8899", 
    // "https://devnet.solana.com",
    "singleGossip");
    var account = new solana_web3.Account();
    // export type CreateAccountParams = {
    //   fromPubkey: PublicKey;
    //   newAccountPubkey: PublicKey;
    //   lamports: number;
    //   space: number;
    //   programId: PublicKey;
    // };
    var lamports = 10 * 1000000000;
    connection.requestAirdrop(account.publicKey, lamports).then(function () {
        console.log("airdrop done");
        initMalloc(connection, account);
    });
}
main();
