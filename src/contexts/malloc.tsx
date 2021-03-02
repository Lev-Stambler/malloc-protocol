import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
  Transaction,
  Account,
  Connection,
  AccountInfo,
} from "@solana/web3.js";
import React, { useEffect, useMemo, useContext, useState } from "react";
import { useConnectionConfig, sendTransaction } from "../contexts/connection";
import { useWallet, WalletAdapter } from "../contexts/wallet";
import {useAccountsContext} from "../contexts/accounts";
import { Malloc } from "./malloc-class";

const PROGRAM_STATE_ADDR = new PublicKey(
  require("../config/data_account.json").data_account_address
);
const PROGRAM_ID = new PublicKey(
  require("../config/program_id.json").programId
);
const REFRESH_INTERVAL = 30_000;
const MallocContext = React.createContext<Malloc | null>(null);

export const useMalloc = () => {
  const context = useContext(MallocContext);
  return context as Malloc;
};

export function MallocProvider({ children = null as any }) {
  const { endpoint } = useConnectionConfig();
  const { wallet } = useWallet();
  const accountsContext = useAccountsContext();
  const connection = useMemo(() => new Connection(endpoint, "recent"), [
    endpoint,
  ]);

  const malloc = useMemo(
    () => {
      console.log("memo")
      return new Malloc(PROGRAM_STATE_ADDR, PROGRAM_ID, connection, wallet, accountsContext)
    },
    [connection, wallet, accountsContext]
  );


  useEffect(() => {
    const updateMalloc = async () => {
      console.log("Refreshing malloc")
      await malloc.refresh();
    };
    const interval = window.setInterval(updateMalloc, REFRESH_INTERVAL)
    updateMalloc()
    return () => {
      window.clearInterval(interval);
    };
  }, [malloc]);

  return (
    <MallocContext.Provider value={malloc}>{children}</MallocContext.Provider>
  );
}
