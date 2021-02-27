import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Button, Col, Row } from "antd";
import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ConnectButton } from "../../components/ConnectButton";
import { useNativeAccount } from "../../contexts/accounts";
import { useConnectionConfig } from "../../contexts/connection";
import { useMarkets } from "../../contexts/market";
import { formatNumber } from "../../utils/utils";

export const HomeView = () => {
  const { marketEmitter, midPriceInUSD } = useMarkets();
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
  if (balance === '--') {
    return (
      <Row gutter={[16, 16]} align="middle">
        <Col span={24}>
          <h2>Please connect a solana wallet</h2>
        </Col>

        <Col span={12}>
          <ConnectButton />
        </Col>
      </Row>
    );
  }

  return (
    <Row gutter={[16, 16]} align="middle">
      <Col span={24}>
        <h2>Your balance: {balance} SOL</h2>
      </Col>

      <Col span={12}>
        <ConnectButton />
      </Col>
    </Row>
  );
};
