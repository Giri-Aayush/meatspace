import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTaskEscrow } from "@/lib/contract";
import { TASK_STATE_LABELS, CELO_SEPOLIA_EXPLORER, TASK_ESCROW_ADDRESS } from "@/constants";

// GET /api/tasks/[id] — full task detail (on-chain + off-chain, no OTP)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id);

    if (isNaN(taskId)) {
      return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
    }

    const record = db.get(taskId);
    if (!record) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const escrow = getTaskEscrow();
    const onChain = await escrow.tasks(taskId);

    const stateNum = Number(onChain.state);

    return NextResponse.json({
      id: taskId,
      description: record.description,
      shopName: record.shopName,
      shopLat: record.shopLat,
      shopLng: record.shopLng,
      destLat: record.destLat,
      destLng: record.destLng,
      itemList: record.itemList,
      deadline: record.deadline,
      createdAt: record.createdAt,
      agentCallbackUrl: record.agentCallbackUrl ?? null,
      // on-chain
      state: stateNum,
      stateLabel: TASK_STATE_LABELS[stateNum as keyof typeof TASK_STATE_LABELS],
      worker: onChain.worker,
      agent: onChain.agent,
      amount: onChain.amount.toString(),
      pickupVerified: onChain.pickupVerified,
      gpsVerified: onChain.gpsVerified,
      pickupCid: onChain.pickupCid || null,
      explorerUrl: `${CELO_SEPOLIA_EXPLORER}/address/${TASK_ESCROW_ADDRESS}`,
      // otp deliberately omitted
    });
  } catch (err) {
    console.error("GET /api/tasks/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });
  }
}
