import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { findContactsByNiche } from "@/lib/deepseek";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { niche, api_key, count = 20 } = body;

    if (!niche) {
      return NextResponse.json({ error: "niche description is required" }, { status: 400 });
    }

    if (!api_key) {
      return NextResponse.json({ error: "DeepSeek API key is required" }, { status: 400 });
    }

    const result = await findContactsByNiche(niche, api_key, Math.min(count, 50));

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
