import React, { useCallback } from "react";
import { useConnection } from "../../contexts/connection";
import { useWallet, WalletProvider } from "../../contexts/wallet";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { notify } from "../../utils/notifications";
import { ConnectButton } from "./../../components/ConnectButton";
import { LABELS } from "../../constants";
import { Button, Input } from "antd";
import { WCallTypes } from "../../models/malloc";
import { useMalloc } from "../../contexts/malloc";
import Grid from "antd/lib/card/Grid";

export const RegisterWCallView = () => {
  const malloc = useMalloc();
  const registerDummyWcall = useCallback(async () => {
    console.log("register dummy");
    const insts: TransactionInstruction[] = [];
    insts.push(malloc.registerCall({
      call_name: "Yo Mom",
      wcall: {
        Simple: {
          wcall: new PublicKey("66gbNEJwdTNqd7tqedB4z7DRMAeSHugthXMYvibyJ9DN"),
          input: "Wrapped Eth",
          associated_accounts: []
        }
      },
    }));
    await malloc.sendMallocTransaction(insts);
  }, [malloc]);

  return (
    <div className="flexColumn" style={{ flex: 1 }}>
      <div>
        <Button type="primary" onClick={registerDummyWcall}>
          Register a Dummy
        </Button>
      </div>
    </div>
  );
};
