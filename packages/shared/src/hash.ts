/* ============================================================
   hash.ts — a stable content hash for a GameConfig, used as the
   "matchup key" that ties every recorded possession to the exact
   config (teams + rosters + edits) it was run on. Both the ingest
   path (stamped onto each analytics run) and the read path (the
   library search) hash the config the same way, so a roster edit
   produces a distinct — and correctly separate — library.

   Isomorphic: crypto.subtle exists on Workers, browsers, and
   modern Node, so this runs unchanged wherever @repo/shared does.
   ============================================================ */
import type { GameConfig } from "./types";

/** Serialize any JSON value with object keys sorted, so two equal configs that
    differ only in key order hash identically. */
function canonical(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(",")}}`;
}

/** SHA-256 the canonicalized config → 12 hex chars: short, stable, and
    collision-safe at app scale. */
export async function hashConfig(config: GameConfig): Promise<string> {
  const bytes = new TextEncoder().encode(canonical(config));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest).slice(0, 6)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
