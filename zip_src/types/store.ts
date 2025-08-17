
export interface StoreItem {
  id: string;
  type: 'pack' | 'agent' | 'tool';
  title: string;
  cover: string;
  hero?: string;  // Large hero image for carousel
  price?: number;   // undefined => Free
  publisher: string;
  rating: number;
  installs: number;
  tags: string[];   // category filter
  description: string;  // markdown
  permissions: string[]; // fs:read, web:fetch …
  agentsIncluded?: number; // for packs
  installed?: boolean;  // Track if already installed
  agents?: Agent[]; // For team packs, details about included agents
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  model: string;
  provider: string;
  tools: string[];
  cover: string;
  description?: string;
}

export type StoreGenre = {
  id: string;
  label: string;
  description: string;
  icon: string;
}
