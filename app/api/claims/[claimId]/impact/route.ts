import { NextResponse } from "next/server";
import {
  impact as claimImpact,
  view as claimDetails,
} from "@/lib/app/services/claimService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ claimId: string }> };

export async function GET(_req: Request, ctx: Params) {
  const { claimId } = await ctx.params;
  const view = claimDetails(claimId);

  if (!view) {
    return NextResponse.json(
      { error: "Claim tidak ditemukan", claimId },
      { status: 404 },
    );
  }

  const impact = claimImpact(claimId);
  if (!impact) {
    return NextResponse.json(
      { error: "Claim tidak ditemukan", claimId },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      claimId,
      status: view.evaluation.status,
      ...impact,
      signals: view.signals.length,
      cachedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
