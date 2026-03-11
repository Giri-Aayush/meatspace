"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getConnectedAddress, getUSDCBalance } from "@/lib/wallet";

export default function ProfilePage() {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState("0.00");
  const [verified, setVerified] = useState(false);
  const [tasksDone, setTasksDone] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setVerified(localStorage.getItem("workerVerified") === "true");
    }
    getConnectedAddress().then(async (addr) => {
      if (!addr) return;
      setAddress(addr);
      const bal = await getUSDCBalance(addr);
      setBalance(bal);
    });
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((tasks) => {
        if (!Array.isArray(tasks)) return;
        getConnectedAddress().then((addr) => {
          if (!addr) return;
          const done = tasks.filter(
            (t) => t.worker?.toLowerCase() === addr.toLowerCase() && t.state === 5
          ).length;
          setTasksDone(done);
        });
      })
      .catch(() => {});
  }, []);

  return (
    <main className="max-w-md mx-auto p-4">
      <div className="flex items-center gap-3 py-4 mb-4">
        <Link href="/worker" className="text-gray-400 hover:text-white text-lg">←</Link>
        <h1 className="text-xl font-bold">Profile</h1>
      </div>

      <div className="bg-gray-800 rounded-2xl p-5 mb-4 border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-green-600/30 flex items-center justify-center text-2xl">
            👷
          </div>
          <div>
            <p className="font-semibold">Worker</p>
            <p className="text-xs text-gray-400 font-mono">
              {address ? `${address.slice(0, 10)}…${address.slice(-6)}` : "Not connected"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-700/50 rounded-xl p-3">
            <p className="text-xs text-gray-400">USDC Balance</p>
            <p className="text-xl font-bold text-green-400">{balance}</p>
          </div>
          <div className="bg-gray-700/50 rounded-xl p-3">
            <p className="text-xs text-gray-400">Tasks Done</p>
            <p className="text-xl font-bold">{tasksDone}</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
        <h2 className="font-semibold mb-3">Verification</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{verified ? "✅" : "⏳"}</span>
            <div>
              <p className="text-sm font-medium">Self Protocol</p>
              <p className="text-xs text-gray-400">ZK passport proof</p>
            </div>
          </div>
          {!verified && (
            <Link
              href="/worker/onboarding"
              className="text-xs bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded-lg transition"
            >
              Verify
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
