import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTaskEscrow } from "@/lib/contract";
import { CELO_SEPOLIA_EXPLORER } from "@/constants";

// POST /api/tasks/[id]/delivery-gps
// Body: { lat, lng, workerAddress }
// Phase 2: haversine stubbed (replaced in Phase 3)
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
    const { lat, lng, workerAddress } = body;

    if (lat == null || lng == null || !workerAddress) {
      return NextResponse.json({ error: "lat, lng, workerAddress required" }, { status: 400 });
    }

    // Phase 2 stub — replaced with real 50m haversine check in Phase 3
    const distanceMetres = 0; // stub
    console.log(`[delivery-gps] task=${taskId} worker=${workerAddress} gps=(${lat},${lng}) distance=${distanceMetres}m (stub)`);

    const escrow = getTaskEscrow();
    const tx = await escrow.submitDeliveryGPS(taskId);
    const receipt = await tx.wait();

    return NextResponse.json({
      ok: true,
      distanceMetres,
      txHash: receipt.hash,
      explorerUrl: `${CELO_SEPOLIA_EXPLORER}/tx/${receipt.hash}`,
      note: "haversine stubbed in Phase 2",
    });
  } catch (err) {
    console.error("POST delivery-gps error:", err);
    const message = err instanceof Error ? err.message : "Failed to submit delivery GPS";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
