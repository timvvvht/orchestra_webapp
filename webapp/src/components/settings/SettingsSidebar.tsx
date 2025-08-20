import React from "react";
import {
  Settings,
  FolderGit2,
  KeyRound,
  Palette,
  Keyboard,
  CreditCard,
  Bell,
  Bug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sections } from "./SettingsLayout";

interface SettingsSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

type SettingsSection = {
  id: string;
  label: string;
  icon: React.ElementType;
};

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  activeSection,
  onSectionChange,
}) => {
  return (
    <nav className="w-[320px] border-r border-border bg-surface-1/80 backdrop-blur-md">
      <div className="p-6 space-y-6">
        <ul className="space-y-0.5">
          {sections.map((section) => (
            <li key={section.id}>
              <button
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-all focus-visible-ring cursor-pointer",
                  activeSection === section.id
                    ? "bg-primary/20 text-primary ses"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                )}
              >
                <section.icon
                  className={cn(
                    "w-5 h-5",
                    activeSection === section.id
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                />
                <span className="font-medium">{section.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default SettingsSidebar;
