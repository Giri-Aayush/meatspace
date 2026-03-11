// Browser-side ethers helpers — only import from "use client" components

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum?: any;
  }
}

import { ethers } from "ethers";
import {
  TASK_ESCROW_ADDRESS,
  TASK_ESCROW_ABI,
  USDC_ADDRESS,
  USDC_ABI,
  CELO_SEPOLIA_CHAIN_ID,
} from "@/constants";

export async function getBrowserSigner() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet found. Open in MetaMask or a Web3 browser.");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== CELO_SEPOLIA_CHAIN_ID) {
    throw new Error(
      `Wrong network. Switch to Celo Sepolia (chain ID ${CELO_SEPOLIA_CHAIN_ID}).`
    );
  }
  return provider.getSigner();
}

export async function getConnectedAddress(): Promise<string | null> {
  try {
    if (typeof window === "undefined" || !window.ethereum) return null;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.listAccounts();
    return accounts[0]?.address ?? null;
  } catch {
    return null;
  }
}

export async function getBrowserEscrow() {
  const signer = await getBrowserSigner();
  return new ethers.Contract(TASK_ESCROW_ADDRESS, TASK_ESCROW_ABI, signer);
}

export async function getUSDCBalance(address: string): Promise<string> {
  try {
    if (typeof window === "undefined" || !window.ethereum) return "0.00";
    const provider = new ethers.BrowserProvider(window.ethereum);
    const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
    const balance = await usdc.balanceOf(address);
    return (Number(balance) / 1_000_000).toFixed(2);
  } catch {
    return "0.00";
  }
}
