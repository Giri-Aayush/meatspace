"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SelfAppBuilder } from "@selfxyz/qrcode";
import dynamic from "next/dynamic";

// SSR-safe: QR code uses browser APIs
const SelfQRcodeWrapper = dynamic(
  () => import("@selfxyz/qrcode").then((m) => m.SelfQRcodeWrapper),
  { ssr: false }
);

export default function OnboardingPage() {
  const router = useRouter();
  const [selfApp, setSelfApp] = useState<ReturnType<SelfAppBuilder["build"]> | null>(null);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Generate a stable userId per browser session
    const userId =
      sessionStorage.getItem("selfUserId") ?? crypto.randomUUID();
    sessionStorage.setItem("selfUserId", userId);

    const app = new SelfAppBuilder({
      version: 2,
      appName: "Rent-a-Human",
      scope: process.env.NEXT_PUBLIC_SELF_SCOPE ?? "rent-a-human",
      endpoint: `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/verify`,
      endpointType: "staging_celo",
      userId,
      userIdType: "uuid",
      disclosures: {
        minimumAge: 18,
      },
    }).build();

    setSelfApp(app);
  }, []);

  function handleSuccess() {
    setVerified(true);
    localStorage.setItem("workerVerified", "true");
    setTimeout(() => router.push("/worker"), 1500);
  }

  function handleError(data: { error_code?: string; reason?: string }) {
    setError(data.reason ?? data.error_code ?? "Verification failed");
  }

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
        real human aged 18+. This is required to accept tasks.
      </p>

      {error && (
        <div className="w-full p-3 rounded-xl bg-red-900/40 border border-red-700 text-red-300 text-sm text-center">
          {error}
        </div>
      )}

      {verified ? (
        <div className="w-full bg-green-900/40 border border-green-700 rounded-2xl p-6 flex flex-col items-center gap-2">
          <p className="text-2xl">✓</p>
          <p className="text-green-300 font-semibold">Identity verified!</p>
          <p className="text-xs text-gray-400">Redirecting to task feed…</p>
        </div>
      ) : (
        <div className="w-full bg-gray-800 rounded-2xl p-4 flex items-center justify-center min-h-[280px] border border-gray-700">
          {selfApp ? (
            <SelfQRcodeWrapper
              selfApp={selfApp}
              onSuccess={handleSuccess}
              onError={handleError}
              size={240}
              darkMode
            />
          ) : (
            <p className="text-gray-500 text-sm animate-pulse">
              Loading QR code…
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-gray-600 text-center">
        Download the Self app at{" "}
        <span className="text-gray-400">self.xyz</span>
      </p>

      <button
        onClick={skip}
        className="w-full py-3 rounded-xl border border-gray-700 text-gray-500 text-sm hover:border-gray-500 hover:text-gray-300 transition"
      >
        Skip for demo
      </button>
    </main>
  );
}
