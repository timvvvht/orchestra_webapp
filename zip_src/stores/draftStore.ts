import { nanoid } from 'nanoid';
import { create } from 'zustand';
import type { RoleModelOverrides } from '@/utils/sendChatMessage';

export interface DraftIssue {
  id: string;
  content: string;          // Natural-language request
  codePath: string;         // REQUIRED absolute/relative path to the code base
  agentConfigId: string;    // Which agent config to use when sending
  modelId?: string | null;  // Optional model override
  autoMode?: boolean;       // Whether Auto Mode is enabled
  singleModelOverride?: string | null;  // Single model to use when Auto Mode is off
  selectedPreset?: 'performance' | 'economy' | 'custom';  // Selected preset when Auto Mode is on
  roleModelOverrides?: RoleModelOverrides;  // Optional role-specific model overrides
  createdAt: number;
}

interface DraftStoreState {
  drafts: Record<string, DraftIssue>;
  addDraft: (draft: Omit<DraftIssue, 'id' | 'createdAt'>) => string; // returns id
  removeDraft: (id: string) => void;
  clearDrafts: () => void;
  getDraftsArray: () => DraftIssue[];
}

export const useDraftStore = create<DraftStoreState>((set, get) => ({
  drafts: {},
  addDraft: (draftPartial) => {
    const id = nanoid();
    const newDraft: DraftIssue = {
      id,
      createdAt: Date.now(),
      ...draftPartial,
    };
    set((state) => ({ drafts: { ...state.drafts, [id]: newDraft } }));
    // Persist to localStorage for session durability
    if (typeof window !== 'undefined') {
      localStorage.setItem('orchestra_drafts', JSON.stringify({ ...get().drafts, [id]: newDraft }));
    }
    return id;
  },
  removeDraft: (id) => {
    set((state) => {
      const newDrafts = { ...state.drafts };
      delete newDrafts[id];
      if (typeof window !== 'undefined') {
        localStorage.setItem('orchestra_drafts', JSON.stringify(newDrafts));
      }
      return { drafts: newDrafts };
    });
  },
  clearDrafts: () => {
    set({ drafts: {} });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('orchestra_drafts');
    }
  },
  getDraftsArray: () => Object.values(get().drafts).sort((a, b) => b.createdAt - a.createdAt),
}));

// Rehydrate from localStorage on first import
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('orchestra_drafts');
  if (stored) {
    try {
      const parsed: Record<string, DraftIssue> = JSON.parse(stored);
      
      // Validate and clean up roleModelOverrides data for backward compatibility
      const cleanedDrafts: Record<string, DraftIssue> = {};
      Object.entries(parsed).forEach(([id, draft]) => {
        // Ensure roleModelOverrides is properly structured or remove if malformed
        if (draft.roleModelOverrides && typeof draft.roleModelOverrides === 'object') {
          // Filter out any invalid role keys (for backward compatibility)
          const validRoles: (keyof RoleModelOverrides)[] = ['explore', 'plan', 'execute', 'debug'];
          const cleanedOverrides: RoleModelOverrides = {};
          
          validRoles.forEach(role => {
            if (draft.roleModelOverrides && role in draft.roleModelOverrides && typeof draft.roleModelOverrides[role] === 'string') {
              cleanedOverrides[role] = draft.roleModelOverrides[role];
            }
          });
          
          const draftWithOverrides: DraftIssue = {
            ...draft,
            ...(Object.keys(cleanedOverrides).length > 0 ? { roleModelOverrides: cleanedOverrides } : {})
          };
          cleanedDrafts[id] = draftWithOverrides;
        } else {
          // No roleModelOverrides or invalid structure, keep draft as-is
          cleanedDrafts[id] = draft;
        }
      });
      
      useDraftStore.setState({ drafts: cleanedDrafts });
    } catch (e) {
      console.error('[DraftStore] Failed to parse stored drafts', e);
    }
  }
}
