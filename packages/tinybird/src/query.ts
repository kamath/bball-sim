/* ============================================================
   query.ts — the read side of @repo/tinybird: thin, typed calls to
   the published API Endpoints (`.pipe` files). Mirrors ingest.ts —
   dependency-free (uses fetch), Bearer-token auth — so it runs
   unchanged on a Worker, in Node, or in the browser.

   Used by the backend to power the matchup play library:
     plays_for_config  — every recorded run of one exact matchup
     get_config        — the verbatim config/plan/setup of one run
   ============================================================ */
import type { TinybirdConfig } from "./ingest";

/** One row from the `plays_for_config` endpoint — a play's outcome summary. */
export interface PlayForConfigRow {
  sim_id: string;
  timestamp: string;
  offense: number;
  offense_team: string;
  result: string;
  points: number;
  final_score_a: number;
  final_score_b: number;
}

/** One row from the `get_config` endpoint — a run's verbatim configuration. */
export interface RunConfigRow {
  sim_id: string;
  offense: number;
  config: string;
  plan: string;
  def_plan: string;
  setup: string;
}

/** GET a published pipe as JSON and return its `data` rows. Reads need a token
    with PIPES:READ scope for the endpoint (an admin/read token works). */
async function queryPipe<T>(
  cfg: TinybirdConfig,
  pipe: string,
  params: Record<string, string | number | undefined>
): Promise<T[]> {
  const url = new URL(`${cfg.host.replace(/\/$/, "")}/v0/pipes/${pipe}.json`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: { Authorization: `Bearer ${cfg.token}` } });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Tinybird read ${pipe} failed: ${res.status} ${res.statusText} ${detail}`);
  }
  const body = (await res.json()) as { data?: T[] };
  return body.data ?? [];
}

/** Every recorded play run on one matchup (by config hash), newest first. */
export function listPlaysForConfig(
  cfg: TinybirdConfig,
  configHash: string,
  limit = 50
): Promise<PlayForConfigRow[]> {
  return queryPipe<PlayForConfigRow>(cfg, "plays_for_config", { matchup: configHash, limit });
}

/** The verbatim configuration one run was executed with, or null if unknown. */
export async function getRunConfig(
  cfg: TinybirdConfig,
  simId: string
): Promise<RunConfigRow | null> {
  const rows = await queryPipe<RunConfigRow>(cfg, "get_config", { id: simId });
  return rows[0] ?? null;
}
