import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Command,
  Download,
  ShieldCheck,
  SquareKanban,
  TrendingUp,
} from "lucide-react";

import { GithubIcon } from "@/components/github-icon";

import { auth } from "@/lib/auth";
import { SITE } from "@/lib/site";
import { appUrl } from "@/lib/urls";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: `${SITE.name} — CRM with honest revenue forecasting` },
  description:
    "An open-source kanban deal pipeline with weighted forecasting for small B2B sales teams. Every stage carries a win likelihood, so the number you see is the number you can trust.",
  alternates: { canonical: "/" },
  openGraph: {
    title: `${SITE.name} — CRM with honest revenue forecasting`,
    description:
      "A kanban deal pipeline with weighted forecasting for small B2B sales teams. Open source, self-hostable, fast.",
    url: "/",
    siteName: SITE.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — CRM with honest revenue forecasting`,
    description:
      "A kanban deal pipeline with weighted forecasting for small B2B sales teams. Open source, self-hostable, fast.",
  },
};

const FEATURES = [
  {
    icon: SquareKanban,
    title: "A board that feels instant",
    body: "Drag deals between stages with optimistic updates and keyboard-accessible drag and drop. Wins and losses are one drop away — and every move is logged.",
  },
  {
    icon: TrendingUp,
    title: "Forecasts you can defend",
    body: "Each stage carries a win likelihood. Foresail multiplies it into every deal, so the dashboard shows what's realistically landing each month — not the sum of your optimism.",
  },
  {
    icon: Building2,
    title: "Contacts & companies built in",
    body: "Lightweight records for the people and accounts behind each deal, connected everywhere they matter. No fields you'll never fill in.",
  },
  {
    icon: ShieldCheck,
    title: "Roles your team can trust",
    body: "Owner, admin, member, and read-only viewer — enforced on the server for every single action, with an append-only audit trail of who changed what.",
  },
  {
    icon: Command,
    title: "Fast for power users",
    body: "⌘K command palette, / to search, server-side filters mirrored into the URL so any view is shareable. Dark mode that was designed, not inverted.",
  },
  {
    icon: Download,
    title: "Your data stays yours",
    body: "One-click CSV export of any filtered view, and the whole product is MIT-licensed — read the code, run it on your own Postgres, change what you like.",
  },
];

const FAQS = [
  {
    q: "Is Foresail free?",
    a: "Yes. Foresail is open source under the MIT license — you can self-host it on your own Postgres for nothing, and the hosted demo is free while the product is in preview.",
  },
  {
    q: "How does the weighted forecast work?",
    a: "Every pipeline stage carries a win likelihood (Lead 10%, Proposal 50%, and so on — you can tune them). Each open deal contributes its value multiplied by that likelihood, grouped by expected close month. That sum is a forecast you can actually defend.",
  },
  {
    q: "Can I try it without creating an account?",
    a: "Yes — use the shared demo login (demo@foresail.app / demo1234) to explore a realistic pipeline with full edit access. The demo workspace resets nightly.",
  },
  {
    q: "Does it support teams and roles?",
    a: "Yes. Invite people with a link and assign owner, admin, member, or viewer roles. Permissions are enforced server-side on every action, and an immutable activity log records every change.",
  },
  {
    q: "Can I get my data out?",
    a: "Any table view exports to CSV with your current filters applied, and if you self-host, the data lives in your own PostgreSQL database from day one.",
  },
  {
    q: "What's it built with?",
    a: "Next.js (App Router), TypeScript in strict mode, PostgreSQL with Prisma, Auth.js, Tailwind CSS, and Recharts. The full source is on GitHub.",
  },
];

function JsonLd() {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE.name,
      url: appUrl("/"),
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: SITE.description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    },
  ];
  return (
    <script
      type="application/ld+json"
      // Server-rendered structured data; content mirrors the visible copy exactly.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function LandingPage() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <JsonLd />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            <Logo />
          </Link>
          <nav aria-label="Landing" className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#forecast" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <a
              href={SITE.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Foresail on GitHub"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
            >
              <GithubIcon aria-hidden="true" />
            </a>
            {signedIn ? (
              <Link href="/app" className={cn(buttonVariants({ size: "sm" }))}>
                Open dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                  Sign in
                </Link>
                <Link href="/signup" className={cn(buttonVariants({ size: "sm" }))}>
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,--theme(--color-primary/6%),transparent_65%)]"
          />
          <div className="relative mx-auto w-full max-w-6xl px-4 pt-16 pb-10 text-center sm:px-6 sm:pt-24">
            <Badge variant="secondary" className="mb-5">
              Open source · MIT licensed
            </Badge>
            <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Know what you&apos;ll <span className="text-primary">actually close</span> this
              quarter.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-pretty text-muted-foreground">
              Foresail is a CRM for small B2B teams that stops the pipeline from lying: a
              drag-and-drop deal board where every stage carries a win likelihood — so the forecast
              is math, not mood.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
                Start free
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
              <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                Try the live demo
              </Link>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Demo login: <span className="font-mono">{SITE.demoEmail}</span> /{" "}
              <span className="font-mono">{SITE.demoPassword}</span> — no signup needed
            </p>

            <div className="relative mx-auto mt-12 max-w-5xl">
              <div className="rounded-xl border bg-card p-1.5 shadow-2xl shadow-primary/5">
                <Image
                  src="/screenshots/board.png"
                  alt="The Foresail deal board: kanban columns for each pipeline stage with deal cards showing value, owner, and close date"
                  width={1440}
                  height={900}
                  priority
                  className="rounded-lg border"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-t bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="text-center text-3xl font-semibold tracking-tight">
              Small team, honest numbers
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
              Everything a five-person sales team needs, and none of the 400 fields it doesn&apos;t.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-xl border bg-card p-5">
                  <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="size-4.5" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-semibold">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How the forecast works */}
        <section id="forecast" className="scroll-mt-20 border-t">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                The forecast is just multiplication
              </h2>
              <p className="mt-4 text-muted-foreground">
                A $50,000 deal at first call isn&apos;t $50,000 of revenue — pretending it is, is
                how quarters get missed. Foresail keeps the math honest:
              </p>
              <ol className="mt-6 space-y-4">
                {[
                  ["Set a win likelihood per stage", "Lead 10%, Qualified 25%, Proposal 50%, Negotiation 75% — tune them to your reality."],
                  ["Every deal is weighted automatically", "A $40K deal in Proposal contributes $20K. Move it to Negotiation and it becomes $30K."],
                  ["Read the number that matters", "The dashboard sums weighted value by expected close month — that's your defensible forecast."],
                ].map(([title, body], index) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">{title}</h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Weighted value
              </p>
              <p className="mt-3 font-mono text-lg sm:text-xl">
                forecast = Σ ( value × stage&nbsp;probability )
              </p>
              <div className="mt-6 space-y-3 border-t pt-5 text-sm">
                {[
                  ["Quartz Financial — Group-wide rollout", "$175,000", "75%", "$131,250"],
                  ["Tidewater Shipping — Fleet tracking", "$140,000", "50%", "$70,000"],
                  ["Zephyr Airlines — Crew scheduling", "$120,000", "10%", "$12,000"],
                ].map(([name, value, p, weighted]) => (
                  <div key={name} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-muted-foreground">{name}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {value} × {p} =
                    </span>
                    <span className="shrink-0 font-mono font-semibold tabular-nums">{weighted}</span>
                  </div>
                ))}
                <div className="flex items-baseline justify-between border-t pt-3">
                  <span className="font-medium">Forecast (these three)</span>
                  <span className="font-mono font-semibold tabular-nums">$213,250</span>
                </div>
                <p className="pt-1 text-xs text-muted-foreground">
                  Raw pipeline would have claimed $435,000. Which number would you take to a board
                  meeting?
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t bg-muted/30">
          <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="text-center text-3xl font-semibold tracking-tight">
              Frequently asked questions
            </h2>
            <dl className="mt-10 space-y-8">
              {FAQS.map((faq) => (
                <div key={faq.q}>
                  <dt className="text-sm font-semibold">{faq.q}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{faq.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* CTA band */}
        <section className="border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight">
              Sail with a forecast you can trust
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Set up your workspace in under a minute. Free while in preview, open source forever.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
                Create your workspace
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
              <a
                href={SITE.github}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                <GithubIcon data-icon="inline-start" aria-hidden="true" />
                Star on GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-2 text-sm text-muted-foreground">{SITE.tagline}.</p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div>
              <h3 className="mb-2 font-medium">Product</h3>
              <ul className="space-y-1.5 text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">Features</a></li>
                <li><Link href="/login" className="hover:text-foreground">Live demo</Link></li>
                <li><Link href="/signup" className="hover:text-foreground">Sign up</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-medium">Open source</h3>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>
                  <a href={SITE.github} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href={`${SITE.github}/blob/main/docs/architecture.md`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                    Architecture
                  </a>
                </li>
                <li>
                  <a href={`${SITE.github}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                    MIT License
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-medium">Account</h3>
              <ul className="space-y-1.5 text-muted-foreground">
                <li><Link href="/login" className="hover:text-foreground">Sign in</Link></li>
                <li><Link href="/forgot-password" className="hover:text-foreground">Reset password</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t">
          <p className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
            Built in the open as a Digital Heroes full-stack trial project. © {new Date().getFullYear()} Foresail.
          </p>
        </div>
      </footer>
    </div>
  );
}
