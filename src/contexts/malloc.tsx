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
import React, { useEffect, useMemo, useContext } from "react";
import { useConnectionConfig, sendTransaction } from "../contexts/connection";
import { useWallet, WalletAdapter } from "../contexts/wallet";
import {useAccountsContext} from "../contexts/accounts";
import {createTokenAccount, DEFAULT_TEMP_MEM_SPACE} from "../actions/account";
import {
  RegisterCallArgs,
  WCallTypes,
  BasketNode,
  WCallSimple,
  WCallChained,
  isWCallChained,
  isWCallSimple,
  WCallSimpleNode,
  WCallChainedNode,
  CreateBasketArgs,
  EnactBasketArgs,
  InitMallocArgs,
  Basket,
  SPLIT_SUM,
  MallocState,
  NewSupportedWCallInput,
} from "../models/malloc";
import { serializePubkey, trimBuffer } from "../utils/utils";
import { Malloc } from "./malloc-class";

const PROGRAM_STATE_ADDR = new PublicKey(
  require("../config/data_account.json").data_account_address
);
const PROGRAM_ID = new PublicKey(
  require("../config/program_id.json").programId
);
const REFRESH_INTERVAL = 1000;
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
    () => new Malloc(PROGRAM_STATE_ADDR, PROGRAM_ID, connection, wallet, accountsContext),
    [connection, wallet, accountsContext]
  );

  useEffect(() => {
    let timer = 0;

    const updateMalloc = async () => {
      await malloc.refresh();
      timer = window.setTimeout(() => updateMalloc, REFRESH_INTERVAL);
    };

    updateMalloc();

    return () => {
      window.clearTimeout(timer);
    };
  }, [malloc]);

  return (
    <MallocContext.Provider value={malloc}>{children}</MallocContext.Provider>
  );
}
