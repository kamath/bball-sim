"use client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Snapshot } from "@/hooks/useGame";
import type { SimEvent } from "@/lib/types";

const SCORE_TYPES = new Set(["score", "dunk"]);

export function Feed({ events, snapshot }: { events: SimEvent[]; snapshot: Snapshot }) {
  const colors = snapshot.teamMeta.map((t) => t.color);
  return (
    <ScrollArea className="h-[60vh] rounded-md border border-border">
      <div className="flex flex-col">
        {events.map((e, i) => {
          if (e.type === "period" || e.type === "final") {
            return (
              <div
                key={i}
                className={cn(
                  "border-b border-border/50 px-3 py-2 text-center text-sm font-semibold tracking-wide text-muted-foreground",
                  e.type === "final" && "text-foreground"
                )}
              >
                {e.text}
              </div>
            );
          }
          const tc = e.team == null ? "#777" : colors[e.team];
          return (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 border-b border-border/40 px-3 py-1.5 text-sm",
                SCORE_TYPES.has(e.type) && "bg-muted/40"
              )}
              style={{ borderLeft: `3px solid ${tc}` }}
            >
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {e.qLabel} {e.clock}
              </span>
              <span className={cn(SCORE_TYPES.has(e.type) && "font-semibold")}>{e.text}</span>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
