"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getBrowserSigner } from "@/lib/wallet";
import { ethers } from "ethers";
import { USDC_ABI, USDC_ADDRESS } from "@/constants";

const DEMO = {
  description: "Pickup medication from Apollo Pharmacy and deliver to patient",
  shopName: "Apollo Pharmacy, Visakhapatnam",
  shopLat: "17.7231",
  shopLng: "83.3012",
  destLat: "17.7200",
  destLng: "83.2990",
  itemList: "Dolo 650 x 10 strips\nVicks VapoRub x 1 unit",
  amount: "0.1",
  deadlineMinutes: "120",
  recipientContact: "+91 98765 43210",
};

interface FormState {
  description: string;
  shopName: string;
  shopLat: string;
  shopLng: string;
  destLat: string;
  destLng: string;
  itemList: string;
  amount: string;
  deadlineMinutes: string;
  recipientContact: string;
}

const EMPTY: FormState = {
  description: "",
  shopName: "",
  shopLat: "",
  shopLng: "",
  destLat: "",
  destLng: "",
  itemList: "",
  amount: "0.1",
  deadlineMinutes: "120",
  recipientContact: "",
};

export default function AgentPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("");
    setSubmitting(true);

    try {
      const deadlineUnix = Math.floor(Date.now() / 1000) + Number(form.deadlineMinutes) * 60;
      const body = {
        description: form.description,
        shopName: form.shopName,
        shopLat: Number(form.shopLat),
        shopLng: Number(form.shopLng),
        destLat: Number(form.destLat),
        destLng: Number(form.destLng),
        itemList: form.itemList.split("\n").map((s) => s.trim()).filter(Boolean),
        deadline: deadlineUnix,
        recipientContact: form.recipientContact,
        amount: Number(form.amount),
      };

      // First attempt — may get 402
      setStatus("Creating task…");
      let res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // Handle x402 payment required
      if (res.status === 402) {
        setStatus("Payment required — sending 0.01 USDC…");
        const challenge = await res.json();
        const accept = challenge?.accepts?.[0];
        if (!accept) throw new Error("Invalid 402 challenge from server");

        const payTo: string = accept.payTo;
        const amountWei = BigInt(accept.maxAmountRequired ?? "10000"); // 0.01 USDC

        const signer = await getBrowserSigner();
        const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
        const tx = await usdc.transfer(payTo, amountWei);
        const receipt = await tx.wait();
        const xPayment = btoa(JSON.stringify({ txHash: receipt.hash }));

        setStatus("Payment sent — creating task…");
        res = await fetch("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PAYMENT": xPayment,
          },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create task");
      }

      const data = await res.json();
      setStatus(`Task #${data.taskId} created!`);
      setTimeout(() => router.push("/agent/dashboard"), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-lg mx-auto p-4 pb-24">
      <div className="flex items-center justify-between py-4 mb-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-white text-lg">←</Link>
          <h1 className="text-xl font-bold">Create Task</h1>
        </div>
        <Link href="/agent/dashboard" className="text-sm text-blue-400 hover:text-blue-300">
          Dashboard →
        </Link>
      </div>

      <button
        type="button"
        onClick={() => setForm(DEMO)}
        className="w-full mb-5 py-2.5 rounded-xl border border-blue-600 text-blue-400 hover:bg-blue-600/10 text-sm font-medium transition"
      >
        Load Demo (Apollo Pharmacy)
      </button>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-900/40 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}
      {status && (
        <div className="mb-4 p-3 rounded-xl bg-blue-900/40 border border-blue-700 text-blue-300 text-sm">
          {status}
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Task Description" required>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            className="w-full bg-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Pickup medication from pharmacy..."
            required
          />
        </Field>

        <Field label="Shop / Pickup Name" required>
          <input value={form.shopName} onChange={(e) => set("shopName", e.target.value)}
            className={inputCls} placeholder="Apollo Pharmacy, City" required />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Shop Lat" required>
            <input value={form.shopLat} onChange={(e) => set("shopLat", e.target.value)}
              type="number" step="any" className={inputCls} placeholder="17.7231" required />
          </Field>
          <Field label="Shop Lng" required>
            <input value={form.shopLng} onChange={(e) => set("shopLng", e.target.value)}
              type="number" step="any" className={inputCls} placeholder="83.3012" required />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Dest Lat" required>
            <input value={form.destLat} onChange={(e) => set("destLat", e.target.value)}
              type="number" step="any" className={inputCls} placeholder="17.7200" required />
          </Field>
          <Field label="Dest Lng" required>
            <input value={form.destLng} onChange={(e) => set("destLng", e.target.value)}
              type="number" step="any" className={inputCls} placeholder="83.2990" required />
          </Field>
        </div>

        <Field label="Items (one per line)" required>
          <textarea
            value={form.itemList}
            onChange={(e) => set("itemList", e.target.value)}
            rows={3}
            className="w-full bg-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder={"Dolo 650 x 10 strips\nVicks VapoRub x 1 unit"}
            required
          />
        </Field>

        <Field label="Recipient Contact">
          <input value={form.recipientContact} onChange={(e) => set("recipientContact", e.target.value)}
            className={inputCls} placeholder="+91 98765 43210" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (USDC)" required>
            <input value={form.amount} onChange={(e) => set("amount", e.target.value)}
              type="number" step="0.01" min="0.01" className={inputCls} required />
          </Field>
          <Field label="Deadline (minutes)" required>
            <input value={form.deadlineMinutes} onChange={(e) => set("deadlineMinutes", e.target.value)}
              type="number" min="5" className={inputCls} required />
          </Field>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-950/95 border-t border-gray-800">
          <div className="max-w-lg mx-auto">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 font-semibold transition"
            >
              {submitting ? "Processing…" : "Create Task"}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}

const inputCls = "w-full bg-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
