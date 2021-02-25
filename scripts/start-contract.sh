#!/bin/bash
# Run from the root

solana airdrop 10
(cd program && cargo build-bpf)

#$(solana-test-validator -u d &> /dev/null &) || "Already running"

echo "deploying $PWD/program/target/deploy/malloc.so" 
solana program deploy "$PWD/program/target/deploy/malloc.so" -u d > src/config/program_id.json


solana logs -u d | grep "MALLOC LOG: "
LOGGER=$?

