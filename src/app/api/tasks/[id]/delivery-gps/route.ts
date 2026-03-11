import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { haversineMetres } from "@/lib/haversine";

const DELIVERY_RADIUS_M = 50;

// POST /api/tasks/[id]/delivery-gps
// Body: { lat, lng, workerAddress }
// Returns: { ok, distanceMetres }
// The caller (worker browser) is responsible for calling submitDeliveryGPS(taskId) on-chain.
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

    return NextResponse.json({
      ok: true,
      distanceMetres: Math.round(distanceMetres),
    });
  } catch (err) {
    console.error("POST delivery-gps error:", err);
    const message = err instanceof Error ? err.message : "Failed to validate delivery GPS";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
