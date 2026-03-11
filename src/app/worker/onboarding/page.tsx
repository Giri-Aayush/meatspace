"use client";

import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();

  function skip() {
    localStorage.setItem("workerVerified", "true");
    router.push("/worker");
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 max-w-sm mx-auto">
      <div className="text-5xl">🪪</div>
      <h1 className="text-2xl font-bold text-center">Verify Your Identity</h1>
      <p className="text-gray-400 text-center text-sm">
        Scan your passport with the Self Protocol app to prove you&apos;re a
        real human. This is required to accept tasks.
      </p>

      <div className="w-full bg-gray-800 rounded-2xl p-6 flex items-center justify-center min-h-[200px]">
        <p className="text-gray-500 text-sm text-center">
          Self Protocol QR code<br />
          <span className="text-xs">(Phase 6 — coming soon)</span>
        </p>
      </div>

      <button
        onClick={skip}
        className="w-full py-3 rounded-xl border border-gray-600 text-gray-400 text-sm hover:border-gray-400 hover:text-white transition"
      >
        Skip for demo
      </button>
    </main>
  );
}
