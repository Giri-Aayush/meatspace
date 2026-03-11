"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getBrowserEscrow, getConnectedAddress } from "@/lib/wallet";

interface Task {
  id: number;
  description: string;
  shopName: string;
  itemList: string[];
  amount: string;
}

export default function PickupPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/tasks/${id}`)
      .then((r) => r.json())
      .then((t) => {
        setTask(t);
        setChecked(new Array(t.itemList?.length ?? 0).fill(false));
      })
      .catch(() => router.replace("/worker"));
  }, [id, router]);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Capture GPS at the exact moment of photo selection
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => setError("Could not get GPS. Please enable location access.")
    );

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URL prefix to get raw base64
      const base64 = result.split(",")[1];
      setPhotoBase64(base64);
      setPhotoPreview(result);
    };
    reader.readAsDataURL(file);
  }

  async function submit() {
    if (!lat || !lng) {
      setError("GPS not available. Enable location and try again.");
      return;
    }
    if (!photoBase64) {
      setError("Please take a photo first.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const address = await getConnectedAddress();
      if (!address) throw new Error("Wallet not connected");

      // 1. Server validates GPS + uploads to IPFS
      const res = await fetch(`/api/tasks/${id}/pickup-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, photoBase64, workerAddress: address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Validation failed");

      // 2. Worker wallet calls the contract
      const escrow = await getBrowserEscrow();
      const tx = await escrow.submitPickupProof(Number(id), data.ipfsCid);
      await tx.wait();

      router.push(`/worker/tasks/${id}/transit`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!task) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 text-sm animate-pulse">Loading…</p>
      </main>
    );
  }

  const allChecked = checked.every(Boolean);

  return (
    <main className="max-w-md mx-auto p-4 pb-32">
      <div className="flex items-center gap-3 py-4 mb-2">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-lg">←</button>
        <div>
          <h1 className="text-lg font-bold">Pickup Proof</h1>
          <p className="text-xs text-gray-400">{task.shopName}</p>
        </div>
        <span className="ml-auto text-green-400 font-semibold text-sm">
          {(Number(task.amount) / 1_000_000).toFixed(2)} USDC
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-900/40 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Item checklist */}
      <section className="bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-700">
        <h2 className="text-sm font-semibold mb-3 text-gray-300">Items to collect</h2>
        <div className="flex flex-col gap-2">
          {task.itemList.map((item, i) => (
            <label key={i} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checked[i] ?? false}
                onChange={() => {
                  const next = [...checked];
                  next[i] = !next[i];
                  setChecked(next);
                }}
                className="w-5 h-5 rounded accent-green-500"
              />
              <span className={`text-sm ${checked[i] ? "line-through text-gray-500" : ""}`}>{item}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Photo capture */}
      <section className="bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-700">
        <h2 className="text-sm font-semibold mb-3 text-gray-300">Photo proof</h2>
        {photoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoPreview}
            alt="Pickup proof"
            className="w-full rounded-xl object-cover max-h-48 mb-3"
          />
        ) : (
          <div className="w-full h-36 rounded-xl bg-gray-700 flex items-center justify-center mb-3">
            <span className="text-4xl">📷</span>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-3 rounded-xl border border-gray-600 hover:border-gray-400 text-sm transition"
        >
          {photoPreview ? "Retake Photo" : "Take Photo"}
        </button>
        {lat && lng && (
          <p className="text-xs text-green-500 mt-2 text-center">
            GPS captured: {lat.toFixed(5)}, {lng.toFixed(5)}
          </p>
        )}
      </section>

      {/* Submit */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-950/95 border-t border-gray-800">
        <div className="max-w-md mx-auto">
          <button
            onClick={submit}
            disabled={!allChecked || !photoBase64 || submitting}
            className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 font-semibold transition"
          >
            {submitting ? "Uploading & confirming…" : "Submit Pickup Proof"}
          </button>
          {!allChecked && (
            <p className="text-xs text-gray-500 text-center mt-2">Check all items first</p>
          )}
        </div>
      </div>
    </main>
  );
}
