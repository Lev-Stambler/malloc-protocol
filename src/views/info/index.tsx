import React, { useEffect, useMemo } from "react";
import { Typography } from "antd"

const { Title, Paragraph, Text, Link } = Typography

export const InfoView = () => {

  return (
    <div className="flex flex-row justify-around px-8 my-8">
      <div className="flex flex-col">
        <Typography>
            <Title>Introduction to Malloc Protocol</Title>
            <Paragraph>
                Malloc Protocol, a portmaneau of "Money Allocation Protocol", is a way to, 
                given an allowance of an SPL token (referred to as an "input") automate 
                the process of partitioning it into "splits" according to percentages defined 
                by a "basket" and putting it to work in other DeFi protocols. It has two main components:
                <ul>
                    <li>The "Malloc Program", which routes each resulting split to its desination protocol via cross-program-invocations and stores basket and call data</li>
                    <li>A possibly large number of "Wrapped Calls" (often abbreaviated as just "Calls") which are solana programs that are called by Malloc with a split and do pretty much anything with that split - including sending it to another basket</li>
                </ul>
            </Paragraph>
            <Paragraph>
                Together, these two components effectively become a network of on-chain financial instruments, where the baskets can be thought of as "API endpoints for money"
                (If you're the kind of person who cares, it's turing complete and we've written a rough proof below just for funsies). This enables ndividuals to compose
                DeFi protocols ("legos") without writing any code. And since a Basket defines percentages, not ammounts, any amount of money can be programattically distributed 
                across an arbitrary and possibly-recursive network of lending protocols, swaps, stablecoin vaults, liquidity pools, prediction markets, no-loss loteries, or really anything DeFi!
                As just a start, here are some interesting use cases to consider, but it's anybody's guess what this is really capable of.
                <ul>
                    <li>piping your salary received from something like BitWage directly into your favorite DeFi strategies</li>
                    <li>social, tokenized DeFi strategies similar to TokenSets but for arbitrary composition of DeFi strategies</li>
                    <li>a fiat off-ramp that automatically sells of some precentage of your DeFi assets scattered across for living expenses</li>
                </ul>
            </Paragraph>
            <Title level={2}>App Usage</Title>
            <Paragraph>
                The Malloc Protocol Web UI, currently in a very rough, experimental state, allows the user to:
                <ul>
                    <li>Load a Malloc program state from a pubkey or initialize a new one</li>
                    <li>View/Create a basket using a graph-editor</li>
                    <li>Register a new call by giving it a program address and public keys for the accounts it expects (doesn't entirely work yet)</li>
                </ul>
            </Paragraph>
            <Title level={3}>Loading Program State</Title>
            <Paragraph>
                To load a Malloc Program state, open the sidebar using the arrow button at the bottom-left and click "Load Program State" button.
            </Paragraph>
            <Title level={3}>Creating/Editing Baskets</Title>
            <Paragraph>
                To create a new basket, open the sidebar using the arrow button at the bottom-left and click "Create Basket". This will open up the graph editor. 
                To open up an existing basket in the graph editor, open the siderbar, open the "My Baskets" drop-down menu, and click on your basket.
            </Paragraph>
            <Title level={4}>Graph Editor</Title>
            <Paragraph>
                Upon first opening the graph editor, all of the nodes will be on-top of each other (we haven't implemented smart-routing yet). You can click and drag to move them around. 
                You can also zoom in and out. To add a new call or basket, click the '+' button at the top-right, and select the corresponding option. Each will open a menu that allows you
                to search for an existing call/basket or open another menu that allows you to create a new one. pressing "Create Node" add the node to the UI. All Basket outputs must be 
                connected to a Call, and all call outputs (if it has one) must be connected to another basket. 
            </Paragraph>
        </Typography>
      </div>
    </div>
  );
};