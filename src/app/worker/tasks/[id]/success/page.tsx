"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { CELO_SEPOLIA_EXPLORER } from "@/constants";

function SuccessContent() {
  const params = useSearchParams();
  const txHash = params.get("txHash");
  const payout = params.get("payout");

  return (
    <main className="max-w-md mx-auto p-4 flex flex-col items-center justify-center min-h-screen gap-6">
      <div className="text-7xl">🎉</div>
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Delivery Complete!</h1>
        <p className="text-gray-400 text-sm">
          Payment released to your wallet.
        </p>
      </div>

      {payout && (
        <div className="bg-green-900/20 border border-green-700 rounded-2xl p-6 text-center w-full">
          <p className="text-sm text-green-400 mb-1">You earned</p>
          <p className="text-4xl font-bold text-green-400">{Number(payout).toFixed(4)}</p>
          <p className="text-sm text-green-400">USDC</p>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full">
        {txHash && (
          <a
            href={`${CELO_SEPOLIA_EXPLORER}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-xl border border-gray-600 hover:border-gray-400 text-center text-sm transition"
          >
            View on CeloScan ↗
          </a>
        )}
        <Link
          href="/worker"
          className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 text-center font-semibold transition"
        >
          Back to Tasks
        </Link>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 text-sm animate-pulse">Loading…</p>
      </main>
    }>
      <SuccessContent />
    </Suspense>
  );
}
