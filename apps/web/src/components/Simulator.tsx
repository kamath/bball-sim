"use client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Share2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useGame } from "@/hooks/useGame";
import { useConfigPlays, useTeams } from "@/lib/queries";
import { fetchLibraryPlay, savePlay } from "@/lib/api";
import type { GameConfig, PlayerConfig, SimulateRequest } from "@repo/shared";
import { Court } from "./Court";
import { Feed } from "./Feed";
import { PlayLibrary } from "./PlayLibrary";
import { PossessionLab } from "./PossessionLab";
import { RosterEditor } from "./RosterEditor";
import { ShotClock } from "./ShotClock";
import { TeamPicker } from "./TeamPicker";

interface SimulatorProps {
  initialConfig: GameConfig;
  /** a shared play (from /play/{id}) to preload into the lab on first mount. */
  initialPlay?: SimulateRequest;
}

/** The two teams' full selectable rosters, in [home, away] order. */
const rostersOf = (cfg: GameConfig): [PlayerConfig[], PlayerConfig[]] => [
  cfg.teamA.roster ?? [],
  cfg.teamB.roster ?? [],
];

export function Simulator({ initialConfig, initialPlay }: SimulatorProps) {
  const game = useGame(initialConfig);
  const { data: teams = [] } = useTeams();
  const { snapshot } = game;
  const names = snapshot.teamMeta;
  // active sub-tab within the lab panel (designer / teams + roster edit)
  const [labTab, setLabTab] = useState("lab");
  // each team's full roster, so the editor can swap a starter for a teammate
  const [rosters, setRosters] = useState<[PlayerConfig[], PlayerConfig[]]>(() =>
    rostersOf(initialConfig)
  );
  // share-link state: idle → the saved /play/{id} url once copied
  const [shareStatus, setShareStatus] = useState<"idle" | "saving" | "copied">("idle");
  const queryClient = useQueryClient();

  // The matchup's play library: prior possessions recorded on this exact config.
  // Keyed by game.version so it re-searches when the matchup / roster changes.
  const { data: plays = [] } = useConfigPlays(game.getConfig(), game.version);
  // Show the library over the court on load / config change, until dismissed or
  // a play is picked. Reset the dismissal whenever the matchup changes.
  const [libraryDismissed, setLibraryDismissed] = useState(false);
  const [loadingPlay, setLoadingPlay] = useState<string | null>(null);
  useEffect(() => {
    setLibraryDismissed(false);
  }, [game.version]);
  // A freshly-run possession is auto-recorded; refresh the library so it shows up.
  useEffect(() => {
    if (game.labPhase === "ended") {
      queryClient.invalidateQueries({ queryKey: ["configPlays"] });
    }
  }, [game.labPhase, queryClient]);

  const showLibrary = !libraryDismissed && plays.length > 0;

  // Pick a recorded play: load its exact replay and reveal the court to watch it.
  const onSelectPlay = async (simId: string) => {
    setLoadingPlay(simId);
    try {
      const stored = await fetchLibraryPlay(simId);
      game.playStored(stored.request, stored.replay);
      setLibraryDismissed(true);
    } catch {
      /* leave the library open so another play can be tried */
    } finally {
      setLoadingPlay(null);
    }
  };

  const onShare = async () => {
    const play = game.capturePlay();
    if (!play) return;
    setShareStatus("saving");
    try {
      const { id } = await savePlay(play);
      const url = `${window.location.origin}/play/${id}`;
      await navigator.clipboard?.writeText(url).catch(() => {});
      setShareStatus("copied");
      window.setTimeout(() => setShareStatus("idle"), 2500);
    } catch {
      setShareStatus("idle");
    }
  };

  return (
    <div className="mx-auto flex h-screen max-w-[1400px] flex-col gap-4 overflow-hidden p-4">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-xl font-semibold">Fable Fieldhouse</h1>
        <span className="text-sm text-muted-foreground">Play Lab</span>
        {names.length === 2 && (
          <span className="ml-auto text-sm text-muted-foreground">
            {names[0].name} vs {names[1].name}
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 ${names.length === 2 ? "" : "ml-auto"}`}
          onClick={onShare}
          disabled={shareStatus === "saving"}
          title="Save this play and copy a shareable link"
        >
          {shareStatus === "copied" ? (
            <Check data-icon="inline-start" />
          ) : (
            <Share2 data-icon="inline-start" />
          )}
          {shareStatus === "copied"
            ? "Link copied"
            : shareStatus === "saving"
              ? "Saving…"
              : "Share play"}
        </Button>
      </header>

      <ShotClock snapshot={snapshot} />

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:grid-rows-[minmax(0,1fr)]">
        <div className="relative flex flex-col gap-4">
          <Court
            canvasRef={game.canvasRef}
            playing={game.playing}
            speed={game.speed}
            canReplay={game.hasReplay}
            labPhase={game.labPhase}
            simulating={game.simulating}
            onTogglePlay={game.togglePlay}
            onReplay={game.replay}
            onExport={game.exportReplay}
            onSetSpeed={game.setSpeed}
            onRun={game.runLab}
            onReRun={game.reRunLab}
            onReset={game.resetLab}
          />
          <Feed
            events={game.labEvents}
            snapshot={snapshot}
            title="Possession play-by-play"
            className="h-[220px]"
          />
          {showLibrary && (
            <PlayLibrary
              plays={plays}
              loadingId={loadingPlay}
              onSelect={onSelectPlay}
              onDismiss={() => setLibraryDismissed(true)}
            />
          )}
        </div>

        <Tabs value={labTab} onValueChange={setLabTab} className="flex min-h-0 flex-col">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="lab">Play Lab</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
          </TabsList>

          {/* forceMount keeps the staged possession alive while you peek at the
              Teams tab; a new matchup bumps game.version, which remounts the
              designer on a fresh formation. */}
          <TabsContent value="lab" forceMount className="flex-1 min-h-0 data-[state=inactive]:hidden">
            <ScrollArea className="h-full pr-3">
              <PossessionLab
                key={game.version}
                teams={game.boxTeams}
                labPhase={game.labPhase}
                labTool={game.labTool}
                onStage={game.stageLab}
                onToolChange={game.setLabTool}
                onClearPaths={game.clearLabPaths}
                initialPlay={game.version === 0 ? initialPlay : undefined}
              />
            </ScrollArea>
          </TabsContent>

          {/* Teams: load a real matchup up top, then edit whoever's on the
              court below — the roster editor reflects the loaded lineup. */}
          <TabsContent value="teams" className="flex-1 min-h-0">
            <ScrollArea className="h-full pr-3">
              <div className="flex flex-col gap-4">
                <TeamPicker
                  teams={teams}
                  onLoad={(config) => {
                    game.newGame(config);
                    setRosters(rostersOf(config));
                  }}
                />
                <RosterEditor
                  teams={game.boxTeams}
                  rosters={rosters}
                  onEdit={game.editPlayer}
                  onSwap={game.swapPlayer}
                />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
