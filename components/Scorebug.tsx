"use client";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Snapshot } from "@/hooks/useGame";

function TeamSide({
  meta,
  score,
  hasPoss,
  align,
}: {
  meta?: { abbr: string; color: string };
  score: number;
  hasPoss: boolean;
  align: "start" | "end";
}) {
  return (
    <div className={cn("flex flex-1 items-center gap-3", align === "end" && "flex-row-reverse")}>
      <span className="size-3 rounded-full" style={{ background: meta?.color ?? "#555" }} />
      <span className="font-display text-2xl font-extrabold tracking-wide">{meta?.abbr ?? "---"}</span>
      <span
        className={cn(
          "size-2 rounded-full transition-opacity",
          hasPoss ? "opacity-100" : "opacity-0"
        )}
        style={{ background: "#ffca3a" }}
      />
      <span className="font-mono text-4xl font-bold tabular-nums">{score}</span>
    </div>
  );
}

export function Scorebug({ snapshot }: { snapshot: Snapshot }) {
  const { teamMeta, scores, qLabel, clock, shotClock, shotClockActive, possession, over } = snapshot;
  return (
    <Card className="flex items-center gap-4 px-5 py-3">
      <TeamSide meta={teamMeta[0]} score={scores[0]} hasPoss={!over && possession === 0} align="start" />
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-display text-sm font-semibold tracking-widest text-muted-foreground">
          {qLabel}
        </span>
        <span className="font-mono text-2xl font-bold tabular-nums">{clock}</span>
        <span
          className={cn(
            "font-mono text-sm font-semibold tabular-nums",
            over && "text-muted-foreground",
            !over && shotClockActive && shotClock <= 5 && "text-destructive",
            !over && !shotClockActive && "text-muted-foreground/50"
          )}
        >
          {over ? "--" : shotClock}
        </span>
      </div>
      <TeamSide meta={teamMeta[1]} score={scores[1]} hasPoss={!over && possession === 1} align="end" />
    </Card>
  );
}
