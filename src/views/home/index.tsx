import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import React, { useEffect, useMemo } from "react";
import { useNativeAccount } from "../../contexts/accounts";
import { useConnectionConfig } from "../../contexts/connection";
import { useMarkets } from "../../contexts/market";
import { formatNumber } from "../../utils/utils";
import { useWallet } from "../../contexts/wallet";

export const HomeView = () => {
  const { marketEmitter, midPriceInUSD } = useMarkets();
  const { connected } = useWallet();
  const { tokenMap } = useConnectionConfig();
  const { account } = useNativeAccount();

  const balance = useMemo(
    () => formatNumber.format((account?.lamports || 0) / LAMPORTS_PER_SOL),
    [account]
  );

  useEffect(() => {
    const refreshTotal = () => {};

    const dispose = marketEmitter.onMarket(() => {
      refreshTotal();
    });

    refreshTotal();

    return () => {
      dispose();
    };
  }, [marketEmitter, midPriceInUSD, tokenMap]);

  // TODO: have a better way to tell if wallet is connected
  if (!connected) {
    return (
      <div className="flex flex-row justify-around">
        <div className="flex flex-col">
          <h2>Please connect a Solana wallet to continue.</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-row justify-around my-8 px-8">
      <div className="flex flex-col">
        <h2>Your balance: {balance} SOL</h2>
      </div>
    </div>
  );
};
