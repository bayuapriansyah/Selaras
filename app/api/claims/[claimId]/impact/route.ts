import { NextResponse } from "next/server";
import { claimView } from "@/lib/app/selectors";
import { impactOf } from "@/lib/app/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ claimId: string }> };

export async function GET(_req: Request, ctx: Params) {
  const { claimId } = await ctx.params;
  const view = claimView(claimId);

  if (!view) {
    return NextResponse.json(
      { error: "Claim tidak ditemukan", claimId },
      { status: 404 },
    );
  }

  const impact = impactOf(
    view.template.rate,
    view.evaluation.claimed,
    view.evaluation.supported,
  );

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
