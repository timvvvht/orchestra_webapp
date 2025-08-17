import React, { useEffect, useState } from "react";
import { Command } from "lucide-react";
import { 
  CommandDialog, 
  CommandInput, 
  CommandList, 
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut
} from "@/components/ui/command";

const CommandPaletteButton: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(open => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const commandGroups = [
    {
      heading: "Create",
      commands: [
        { label: "New Agent", icon: "👤", shortcut: "⌘A", action: () => console.log("New agent") },
        { label: "New Team", icon: "👥", shortcut: "⌘T", action: () => console.log("New team") },
        { label: "New Note", icon: "📝", shortcut: "⌘N", action: () => console.log("New note") },
        { label: "New Task", icon: "✓", shortcut: "⌘⇧T", action: () => console.log("New task") },
      ],
    },
    {
      heading: "Navigate",
      commands: [
        { label: "Go to Dashboard", icon: "🏠", shortcut: "⌘D", action: () => console.log("Go to dashboard") },
        { label: "Go to Vault", icon: "📚", shortcut: "⌘V", action: () => console.log("Go to vault") },
        { label: "Go to Teams", icon: "👥", shortcut: "⌘⇧T", action: () => console.log("Go to teams") },
        { label: "Go to Settings", icon: "⚙️", shortcut: "⌘,", action: () => console.log("Go to settings") },
      ],
    },
    {
      heading: "Actions",
      commands: [
        { label: "Run Agent", icon: "▶️", shortcut: "⌘R", action: () => console.log("Run agent") },
        { label: "Pause Agent", icon: "⏸️", shortcut: "⌘P", action: () => console.log("Pause agent") },
        { label: "Search Vault", icon: "🔍", shortcut: "⌘F", action: () => console.log("Search vault") },
        { label: "Toggle Theme", icon: "🌓", shortcut: "⌘⇧L", action: () => console.log("Toggle theme") },
      ],
    },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground border border-border rounded-md hover:bg-muted/50 transition-colors"
      >
        <Command className="h-3.5 w-3.5" />
        <span>Cmd+K</span>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          {commandGroups.map((group) => (
            <CommandGroup key={group.heading} heading={group.heading}>
              {group.commands.map((command) => (
                <CommandItem
                  key={command.label}
                  onSelect={() => {
                    command.action();
                    setOpen(false);
                  }}
                >
                  <div className="mr-2">{command.icon}</div>
                  <span>{command.label}</span>
                  {command.shortcut && (
                    <CommandShortcut>{command.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default CommandPaletteButton;