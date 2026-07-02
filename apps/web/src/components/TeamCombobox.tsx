"use client";
/* ============================================================
   TeamCombobox — searchable NBA team picker for a matchup slot.
   Replaces the old "Real NBA matchup" card: each side of the
   court is chosen right on its roster header. Picking a team
   rebuilds that slot's lineup from the real 2024-25 roster.
   ============================================================ */
import { useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { TeamOption } from "@repo/shared";

interface TeamComboboxProps {
  teams: TeamOption[];
  /** the team currently filling this slot, if any */
  selectedId: number | null;
  /** the other slot's team — hidden so a side can't face itself */
  excludeId: number | null;
  /** shown when this slot is rebuilding after a pick */
  loading?: boolean;
  color?: string;
  onSelect: (teamId: number) => void;
}

export function TeamCombobox({
  teams,
  selectedId,
  excludeId,
  loading,
  color,
  onSelect,
}: TeamComboboxProps) {
  const [open, setOpen] = useState(false);
  const current = teams.find((t) => t.id === selectedId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={loading}
          className="h-9 w-full justify-between gap-2 font-semibold"
        >
          <span className="flex min-w-0 items-center gap-2">
            {color && (
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: color }}
              />
            )}
            <span className="truncate">{current?.fullName ?? "Select a team"}</span>
          </span>
          {loading ? (
            <Loader2 className="size-3.5 shrink-0 animate-spin opacity-70" />
          ) : (
            <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search NBA teams…" />
          <CommandList>
            <CommandEmpty>No team found.</CommandEmpty>
            {teams.map((t) => (
              <CommandItem
                key={t.id}
                value={t.fullName}
                disabled={t.id === excludeId}
                onSelect={() => {
                  if (t.id !== selectedId) onSelect(t.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn("size-3.5", t.id === selectedId ? "opacity-100" : "opacity-0")}
                />
                <span className="flex-1 truncate">{t.fullName}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{t.abbr}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
