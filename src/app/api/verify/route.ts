import { NextResponse } from "next/server";

// POST /api/verify — Self Protocol ZK passport verification
// Phase 2: stubbed. Real verifier added in Phase 6.
export async function POST() {
  return NextResponse.json({ isValid: true, note: "Self Protocol stub — Phase 6" });
}
