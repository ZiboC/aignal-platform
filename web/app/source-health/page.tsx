import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, AlertTriangle, ArrowLeft, CheckCircle2, PlugZap, RadioTower } from "lucide-react";
import { Shell } from "@/components/shell";
import type { SourceHealthReport } from "@/lib/source-health";
import { getSourceHealthReport } from "@/lib/source-health";

export default async function SourceHealthPage() {
  const report = await getSourceHealthReport();

  return (
    <Shell language="en">
      <main className="mx-auto flex max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-sm border border-line bg-white/8 px-4 py-3 text-sm font-black text-ivory hover:border-signal hover:text-signal"
        >
          <ArrowLeft size={16} />
          Back to signals
        </Link>

        {!report ? (
          <section className="border border-line bg-obsidian/72 p-6">
            <p className="text-sm font-black uppercase text-amber">No source health report found</p>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-muted">
              Run <span className="text-ivory">npm run source-health</span> from the repo root, then refresh this page.
            </p>
          </section>
        ) : (
          <>
            <section className="radar-panel-motion overflow-hidden border border-line bg-obsidian/78 shadow-soft">
              <div className="radar-panel-motion__grid" />
              <div className="radar-panel-motion__scan" />
              <div className="relative grid gap-8 p-5 sm:p-7 lg:grid-cols-[1fr_1.25fr] lg:p-9">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2 text-xs font-black uppercase text-amber">
                    <span>[ Source Health ]</span>
                    <span>[ {formatDateTime(report.checked_at)} ]</span>
                  </div>
                  <h1 className="mt-10 max-w-3xl text-5xl font-black uppercase leading-none text-ivory sm:text-6xl lg:text-7xl">
                    Source Health
                  </h1>
                  <p className="mt-5 max-w-2xl text-base font-bold leading-7 text-muted">
                    Tracks whether Aignal source-pool URLs are reachable, directly collectable, or still need collection adapters.
                  </p>
                </div>

                <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric label="Reachable" value={report.summary.reachable_sources} accent="text-signal" />
                  <Metric label="Failing" value={report.summary.failing_sources} accent="text-amber" />
                  <Metric label="Direct" value={report.summary.directly_collectable_sources} accent="text-data" />
                  <Metric label="Adapters" value={report.summary.adapter_needed_sources} accent="text-category" />
                </div>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="border border-line bg-obsidian/72 p-5">
                <SectionTitle icon={<Activity size={17} />} title="Category Coverage" />
                <div className="mt-5 grid gap-3">
                  {report.categories.map((category) => (
                    <div key={category.id} className="border border-line bg-white/5 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-ivory">{category.label_en}</p>
                          <p className="mt-1 text-xs font-black uppercase text-category">{category.label_zh}</p>
                        </div>
                        <StatusBadge status={category.coverage_status} />
                      </div>
                      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs font-black uppercase text-muted">
                        <MiniStat label="Sources" value={category.source_count} />
                        <MiniStat label="Reachable" value={category.reachable_count} />
                        <MiniStat label="Direct" value={category.directly_collectable_count} />
                        <MiniStat label="Failing" value={category.failing_count} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div className="border border-line bg-obsidian/72 p-5">
                  <SectionTitle icon={<AlertTriangle size={17} />} title="Failing Sources" />
                  <div className="mt-5 space-y-3">
                    {report.sources.filter((source) => source.health_status === "failing").map((source) => (
                      <SourceRow key={source.id} source={source} />
                    ))}
                    {report.summary.failing_sources === 0 ? (
                      <p className="text-sm font-bold text-muted">No failing sources in the latest report.</p>
                    ) : null}
                  </div>
                </div>

                <div className="border border-line bg-obsidian/72 p-5">
                  <SectionTitle icon={<PlugZap size={17} />} title="Adapter Needed" />
                  <p className="mt-3 text-sm font-bold leading-6 text-muted">
                    These sources are reachable but are not directly collected by the current RSS/API pipeline yet.
                  </p>
                  <div className="mt-5 space-y-2">
                    {report.sources.filter((source) => source.collection_status === "needs_adapter").slice(0, 8).map((source) => (
                      <a
                        key={source.id}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 border border-category/45 bg-category/10 px-3 py-2 text-xs font-black text-category hover:bg-category/20"
                      >
                        <span className="min-w-0 truncate">{source.name}</span>
                        <span className="shrink-0 uppercase text-muted">{source.access_method}</span>
                      </a>
                    ))}
                    {report.summary.adapter_needed_sources === 0 ? (
                      <span className="border border-signal/60 bg-signal/10 px-3 py-2 text-xs font-black text-signal">
                        All sources are directly collectable
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </Shell>
  );
}

function Metric({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="border border-white/25 bg-white/10 p-4 text-center">
      <p className={`text-3xl font-black ${accent}`}>{value}</p>
      <p className="mt-2 text-xs font-black uppercase text-muted">{label}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-white/15 bg-white/5 p-2">
      <p className="text-sm text-ivory">{value}</p>
      <p className="mt-1 text-[10px]">{label}</p>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-black uppercase text-signal">
      {icon}
      {title}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const ok = status === "ok";
  const degraded = status === "degraded";
  const label = status.replaceAll("_", " ");
  return (
    <span
      className={[
        "inline-flex items-center gap-2 border px-3 py-1 text-xs font-black uppercase",
        ok ? "border-signal/60 bg-signal/10 text-signal" : "",
        degraded ? "border-amber/60 bg-amber/10 text-amber" : "",
        !ok && !degraded ? "border-category/60 bg-category/10 text-category" : ""
      ].join(" ")}
    >
      {ok ? <CheckCircle2 size={13} /> : <RadioTower size={13} />}
      {label}
    </span>
  );
}

function SourceRow({ source }: { source: SourceHealthReport["sources"][number] }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="block border border-amber/50 bg-amber/10 p-4 hover:bg-amber/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-ivory">{source.name}</p>
          <p className="mt-1 truncate text-xs font-bold text-muted">{source.id}</p>
        </div>
        <span className="shrink-0 text-xs font-black text-amber">{source.status ?? "network"}</span>
      </div>
      <p className="mt-3 text-xs font-bold leading-5 text-muted">{source.error}</p>
    </a>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Los_Angeles"
  }).format(new Date(value));
}
