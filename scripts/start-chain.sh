#!/bin/bash
# Run from the root

cd program && cargo build-bpf
solana program deploy $PWD/program/target/deploy/spl_memo.so -u l

solana-test-validator&
VAL_NODE=$?

solana logs -u l
LOGGER=$?

cleanup() {
  pkill $VAL_NODE
}

trap cleanup EXIT

