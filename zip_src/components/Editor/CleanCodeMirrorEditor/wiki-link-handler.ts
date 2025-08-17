import { invoke } from '@tauri-apps/api/core';

// Wiki link information from Rust backend
export interface WikiLink {
    original: string;
    target: string;
    display_text?: string;
    resolved_path?: string;
    exists: boolean;
    link_type: 'Relative' | 'Absolute' | 'Search';
}

/**
 * Wiki link handler for resolving and navigating wiki links
 */
export class WikiLinkHandler {
    private currentFilePath: string = '';
    private resolvedLinks: Map<string, WikiLink> = new Map();
    private onNavigateCallbacks: Array<(path: string) => void> = [];

    /**
     * Create a new wiki link handler
     */
    constructor() {
        // Initialize the handler
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for wiki link clicks
     */
    private setupEventListeners() {
        // Listen for wiki link clicks on the document
        document.addEventListener('wiki-link-click', (e: Event) => {
            const customEvent = e as CustomEvent;
            const target = customEvent.detail?.target;
            if (target) {
                this.navigateToLink(target);
            }
        });
    }

    /**
     * Set the current file path
     */
    public setCurrentFilePath(path: string) {
        this.currentFilePath = path;
        // Clear the cache when the file changes
        this.resolvedLinks.clear();
    }

    /**
     * Resolve a wiki link to an absolute path
     */
    public async resolveLink(linkText: string): Promise<WikiLink> {
        // Check if we have this link in the cache
        if (this.resolvedLinks.has(linkText)) {
            return this.resolvedLinks.get(linkText)!;
        }

        try {
            // Call the Rust backend to resolve the link
            const wikiLink = await invoke<WikiLink>('resolve_wiki_link', {
                linkText,
                currentFilePath: this.currentFilePath
            });

            // Cache the result
            this.resolvedLinks.set(linkText, wikiLink);

            return wikiLink;
        } catch (error) {
            console.error('Error resolving wiki link:', error);
            // Return a broken link
            const brokenLink: WikiLink = {
                original: linkText,
                target: linkText.replace(/\[\[|\]\]/g, ''),
                exists: false,
                link_type: 'Search'
            };
            this.resolvedLinks.set(linkText, brokenLink);
            return brokenLink;
        }
    }

    /**
     * Find all wiki links in a markdown text
     */
    public async findLinks(markdownText: string): Promise<Array<[number, number, string]>> {
        try {
            // Call the Rust backend to find all wiki links
            return await invoke<Array<[number, number, string]>>('find_wiki_links', {
                markdownText
            });
        } catch (error) {
            console.error('Error finding wiki links:', error);
            return [];
        }
    }

    /**
     * Navigate to a wiki link
     */
    public async navigateToLink(target: string) {
        try {
            // Resolve the link
            const wikiLink = await this.resolveLink(`[[${target}]]`);

            // If the link exists, navigate to it
            if (wikiLink.exists && wikiLink.resolved_path) {
                // Notify all callbacks
                for (const callback of this.onNavigateCallbacks) {
                    callback(wikiLink.resolved_path);
                }
            } else {
                console.warn('Wiki link does not exist:', target);
            }
        } catch (error) {
            console.error('Error navigating to wiki link:', error);
        }
    }

    /**
     * Generate a URL for a wiki link
     */
    public async generateUrl(linkText: string): Promise<string | null> {
        try {
            // Call the Rust backend to generate a URL
            const url = await invoke<string | null>('generate_wiki_link_url', {
                linkText,
                currentFilePath: this.currentFilePath
            });

            return url;
        } catch (error) {
            console.error('Error generating wiki link URL:', error);
            return null;
        }
    }

    /**
     * Parse a URL into a file path
     */
    public async parseUrl(url: string): Promise<string | null> {
        try {
            // Call the Rust backend to parse a URL
            return await invoke<string | null>('parse_wiki_link_url', {
                url
            });
        } catch (error) {
            console.error('Error parsing wiki link URL:', error);
            return null;
        }
    }

    /**
     * Register a callback for when a wiki link is navigated to
     */
    public onNavigate(callback: (path: string) => void) {
        this.onNavigateCallbacks.push(callback);
    }

    /**
     * Remove a navigation callback
     */
    public offNavigate(callback: (path: string) => void) {
        const index = this.onNavigateCallbacks.indexOf(callback);
        if (index !== -1) {
            this.onNavigateCallbacks.splice(index, 1);
        }
    }

    /**
     * Update the wiki link cache
     */
    public async updateCache(): Promise<void> {
        try {
            await invoke('update_wiki_link_cache');
        } catch (error) {
            console.error('Error updating wiki link cache:', error);
        }
    }
}

// Create a singleton instance
export const wikiLinkHandler = new WikiLinkHandler();
