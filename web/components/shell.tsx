import Link from "next/link";
import { Bookmark } from "lucide-react";
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
      <header className="sticky top-0 z-20 border-b border-cream/20 bg-obsidian/92 shadow-[0_1px_0_rgba(34,245,255,0.1)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-2 px-4 py-4 sm:gap-3 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex min-w-0 items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/aignal-mark.svg" alt="" className="h-9 w-9 shrink-0" />
            <span className="text-lg font-black uppercase tracking-normal text-ivory">Aignal</span>
          </Link>

          <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              href="/"
              className="hidden rounded-sm px-3 py-2 text-xs font-black uppercase text-source hover:bg-source/12 hover:text-signal sm:inline-flex"
            >
              {t.navHome}
            </Link>
            <Link
              href="/saved"
              className="inline-flex items-center gap-2 rounded-sm px-3 py-2 text-xs font-black uppercase text-source hover:bg-source/12 hover:text-signal"
            >
              <Bookmark size={16} />
              <span className="hidden sm:inline">{t.navSaved}</span>
            </Link>
            {rightSlot ? <div className="hidden sm:block">{rightSlot}</div> : null}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
