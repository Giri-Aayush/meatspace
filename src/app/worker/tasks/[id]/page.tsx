"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { TaskState } from "@/constants";

// Routes the worker to the correct sub-page based on on-chain task state
export default function TaskRouter() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    if (!id) return;
    fetch(`/api/tasks/${id}`)
      .then((r) => r.json())
      .then((task) => {
        if (task.error) { router.replace("/worker"); return; }
        switch (task.state) {
          case TaskState.ACCEPTED:
          case TaskState.PICKUP_VERIFIED:
            router.replace(`/worker/tasks/${id}/pickup`);
            break;
          case TaskState.IN_TRANSIT:
            router.replace(`/worker/tasks/${id}/transit`);
            break;
          case TaskState.DELIVERED:
            router.replace(`/worker/tasks/${id}/delivery`);
            break;
          case TaskState.COMPLETED:
            router.replace(`/worker/tasks/${id}/success`);
            break;
          default:
            router.replace("/worker");
        }
      })
      .catch(() => router.replace("/worker"));
  }, [id, router]);

  return (
    <main className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500 text-sm animate-pulse">Loading task…</p>
    </main>
  );
}
