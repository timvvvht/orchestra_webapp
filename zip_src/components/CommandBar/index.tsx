import React, { useEffect, useState, useRef } from "react";
import { Command } from "@/components/ui/command";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Settings,
  PauseCircle,
  Play,
  Power,
  Shield,
  LayoutGrid,
  Mail,
  MessageSquare,
  Search,
  Moon,
  Sun,
  Users,
  UserPlus,
  Clipboard,
  FileEdit,
  Plus,
  BookOpen,
  Key,
  StopCircle,
  Eye,
  FileDigit,
  ArrowRight,
  ListTodo,
  FolderOpen,
  MessageCircle,
  ChartBar,
  HelpCircle,
} from "lucide-react";

interface CommandType {
  id: string;
  title: string;
  icon: React.ElementType;
  handler: () => void;
  shortcut?: string;
  keywords?: string[];
  category: "create" | "delegate" | "control" | "inspect" | "navigate" | "contextual";
  hotString?: string;
}

interface CommandBarProps {
  teamStatus: 'auto' | 'paused' | 'off';
  onChangeStatus: (status: 'auto' | 'paused' | 'off') => void;
  viewMode: 'tasks' | 'email' | 'social';
  onChangeViewMode: (mode: 'tasks' | 'email' | 'social') => void;
}

const CommandBar: React.FC<CommandBarProps> = ({ 
  teamStatus, 
  onChangeStatus, 
  viewMode, 
  onChangeViewMode 
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [recentCommands, setRecentCommands] = useState<CommandType[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const createCommands: CommandType[] = [
    {
      id: "new-team",
      title: "New Team",
      icon: Users,
      handler: () => {
        console.log("Create new team");
        setOpen(false);
      },
      shortcut: "⌘T",
      keywords: ["team", "new", "create", "group"],
      category: "create",
      hotString: "nt",
    },
    {
      id: "new-agent",
      title: "New Agent from Template",
      icon: UserPlus,
      handler: () => {
        console.log("Create new agent from template");
        setOpen(false);
      },
      shortcut: "⌘A",
      keywords: ["agent", "new", "template", "create", "assistant"],
      category: "create",
      hotString: "na",
    },
    {
      id: "new-task",
      title: "New Task Card",
      icon: ListTodo,
      handler: () => {
        console.log("Create new task card");
        setOpen(false);
      },
      shortcut: "⌘N",
      keywords: ["task", "new", "create", "card"],
      category: "create",
      hotString: "ntask",
    },
    {
      id: "new-note",
      title: "New Vault Note",
      icon: FileEdit,
      handler: () => {
        console.log("Create new vault note");
        setOpen(false);
      },
      shortcut: "⌘⇧N",
      keywords: ["note", "new", "create", "vault", "document"],
      category: "create",
      hotString: "nn",
    },
  ];

  const controlCommands: CommandType[] = [
    teamStatus === "auto"
      ? {
          id: "pause-team",
          title: "Pause Team",
          icon: PauseCircle,
          handler: () => {
            onChangeStatus("paused");
            setOpen(false);
          },
          shortcut: "⌘P",
          keywords: ["pause", "team", "stop"],
          category: "control",
          hotString: "pause",
        }
      : teamStatus === "paused"
      ? {
          id: "resume-team",
          title: "Resume Team",
          icon: Play,
          handler: () => {
            onChangeStatus("auto");
            setOpen(false);
          },
          shortcut: "⌘R",
          keywords: ["resume", "team", "start", "play"],
          category: "control",
          hotString: "resume",
        }
      : {
          id: "start-team",
          title: "Start Team",
          icon: Power,
          handler: () => {
            onChangeStatus("auto");
            setOpen(false);
          },
          shortcut: "⌘S",
          keywords: ["start", "team", "power", "on"],
          category: "control",
          hotString: "start",
        },
    {
      id: "stop-run",
      title: "Kill Run-in-Progress",
      icon: StopCircle,
      handler: () => {
        console.log("Stop current run");
        setOpen(false);
      },
      shortcut: "⌘.",
      keywords: ["stop", "kill", "run", "progress", "interrupt"],
      category: "control",
      hotString: "stop run",
    },
  ];

  const navigationCommands: CommandType[] = [
    {
      id: "switch-to-tasks",
      title: "Switch to Task View",
      icon: LayoutGrid,
      handler: () => {
        onChangeViewMode("tasks");
        setOpen(false);
      },
      shortcut: "⌘1",
      keywords: ["tasks", "view", "switch", "board"],
      category: "navigate",
      hotString: "board",
    },
    {
      id: "switch-to-email",
      title: "Switch to Email View",
      icon: Mail,
      handler: () => {
        onChangeViewMode("email");
        setOpen(false);
      },
      shortcut: "⌘2",
      keywords: ["email", "mail", "view", "switch"],
      category: "navigate",
    },
    {
      id: "switch-to-social",
      title: "Switch to Social View",
      icon: MessageSquare,
      handler: () => {
        onChangeViewMode("social");
        setOpen(false);
      },
      shortcut: "⌘3",
      keywords: ["social", "media", "view", "switch"],
      category: "navigate",
    },
    {
      id: "open-settings",
      title: "Open Settings Dialog",
      icon: Settings,
      handler: () => {
        console.log("Open settings");
        setOpen(false);
      },
      shortcut: "⌘,",
      keywords: ["settings", "preferences", "options", "configure"],
      category: "navigate",
      hotString: "settings",
    },
    {
      id: "show-shortcuts",
      title: "Show Keyboard Shortcuts",
      icon: HelpCircle,
      handler: () => {
        console.log("Show keyboard shortcuts");
        setOpen(false);
      },
      shortcut: "⌘/",
      keywords: ["shortcuts", "keyboard", "help", "keys", "hotkeys"],
      category: "navigate",
      hotString: "help keys",
    },
  ];

  const allCommands = [
    ...createCommands,
    ...controlCommands,
    ...navigationCommands,
  ];

  const filteredCommands = search.trim() === ""
    ? allCommands
    : allCommands.filter((command) => {
        const searchTerm = search.toLowerCase();
        
        if (command.hotString && command.hotString.toLowerCase() === searchTerm) {
          return true;
        }
        
        if (command.hotString && command.hotString.toLowerCase().startsWith(searchTerm)) {
          return true;
        }
        
        return (
          command.title.toLowerCase().includes(searchTerm) ||
          command.keywords?.some((keyword) =>
            keyword.toLowerCase().includes(searchTerm)
          ) ||
          command.title
            .split(" ")
            .map((word) => word[0]?.toLowerCase())
            .join("")
            .includes(searchTerm)
        );
      });

  const prioritizedCommands = [...filteredCommands].sort((a, b) => {
    const aHotString = a.hotString?.toLowerCase() || "";
    const bHotString = b.hotString?.toLowerCase() || "";
    const searchTerm = search.toLowerCase();
    
    if (aHotString === searchTerm && bHotString !== searchTerm) return -1;
    if (bHotString === searchTerm && aHotString !== searchTerm) return 1;
    
    if (aHotString.startsWith(searchTerm) && !bHotString.startsWith(searchTerm)) return -1;
    if (bHotString.startsWith(searchTerm) && !aHotString.startsWith(searchTerm)) return 1;
    
    return a.title.localeCompare(b.title);
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  const executeCommand = (command: CommandType) => {
    command.handler();
    
    setRecentCommands((prev) => {
      const filtered = prev.filter((cmd) => cmd.id !== command.id);
      return [command, ...filtered].slice(0, 5);
    });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        ref={inputRef}
        placeholder="Type a command or search..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {recentCommands.length > 0 && search.trim() === "" && (
          <>
            <CommandGroup heading="Recent">
              {recentCommands.map((command) => (
                <CommandItem
                  key={command.id}
                  onSelect={() => executeCommand(command)}
                >
                  <div className="mr-2 flex h-4 w-4 items-center justify-center">
                    <command.icon className="h-3 w-3" />
                  </div>
                  <span>{command.title}</span>
                  {command.shortcut && (
                    <CommandShortcut>{command.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Create">
          {prioritizedCommands
            .filter((command) => command.category === "create")
            .map((command) => (
              <CommandItem
                key={command.id}
                onSelect={() => executeCommand(command)}
              >
                <div className="mr-2 flex h-4 w-4 items-center justify-center">
                  <command.icon className="h-3 w-3" />
                </div>
                <span>{command.title}</span>
                {command.shortcut && (
                  <CommandShortcut>{command.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            ))}
        </CommandGroup>

        <CommandGroup heading="Control">
          {prioritizedCommands
            .filter((command) => command.category === "control")
            .map((command) => (
              <CommandItem
                key={command.id}
                onSelect={() => executeCommand(command)}
              >
                <div className="mr-2 flex h-4 w-4 items-center justify-center">
                  <command.icon className="h-3 w-3" />
                </div>
                <span>{command.title}</span>
                {command.shortcut && (
                  <CommandShortcut>{command.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            ))}
        </CommandGroup>

        <CommandGroup heading="Navigate">
          {prioritizedCommands
            .filter((command) => command.category === "navigate")
            .map((command) => (
              <CommandItem
                key={command.id}
                onSelect={() => executeCommand(command)}
              >
                <div className="mr-2 flex h-4 w-4 items-center justify-center">
                  <command.icon className="h-3 w-3" />
                </div>
                <span>{command.title}</span>
                {command.shortcut && (
                  <CommandShortcut>{command.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandBar;