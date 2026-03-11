"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CELO_SEPOLIA_EXPLORER, TaskState } from "@/constants";

interface Task {
  id: number;
  description: string;
  shopName: string;
  amount: string;
  state: number;
  stateLabel: string;
  worker: string;
  deadline: number;
  createdAt: number;
  pickupCid: string | null;
}

const STATE_PILL: Record<number, { label: string; cls: string }> = {
  0: { label: "Created",         cls: "bg-gray-600/40 text-gray-300" },
  1: { label: "Accepted",        cls: "bg-yellow-600/30 text-yellow-300" },
  2: { label: "Pickup Verified", cls: "bg-blue-600/30 text-blue-300" },
  3: { label: "In Transit",      cls: "bg-orange-600/30 text-orange-300 animate-pulse" },
  4: { label: "Delivered",       cls: "bg-teal-600/30 text-teal-300" },
  5: { label: "Completed",       cls: "bg-green-600/30 text-green-300" },
  6: { label: "Disputed",        cls: "bg-red-600/30 text-red-300" },
};

function deadlineLabel(unix: number) {
  const secs = unix - Date.now() / 1000;
  if (secs < 0) return "Expired";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m left`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m left`;
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function fetchTasks() {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (Array.isArray(data)) {
        setTasks(data.sort((a: Task, b: Task) => b.id - a.id));
        setLastUpdated(new Date());
      }
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchTasks();
    const id = setInterval(fetchTasks, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="max-w-lg mx-auto p-4 pb-8">
      <div className="flex items-center justify-between py-4 mb-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-white text-lg">←</Link>
          <div>
            <h1 className="text-xl font-bold">Agent Dashboard</h1>
            {lastUpdated && (
              <p className="text-xs text-gray-500">
                Updated {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        <Link
          href="/agent"
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-xl font-medium transition"
        >
          + New Task
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">🤖</p>
          <p className="text-gray-400 text-sm mb-6">No tasks yet.</p>
          <Link
            href="/agent"
            className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-semibold transition"
          >
            Create First Task
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => {
            const pill = STATE_PILL[task.state] ?? STATE_PILL[0];
            const amountUSDC = (Number(task.amount) / 1_000_000).toFixed(2);
            return (
              <div key={task.id} className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug truncate">{task.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{task.shopName}</p>
                  </div>
                  <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${pill.cls}`}>
                    {pill.label}
                  </span>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                  <span className="text-green-400 font-semibold">{amountUSDC} USDC</span>
                  <span>·</span>
                  <span>{deadlineLabel(task.deadline)}</span>
                  {task.worker !== "0x0000000000000000000000000000000000000000" && (
                    <>
                      <span>·</span>
                      <span className="font-mono">
                        {task.worker.slice(0, 6)}…{task.worker.slice(-4)}
                      </span>
                    </>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-700 rounded-full h-1.5 mb-3">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, (task.state / 5) * 100)}%` }}
                  />
                </div>

                {/* Links */}
                <div className="flex items-center gap-3 text-xs">
                  <a
                    href={`${CELO_SEPOLIA_EXPLORER}/address/0xc361290c3A84b9F3F2C44683D908Ca5172EB9031`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-gray-300 transition"
                  >
                    CeloScan ↗
                  </a>
                  {task.pickupCid && (
                    <>
                      <span className="text-gray-700">·</span>
                      <a
                        href={`https://ipfs.io/ipfs/${task.pickupCid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition"
                      >
                        IPFS Proof ↗
                      </a>
                    </>
                  )}
                  {task.state === TaskState.COMPLETED && (
                    <>
                      <span className="text-gray-700">·</span>
                      <span className="text-green-400">✓ Paid out</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
