import { useState, useEffect, useCallback } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getPlatform } from '@/utils/platform';

interface UseWindowControlsReturn {
    isMaximized: boolean;
    currentPlatform: string | null;
    showWindowControls: boolean;
    handleClose: () => Promise<void>;
    handleMinimize: () => Promise<void>;
    handleMaximize: () => Promise<void>;
    handleTitlebarDoubleClick: () => Promise<void>;
}

export const useWindowControls = (): UseWindowControlsReturn => {
    const [isMaximized, setIsMaximized] = useState(false);
    const [currentPlatform, setCurrentPlatform] = useState<string | null>(null);
    const appWindow = getCurrentWebviewWindow();

    // Detect platform on hook initialization
    useEffect(() => {
        const detectPlatform = async () => {
            try {
                const platform = await getPlatform();
                console.log('[useWindowControls] Detected platform:', platform);
                setCurrentPlatform(platform);

                // Check if window is maximized
                if (appWindow) {
                    const maximized = await appWindow.isMaximized();
                    setIsMaximized(maximized);
                }
            } catch (error) {
                console.error('[useWindowControls] Failed to detect platform:', error);
            }
        };

        detectPlatform();

        // Listen for window maximize/unmaximize events
        const unlisten = appWindow?.onResized(() => {
            appWindow.isMaximized().then(setIsMaximized);
        });

        return () => {
            unlisten?.then((fn: () => void) => fn());
        };
    }, [appWindow]);

    // Window control functions
    const handleClose = useCallback(async () => {
        await appWindow?.close();
    }, [appWindow]);

    const handleMinimize = useCallback(async () => {
        await appWindow?.minimize();
    }, [appWindow]);

    const handleMaximize = useCallback(async () => {
        if (isMaximized) {
            await appWindow?.unmaximize();
            setIsMaximized(false);
        } else {
            await appWindow?.maximize();
            setIsMaximized(true);
        }
    }, [appWindow, isMaximized]);

    // Handle double-click on titlebar to maximize/restore window
    const handleTitlebarDoubleClick = useCallback(async () => {
        await handleMaximize();
    }, [handleMaximize]);

    // Determine if we should show window controls based on platform
    const showWindowControls = currentPlatform !== 'macos';

    return {
        isMaximized,
        currentPlatform,
        showWindowControls,
        handleClose,
        handleMinimize,
        handleMaximize,
        handleTitlebarDoubleClick
    };
};
