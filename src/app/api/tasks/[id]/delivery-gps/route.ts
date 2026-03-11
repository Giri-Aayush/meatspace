import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTaskEscrow } from "@/lib/contract";
import { CELO_SEPOLIA_EXPLORER } from "@/constants";
import { haversineMetres } from "@/lib/haversine";

const DELIVERY_RADIUS_M = 50;

// POST /api/tasks/[id]/delivery-gps
// Body: { lat, lng, workerAddress }
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

    // Haversine gate — worker must be within 50m of the delivery destination
    const distanceMetres = haversineMetres(lat, lng, record.destLat, record.destLng);
    if (distanceMetres > DELIVERY_RADIUS_M) {
      return NextResponse.json(
        { error: `Too far from destination: ${Math.round(distanceMetres)}m (max ${DELIVERY_RADIUS_M}m)` },
        { status: 400 }
      );
    }

    console.log(`[delivery-gps] task=${taskId} worker=${workerAddress} gps=(${lat},${lng}) distance=${Math.round(distanceMetres)}m`);

    const escrow = getTaskEscrow();
    const tx = await escrow.submitDeliveryGPS(taskId);
    const receipt = await tx.wait();

    return NextResponse.json({
      ok: true,
      distanceMetres: Math.round(distanceMetres),
      txHash: receipt.hash,
      explorerUrl: `${CELO_SEPOLIA_EXPLORER}/tx/${receipt.hash}`,
    });
  } catch (err) {
    console.error("POST delivery-gps error:", err);
    const message = err instanceof Error ? err.message : "Failed to submit delivery GPS";
    if (message.includes("Wrong state") || message.includes("Not your task")) {
      return NextResponse.json({ error: "Task is not in the correct state for GPS submission" }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
