// Utility for handling external links in Tauri
export async function openExternalLink(url: string): Promise<void> {
    // Check if it's an external URL
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
        console.warn('Invalid external URL:', url);
        return;
    }

    try {
        // Check if we're in a Tauri environment
        if (window.__TAURI__) {
            const { open } = await import('@tauri-apps/plugin-shell');
            await open(url);
        } else {
            // Fallback for web version
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    } catch (error) {
        console.error('Failed to open external link:', error);
        // Fallback to regular browser behavior
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}

// Check if a URL is external
export function isExternalUrl(url: string): boolean {
    if (!url) return false;

    // Check for common external URL patterns
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');
}

// Handle link clicks with proper external link handling
export function handleLinkClick(e: React.MouseEvent<HTMLAnchorElement>, href?: string): void {
    if (!href) return;

    if (isExternalUrl(href)) {
        e.preventDefault();
        openExternalLink(href);
    }
    // Let internal links work normally
}
