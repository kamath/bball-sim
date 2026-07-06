/* ============================================================
   artifactStats.ts — client-side rollups over a SimArtifact.

   The backend returns normalized tables (players + contributions);
   the "by whom" breakdowns the UI shows are a group-by over
   contributions joined to players — cheap, since one batch is at
   most a few thousand rows. No extra backend work.
   ============================================================ */
import type { SimArtifact, ShotType } from "@repo/shared";

/** The field-goal range buckets (ft is tracked separately as free throws). */
export const FG_TYPES: Exclude<ShotType, "ft">[] = ["three", "mid", "inside", "dunk"];

/** One player's line for the batch: volume + efficiency, derived from the
    contribution rows credited to that playerId. */
export interface PlayerLine {
  id: number;
  team: number;
  name: string;
  number: number;
  position: string;
  passes: number;
  fga: number;
  fgm: number;
  points: number;
  ast: number;
  offReb: number;
  defReb: number;
  tov: number;
  stl: number;
  blk: number;
  /** opponent field-goal attempts this player contested (defended within 4.5 ft). */
  contests: number;
  /** personal fouls committed. */
  fouls: number;
  ftm: number;
  fta: number;
  /** attempts and makes by range bucket. */
  byType: Record<Exclude<ShotType, "ft">, { a: number; m: number }>;
  /** mean engine make-probability of this player's FG attempts (0–1), or null. */
  avgQuality: number | null;
}

const emptyLine = (p: SimArtifact["players"][number]): PlayerLine => ({
  id: p.id,
  team: p.team,
  name: p.name,
  number: p.number,
  position: p.position,
  passes: 0,
  fga: 0,
  fgm: 0,
  points: 0,
  ast: 0,
  offReb: 0,
  defReb: 0,
  tov: 0,
  stl: 0,
  blk: 0,
  contests: 0,
  fouls: 0,
  ftm: 0,
  fta: 0,
  byType: { three: { a: 0, m: 0 }, mid: { a: 0, m: 0 }, inside: { a: 0, m: 0 }, dunk: { a: 0, m: 0 } },
  avgQuality: null,
});

/** Group the contribution table by player into per-player box-score-plus lines,
    ordered by team then slot (the artifact's players order). */
export function perPlayerStats(artifact: SimArtifact): PlayerLine[] {
  const lines = new Map<number, PlayerLine>();
  for (const p of artifact.players) lines.set(p.id, emptyLine(p));

  const quality = new Map<number, { sum: number; n: number }>();
  for (const c of artifact.contributions) {
    const line = lines.get(c.playerId);
    if (!line) continue;
    switch (c.kind) {
      case "pass":
        line.passes++;
        break;
      case "assist":
        line.ast++;
        break;
      case "off_reb":
        line.offReb++;
        break;
      case "def_reb":
        line.defReb++;
        break;
      case "turnover":
        line.tov++;
        break;
      case "steal":
        line.stl++;
        break;
      case "block":
        line.blk++;
        break;
      case "contest":
        line.contests++;
        break;
      case "foul_committed":
        line.fouls++;
        break;
      case "shot_make":
      case "shot_miss": {
        line.fga++;
        const made = c.kind === "shot_make";
        if (made) {
          line.fgm++;
          line.points += c.points ?? 0;
        }
        // a swatted attempt carries no range bucket; it still counts as an FGA
        if (c.shotType && c.shotType !== "ft") {
          const bucket = line.byType[c.shotType];
          bucket.a++;
          if (made) bucket.m++;
        }
        if (c.shotQuality != null) {
          const q = quality.get(c.playerId) ?? { sum: 0, n: 0 };
          q.sum += c.shotQuality;
          q.n++;
          quality.set(c.playerId, q);
        }
        break;
      }
      case "ft_make":
        line.fta++;
        line.ftm++;
        line.points += c.points ?? 1;
        break;
      case "ft_miss":
        line.fta++;
        break;
    }
  }
  for (const [id, q] of quality) {
    const line = lines.get(id);
    if (line && q.n) line.avgQuality = q.sum / q.n;
  }
  return [...lines.values()];
}

/** Sort a histogram (outcome type → count) into descending [label, count] pairs. */
export function rankHistogram(hist: Record<string, number>): [string, number][] {
  return Object.entries(hist).sort((a, b) => b[1] - a[1]);
}

/** How the batch's possessions ended, with field goals split by 2/3pt and free
    throws carrying their make rate. Made/missed are keyed off each possession's
    terminal shot; blocks fold into missed 2s, dunks into made 2s. Everything
    that isn't a field goal or a trip to the line stays in `other`. */
export interface OutcomeBreakdown {
  n: number;
  made: { total: number; two: number; three: number };
  missed: { total: number; two: number; three: number };
  /** possessions that ended at the free-throw line. */
  ftPlays: number;
  /** the remaining terminal outcomes (turnovers, etc.), ranked by frequency. */
  other: [string, number][];
}

export function outcomeBreakdown(artifact: SimArtifact): OutcomeBreakdown {
  const n = artifact.possessions.length;
  const made = { total: 0, two: 0, three: 0 };
  const missed = { total: 0, two: 0, three: 0 };
  let ftPlays = 0;
  const otherHist: Record<string, number> = {};

  for (const p of artifact.possessions) {
    if (p.fgMade) {
      made.total++;
      if (p.shotType === "three") made.three++;
      else made.two++;
    } else if (p.fgAttempted) {
      missed.total++;
      if (p.shotType === "three") missed.three++;
      else missed.two++;
    } else if (p.outcomeType === "freethrow") {
      ftPlays++;
    } else {
      otherHist[p.outcomeType] = (otherHist[p.outcomeType] ?? 0) + 1;
    }
  }

  return {
    n,
    made,
    missed,
    ftPlays,
    other: rankHistogram(otherHist),
  };
}

/** Human labels for the coarse outcome-type buckets. */
export const OUTCOME_LABELS: Record<string, string> = {
  score: "Made FG",
  dunk: "Dunk",
  miss: "Missed FG",
  block: "Blocked",
  steal: "Turnover (steal)",
  turnover: "Turnover",
  freethrow: "Free throws",
  rebound: "Rebound",
  recover: "Loose ball",
  info: "No result",
};
