import type { Metadata } from "next";
import Link from "next/link";
import { Mascot } from "@/components/Mascot";

export const metadata: Metadata = {
  title: "Privacy & trust | Snoopy",
  description:
    "How Snoopy handles receipt photos, AI scanning, sign-in, storage, export, and deletion.",
};

const UPDATED_AT = "July 8, 2026";

const sections = [
  {
    title: "Overview",
    body: [
      "Snoopy helps you turn receipts into summaries and weekly insights. By default, receipt history is stored on your device.",
      "Receipt data is sent outside your device only when you enable cloud scan, use a private scan provider, or sign in for account sync.",
      "If a real receipt photo cannot be read, Snoopy shows a failure message and does not replace it with sample data.",
    ],
  },
  {
    title: "Receipt photos",
    body: [
      "Receipt photos are compressed in your browser before any upload attempt.",
      "If cloud scan is off, receipt photos are not sent to Snoopy's cloud parser. You can still use sample scans, which use mock receipt data.",
      "If cloud scan is on, the compressed receipt image is sent to the selected parser so Snoopy can extract receipt details.",
    ],
  },
  {
    title: "AI scanning",
    body: [
      "Snoopy cloud scan uses the app's configured AI provider to extract merchant, item, total, date, category, and insight fields from a receipt image.",
      "Private scan lets you use your own provider key in this browser. In that mode, the receipt image is sent directly to the provider you choose.",
      "AI-generated receipt reads may contain mistakes. Review important totals, dates, and item details before relying on them.",
    ],
  },
  {
    title: "Storage",
    body: [
      "When you are signed out, receipt history is stored in this browser's local storage.",
      "When you sign in with Google and cloud storage is configured, receipt records can sync to private account-owned storage.",
      "Private receipt images are served through an authenticated Snoopy image route rather than public bucket URLs.",
    ],
  },
  {
    title: "Sign-in",
    body: [
      "Google sign-in is used to connect receipts to your account. Snoopy stores the profile details needed to identify your account and maintain your session.",
      "Session cookies are httpOnly, which means browser JavaScript cannot read the raw session token.",
    ],
  },
  {
    title: "Export and deletion",
    body: [
      "From Profile, you can export your receipt history as a JSON file.",
      "You can also delete your receipt history. Snoopy removes local records and, when cloud storage is available, requests deletion of linked private receipt images.",
    ],
  },
  {
    title: "Responsible use",
    body: [
      "Use Snoopy for your own receipt tracking and personal insights. Do not upload or store someone else's private receipts without permission.",
      "Snoopy insights are informational observations, not financial, tax, medical, nutrition, or legal advice.",
      "Snoopy is an early product. Features may change, and external AI or storage providers may occasionally be unavailable.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink-soft">Snoopy</p>
          <h1 className="font-display text-2xl font-semibold leading-tight text-ink">
            Privacy & trust
          </h1>
          <p className="mt-1 text-sm text-ink-soft">Last updated {UPDATED_AT}</p>
        </div>
        <Mascot size={62} mood="curious" />
      </header>

      <section className="rounded-[28px] bg-paper p-5 shadow-soft">
        <p className="text-sm leading-relaxed text-ink-soft">
          Before you upload a receipt, here is what happens to it: what stays on
          your device, what may be sent for scanning, and how you can export or
          delete your history.
        </p>
      </section>

      <div className="flex flex-col gap-3">
        {sections.map((section) => (
          <section key={section.title} className="rounded-3xl bg-paper p-5 shadow-soft">
            <h2 className="font-display text-lg font-semibold text-ink">
              {section.title}
            </h2>
            <div className="mt-3 flex flex-col gap-2.5">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-relaxed text-ink-soft">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Link
        href="/profile"
        className="rounded-2xl bg-ink px-5 py-3.5 text-center text-sm font-semibold text-white shadow-lift active:scale-[0.99] transition-transform"
      >
        Back to profile
      </Link>
    </div>
  );
}
