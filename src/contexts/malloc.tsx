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
import { useAccountsContext } from "../contexts/accounts";
import { Malloc } from "./malloc-class";
import { PROGRAM_IDS } from "../utils/ids";
import { MallocState } from "../models/malloc";

const PROGRAM_STATE_ADDR = new PublicKey(
  require("../config/data_account.json").data_account_address
);
const PROGRAM_ID = new PublicKey(
  require("../config/program_id.json").programId
);
const REFRESH_INTERVAL = 30_000;
const MallocContext = React.createContext<Malloc>(
  new Malloc(
    PROGRAM_STATE_ADDR,
    PROGRAM_ID,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    true
  )
);

export const useMalloc = () => {
  const malloc = useContext(MallocContext);
  return malloc as Malloc;
};

export function MallocProvider({ children = null as any }) {
  const { endpoint } = useConnectionConfig();
  const { wallet  } = useWallet();
  const accountsContext = useAccountsContext();
  const connection = useMemo(() => new Connection(endpoint, "recent"), [
    endpoint,
  ]);
  const [mallocState, setMallocState] = useState<MallocState | undefined>(undefined);

  const malloc = useMemo(() => {
    console.log("memo, changing malloc");
    return new Malloc(
      PROGRAM_STATE_ADDR,
      PROGRAM_ID,
      connection,
      wallet,
      accountsContext,
      setMallocState,
      mallocState || undefined
    );
  }, [connection, wallet, accountsContext, mallocState]);

  const updateMalloc = async () => {
    await malloc.refresh();
  };

  useEffect(() => {
    const interval = window.setInterval(updateMalloc, REFRESH_INTERVAL);
    updateMalloc();
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return (
    <MallocContext.Provider value={malloc}>{children}</MallocContext.Provider>
  );
}
