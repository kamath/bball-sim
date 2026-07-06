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
import {
  chipFilter,
  playerSimSets,
  type ChipKind,
  type PossessionFilter,
} from "@/lib/possessionFilters";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const one = (x: number) => x.toFixed(1);
const two = (x: number) => x.toFixed(2);
const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/** Shared toggle wiring for every clickable aggregate element: whether it is
    currently an active filter, and the callback that flips it. Passed down so a
    stat/bar/chip renders as a toggle button when it carries a filter. */
interface Toggle {
  activeIds: Set<string>;
  onToggle: (filter: PossessionFilter) => void;
}

/** The ring an element gets while it is an active filter. Inset so it never
    extends past the element's box — an outset/offset ring gets clipped by the
    surrounding ScrollArea's overflow near the panel's top/bottom edges. */
const activeRing = "ring-2 ring-inset ring-primary";

/** Interactive affordances shared by every clickable aggregate element: the
    pointer cursor plus an inset keyboard-focus ring that replaces the browser's
    native outline (which would clip the same way an outset ring does). */
const interactive =
  "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

/** A single labeled headline number. Clickable when it carries a filter. */
function Stat({
  label,
  value,
  filter,
  toggle,
}: {
  label: string;
  value: string;
  filter?: PossessionFilter;
  toggle?: Toggle;
}) {
  const active = !!filter && !!toggle?.activeIds.has(filter.id);
  return (
    <button
      type="button"
      disabled={!filter || !toggle}
      onClick={filter && toggle ? () => toggle.onToggle(filter) : undefined}
      title={filter ? `Filter possessions: ${filter.label}` : undefined}
      className={cn(
        "flex flex-col gap-1 rounded-lg bg-muted px-3 py-2.5 text-left",
        filter && toggle && cn(interactive, "transition hover:bg-muted/70"),
        active && activeRing
      )}
    >
      <span className="text-xl font-semibold leading-none tabular-nums">{value}</span>
      <span className="whitespace-nowrap text-xs text-muted-foreground">{label}</span>
    </button>
  );
}

/** A full-width share bar with the label and value drawn on the bar itself.
    Clickable when it carries a filter. */
function Bar({
  label,
  value,
  count,
  filter,
  toggle,
}: {
  label: string;
  value: number;
  count?: number;
  filter?: PossessionFilter;
  toggle?: Toggle;
}) {
  const active = !!filter && !!toggle?.activeIds.has(filter.id);
  return (
    <button
      type="button"
      disabled={!filter || !toggle}
      onClick={filter && toggle ? () => toggle.onToggle(filter) : undefined}
      title={filter ? `Filter possessions: ${filter.label}` : undefined}
      className={cn(
        "relative block h-7 w-full overflow-hidden rounded-md bg-muted text-left",
        filter && toggle && interactive,
        active && activeRing
      )}
    >
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
    </button>
  );
}

/** Compact section header. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>;
}

/** One labeled stat as a chip; dimmed when zero so the eye skips empties.
    `accent` highlights it (used for the points pill). Clickable when it carries
    a filter — the chip toggles the "possessions where this player did X" set. */
function Chip({
  label,
  value,
  dim,
  accent,
  title,
  filter,
  toggle,
}: {
  label: string;
  value: string;
  dim?: boolean;
  accent?: boolean;
  title?: string;
  filter?: PossessionFilter;
  toggle?: Toggle;
}) {
  const active = !!filter && !!toggle?.activeIds.has(filter.id);
  return (
    <button
      type="button"
      disabled={!filter || !toggle}
      onClick={filter && toggle ? () => toggle.onToggle(filter) : undefined}
      title={filter ? `Filter possessions: ${filter.label}` : title}
      className={cn(
        "rounded px-1.5 py-0.5 text-xs tabular-nums",
        accent ? "bg-primary/20 font-semibold" : "bg-muted",
        filter && toggle && cn(interactive, "hover:brightness-95"),
        dim && "opacity-40",
        active && activeRing
      )}
    >
      <span className={cn(!accent && "text-muted-foreground")}>{label}</span>{" "}
      <span className="font-medium">{value}</span>
    </button>
  );
}

const ma = (t: { m: number; a: number }) => `${t.m}/${t.a}`;

/** One player's line as a card: a header + a wrapping row of stat chips (so a
    wide breakdown flows onto the next line instead of overflowing). The chip set
    is side-specific — offensive volume/efficiency for the team with the ball,
    defensive activity for the team guarding it. Each chip that maps to a
    per-possession stat is a toggleable filter. */
function PlayerCard({
  l,
  side,
  sets,
  toggle,
}: {
  l: PlayerLine;
  side: "offense" | "defense";
  /** this player's simId sets, keyed by chip kind (undefined = never recorded) */
  sets?: Map<ChipKind, Set<string>>;
  toggle: Toggle;
}) {
  // build a filter for a chip kind from this player's recorded simIds
  const f = (kind: ChipKind, chipLabel: string) =>
    chipFilter(l.id, l.name, kind, chipLabel, sets?.get(kind)) ?? undefined;
  return (
    <div className="flex flex-col gap-1.5 py-2 first:pt-0">
      <span className="truncate text-sm font-medium">
        <span className="text-muted-foreground">#{l.number}</span> {l.name}
        <span className="ml-1 text-xs font-normal text-muted-foreground">{l.position}</span>
      </span>
      <div className="flex flex-wrap gap-1">
        {side === "offense" ? (
          <>
            <Chip label="Pts" value={String(l.points)} accent title="Points scored" filter={f("pts", "scored")} toggle={toggle} />
            <Chip label="Pass" value={String(l.passes)} dim={!l.passes} title="Completed passes" filter={f("pass", "passed")} toggle={toggle} />
            <Chip
              label="FG"
              value={`${ma({ m: l.fgm, a: l.fga })}${l.fga ? ` · ${pct(l.fgm / l.fga)}` : ""}`}
              dim={!l.fga}
              title="Field goals made / attempted"
              filter={f("fg", "shot")}
              toggle={toggle}
            />
            <Chip label="3P" value={ma(l.byType.three)} dim={!l.byType.three.a} title="Threes made / attempted" filter={f("three", "3PT")} toggle={toggle} />
            <Chip label="Mid" value={ma(l.byType.mid)} dim={!l.byType.mid.a} title="Mid-range made / attempted" filter={f("mid", "mid-range")} toggle={toggle} />
            <Chip label="Paint" value={ma(l.byType.inside)} dim={!l.byType.inside.a} title="Paint shots made / attempted" filter={f("inside", "paint")} toggle={toggle} />
            <Chip label="Dunk" value={ma(l.byType.dunk)} dim={!l.byType.dunk.a} title="Dunks made / attempted" filter={f("dunk", "dunk")} toggle={toggle} />
            <Chip
              label="Qual"
              value={l.avgQuality == null ? "—" : pct(l.avgQuality)}
              dim={l.avgQuality == null}
              title="Average shot quality (make probability at release)"
            />
            <Chip label="Ast" value={String(l.ast)} dim={!l.ast} title="Assists" filter={f("ast", "assist")} toggle={toggle} />
            <Chip label="OReb" value={String(l.offReb)} dim={!l.offReb} title="Offensive rebounds" filter={f("offReb", "off. rebound")} toggle={toggle} />
            <Chip label="TO" value={String(l.tov)} dim={!l.tov} title="Turnovers" filter={f("tov", "turnover")} toggle={toggle} />
          </>
        ) : (
          <>
            <Chip label="DReb" value={String(l.defReb)} dim={!l.defReb} title="Defensive rebounds" filter={f("defReb", "def. rebound")} toggle={toggle} />
            <Chip label="Cont" value={String(l.contests)} dim={!l.contests} title="Shots contested" filter={f("contest", "contest")} toggle={toggle} />
            <Chip label="Stl" value={String(l.stl)} dim={!l.stl} title="Steals" filter={f("stl", "steal")} toggle={toggle} />
            <Chip label="Blk" value={String(l.blk)} dim={!l.blk} title="Blocks" filter={f("blk", "block")} toggle={toggle} />
            <Chip label="PF" value={String(l.fouls)} dim={!l.fouls} title="Personal fouls committed" filter={f("foul", "foul")} toggle={toggle} />
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
  sets,
  toggle,
}: {
  title: string;
  side: "offense" | "defense";
  lines: PlayerLine[];
  sets: Map<number, Map<ChipKind, Set<string>>>;
  toggle: Toggle;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{title}</span>
      <div className="flex flex-col divide-y divide-border/50">
        {lines.map((l) => (
          <PlayerCard key={l.id} l={l} side={side} sets={sets.get(l.id)} toggle={toggle} />
        ))}
      </div>
    </div>
  );
}

/** The default results tab: what the chosen config generally produces over the
    batch — headline rates, the outcome distribution, the shot profile, and the
    per-player "by whom" breakdown, all derived from the artifact's tables.
    Clicking any element toggles a filter on the possession list beneath it. */
export function AggregatePanel({
  artifact,
  activeIds,
  onToggle,
}: {
  artifact: SimArtifact;
  /** ids of the filters currently active, so active elements read as selected */
  activeIds: Set<string>;
  /** toggle a filter authored by an aggregate element on or off */
  onToggle: (filter: PossessionFilter) => void;
}) {
  const toggle: Toggle = { activeIds, onToggle };
  const { aggregate: agg, config } = artifact;
  const lines = perPlayerStats(artifact);
  const offenseLines = lines.filter((l) => l.team === config.offense);
  const defenseLines = lines.filter((l) => l.team !== config.offense);
  const sets = playerSimSets(artifact);
  const ob = outcomeBreakdown(artifact);
  // every outcome bar in one list, sorted by descending share, each carrying the
  // predicate that selects the possessions it summarizes.
  const outcomeBars: { label: string; value: number; count: number; filter: PossessionFilter }[] = [];
  const bar = (label: string, count: number, filter: PossessionFilter) =>
    outcomeBars.push({ label, value: count / ob.n, count, filter });
  if (ob.made.total > 0) {
    bar("Made FG", ob.made.total, { id: "outcome:made-fg", label: "Made FG", test: (p) => p.fgMade });
    bar("Made 2PT", ob.made.two, { id: "outcome:made-2pt", label: "Made 2PT", test: (p) => p.fgMade && p.shotType !== "three" });
    bar("Made 3PT", ob.made.three, { id: "outcome:made-3pt", label: "Made 3PT", test: (p) => p.fgMade && p.shotType === "three" });
  }
  if (ob.missed.total > 0) {
    bar("Missed FG", ob.missed.total, { id: "outcome:missed-fg", label: "Missed FG", test: (p) => p.fgAttempted && !p.fgMade });
    bar("Missed 2PT", ob.missed.two, { id: "outcome:missed-2pt", label: "Missed 2PT", test: (p) => p.fgAttempted && !p.fgMade && p.shotType !== "three" });
    bar("Missed 3PT", ob.missed.three, { id: "outcome:missed-3pt", label: "Missed 3PT", test: (p) => p.fgAttempted && !p.fgMade && p.shotType === "three" });
  }
  if (ob.ftPlays > 0)
    bar("Free throws", ob.ftPlays, {
      id: "outcome:ft",
      label: "Free throws",
      test: (p) => !p.fgAttempted && p.outcomeType === "freethrow",
    });
  for (const [type, count] of ob.other)
    bar(OUTCOME_LABELS[type] ?? type, count, {
      id: `outcome:${type}`,
      label: OUTCOME_LABELS[type] ?? type,
      test: (p) => !p.fgAttempted && p.outcomeType === type,
    });
  outcomeBars.sort((a, b) => b.value - a.value);
  const shotTypes = rankHistogram(agg.shotTypeMix);
  const openness = rankHistogram(agg.opennessMix);

  return (
    <div className="flex flex-col gap-5 pb-2">
      {/* headline rates — capped at 3 per row so the tiles never shrink/clip.
          the boolean rates double as filters; the averages are display-only. */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="pts / poss" value={two(agg.pointsPerPossession)} />
        <Stat label="scored" value={pct(agg.scoredPct)} toggle={toggle} filter={{ id: "stat:scored", label: "Scored", test: (p) => p.points > 0 }} />
        <Stat label="assisted" value={pct(agg.assistRate)} toggle={toggle} filter={{ id: "stat:assisted", label: "Assisted", test: (p) => p.assisted }} />
        <Stat label="turnover" value={pct(agg.turnoverRate)} toggle={toggle} filter={{ id: "stat:turnover", label: "Turnover", test: (p) => p.turnover }} />
        <Stat label="off. reb" value={pct(agg.offRebRate)} toggle={toggle} filter={{ id: "stat:off-reb", label: "Off. rebound", test: (p) => p.offReb > 0 }} />
        <Stat label="passes / poss" value={one(agg.avgPasses)} />
      </div>

      {/* outcome distribution */}
      <section className="flex flex-col gap-2">
        <SectionTitle>Most common outcomes</SectionTitle>
        <div className="flex flex-col gap-1.5">
          {outcomeBars.map((b) => (
            <Bar key={b.filter.id} label={b.label} value={b.value} count={b.count} filter={b.filter} toggle={toggle} />
          ))}
        </div>
      </section>

      {/* shot profile */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <SectionTitle>Shots by type</SectionTitle>
          <div className="flex flex-col gap-1.5">
            {shotTypes.length ? (
              shotTypes.map(([t, v]) => (
                <Bar
                  key={t}
                  label={title(t)}
                  value={v}
                  filter={{ id: `shot:${t}`, label: `${title(t)} shot`, test: (p) => p.fgAttempted && p.shotType === t }}
                  toggle={toggle}
                />
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No shots attempted.</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <SectionTitle>Shot quality (openness)</SectionTitle>
          <div className="flex flex-col gap-1.5">
            {openness.length ? (
              openness.map(([o, v]) => (
                <Bar
                  key={o}
                  label={title(o.replace("_", " "))}
                  value={v}
                  filter={{
                    id: `openness:${o}`,
                    label: `${title(o.replace("_", " "))} shot`,
                    test: (p) => p.fgAttempted && p.openness === o,
                  }}
                  toggle={toggle}
                />
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No shots attempted.</span>
            )}
          </div>
        </div>
      </section>

      {/* per-player breakdown */}
      <section className="flex flex-col gap-4">
        <SectionTitle>By player</SectionTitle>
        <PlayerGroup title={`${config.offenseTeam} — offense`} side="offense" lines={offenseLines} sets={sets} toggle={toggle} />
        <PlayerGroup title={`${config.defenseTeam} — defense`} side="defense" lines={defenseLines} sets={sets} toggle={toggle} />
      </section>
    </div>
  );
}
