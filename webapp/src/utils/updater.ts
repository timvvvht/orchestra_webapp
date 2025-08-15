// NOTE: These updater utilities rely on the Tauri runtime. We short-circuit them when
// running in the regular web build so the codebase can be shared across platforms
// without runtime errors (e.g. `TypeError: Cannot read properties of undefined (reading 'invoke')`).
// All Tauri imports are now dynamic to prevent module loading errors in browser.

export async function checkForAppUpdates(onUserClick = false) {
  // Skip in browser environment
  if (!(window as any).__TAURI__) {
    console.log('[Updater] Skipping update check: not running inside Tauri runtime');
    return;
  }

  try {
    console.log('Checking for Orchestra updates...');
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    
    if (update === null) {
      console.log('Failed to check for updates');
      if (onUserClick) {
        const { message } = await import('@tauri-apps/plugin-dialog');
        await message('Failed to check for updates.\nPlease try again later.', {
          title: 'Update Check Failed',
          kind: 'error',
          okLabel: 'OK'
        });
      }
      return;
    }
    
    if (update?.available) {
      console.log(`Update available: ${update.version}`);
      const { ask } = await import('@tauri-apps/plugin-dialog');
      const yes = await ask(
        `Orchestra ${update.version} is available!\n\nRelease notes:\n${update.body}`,
        {
          title: 'Orchestra Update Available',
          kind: 'info',
          okLabel: 'Update Now',
          cancelLabel: 'Later'
        }
      );
      
      if (yes) {
        console.log('User accepted update, starting download...');
        
        // Show progress during download
        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              console.log(`Started downloading ${event.data.contentLength} bytes`);
              break;
            case 'Progress':
              console.log(`Downloaded ${event.data.chunkLength} bytes`);
              break;
            case 'Finished':
              console.log('Download finished, installing...');
              break;
          }
        });
        
        console.log('Update installed, restarting Orchestra...');
        // Restart the app
        const { relaunch } = await import('@tauri-apps/plugin-process');
        await relaunch();
      } else {
        console.log('User declined update');
      }
    } else {
      console.log('No update available');
      if (onUserClick) {
        const { message } = await import('@tauri-apps/plugin-dialog');
        await message('You are running the latest version of Orchestra!', {
          title: 'No Update Available',
          kind: 'info',
          okLabel: 'OK'
        });
      }
    }
  } catch (error) {
    console.error('Update check failed:', error);
    if (onUserClick) {
      const { message } = await import('@tauri-apps/plugin-dialog');
      await message('Failed to check for updates.\nPlease check your internet connection.', {
        title: 'Update Check Failed',
        kind: 'error',
        okLabel: 'OK'
      });
    }
  }
}

// Check for updates on app startup (non-blocking)
export function initializeAutoUpdater() {
  // Skip auto-update logic in web builds (no Tauri runtime)
  if (!(window as any).__TAURI__) {
    console.log('[Updater] Skipping auto-update: not running inside Tauri runtime');
    return;
  }
  // Wait a bit after app startup to avoid interfering with initialization
  setTimeout(() => {
    checkForAppUpdates(false);
  }, 5000); // 5 seconds delay
  
  // Check for updates every hour
  setInterval(() => {
    checkForAppUpdates(false);
  }, 60 * 60 * 1000); // 1 hour
}