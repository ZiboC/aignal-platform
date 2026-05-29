import Link from "next/link";
import { Bookmark, Sparkles } from "lucide-react";
import { copy } from "@/lib/i18n";
import type { Language } from "@/lib/types";

type Props = {
  language: Language;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
};

export function Shell({ language, children, rightSlot }: Props) {
  const t = copy[language];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex min-w-0 items-center gap-2">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink text-white">
              <Sparkles size={18} />
            </span>
            <span className="text-lg font-bold tracking-normal text-ink">Aignal</span>
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden rounded-md px-3 py-2 text-sm font-semibold text-muted hover:bg-panel hover:text-ink sm:inline-flex"
            >
              {t.navHome}
            </Link>
            <Link
              href="/saved"
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-muted hover:bg-panel hover:text-ink"
            >
              <Bookmark size={16} />
              {t.navSaved}
            </Link>
            {rightSlot}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
