"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getBrowserEscrow } from "@/lib/wallet";
import { TASK_ESCROW_ABI, TASK_ESCROW_ADDRESS } from "@/constants";
import { ethers } from "ethers";

export default function DeliveryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function confirmDelivery() {
    if (otp.length !== 6) { setError("Enter the 6-digit OTP from the recipient"); return; }
    setError("");
    setSubmitting(true);
    try {
      const escrow = await getBrowserEscrow();
      const tx = await escrow.confirmDelivery(Number(id), otp);
      const receipt = await tx.wait();

      // Parse payout from TaskCompleted event
      let payoutUSDC = "0";
      const iface = new ethers.Interface(TASK_ESCROW_ABI);
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "TaskCompleted") {
            payoutUSDC = (Number(parsed.args.payout) / 1_000_000).toFixed(6);
          }
        } catch { /* skip */ }
      }

      router.push(`/worker/tasks/${id}/success?txHash=${receipt.hash}&payout=${payoutUSDC}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      if (msg.includes("Invalid OTP")) {
        setError("Wrong OTP — ask the recipient to read it again.");
      } else if (msg.includes("user rejected")) {
        setError("Transaction rejected.");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-4">
      <div className="flex items-center gap-3 py-4 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-lg">←</button>
        <h1 className="text-lg font-bold">Confirm Delivery</h1>
      </div>

      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🤝</div>
        <p className="text-gray-300 text-sm">
          Ask the recipient for the 6-digit OTP they received.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-900/40 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="bg-gray-800 rounded-2xl p-5 mb-6 border border-gray-700">
        <label className="block text-xs text-gray-400 mb-2">One-Time Password</label>
        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          className="w-full bg-gray-700 rounded-xl px-4 py-4 text-3xl font-bold tracking-[0.5em] text-center outline-none focus:ring-2 focus:ring-green-500 text-white placeholder-gray-600"
        />
      </div>

      <button
        onClick={confirmDelivery}
        disabled={otp.length !== 6 || submitting}
        className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 font-semibold transition"
      >
        {submitting ? "Confirming on-chain…" : "Confirm & Release Payment"}
      </button>
      <p className="text-xs text-gray-500 text-center mt-3">
        This releases your USDC payout from escrow.
      </p>
    </main>
  );
}
