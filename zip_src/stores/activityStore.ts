import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type EventKind = 'tool_call' | 'tool_result' | 'message' | 'thinking' | 'file_operation' | 'error' | 'complete';

export interface ActivityEvent {
    id: string;
    agentId: string;
    agentName: string;
    agentColor: string;
    avatarPath?: string;
    avatarType?: 'emoji' | 'resource';
    action: string;
    target?: string;
    details?: string;
    timestamp: number; // epoch-ms for JSON
    eventType?: EventKind;
    isRead?: boolean; // Track if event has been seen
}

interface ActivityFeedState {
    events: ActivityEvent[];
    addEvent: (e: ActivityEvent) => void;
    clear: () => void;
    markAllAsRead: () => void;
    markAsRead: (id: string) => void;
}

/**
 * ActivityFeed Store
 * Maintains a list of activity events from agents across the system
 * Persists events to localStorage and caps the list at 200 events
 */
export const useActivityFeed = create<ActivityFeedState>()(
    persist(
        (set, get) => ({
            events: [],

            addEvent(e) {
                // Add isRead: false to new events
                const eventWithReadState = { ...e, isRead: false };
                
                // More aggressive cleanup: keep only 100 events instead of 200
                // and clean up old events (older than 24 hours)
                const now = Date.now();
                const DAY_MS = 24 * 60 * 60 * 1000;
                
                const currentEvents = get().events;
                const recentEvents = currentEvents.filter(event => 
                    (now - event.timestamp) < DAY_MS
                );
                
                const next = [eventWithReadState, ...recentEvents].slice(0, 100);
                set({ events: next });
            },

            clear() {
                set({ events: [] });
            },
            
            markAllAsRead() {
                const updatedEvents = get().events.map(event => ({
                    ...event,
                    isRead: true
                }));
                set({ events: updatedEvents });
            },
            
            markAsRead(id: string) {
                const updatedEvents = get().events.map(event => 
                    event.id === id ? { ...event, isRead: true } : event
                );
                set({ events: updatedEvents });
            }
        }),
        { name: 'aiwiki_activity_feed' }
    )
);
