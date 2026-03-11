import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTaskEscrow } from "@/lib/contract";
import { CELO_SEPOLIA_EXPLORER } from "@/constants";
import { haversineMetres } from "@/lib/haversine";
import { uploadProofBundle } from "@/lib/ipfs";

const PICKUP_RADIUS_M = 100;

// POST /api/tasks/[id]/pickup-proof
// Body: { lat, lng, photoBase64?, workerAddress }
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

    // Haversine gate — worker must be within 100m of the shop
    const distanceMetres = haversineMetres(lat, lng, record.shopLat, record.shopLng);
    if (distanceMetres > PICKUP_RADIUS_M) {
      return NextResponse.json(
        { error: `Too far from shop: ${Math.round(distanceMetres)}m (max ${PICKUP_RADIUS_M}m)` },
        { status: 400 }
      );
    }

    // IPFS upload — photo + metadata bundle
    const photoBuffer = photoBase64
      ? Buffer.from(photoBase64, "base64")
      : undefined;

    const ipfsCid = await uploadProofBundle({
      photoBuffer,
      taskId,
      workerAddress,
      lat,
      lng,
      timestamp: Date.now(),
    });

    console.log(`[pickup-proof] task=${taskId} worker=${workerAddress} gps=(${lat},${lng}) distance=${Math.round(distanceMetres)}m cid=${ipfsCid}`);

    const escrow = getTaskEscrow();
    const tx = await escrow.submitPickupProof(taskId, ipfsCid);
    const receipt = await tx.wait();

    return NextResponse.json({
      ok: true,
      ipfsCid,
      ipfsUrl: `https://ipfs.io/ipfs/${ipfsCid}`,
      distanceMetres: Math.round(distanceMetres),
      txHash: receipt.hash,
      explorerUrl: `${CELO_SEPOLIA_EXPLORER}/tx/${receipt.hash}`,
    });
  } catch (err) {
    console.error("POST pickup-proof error:", err);
    const message = err instanceof Error ? err.message : "Failed to submit pickup proof";
    if (message.includes("Wrong state")) {
      return NextResponse.json({ error: "Task is not in ACCEPTED state" }, { status: 400 });
    }
    if (message.includes("Not your task")) {
      return NextResponse.json({ error: "Only the assigned worker can submit pickup proof" }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
