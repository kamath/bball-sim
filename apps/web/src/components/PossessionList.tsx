"use client";
import { X } from "lucide-react";
import type { ArtifactPossession } from "@repo/shared";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { PossessionFilter } from "@/lib/possessionFilters";

/** Render a compute time as a compact, human duration (e.g. "842 ms", "1.2 s"). */
const fmtDuration = (ms: number): string =>
  ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;

/** The possession explorer that lives under the court: the full list of the
    batch's runs, narrowed to whatever filters are active on the aggregate. A run
    is shown when it matches ANY active filter (a union); with more than one
    filter active each row is tagged with the filters it belongs to. Clicking a
    run plays it back on the court; the run currently playing is highlighted. */
export function PossessionList({
  possessions,
  filters,
  activeSimId,
  durationMs,
  onSelect,
  onRemoveFilter,
  onClear,
  className,
}: {
  possessions: ArtifactPossession[];
  /** the active filters (union). Empty = show every possession. */
  filters: PossessionFilter[];
  /** simId of the run currently playing on the court — marked in the list */
  activeSimId?: string | null;
  /** how long the batch took to compute, shown next to the count */
  durationMs?: number | null;
  /** play a run on the court by its simId */
  onSelect: (simId: string) => void;
  /** drop one active filter by id */
  onRemoveFilter: (id: string) => void;
  /** drop every active filter */
  onClear: () => void;
  className?: string;
}) {
  const total = possessions.length;
  // keep each run's batch position so the row number is stable under filtering
  const rows = possessions.map((p, i) => ({ p, i }));
  const shown = filters.length ? rows.filter(({ p }) => filters.some((f) => f.test(p))) : rows;
  const n = shown.length;
  const totalPts = shown.reduce((sum, { p }) => sum + p.points, 0);
  const avg = n ? totalPts / n : 0;
  const scored = shown.filter(({ p }) => p.points > 0).length;
  const showPills = filters.length > 1;

  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-1.5", className)}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <Label>
          {filters.length ? `${n} of ${total} possessions` : `${total} possessions`}
        </Label>
        {durationMs != null && (
          <span className="text-sm font-normal text-muted-foreground">
            computed in {fmtDuration(durationMs)}
          </span>
        )}
        <span className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span>
            <span className="font-medium tabular-nums">{avg.toFixed(2)}</span>{" "}
            <span className="text-muted-foreground">pts/poss</span>
          </span>
          <span>
            <span className="font-medium tabular-nums">
              {n ? Math.round((scored / n) * 100) : 0}%
            </span>{" "}
            <span className="text-muted-foreground">scored</span>
          </span>
        </span>
      </div>

      {/* active filters — each removable, plus a clear-all */}
      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onRemoveFilter(f.id)}
              className="flex items-center gap-1 rounded-full bg-primary/15 py-0.5 pl-2.5 pr-1.5 text-xs font-medium text-foreground hover:bg-primary/25"
              title={`Remove filter: ${f.label}`}
            >
              {f.label}
              <X className="size-3 text-muted-foreground" />
            </button>
          ))}
          <button
            type="button"
            onClick={onClear}
            className="rounded-full px-2 py-0.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1 rounded-md border">
        <div className="flex flex-col">
          {n === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No possessions match the active filters.
            </div>
          )}
          {shown.map(({ p, i }) => {
            const active = p.simId === activeSimId;
            const matched = showPills ? filters.filter((f) => f.test(p)) : [];
            return (
              <button
                key={p.simId}
                type="button"
                onClick={() => onSelect(p.simId)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex items-start gap-2 border-l-2 px-3 py-1.5 text-left text-sm",
                  active ? "border-primary bg-muted" : "border-transparent",
                  "cursor-pointer hover:bg-muted/50"
                )}
                title="Play this possession on the court"
              >
                <span className="w-6 shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "w-7 shrink-0 pt-0.5 tabular-nums",
                    p.points > 0 ? "font-medium" : "text-muted-foreground"
                  )}
                >
                  {p.points > 0 ? `+${p.points}` : "0"}
                </span>
                <span className="flex flex-1 flex-col gap-1">
                  <span className={cn((active || p.points > 0) && "font-medium")}>{p.result}</span>
                  {matched.length > 0 && (
                    <span className="flex flex-wrap gap-1">
                      {matched.map((f) => (
                        <span
                          key={f.id}
                          className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground"
                        >
                          {f.label}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
