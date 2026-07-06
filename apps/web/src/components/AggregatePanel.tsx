"use client";
import type { SimArtifact } from "@repo/shared";
import { cn } from "@/lib/utils";
import {
  OUTCOME_LABELS,
  outcomeBreakdown,
  perPlayerStats,
  rankHistogram,
  type PlayerLine,
} from "@/lib/artifactStats";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const one = (x: number) => x.toFixed(1);
const two = (x: number) => x.toFixed(2);
const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/** A single labeled headline number. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted px-3 py-2.5">
      <span className="text-xl font-semibold leading-none tabular-nums">{value}</span>
      <span className="whitespace-nowrap text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

/** A full-width share bar with the label and value drawn on the bar itself. */
function Bar({ label, value, count }: { label: string; value: number; count?: number }) {
  return (
    <div className="relative h-7 w-full overflow-hidden rounded-md bg-muted">
      <div
        className="absolute inset-y-0 left-0 bg-primary/35"
        style={{ width: `${Math.min(100, value * 100)}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-between gap-2 px-2.5 text-sm">
        <span className="truncate font-medium">{label}</span>
        <span className="shrink-0 tabular-nums">
          {pct(value)}
          {count != null && <span className="ml-1.5 text-muted-foreground">· {count}</span>}
        </span>
      </div>
    </div>
  );
}

/** Compact section header. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>;
}

/** One labeled stat as a chip; dimmed when zero so the eye skips empties.
    `accent` highlights it (used for the points pill). */
function Chip({
  label,
  value,
  dim,
  accent,
  title,
}: {
  label: string;
  value: string;
  dim?: boolean;
  accent?: boolean;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "rounded px-1.5 py-0.5 text-xs tabular-nums",
        accent ? "bg-primary/20 font-semibold" : "bg-muted",
        dim && "opacity-40"
      )}
    >
      <span className={cn(!accent && "text-muted-foreground")}>{label}</span>{" "}
      <span className="font-medium">{value}</span>
    </span>
  );
}

const ma = (t: { m: number; a: number }) => `${t.m}/${t.a}`;

/** One player's line as a card: a header + a wrapping row of stat chips (so a
    wide breakdown flows onto the next line instead of overflowing). The chip set
    is side-specific — offensive volume/efficiency for the team with the ball,
    defensive activity for the team guarding it. */
function PlayerCard({ l, side }: { l: PlayerLine; side: "offense" | "defense" }) {
  return (
    <div className="flex flex-col gap-1.5 py-2 first:pt-0">
      <span className="truncate text-sm font-medium">
        <span className="text-muted-foreground">#{l.number}</span> {l.name}
        <span className="ml-1 text-xs font-normal text-muted-foreground">{l.position}</span>
      </span>
      <div className="flex flex-wrap gap-1">
        {side === "offense" ? (
          <>
            <Chip label="Pts" value={String(l.points)} accent title="Points scored" />
            <Chip label="Pass" value={String(l.passes)} dim={!l.passes} title="Completed passes" />
            <Chip
              label="FG"
              value={`${ma({ m: l.fgm, a: l.fga })}${l.fga ? ` · ${pct(l.fgm / l.fga)}` : ""}`}
              dim={!l.fga}
              title="Field goals made / attempted"
            />
            <Chip label="3P" value={ma(l.byType.three)} dim={!l.byType.three.a} title="Threes made / attempted" />
            <Chip label="Mid" value={ma(l.byType.mid)} dim={!l.byType.mid.a} title="Mid-range made / attempted" />
            <Chip label="Paint" value={ma(l.byType.inside)} dim={!l.byType.inside.a} title="Paint shots made / attempted" />
            <Chip label="Dunk" value={ma(l.byType.dunk)} dim={!l.byType.dunk.a} title="Dunks made / attempted" />
            <Chip
              label="Qual"
              value={l.avgQuality == null ? "—" : pct(l.avgQuality)}
              dim={l.avgQuality == null}
              title="Average shot quality (make probability at release)"
            />
            <Chip label="Ast" value={String(l.ast)} dim={!l.ast} title="Assists" />
            <Chip label="OReb" value={String(l.offReb)} dim={!l.offReb} title="Offensive rebounds" />
            <Chip label="TO" value={String(l.tov)} dim={!l.tov} title="Turnovers" />
          </>
        ) : (
          <>
            <Chip label="DReb" value={String(l.defReb)} dim={!l.defReb} title="Defensive rebounds" />
            <Chip label="Cont" value={String(l.contests)} dim={!l.contests} title="Shots contested" />
            <Chip label="Stl" value={String(l.stl)} dim={!l.stl} title="Steals" />
            <Chip label="Blk" value={String(l.blk)} dim={!l.blk} title="Blocks" />
            <Chip label="PF" value={String(l.fouls)} dim={!l.fouls} title="Personal fouls committed" />
          </>
        )}
      </div>
    </div>
  );
}

/** A team's players as a stack of cards, chip set chosen by side. */
function PlayerGroup({
  title,
  side,
  lines,
}: {
  title: string;
  side: "offense" | "defense";
  lines: PlayerLine[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{title}</span>
      <div className="flex flex-col divide-y divide-border/50">
        {lines.map((l) => (
          <PlayerCard key={l.id} l={l} side={side} />
        ))}
      </div>
    </div>
  );
}

/** The default results tab: what the chosen config generally produces over the
    batch — headline rates, the outcome distribution, the shot profile, and the
    per-player "by whom" breakdown, all derived from the artifact's tables. */
export function AggregatePanel({ artifact }: { artifact: SimArtifact }) {
  const { aggregate: agg, config } = artifact;
  const lines = perPlayerStats(artifact);
  const offenseLines = lines.filter((l) => l.team === config.offense);
  const defenseLines = lines.filter((l) => l.team !== config.offense);
  const ob = outcomeBreakdown(artifact);
  // every outcome bar in one list, sorted by descending share
  const outcomeBars: { label: string; value: number; count: number }[] = [];
  if (ob.made.total > 0) {
    outcomeBars.push({ label: "Made FG", value: ob.made.total / ob.n, count: ob.made.total });
    outcomeBars.push({ label: "Made 2PT", value: ob.made.two / ob.n, count: ob.made.two });
    outcomeBars.push({ label: "Made 3PT", value: ob.made.three / ob.n, count: ob.made.three });
  }
  if (ob.missed.total > 0) {
    outcomeBars.push({ label: "Missed FG", value: ob.missed.total / ob.n, count: ob.missed.total });
    outcomeBars.push({ label: "Missed 2PT", value: ob.missed.two / ob.n, count: ob.missed.two });
    outcomeBars.push({ label: "Missed 3PT", value: ob.missed.three / ob.n, count: ob.missed.three });
  }
  if (ob.ftPlays > 0) outcomeBars.push({ label: "Free throws", value: ob.ftPlays / ob.n, count: ob.ftPlays });
  for (const [type, count] of ob.other)
    outcomeBars.push({ label: OUTCOME_LABELS[type] ?? type, value: count / ob.n, count });
  outcomeBars.sort((a, b) => b.value - a.value);
  const shotTypes = rankHistogram(agg.shotTypeMix);
  const openness = rankHistogram(agg.opennessMix);

  return (
    <div className="flex flex-col gap-5 pb-2">
      {/* headline rates — capped at 3 per row so the tiles never shrink/clip */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="pts / poss" value={two(agg.pointsPerPossession)} />
        <Stat label="scored" value={pct(agg.scoredPct)} />
        <Stat label="assisted" value={pct(agg.assistRate)} />
        <Stat label="turnover" value={pct(agg.turnoverRate)} />
        <Stat label="off. reb" value={pct(agg.offRebRate)} />
        <Stat label="passes / poss" value={one(agg.avgPasses)} />
      </div>

      {/* outcome distribution */}
      <section className="flex flex-col gap-2">
        <SectionTitle>Most common outcomes</SectionTitle>
        <div className="flex flex-col gap-1.5">
          {outcomeBars.map((b) => (
            <Bar key={b.label} label={b.label} value={b.value} count={b.count} />
          ))}
        </div>
      </section>

      {/* shot profile */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <SectionTitle>Shots by type</SectionTitle>
          <div className="flex flex-col gap-1.5">
            {shotTypes.length ? (
              shotTypes.map(([t, v]) => <Bar key={t} label={title(t)} value={v} />)
            ) : (
              <span className="text-sm text-muted-foreground">No shots attempted.</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <SectionTitle>Shot quality (openness)</SectionTitle>
          <div className="flex flex-col gap-1.5">
            {openness.length ? (
              openness.map(([o, v]) => <Bar key={o} label={title(o.replace("_", " "))} value={v} />)
            ) : (
              <span className="text-sm text-muted-foreground">No shots attempted.</span>
            )}
          </div>
        </div>
      </section>

      {/* per-player breakdown */}
      <section className="flex flex-col gap-4">
        <SectionTitle>By player</SectionTitle>
        <PlayerGroup title={`${config.offenseTeam} — offense`} side="offense" lines={offenseLines} />
        <PlayerGroup title={`${config.defenseTeam} — defense`} side="defense" lines={defenseLines} />
      </section>
    </div>
  );
}
