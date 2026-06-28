import { NextRequest, NextResponse } from "next/server";
import { recordClick } from "@/lib/tracking";

export async function GET(req: NextRequest) {
  const rid = req.nextUrl.searchParams.get("rid");
  if (!rid) {
    return NextResponse.redirect(new URL("/marketing", req.url));
  }

  const result = recordClick(rid);
  if (!result) {
    return NextResponse.redirect(new URL("/marketing", req.url));
  }

  return NextResponse.redirect(result.url);
}
