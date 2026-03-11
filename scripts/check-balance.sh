#!/usr/bin/env bash
set -euo pipefail

# Load env vars
set -a
source "$(dirname "$0")/../.env.local"
set +a

RPC="https://forno.celo-sepolia.celo-testnet.org"
USDC="0x01C5C0122039549AD1493B8220cABEdD739BC44E"

# Derive address from private key
ADDRESS=$(cast wallet address "$DEPLOYER_PRIVATE_KEY")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Wallet:  $ADDRESS"
echo "  Network: Celo Sepolia (11142220)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# CELO (native, 18 decimals)
CELO_RAW=$(cast balance "$ADDRESS" --rpc-url "$RPC")
CELO=$(python3 -c "print(f'{int('$CELO_RAW') / 1e18:.4f}')")
echo "  CELO:    $CELO"

# USDC (6 decimals) — strip the [2eX] annotation cast appends
USDC_RAW=$(cast call "$USDC" "balanceOf(address)(uint256)" "$ADDRESS" --rpc-url "$RPC" | awk '{print $1}')
USDC_AMOUNT=$(python3 -c "print(f'{int('$USDC_RAW') / 1e6:.2f}')")
echo "  USDC:    $USDC_AMOUNT"

# TaskEscrow USDC balance
ESCROW="${NEXT_PUBLIC_TASK_ESCROW_ADDRESS:-}"
if [ -n "$ESCROW" ]; then
  ESCROW_RAW=$(cast call "$USDC" "balanceOf(address)(uint256)" "$ESCROW" --rpc-url "$RPC" | awk '{print $1}')
  ESCROW_AMOUNT=$(python3 -c "print(f'{int('$ESCROW_RAW') / 1e6:.2f}')")
  echo "  Escrow:  $ESCROW_AMOUNT USDC locked"
  echo "           $ESCROW"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
