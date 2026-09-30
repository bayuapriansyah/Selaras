import { NextResponse } from "next/server";
import { buildExplanation } from "@/lib/app/explain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let claimId: unknown;
  try {
    const body = await req.json();
    claimId = body?.claimId;
  } catch {
    return NextResponse.json(
      { error: "Body JSON tidak valid" },
      { status: 400 },
    );
  }

  if (typeof claimId !== "string" || claimId.length === 0) {
    return NextResponse.json(
      { error: "claimId wajib diisi" },
      { status: 400 },
    );
  }

  const result = buildExplanation(claimId);
  if (!result) {
    return NextResponse.json(
      { error: "Claim tidak ditemukan", claimId },
      { status: 404 },
    );
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
