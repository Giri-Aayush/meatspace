import { ethers } from "ethers";
import { TASK_ESCROW_ADDRESS, TASK_ESCROW_ABI, USDC_ADDRESS, USDC_ABI } from "@/constants";

const RPC = "https://forno.celo-sepolia.celo-testnet.org";

function getProvider() {
  return new ethers.JsonRpcProvider(RPC);
}

function getSigner() {
  const provider = getProvider();
  return new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
}

export function getTaskEscrow() {
  return new ethers.Contract(TASK_ESCROW_ADDRESS, TASK_ESCROW_ABI, getSigner());
}

export function getUSDC() {
  return new ethers.Contract(USDC_ADDRESS, USDC_ABI, getSigner());
}

// Ensure the server wallet has approved enough USDC for the escrow contract.
export async function ensureUSDCApproval(amountWei: bigint) {
  const signer = getSigner();
  const usdc = getUSDC();
  const allowance: bigint = await usdc.allowance(signer.address, TASK_ESCROW_ADDRESS);
  if (allowance < amountWei) {
    const tx = await usdc.approve(TASK_ESCROW_ADDRESS, ethers.MaxUint256);
    await tx.wait();
  }
}

// Parse taskId from TaskCreated event log.
export function parseTaskCreatedId(
  receipt: ethers.TransactionReceipt,
  contract: ethers.Contract
): number {
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === "TaskCreated") {
        return Number(parsed.args.taskId);
      }
    } catch {
      // not this contract's log
    }
  }
  throw new Error("TaskCreated event not found in receipt");
}
