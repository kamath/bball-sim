"use client";
/* ============================================================
   CourtTools — the staging tools for the possession designer:
   move players, draw the routes they run, and clear those routes.
   Rendered beneath the court board so editing happens right where
   you see it. Only active while a possession is staged (frozen).
   ============================================================ */
import { Eraser, MousePointer2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LabPhase, LabTool } from "@/hooks/useGame";

interface CourtToolsProps {
  labPhase: LabPhase;
  labTool: LabTool;
  onToolChange: (t: LabTool) => void;
  onClearPaths: () => void;
}

export function CourtTools({ labPhase, labTool, onToolChange, onClearPaths }: CourtToolsProps) {
  const staged = labPhase === "staged";
  return (
    <div className="flex items-center gap-1 rounded-md border p-1">
      <Button
        size="sm"
        variant={labTool === "move" ? "secondary" : "ghost"}
        onClick={() => onToolChange("move")}
        disabled={!staged}
      >
        <MousePointer2 className="mr-1.5 size-3.5" /> Move
      </Button>
      <Button
        size="sm"
        variant={labTool === "path" ? "secondary" : "ghost"}
        onClick={() => onToolChange("path")}
        disabled={!staged}
      >
        <PenLine className="mr-1.5 size-3.5" /> Draw path
      </Button>
      <Button size="sm" variant="ghost" onClick={onClearPaths} disabled={!staged}>
        <Eraser className="mr-1.5 size-3.5" /> Clear paths
      </Button>
    </div>
  );
}
