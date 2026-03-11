import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTaskEscrow } from "@/lib/contract";
import { CELO_SEPOLIA_EXPLORER, USDC_ADDRESS } from "@/constants";
import { ethers } from "ethers";

// POST /api/tasks/[id]/confirm-delivery
// Body: { otp, workerAddress }
// The OTP is checked on-chain via keccak256 — if wrong, the tx reverts.
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
    const { otp, workerAddress } = body;

    if (!otp || !workerAddress) {
      return NextResponse.json({ error: "otp and workerAddress required" }, { status: 400 });
    }

    const escrow = getTaskEscrow();
    const tx = await escrow.confirmDelivery(taskId, otp);
    const receipt = await tx.wait();

    // Read payout from TaskCompleted event
    let payout = "0";
    for (const log of receipt.logs) {
      try {
        const parsed = escrow.interface.parseLog(log);
        if (parsed?.name === "TaskCompleted") {
          // payout is in USDC 6-decimal units
          payout = (Number(parsed.args.payout) / 1_000_000).toFixed(6);
        }
      } catch { /* not this event */ }
    }

    // Fire agent webhook if configured
    if (record.agentCallbackUrl) {
      try {
        await fetch(record.agentCallbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId,
            status: "COMPLETED",
            worker: workerAddress,
            payoutUSDC: payout,
            txHash: receipt.hash,
            explorerUrl: `${CELO_SEPOLIA_EXPLORER}/tx/${receipt.hash}`,
          }),
        });
      } catch (webhookErr) {
        console.warn("Webhook delivery failed:", webhookErr);
      }
    }

    return NextResponse.json({
      ok: true,
      payoutUSDC: payout,
      txHash: receipt.hash,
      explorerUrl: `${CELO_SEPOLIA_EXPLORER}/tx/${receipt.hash}`,
    });
  } catch (err) {
    console.error("POST confirm-delivery error:", err);
    const message = err instanceof Error ? err.message : "Failed to confirm delivery";
    // Surface contract revert reason cleanly
    const isWrongOTP = message.includes("Invalid OTP");
    return NextResponse.json(
      { error: isWrongOTP ? "Invalid OTP — ask the recipient to read it again" : message },
      { status: isWrongOTP ? 400 : 500 }
    );
  }
}
