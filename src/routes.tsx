import { HashRouter, Route, Switch } from "react-router-dom";
import React from "react";
import { WalletProvider } from "./contexts/wallet";
import { ConnectionProvider } from "./contexts/connection";
import { AccountsProvider } from "./contexts/accounts";
import { MarketProvider } from "./contexts/market";
import { MallocProvider } from "./contexts/malloc";
import { AppLayout } from "./components/Layout";

import { FaucetView, HomeView, RegisterWCallView, CallGraphView } from "./views";

export function Routes() {
  return (
    <>
      <HashRouter basename={"/"}>
        <ConnectionProvider>
          <WalletProvider>
            <AccountsProvider>
              <MallocProvider>
                <MarketProvider>
                  <AppLayout>
                    <Switch>
                      <Route exact path="/" component={() => <HomeView />} />
                      <Route exact path="/faucet" children={<FaucetView />} />
                      <Route exact path="/graph/:topLevelBasketId" children={<CallGraphView />} />
                      <Route exact path="/register-wcall" children={<RegisterWCallView />} />
                    </Switch>
                  </AppLayout>
                </MarketProvider>
              </MallocProvider>
            </AccountsProvider>
          </WalletProvider>
        </ConnectionProvider>
      </HashRouter>
    </>
  );
}
