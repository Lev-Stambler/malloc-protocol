#!/bin/bash
# Run from the root

(cd program && cargo build-bpf)

$(solana-test-validator &>/dev/null &) || "Already running"
sleep 2

echo "$PWD/program/target/deploy/malloc.so" 
solana program deploy "$PWD/program/target/deploy/malloc.so" -u d > src/config/program_id.json


solana logs -u d | grep "MALLOC LOG: "
LOGGER=$?

