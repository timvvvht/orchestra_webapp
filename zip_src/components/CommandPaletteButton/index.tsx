import React, { useEffect, useState } from "react";
import { Command } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { 
  Command as CommandPrimitive, 
  CommandInput, 
  CommandList, 
  CommandEmpty,
  CommandItem
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

  const actions = [
    { label: "New Task", cb: () => console.log("New task") },
    { label: "New Note", cb: () => console.log("New note") },
    { label: "Start Chat", cb: () => console.log("Start chat") },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground border border-border rounded-md hover:bg-accent transition-colors"
      >
        <Command className="h-3.5 w-3.5" />
        <span>Cmd+K</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <CommandPrimitive className="rounded-lg border shadow-lg">
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {actions.map((action) => (
              <CommandItem
                key={action.label}
                onSelect={() => {
                  action.cb();
                  setOpen(false);
                }}
              >
                {action.label}
              </CommandItem>
            ))}
          </CommandList>
        </CommandPrimitive>
      </Dialog>
    </>
  );
};

export default CommandPaletteButton;