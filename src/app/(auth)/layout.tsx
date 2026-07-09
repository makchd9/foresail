import Link from "next/link";

import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,--theme(--color-primary/8%),transparent_60%)]"
      />
      <header className="relative z-10 flex justify-center pt-10 sm:pt-14">
        <Link
          href="/"
          className="rounded-md text-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <Logo />
          <span className="sr-only">Foresail home</span>
        </Link>
      </header>
      <main className="relative z-10 flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
      <footer className="relative z-10 pb-8 text-center text-xs text-muted-foreground">
        Free while in preview · No credit card required
      </footer>
    </div>
  );
}
