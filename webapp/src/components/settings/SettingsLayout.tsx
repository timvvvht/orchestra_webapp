import React, { useState } from "react";
import { Settings, Palette, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SettingsSidebar from "./SettingsSidebar";

import ApiKeysSettings from "./sections/ApiKeysSettings";

type SettingsSection = {
  id: string;
  label: string;
  icon: React.ElementType;
  component: React.ReactNode;
};

export const sections: SettingsSection[] = [
  {
    id: "api-key",
    label: "API Key",
    icon: Palette,
    component: <ApiKeysSettings />,
  },
];

const SettingsLayout = () => {
  const [activeSection, setActiveSection] = useState("api-key");
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header - Updated to match design spec 4.1 */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-surface-1/80 border-b border-border">
        <div className="px-6 py-4 flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground tracking-tight">
              Settings
            </h1>
          </div>
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-md border border-border bg-surface-1 hover:bg-surface-2 transition-all text-sm text-foreground focus-visible-ring"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <SettingsSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        {/* Content Area without Animation */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto py-8 px-6 bg-gray-300">
            {
              sections.find((section) => section.id === activeSection)
                ?.component
            }
          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsLayout;
