"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getBrowserEscrow, getConnectedAddress } from "@/lib/wallet";

interface Task {
  description: string;
  shopName: string;
  destLat: number;
  destLng: number;
  amount: string;
}

const GPS_POLL_MS = 2 * 60 * 1000; // 2 minutes

export default function TransitPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const [withinRange, setWithinRange] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`/api/tasks/${id}`)
      .then((r) => r.json())
      .then((t) => { if (t.error) router.replace("/worker"); else setTask(t); })
      .catch(() => router.replace("/worker"));
  }, [id, router]);

  useEffect(() => {
    if (!task) return;

    async function checkGPS() {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const address = await getConnectedAddress();
        if (!address) return;

        const res = await fetch(`/api/tasks/${id}/delivery-gps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            workerAddress: address,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setDistanceM(data.distanceMetres);
          setWithinRange(true);
          setError("");
        } else {
          setDistanceM(data.error?.match(/(\d+)m/)?.[1] ? parseInt(data.error.match(/(\d+)m/)[1]) : null);
          setWithinRange(false);
        }
      }, () => {});
    }

    checkGPS();
    intervalRef.current = setInterval(checkGPS, GPS_POLL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [task, id]);

  async function confirmArrival() {
    setError("");
    setConfirming(true);
    try {
      const escrow = await getBrowserEscrow();
      const tx = await escrow.submitDeliveryGPS(Number(id));
      await tx.wait();
      router.push(`/worker/tasks/${id}/delivery`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setConfirming(false);
    }
  }

  if (!task) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 text-sm animate-pulse">Loading…</p>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto p-4 pb-32">
      <div className="flex items-center gap-3 py-4 mb-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-lg">←</button>
        <div>
          <h1 className="text-lg font-bold">In Transit</h1>
          <p className="text-xs text-gray-400">{task.description}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-900/40 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Status card */}
      <div className={`rounded-2xl p-6 mb-4 border text-center ${
        withinRange
          ? "bg-green-900/20 border-green-700"
          : "bg-gray-800 border-gray-700"
      }`}>
        <div className={`text-5xl mb-3 ${withinRange ? "" : "animate-pulse"}`}>
          {withinRange ? "📍" : "🚶"}
        </div>
        <p className={`text-2xl font-bold ${withinRange ? "text-green-400" : "text-white"}`}>
          {withinRange ? "You\'re here!" : distanceM != null ? `${distanceM}m away` : "Locating…"}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {withinRange ? "Within 50m of destination" : "GPS checks every 2 minutes"}
        </p>
      </div>

      <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
        <p className="text-xs text-gray-400 mb-1">Deliver to</p>
        <p className="text-sm font-medium">{task.description}</p>
        <p className="text-xs text-gray-500 mt-1 font-mono">
          {task.destLat.toFixed(5)}, {task.destLng.toFixed(5)}
        </p>
      </div>

      {/* Confirm button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-950/95 border-t border-gray-800">
        <div className="max-w-md mx-auto">
          <button
            onClick={confirmArrival}
            disabled={!withinRange || confirming}
            className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 font-semibold transition"
          >
            {confirming ? "Confirming on-chain…" : "I\'m at the Destination"}
          </button>
          {!withinRange && (
            <p className="text-xs text-gray-500 text-center mt-2">
              Must be within 50m of destination
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
