"use client";
/* ============================================================
   PossessionLab — script a single possession in a sandboxed
   game (the real game is untouched): pick the play, the
   coverage, where the inbound starts, and a job for each
   player. The sandbox freezes when the possession ends.
   ============================================================ */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { BoxTeam, PossessionOpts, Snapshot } from "@/hooks/useGame";
import type { DefScheme, PlayCall, PlayerAssignment, SimEvent } from "@/lib/types";

const PLAYS: { value: PlayCall; label: string; blurb: string }[] = [
  { value: "motion", label: "Motion", blurb: "free-flowing offense, everyone hunts a spot" },
  { value: "iso", label: "Isolation", blurb: "clear out and let the star go to work" },
  { value: "pnr", label: "Pick & roll", blurb: "screen for the handler, roll to the rim" },
  { value: "post", label: "Post-up", blurb: "feed the big on the block" },
];

const SCHEMES: { value: DefScheme; label: string; blurb: string }[] = [
  { value: "man", label: "Man-to-man", blurb: "stick with your matchup" },
  { value: "switch", label: "Switch everything", blurb: "trade assignments on every screen" },
  { value: "zone", label: "2-3 Zone", blurb: "guard your area, pack the paint" },
];

const ASSIGNMENTS: { value: PlayerAssignment | "auto"; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "handler", label: "Ball handler" },
  { value: "screener", label: "Screener" },
  { value: "focus", label: "Go-to guy" },
  { value: "corner", label: "Corner" },
  { value: "wing", label: "Wing" },
  { value: "top", label: "Top of key" },
  { value: "dunker", label: "Dunker spot" },
];

interface PossessionLabProps {
  teams: BoxTeam[];
  snapshot: Snapshot;
  events: SimEvent[];
  onRun: (opts: PossessionOpts) => void;
  onResume: () => void;
}

export function PossessionLab({ teams, snapshot, events, onRun, onResume }: PossessionLabProps) {
  const [offense, setOffense] = useState(0);
  const [play, setPlay] = useState<PlayCall>("pnr");
  const [scheme, setScheme] = useState<DefScheme>("man");
  const [start, setStart] = useState<"full" | "half">("half");
  const [assignments, setAssignments] = useState<(PlayerAssignment | "auto")[]>(
    Array(5).fill("auto")
  );

  if (teams.length < 2) return null;
  const offTeam = teams[offense];
  const playMeta = PLAYS.find((p) => p.value === play)!;
  const schemeMeta = SCHEMES.find((s) => s.value === scheme)!;

  const setAssignment = (slot: number, v: PlayerAssignment | "auto") => {
    setAssignments((prev) => {
      const next = [...prev];
      // unique roles: claiming handler/screener/focus releases it elsewhere
      if (v === "handler" || v === "screener" || v === "focus") {
        for (let i = 0; i < next.length; i++) if (next[i] === v) next[i] = "auto";
      }
      next[slot] = v;
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Script one possession in a sandbox — the real game is paused and untouched. Pick the
        play, the coverage, and a job for each player, then watch it unfold.
      </p>

      <div className="flex flex-col gap-1.5">
        <Label>Offense</Label>
        <div className="flex gap-1.5">
          {teams.map((t, ti) => (
            <Button
              key={ti}
              size="sm"
              variant={offense === ti ? "secondary" : "outline"}
              onClick={() => {
                setOffense(ti);
                setAssignments(Array(5).fill("auto"));
              }}
            >
              <span className="mr-1.5 size-2.5 rounded-full" style={{ background: t.color }} />
              {t.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Inbound from</Label>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant={start === "half" ? "secondary" : "outline"}
            onClick={() => setStart("half")}
          >
            Half court (sideline)
          </Button>
          <Button
            size="sm"
            variant={start === "full" ? "secondary" : "outline"}
            onClick={() => setStart("full")}
          >
            Full court (baseline)
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Play call</Label>
        <Select value={play} onValueChange={(v) => setPlay(v as PlayCall)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLAYS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{playMeta.blurb}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Defense ({teams[1 - offense].name})</Label>
        <Select value={scheme} onValueChange={(v) => setScheme(v as DefScheme)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCHEMES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{schemeMeta.blurb}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Player jobs</Label>
        {offTeam.players.map((bp, slot) => (
          <div key={bp.id} className="flex items-center gap-2">
            <span className="w-36 truncate text-sm">
              #{bp.number} {bp.name.split(" ").slice(-1)[0]}
            </span>
            <Select
              value={assignments[slot]}
              onValueChange={(v) => setAssignment(slot, v as PlayerAssignment | "auto")}
            >
              <SelectTrigger className="h-8 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENTS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          Jobs are drawn on the court next to each player during the possession.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() =>
            onRun({
              offense,
              play,
              defScheme: scheme,
              start,
              assignments: assignments.map((a) => (a === "auto" ? null : a)),
            })
          }
        >
          {snapshot.labActive ? "Run it again" : "Run possession"}
        </Button>
        {snapshot.labActive && (
          <Button variant="outline" onClick={onResume}>
            Back to game
          </Button>
        )}
      </div>

      {snapshot.labActive && (
        <div className="flex flex-col gap-1.5">
          <Label>Possession play-by-play</Label>
          <div className="flex flex-col rounded-md border">
            {events.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">Setting it up…</div>
            )}
            {events.map((e, i) => (
              <div
                key={i}
                className={cn(
                  "px-3 py-1.5 text-sm",
                  (e.type === "pass" || e.type === "info") && "text-muted-foreground"
                )}
              >
                {e.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
