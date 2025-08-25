import LeftRail from "@/components/LeftTail";
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface MainLayoutContextType {
  // File state
  filePath: string | undefined;
  unsavedChanges: boolean;
  isLoading: boolean;
  error: string | null;

  // UI state
  showFilePanel: boolean;
  sidePanelWidth: number;
  filePanelRef: React.RefObject<HTMLDivElement | null>;

  // Functions
  setFilePath: (path: string | undefined) => void;
  setUnsavedChanges: (value: boolean) => void;
  setError: (error: string | null) => void;
  toggleFilePanel: () => void; // Kept for compatibility, though its behavior changes
  setSidePanelWidth: (width: number) => void;
  handleSave: () => Promise<boolean>;
}

const MainLayoutContext = createContext<MainLayoutContextType | undefined>(
  undefined
);

export const useMainLayout = () => {
  const context = useContext(MainLayoutContext);
  if (!context) {
    throw new Error("useMainLayout must be used within a MainLayoutProvider");
  }
  return context;
};

interface MainLayoutProviderProps {
  children: ReactNode;
  initialFilePath?: string;
}

export const MainLayoutProvider: React.FC<MainLayoutProviderProps> = ({
  children,
  initialFilePath,
}) => {
  // File state
  const [filePath, setFilePath] = useState<string | undefined>(initialFilePath);
  const [unsavedChanges, setUnsavedChanges] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [showFilePanel, setShowFilePanel] = useState<boolean>(true); // Default to true
  const [sidePanelWidth, setSidePanelWidth] = useState<number>(320);
  const filePanelRef = React.useRef<HTMLDivElement>(null);

  // Toggle file panel (now ensures it's shown)
  const toggleFilePanel = useCallback(() => {
    setShowFilePanel(true); // Ensures the panel is always set to true if called
  }, []);

  // Handle saving content
  const handleSave = useCallback(async (): Promise<boolean> => {
    if (isLoading || !unsavedChanges || !filePath) return false;

    try {
      console.log("Saving content to file:", filePath);
      // In a real app, this would save the file using Tauri's API

      setUnsavedChanges(false);
      console.log("File saved successfully");
      return true;
    } catch (err) {
      console.error("Error saving file:", err);
      setError(
        `Failed to save file: ${err instanceof Error ? err.message : String(err)}`
      );
      return false;
    }
  }, [isLoading, unsavedChanges, filePath]);

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events from input fields
      if (
        (e.target as HTMLElement)?.tagName === "INPUT" ||
        (e.target as HTMLElement)?.tagName === "TEXTAREA"
      ) {
        return;
      }

      // Save shortcut (Cmd+S or Ctrl+S)
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }

      // Toggle file panel (Cmd+P or Ctrl+P) - REMOVED
      // if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
      //   e.preventDefault();
      //   toggleFilePanel(); // This would now only ensure it shows
      //   return;
      // }
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [handleSave]); // toggleFilePanel removed from dependencies

  const value = {
    // File state
    filePath,
    unsavedChanges,
    isLoading,
    error,

    // UI state
    showFilePanel,
    sidePanelWidth,
    filePanelRef,

    // Functions
    setFilePath,
    setUnsavedChanges,
    setError,
    toggleFilePanel,
    setSidePanelWidth,
    handleSave,
  };

  return (
    <MainLayoutContext.Provider value={value}>
      <div
        className="min-h-screen min-w-screen text-white flex max-h-screen"
        id="main-layout-provider"
      >
        <LeftRail />
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </MainLayoutContext.Provider>
  );
};
