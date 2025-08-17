import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  teamStatus?: 'auto' | 'paused' | 'off';
  onChangeStatus?: (status: 'auto' | 'paused' | 'off') => void;
  viewMode?: 'tasks' | 'email' | 'social';
  onChangeViewMode?: (mode: 'tasks' | 'email' | 'social') => void;
}

const CommandBar: React.FC<CommandBarProps> = ({ 
  teamStatus = 'off', 
  onChangeStatus = () => {}, 
  viewMode = 'tasks', 
  onChangeViewMode = () => {} 
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [recentCommands, setRecentCommands] = useState<CommandType[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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
    {
      id: "toggle-dark-mode",
      title: "Toggle Dark Mode",
      icon: Moon,
      handler: () => {
        document.documentElement.classList.toggle('dark');
        setOpen(false);
      },
      shortcut: "⌘D",
      keywords: ["theme", "dark", "light", "mode", "appearance"],
      category: "create",
      hotString: "dark",
    },
  ];

  const delegateCommands: CommandType[] = [
    {
      id: "run-agent",
      title: "Run Agent on Current Note",
      icon: Play,
      handler: () => {
        console.log("Run agent on current note");
        setOpen(false);
      },
      keywords: ["run", "agent", "note", "current", "execute"],
      category: "delegate",
      hotString: "run",
    },
    {
      id: "ask-agent",
      title: "Ask Specific Agent",
      icon: MessageCircle,
      handler: () => {
        console.log("Ask specific agent");
        setOpen(false);
      },
      keywords: ["ask", "agent", "question", "specific"],
      category: "delegate",
      hotString: "ask",
    },
    {
      id: "assign-task",
      title: "Assign Task to Agent",
      icon: ArrowRight,
      handler: () => {
        console.log("Assign task to agent");
        setOpen(false);
      },
      keywords: ["assign", "task", "agent"],
      category: "delegate",
      hotString: "assign",
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
      id: "pause-agent",
      title: "Pause Specific Agent",
      icon: PauseCircle,
      handler: () => {
        console.log("Pause specific agent");
        setOpen(false);
      },
      keywords: ["pause", "agent", "specific", "stop"],
      category: "control",
      hotString: "pause [agent]",
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
    {
      id: "toggle-mode",
      title: "Toggle Auto-Pilot vs Observer",
      icon: Eye,
      handler: () => {
        console.log("Toggle mode");
        setOpen(false);
      },
      keywords: ["mode", "toggle", "auto", "pilot", "observer"],
      category: "control",
      hotString: "mode",
    },
  ];

  const navigationCommands: CommandType[] = [
    {
      id: "go-to-dashboard",
      title: "Go to Dashboard",
      icon: LayoutGrid,
      handler: () => {
        navigate("/dashboard");
        setOpen(false);
      },
      shortcut: "⌘1",
      keywords: ["dashboard", "home", "go", "navigate"],
      category: "navigate",
      hotString: "dash",
    },
    {
      id: "go-to-teams",
      title: "Go to Teams",
      icon: Users,
      handler: () => {
        navigate("/teams");
        setOpen(false);
      },
      shortcut: "⌘2",
      keywords: ["teams", "go", "navigate"],
      category: "navigate",
      hotString: "teams",
    },
    {
      id: "go-to-agents",
      title: "Go to Agents",
      icon: UserPlus,
      handler: () => {
        navigate("/agents");
        setOpen(false);
      },
      shortcut: "⌘3",
      keywords: ["agents", "go", "navigate"],
      category: "navigate",
      hotString: "agents",
    },
    {
      id: "go-to-vault",
      title: "Go to Vault",
      icon: BookOpen,
      handler: () => {
        navigate("/vault");
        setOpen(false);
      },
      shortcut: "⌘4",
      keywords: ["vault", "knowledge", "go", "navigate"],
      category: "navigate",
      hotString: "vault",
    },
    {
      id: "go-to-settings",
      title: "Go to Settings",
      icon: Settings,
      handler: () => {
        navigate("/settings");
        setOpen(false);
      },
      shortcut: "⌘,",
      keywords: ["settings", "preferences", "options", "configure"],
      category: "navigate",
      hotString: "settings",
    },
  ];

  const allCommands = [
    ...createCommands,
    ...delegateCommands,
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
        
        {search.trim() === "" && recentCommands.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recentCommands.map((command) => (
                <CommandItem
                  key={command.id}
                  onSelect={() => executeCommand(command)}
                >
                  <command.icon className="mr-2 h-4 w-4" />
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

        {prioritizedCommands.length > 0 && (
          <>
            <CommandGroup heading="Create">
              {prioritizedCommands
                .filter((cmd) => cmd.category === "create")
                .map((command) => (
                  <CommandItem
                    key={command.id}
                    onSelect={() => executeCommand(command)}
                  >
                    <command.icon className="mr-2 h-4 w-4" />
                    <span>{command.title}</span>
                    {command.shortcut && (
                      <CommandShortcut>{command.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                ))}
            </CommandGroup>

            <CommandGroup heading="Delegate">
              {prioritizedCommands
                .filter((cmd) => cmd.category === "delegate")
                .map((command) => (
                  <CommandItem
                    key={command.id}
                    onSelect={() => executeCommand(command)}
                  >
                    <command.icon className="mr-2 h-4 w-4" />
                    <span>{command.title}</span>
                    {command.shortcut && (
                      <CommandShortcut>{command.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                ))}
            </CommandGroup>

            <CommandGroup heading="Control">
              {prioritizedCommands
                .filter((cmd) => cmd.category === "control")
                .map((command) => (
                  <CommandItem
                    key={command.id}
                    onSelect={() => executeCommand(command)}
                  >
                    <command.icon className="mr-2 h-4 w-4" />
                    <span>{command.title}</span>
                    {command.shortcut && (
                      <CommandShortcut>{command.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                ))}
            </CommandGroup>

            <CommandGroup heading="Navigate">
              {prioritizedCommands
                .filter((cmd) => cmd.category === "navigate")
                .map((command) => (
                  <CommandItem
                    key={command.id}
                    onSelect={() => executeCommand(command)}
                  >
                    <command.icon className="mr-2 h-4 w-4" />
                    <span>{command.title}</span>
                    {command.shortcut && (
                      <CommandShortcut>{command.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default CommandBar;