import { NextResponse } from "next/server";
import { getGraph } from "@/lib/app/services/graphService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ claimId: string }> };

export async function GET(_req: Request, ctx: Params) {
  const { claimId } = await ctx.params;
  const payload = await getGraph(claimId);

  if (!payload) {
    return NextResponse.json(
      { error: "Claim tidak ditemukan", claimId },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { ...payload, cachedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
