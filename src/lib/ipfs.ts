// IPFS uploads via Pinata (free tier, no credit card required)
// Sign up at https://pinata.cloud → API Keys → generate key with pinFileToIPFS permission
// Add PINATA_JWT=<your_jwt> to .env.local

const PINATA_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

export interface ProofBundle {
  photoBuffer?: Buffer;
  taskId: number;
  workerAddress: string;
  lat: number;
  lng: number;
  timestamp: number;
}

/**
 * Uploads a photo + metadata JSON to IPFS via Pinata.
 * Returns the IPFS CID string (IpfsHash from Pinata response).
 */
export async function uploadProofBundle(bundle: ProofBundle): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("PINATA_JWT must be set in .env.local");

  const metadata = {
    taskId: bundle.taskId,
    workerAddress: bundle.workerAddress,
    lat: bundle.lat,
    lng: bundle.lng,
    timestamp: bundle.timestamp,
    timestampISO: new Date(bundle.timestamp).toISOString(),
  };

  const form = new FormData();

  // metadata.json
  form.append(
    "file",
    new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" }),
    "metadata.json"
  );

  // photo (optional)
  if (bundle.photoBuffer) {
    form.append(
      "file",
      new Blob([bundle.photoBuffer.buffer as ArrayBuffer], { type: "image/jpeg" }),
      "photo.jpg"
    );
  }

  // Pinata metadata (name shown in dashboard)
  form.append(
    "pinataMetadata",
    JSON.stringify({ name: `task-${bundle.taskId}-proof-${bundle.timestamp}` })
  );

  const res = await fetch(PINATA_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata upload failed (${res.status}): ${text}`);
  }

  const json = await res.json() as { IpfsHash: string };
  return json.IpfsHash;
}
