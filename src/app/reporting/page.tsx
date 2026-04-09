export const dynamic = 'force-dynamic';

import { AppShell } from "@/components/layout/app-shell";
import { db } from "@/lib/db";
import { formatCategory } from "@/lib/format";
import { TicketCategory } from "@prisma/client";
import { ReportingRefresher } from "./reporting-refresher";

// ── helpers ────────────────────────────────────────────────────────────────

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of arr) {
    const k = key(item);
    result[k] = (result[k] ?? 0) + 1;
  }
  return result;
}

function sortedEntries(obj: Record<string, number>): [string, number][] {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]);
}

/** Extracts "Marke: XYZ" from a ticket description, or null. */
function parseMarke(description: string): string | null {
  const match = description.match(/Marke:\s*([^·\n]+)/i);
  return match ? match[1].trim() : null;
}

// ── chart components ───────────────────────────────────────────────────────

const ACCENT = "#6366f1";
const CHART_COLORS = [
  "#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6",
  "#a855f7", "#f97316", "#06b6d4"
];

function HorizontalBar({ label, value, max, color = ACCENT }: {
  label: string;
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 140, fontSize: 13, textAlign: "right", color: "var(--muted)", flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </div>
      <div style={{ flex: 1, background: "var(--bg)", borderRadius: 6, height: 26, overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            minWidth: value > 0 ? 24 : 0,
            background: color,
            height: "100%",
            borderRadius: 6,
            transition: "width 0.3s"
          }}
        />
      </div>
      <div style={{ width: 28, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{value}</div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "20px 16px" }}>
      <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>{label}</div>
      {sub && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function DonutChart({ open, inProgress, done }: { open: number; inProgress: number; done: number }) {
  const total = open + inProgress + done;
  if (total === 0) return <p className="muted" style={{ margin: 0, fontSize: 13 }}>Keine Daten</p>;

  const size = 140;
  const r = 50;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  const slices = [
    { value: open, color: "#f59e0b", label: "Offen" },
    { value: inProgress, color: "#6366f1", label: "In Bearbeitung" },
    { value: done, color: "#22c55e", label: "Erledigt" }
  ];

  let offset = 0;
  const paths = slices.map((s) => {
    const dash = (s.value / total) * circ;
    const gap = circ - dash;
    const el = (
      <circle
        key={s.label}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={s.color}
        strokeWidth={22}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={-offset}
        style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
      />
    );
    offset += dash;
    return el;
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg)" strokeWidth={22} />
        {paths}
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={18} fontWeight={800} fill="currentColor">
          {total}
        </text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {slices.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span>{s.label}</span>
            <span style={{ fontWeight: 700 }}>{s.value}</span>
            <span className="muted">({total > 0 ? Math.round((s.value / total) * 100) : 0}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyBars({ data }: { data: { month: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const barW = Math.max(24, Math.min(48, Math.floor(320 / data.length) - 8));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120, paddingBottom: 28, position: "relative" }}>
      {data.map((d, i) => (
        <div key={d.month} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700 }}>{d.count > 0 ? d.count : ""}</div>
          <div
            style={{
              width: barW,
              height: Math.max(4, Math.round((d.count / max) * 80)),
              background: CHART_COLORS[i % CHART_COLORS.length],
              borderRadius: "4px 4px 0 0"
            }}
          />
          <div style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap", marginTop: 2 }}>{d.month}</div>
        </div>
      ))}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────

export default async function ReportingPage() {
  const tickets = await db.ticket.findMany({
    select: {
      status: true,
      category: true,
      location: true,
      description: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { createdAt: "asc" }
  });

  const total = tickets.length;
  const open = tickets.filter((t) => t.status === "OPEN").length;
  const inProgress = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const done = tickets.filter((t) => t.status === "DONE").length;

  // By category
  const byCategory = sortedEntries(
    groupBy(tickets, (t) => formatCategory(t.category as TicketCategory))
  );
  const maxCat = byCategory[0]?.[1] ?? 1;

  // By location – full "Raum – Unterpunkt" string
  const byLocation = sortedEntries(groupBy(tickets, (t) => t.location));
  const maxLoc = byLocation[0]?.[1] ?? 1;

  // By room – just the part before " – " (or the whole string if no dash)
  const byRoom = sortedEntries(
    groupBy(tickets, (t) => t.location.split(" – ")[0].trim())
  );
  const maxRoom = byRoom[0]?.[1] ?? 1;

  // Hersteller / Marke – parsed from description
  const ticketsWithMarke = tickets
    .map((t) => parseMarke(t.description))
    .filter((m): m is string => m !== null);

  const byMarke = sortedEntries(groupBy(ticketsWithMarke, (m) => m));
  const maxMarke = byMarke[0]?.[1] ?? 1;

  // Monthly trend – last 12 months
  const now = new Date();
  const months: { month: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
    const count = tickets.filter((t) => {
      const td = new Date(t.createdAt);
      return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
    }).length;
    months.push({ month: label, count });
  }

  // Avg resolution time (done tickets: createdAt → updatedAt as proxy)
  const doneTix = tickets.filter((t) => t.status === "DONE");
  const avgDays = doneTix.length > 0
    ? Math.round(
        doneTix.reduce((acc, t) => {
          const ms = new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime();
          return acc + ms / (1000 * 60 * 60 * 24);
        }, 0) / doneTix.length
      )
    : null;

  return (
    <AppShell>
      {/* Auto-refreshes data every 60 s */}
      <ReportingRefresher intervalMs={60_000} />

      <div className="stack" style={{ maxWidth: 860 }}>
        <div>
          <h1 className="page-title">Auswertung</h1>
          <p className="page-lead muted">Übersicht über alle Tickets und häufige Problembereiche.</p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
          <StatCard label="Tickets gesamt" value={total} />
          <StatCard label="Offen" value={open} />
          <StatCard label="In Bearbeitung" value={inProgress} />
          <StatCard label="Erledigt" value={done} />
          {avgDays !== null && (
            <StatCard label="Ø Bearbeitungszeit" value={`${avgDays}d`} sub="erledigte Tickets" />
          )}
        </div>

        {/* Status-Donut */}
        <div className="card stack">
          <h3 style={{ margin: 0 }}>Status-Verteilung</h3>
          <DonutChart open={open} inProgress={inProgress} done={done} />
        </div>

        {/* By Room (grouped) */}
        <div className="card stack">
          <h3 style={{ margin: 0 }}>Probleme nach Raum</h3>
          {byRoom.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>Noch keine Daten.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {byRoom.map(([room, count], i) => (
                <HorizontalBar
                  key={room}
                  label={room}
                  value={count}
                  max={maxRoom}
                  color={CHART_COLORS[i % CHART_COLORS.length]}
                />
              ))}
            </div>
          )}
        </div>

        {/* By Location (detailed) */}
        <div className="card stack">
          <h3 style={{ margin: 0 }}>Probleme nach Ort (Detail)</h3>
          {byLocation.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>Noch keine Daten.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {byLocation.map(([loc, count], i) => (
                <HorizontalBar
                  key={loc}
                  label={loc}
                  value={count}
                  max={maxLoc}
                  color={CHART_COLORS[i % CHART_COLORS.length]}
                />
              ))}
            </div>
          )}
        </div>

        {/* By Category */}
        <div className="card stack">
          <h3 style={{ margin: 0 }}>Probleme nach Kategorie</h3>
          {byCategory.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>Noch keine Daten.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {byCategory.map(([cat, count], i) => (
                <HorizontalBar
                  key={cat}
                  label={cat}
                  value={count}
                  max={maxCat}
                  color={CHART_COLORS[i % CHART_COLORS.length]}
                />
              ))}
            </div>
          )}
        </div>

        {/* Hersteller */}
        <div className="card stack">
          <h3 style={{ margin: 0 }}>Hersteller-Auswertung</h3>
          <p className="muted" style={{ margin: "0 0 4px", fontSize: 13 }}>
            Basierend auf Tickets mit Geräteangabe ({ticketsWithMarke.length} von {total})
          </p>
          {byMarke.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>Noch keine Geräte-Tickets erfasst.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {byMarke.map(([marke, count], i) => (
                <HorizontalBar
                  key={marke}
                  label={marke}
                  value={count}
                  max={maxMarke}
                  color={CHART_COLORS[i % CHART_COLORS.length]}
                />
              ))}
            </div>
          )}
        </div>

        {/* Monthly Trend */}
        <div className="card stack">
          <h3 style={{ margin: 0 }}>Tickets pro Monat (letzte 12 Monate)</h3>
          <MonthlyBars data={months} />
        </div>
      </div>
    </AppShell>
  );
}
