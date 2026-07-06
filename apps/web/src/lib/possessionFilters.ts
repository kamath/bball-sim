/* ============================================================
   possessionFilters.ts — the filter model shared between the
   aggregate (which authors filters) and the possession list
   (which applies them).

   A PossessionFilter is a labeled predicate over one simulated
   possession. Clicking any aggregate element (a headline stat, an
   outcome/shot bar, or a player chip) toggles the matching filter;
   the possession list shows every run matching ANY active filter
   (a union), tagging each row with the filters it belongs to.
   ============================================================ */
import type { ArtifactPossession, SimArtifact } from "@repo/shared";

/** A labeled predicate over a possession, keyed by a stable id so the same
    aggregate element toggles the same filter on and off. */
export interface PossessionFilter {
  id: string;
  label: string;
  test: (p: ArtifactPossession) => boolean;
}

/** The player-chip categories that map to a per-possession predicate. Each is a
    contribution kind (or a shot bucket) a player recorded on the possession. */
export type ChipKind =
  | "pts"
  | "pass"
  | "fg"
  | "three"
  | "mid"
  | "inside"
  | "dunk"
  | "ast"
  | "offReb"
  | "tov"
  | "defReb"
  | "contest"
  | "stl"
  | "blk"
  | "foul";

/** For each player, the set of simIds on which they recorded each chip kind —
    so a chip filter is just a `set.has(p.simId)` membership test. Built once per
    artifact by walking the contribution table. */
export function playerSimSets(artifact: SimArtifact): Map<number, Map<ChipKind, Set<string>>> {
  const out = new Map<number, Map<ChipKind, Set<string>>>();
  const add = (playerId: number, kind: ChipKind, simId: string) => {
    let byKind = out.get(playerId);
    if (!byKind) out.set(playerId, (byKind = new Map()));
    let ids = byKind.get(kind);
    if (!ids) byKind.set(kind, (ids = new Set()));
    ids.add(simId);
  };
  for (const c of artifact.contributions) {
    switch (c.kind) {
      case "pass":
        add(c.playerId, "pass", c.simId);
        break;
      case "assist":
        add(c.playerId, "ast", c.simId);
        break;
      case "off_reb":
        add(c.playerId, "offReb", c.simId);
        break;
      case "def_reb":
        add(c.playerId, "defReb", c.simId);
        break;
      case "turnover":
        add(c.playerId, "tov", c.simId);
        break;
      case "steal":
        add(c.playerId, "stl", c.simId);
        break;
      case "block":
        add(c.playerId, "blk", c.simId);
        break;
      case "contest":
        add(c.playerId, "contest", c.simId);
        break;
      case "foul_committed":
        add(c.playerId, "foul", c.simId);
        break;
      case "shot_make":
      case "shot_miss":
        add(c.playerId, "fg", c.simId);
        if (c.kind === "shot_make") add(c.playerId, "pts", c.simId);
        if (c.shotType && c.shotType !== "ft") add(c.playerId, c.shotType as ChipKind, c.simId);
        break;
      case "ft_make":
        add(c.playerId, "pts", c.simId);
        break;
    }
  }
  return out;
}

/** Build a player-chip filter from a precomputed simId set, or null when the
    player never recorded that stat (so the chip stays non-interactive). */
export function chipFilter(
  playerId: number,
  playerName: string,
  kind: ChipKind,
  chipLabel: string,
  ids: Set<string> | undefined
): PossessionFilter | null {
  if (!ids || ids.size === 0) return null;
  return {
    id: `player:${playerId}:${kind}`,
    label: `${playerName} · ${chipLabel}`,
    test: (p) => ids.has(p.simId),
  };
}
