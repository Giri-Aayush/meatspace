import { NextRequest, NextResponse } from "next/server";
import { SelfBackendVerifier, AllIds, DefaultConfigStore } from "@selfxyz/core";

const scope = process.env.SELF_SCOPE ?? "rent-a-human";
const endpoint = `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/verify`;

// mockPassport: true → accepts Self testnet passports (hackathon mode)
const configStore = new DefaultConfigStore({
  minimumAge: 18,
  ofac: false,
});

const verifier = new SelfBackendVerifier(
  scope,
  endpoint,
  true, // mockPassport — testnet mode
  AllIds,
  configStore,
  "uuid"
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { attestationId, proof, publicSignals, userContextData } = body;

    if (!proof || !publicSignals) {
      return NextResponse.json({ error: "Missing proof or publicSignals" }, { status: 400 });
    }

    const result = await verifier.verify(
      attestationId,
      proof,
      publicSignals,
      userContextData
    );

    const isValid = result?.isValidDetails?.isValid ?? false;

    return NextResponse.json({
      isValid,
      ageVerified: result?.isValidDetails?.isMinimumAgeValid ?? false,
      userId: result?.userData?.userIdentifier,
    });
  } catch (err) {
    console.error("POST /api/verify error:", err);
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: message, isValid: false }, { status: 500 });
  }
}
