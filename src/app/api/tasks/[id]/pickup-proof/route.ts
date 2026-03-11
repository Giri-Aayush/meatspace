import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTaskEscrow } from "@/lib/contract";
import { CELO_SEPOLIA_EXPLORER } from "@/constants";

// POST /api/tasks/[id]/pickup-proof
// Body: { lat, lng, photoBase64, workerAddress }
// Phase 2: haversine and IPFS are stubbed (replaced in Phase 3)
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
    const { lat, lng, photoBase64, workerAddress } = body;

    if (lat == null || lng == null || !workerAddress) {
      return NextResponse.json({ error: "lat, lng, workerAddress required" }, { status: 400 });
    }

    // Phase 2 stub — replaced with real haversine check in Phase 3
    const distanceMetres = 0; // stub
    console.log(`[pickup-proof] task=${taskId} worker=${workerAddress} gps=(${lat},${lng}) distance=${distanceMetres}m (stub)`);
    if (photoBase64) console.log(`[pickup-proof] photo received (${photoBase64.length} chars)`);

    // Phase 2 stub — replaced with real IPFS upload in Phase 3
    const ipfsCid = "bafkreidemo";
    console.log(`[pickup-proof] IPFS CID (stub): ${ipfsCid}`);

    // Call contract — server wallet signs on behalf of worker for Phase 2
    const escrow = getTaskEscrow();
    const tx = await escrow.submitPickupProof(taskId, ipfsCid);
    const receipt = await tx.wait();

    return NextResponse.json({
      ok: true,
      ipfsCid,
      distanceMetres,
      txHash: receipt.hash,
      explorerUrl: `${CELO_SEPOLIA_EXPLORER}/tx/${receipt.hash}`,
      note: "haversine + IPFS are stubbed in Phase 2",
    });
  } catch (err) {
    console.error("POST pickup-proof error:", err);
    const message = err instanceof Error ? err.message : "Failed to submit pickup proof";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
