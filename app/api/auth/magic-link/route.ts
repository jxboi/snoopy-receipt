import { NextResponse } from "next/server";
import { appOrigin } from "@/lib/appOrigin";
import { createMagicLinkToken } from "@/lib/magicLink";

interface MagicLinkRequest {
  email?: string;
  name?: string;
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function emailHtml(link: string, name: string): string {
  return `
    <div style="font-family:Arial,sans-serif;background:#fff8f2;padding:32px">
      <div style="max-width:520px;margin:auto;background:white;border-radius:24px;padding:28px;color:#2a2336">
        <h1 style="margin:0 0 12px;font-size:24px">Your Snoopy sign-in link</h1>
        <p style="font-size:15px;line-height:1.5;color:#7b7488">Hi ${name}, tap the button below to save your receipt trail.</p>
        <p style="margin:28px 0">
          <a href="${link}" style="background:#ff6b5b;color:white;text-decoration:none;padding:14px 18px;border-radius:16px;font-weight:700">Sign in to Snoopy</a>
        </p>
        <p style="font-size:12px;line-height:1.5;color:#a9a3b4">This link expires in 15 minutes. If you did not ask for it, you can ignore this email.</p>
      </div>
    </div>
  `;
}

export async function POST(request: Request) {
  let body: MagicLinkRequest;
  try {
    body = (await request.json()) as MagicLinkRequest;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const name = body.name?.trim() || email.split("@")[0] || "Receipt pal";
  if (!validEmail(email)) {
    return NextResponse.json({ error: "bad_email" }, { status: 400 });
  }

  const token = createMagicLinkToken({ email, name });
  const link = `${appOrigin(request)}/auth/verify?token=${encodeURIComponent(
    token
  )}`;

  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "email_unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true, mode: "dev", devLink: link });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:
        process.env.AUTH_EMAIL_FROM ||
        process.env.RESEND_FROM ||
        "Snoopy <onboarding@resend.dev>",
      to: email,
      subject: "Your Snoopy sign-in link",
      html: emailHtml(link, name),
      text: `Hi ${name}, sign in to Snoopy: ${link}\n\nThis link expires in 15 minutes.`,
    }),
  });

  if (!res.ok) {
    console.error("magic link email failed:", await res.text());
    return NextResponse.json({ error: "email_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, mode: "email" });
}
