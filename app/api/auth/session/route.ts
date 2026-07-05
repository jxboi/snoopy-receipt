import { NextRequest, NextResponse } from "next/server";
import { sessionFromRequest } from "@/lib/authSession";

export async function GET(request: NextRequest) {
  const session = sessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ profile: null }, { status: 401 });
  }

  return NextResponse.json({
    profile: {
      id: session.id,
      name: session.name,
      email: session.email,
      signedInAt: session.signedInAt,
    },
  });
}
