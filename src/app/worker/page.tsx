"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getConnectedAddress, getBrowserEscrow } from "@/lib/wallet";
import { haversineMetres } from "@/lib/haversine";
import { TaskState, TASK_STATE_LABELS } from "@/constants";

interface Task {
  id: number;
  description: string;
  shopName: string;
  shopLat: number;
  shopLng: number;
  amount: string;
  state: number;
  stateLabel: string;
  worker: string;
  deadline: number;
}

export default function WorkerFeedPage() {
  const router = useRouter();
  const [address, setAddress] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLng, setMyLng] = useState<number | null>(null);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("workerVerified")) {
      router.replace("/worker/onboarding");
      return;
    }
    getConnectedAddress().then(setAddress);
    navigator.geolocation?.getCurrentPosition(
      (pos) => { setMyLat(pos.coords.latitude); setMyLng(pos.coords.longitude); },
      () => {}
    );
    fetchTasks();
  }, [router]);

  async function fetchTasks() {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  async function connectWallet() {
    try {
      const signer = await (await import("@/lib/wallet")).getBrowserSigner();
      const addr = await signer.getAddress();
      setAddress(addr);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect wallet");
    }
  }

  async function acceptTask(taskId: number) {
    setError("");
    setAccepting(taskId);
    try {
      const escrow = await getBrowserEscrow();
      const tx = await escrow.acceptTask(taskId);
      await tx.wait();
      router.push(`/worker/tasks/${taskId}/pickup`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to accept task");
    } finally {
      setAccepting(null);
    }
  }

  const openTasks = tasks.filter((t) => t.state === TaskState.CREATED);
  const myTasks = tasks.filter(
    (t) => address && t.worker.toLowerCase() === address.toLowerCase() &&
    t.state > TaskState.CREATED && t.state < TaskState.COMPLETED
  );

  function distLabel(task: Task) {
    if (myLat == null || myLng == null) return null;
    const m = haversineMetres(myLat, myLng, task.shopLat, task.shopLng);
    return m < 1000 ? `${Math.round(m)}m away` : `${(m / 1000).toFixed(1)}km away`;
  }

  function deadlineLabel(unix: number) {
    const mins = Math.round((unix - Date.now() / 1000) / 60);
    if (mins < 0) return "Expired";
    if (mins < 60) return `${mins}m left`;
    return `${Math.floor(mins / 60)}h left`;
  }

  return (
    <main className="max-w-md mx-auto p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between py-4 mb-2">
        <h1 className="text-xl font-bold">Tasks</h1>
        <Link href="/worker/profile" className="text-sm text-gray-400 hover:text-white">
          {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Profile"}
        </Link>
      </div>

      {!address && (
        <button
          onClick={connectWallet}
          className="w-full mb-4 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-semibold transition"
        >
          Connect Wallet
        </button>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-900/40 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* My active tasks */}
      {myTasks.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs uppercase text-gray-500 font-semibold mb-2 tracking-wider">In Progress</h2>
          <div className="flex flex-col gap-2">
            {myTasks.map((task) => (
              <Link
                key={task.id}
                href={`/worker/tasks/${task.id}`}
                className="bg-gray-800 rounded-2xl p-4 block hover:bg-gray-750 transition border border-gray-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{task.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{task.shopName}</p>
                  </div>
                  <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full whitespace-nowrap">
                    {task.stateLabel}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Open tasks */}
      <section>
        <h2 className="text-xs uppercase text-gray-500 font-semibold mb-2 tracking-wider">Available Tasks</h2>
        {loading && <p className="text-gray-500 text-sm py-8 text-center">Loading…</p>}
        {!loading && openTasks.length === 0 && (
          <p className="text-gray-500 text-sm py-8 text-center">No open tasks right now.</p>
        )}
        <div className="flex flex-col gap-3">
          {openTasks.map((task) => (
            <div key={task.id} className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="font-medium text-sm leading-snug">{task.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{task.shopName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-green-400 font-semibold text-sm">
                    {(Number(task.amount) / 1_000_000).toFixed(2)} USDC
                  </p>
                  <p className="text-xs text-gray-500">{deadlineLabel(task.deadline)}</p>
                </div>
              </div>
              {distLabel(task) && (
                <p className="text-xs text-gray-500 mb-3">📍 {distLabel(task)}</p>
              )}
              <button
                onClick={() => acceptTask(task.id)}
                disabled={!address || accepting === task.id}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 font-semibold text-sm transition"
              >
                {accepting === task.id ? "Accepting…" : !address ? "Connect wallet first" : "Accept Task"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
