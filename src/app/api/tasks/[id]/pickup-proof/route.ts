import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { haversineMetres } from "@/lib/haversine";
import { uploadProofBundle } from "@/lib/ipfs";

const PICKUP_RADIUS_M = 100;

// POST /api/tasks/[id]/pickup-proof
// Body: { lat, lng, photoBase64?, workerAddress }
// Returns: { ok, ipfsCid, ipfsUrl, distanceMetres }
// The caller (worker browser) is responsible for calling submitPickupProof(taskId, cid) on-chain.
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

    return NextResponse.json({
      ok: true,
      ipfsCid,
      ipfsUrl: `https://ipfs.io/ipfs/${ipfsCid}`,
      distanceMetres: Math.round(distanceMetres),
    });
  } catch (err) {
    console.error("POST pickup-proof error:", err);
    const message = err instanceof Error ? err.message : "Failed to submit pickup proof";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
