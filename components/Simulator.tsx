"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGame } from "@/hooks/useGame";
import type { GameConfig } from "@/lib/types";
import type { TeamOption } from "@/app/actions";
import { BoxScore } from "./BoxScore";
import { Court } from "./Court";
import { Feed } from "./Feed";
import { RosterEditor } from "./RosterEditor";
import { Scorebug } from "./Scorebug";
import { TeamPicker } from "./TeamPicker";

interface SimulatorProps {
  initialConfig: GameConfig;
  teams: TeamOption[];
}

export function Simulator({ initialConfig, teams }: SimulatorProps) {
  const game = useGame(initialConfig);
  const { snapshot } = game;
  const names = snapshot.teamMeta;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4 p-4">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="size-2.5 animate-pulse rounded-full bg-destructive" />
        <span className="font-display text-xl font-extrabold tracking-widest">FABLE FIELDHOUSE</span>
        <span className="text-xs font-semibold tracking-widest text-muted-foreground">
          LIVE SIMULATION
        </span>
        {names.length === 2 && (
          <span className="ml-auto font-mono text-sm text-muted-foreground">
            {names[0].name} <em className="not-italic">vs</em> {names[1].name}
          </span>
        )}
      </header>

      <Scorebug snapshot={snapshot} />

      <main className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Court
          canvasRef={game.canvasRef}
          playing={game.playing}
          speed={game.speed}
          onTogglePlay={game.togglePlay}
          onNewGame={() => game.newGame()}
          onSetSpeed={game.setSpeed}
        />

        <Tabs defaultValue="feed" className="flex flex-col">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="feed">Play-by-play</TabsTrigger>
            <TabsTrigger value="box">Box score</TabsTrigger>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
          </TabsList>

          <TabsContent value="feed">
            <Feed events={game.events} snapshot={snapshot} />
          </TabsContent>

          <TabsContent value="box">
            <ScrollArea className="h-[60vh] pr-3">
              <BoxScore teams={game.boxTeams} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="edit">
            <ScrollArea className="h-[60vh] pr-3">
              <RosterEditor teams={game.boxTeams} onEdit={game.editPlayer} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="teams">
            <TeamPicker teams={teams} onLoad={(config) => game.newGame(config)} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
