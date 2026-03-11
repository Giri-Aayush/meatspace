import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTaskEscrow } from "@/lib/contract";
import { CELO_SEPOLIA_EXPLORER } from "@/constants";

// POST /api/tasks/[id]/accept
// Body: { workerAddress }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id);
    if (isNaN(taskId)) return NextResponse.json({ error: "Invalid task id" }, { status: 400 });

    const record = db.get(taskId);
    if (!record) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const body = await req.json();
    const { workerAddress } = body;
    if (!workerAddress) {
      return NextResponse.json({ error: "workerAddress required" }, { status: 400 });
    }

    const escrow = getTaskEscrow();
    const tx = await escrow.acceptTask(taskId);
    const receipt = await tx.wait();

    return NextResponse.json({
      ok: true,
      txHash: receipt.hash,
      explorerUrl: `${CELO_SEPOLIA_EXPLORER}/tx/${receipt.hash}`,
    });
  } catch (err) {
    console.error("POST accept error:", err);
    const message = err instanceof Error ? err.message : "Failed to accept task";
    if (message.includes("Task not available")) {
      return NextResponse.json({ error: "Task is not available (already accepted or does not exist)" }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
