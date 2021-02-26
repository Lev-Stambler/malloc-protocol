#!/bin/bash
# Run from the root

solana airdrop 10
(cd program && cargo build-bpf)

#$(solana-test-validator -u d &) || "Already running"

echo "deploying $PWD/program/target/deploy/malloc.so" 
solana program deploy "$PWD/program/target/deploy/malloc.so" > src/config/program_id.json

yarn test-functional

solana logs | grep "MALLOC LOG: "
LOGGER=$?

