/**
 * Sample MCP Servers Data
 * 
 * Provides sample MCP server configurations for testing and development.
 * These can be used to quickly populate the playground with example servers.
 */

import { AddServerFormData } from '../services/mcp/types';
import { useMcpServerManagementStore } from '../stores/mcpServerManagementStore';

export const SAMPLE_MCP_SERVERS: AddServerFormData[] = [
  {
    name: 'Sequential Thinking',
    type: 'npm',
    packageName: '@modelcontextprotocol/server-sequential-thinking',
    description: 'A server that provides sequential thinking and reasoning capabilities for complex problem solving.',
    tags: ['ai', 'reasoning', 'thinking', 'problem-solving']
  },
  {
    name: 'File System',
    type: 'npm', 
    packageName: '@modelcontextprotocol/server-filesystem',
    description: 'Provides secure file system access with read/write capabilities for local files and directories.',
    tags: ['filesystem', 'files', 'io', 'storage']
  },
  {
    name: 'Web Search',
    type: 'npm',
    packageName: '@modelcontextprotocol/server-brave-search',
    description: 'Enables web search capabilities using the Brave Search API for real-time information retrieval.',
    tags: ['search', 'web', 'api', 'information']
  },
  {
    name: 'GitHub Integration',
    type: 'npm',
    packageName: '@modelcontextprotocol/server-github',
    description: 'Provides GitHub API integration for repository management, issues, and pull requests.',
    tags: ['github', 'git', 'repository', 'api', 'development']
  },
  {
    name: 'SQLite Database',
    type: 'npm',
    packageName: '@modelcontextprotocol/server-sqlite',
    description: 'SQLite database server for local data storage and SQL query execution.',
    tags: ['database', 'sqlite', 'sql', 'storage', 'data']
  },
  {
    name: 'Memory Bank',
    type: 'npm',
    packageName: '@modelcontextprotocol/server-memory',
    description: 'Persistent memory storage for maintaining context and information across sessions.',
    tags: ['memory', 'persistence', 'context', 'storage']
  },
  {
    name: 'Time & Calendar',
    type: 'npm',
    packageName: '@modelcontextprotocol/server-time',
    description: 'Provides time, date, and calendar functionality with timezone support.',
    tags: ['time', 'calendar', 'date', 'timezone', 'scheduling']
  },
  {
    name: 'Docker Container',
    type: 'docker',
    dockerImage: 'mcp/example-server:latest',
    description: 'Example MCP server running in a Docker container for isolated execution.',
    tags: ['docker', 'container', 'example', 'isolation']
  },
  {
    name: 'Custom Python Server',
    type: 'custom',
    execPath: '/usr/bin/python3',
    args: ['-m', 'my_mcp_server'],
    description: 'Custom Python-based MCP server with specialized functionality.',
    tags: ['python', 'custom', 'specialized']
  },
  {
    name: 'Weather Service',
    type: 'npm',
    packageName: '@modelcontextprotocol/server-weather',
    description: 'Weather information and forecasting service with location-based queries.',
    tags: ['weather', 'forecast', 'location', 'api', 'climate']
  },
  {
    name: 'Dynamic Demo',
    type: 'custom',
    execPath: 'node',
    args: ['packages/demo-dynamic-mcp-server/bin/server.js'],
    description: 'Local dynamic MCP server returning non-static tool list',
    tags: ['dynamic', 'demo']
  }
];

/**
 * Helper function to add sample servers to the store
 * @param serverNames Optional array of server names to add. If not provided, adds all sample servers.
 */
export const addSampleServers = async (serverNames?: string[]): Promise<void> => {
  const { addServer } = useMcpServerManagementStore.getState();
  
  const serversToAdd = serverNames 
    ? SAMPLE_MCP_SERVERS.filter(server => serverNames.includes(server.name))
    : SAMPLE_MCP_SERVERS;
  
  for (const serverData of serversToAdd) {
    try {
      await addServer(serverData);
      console.log(`Added sample server: ${serverData.name}`);
    } catch (error) {
      console.error(`Failed to add sample server ${serverData.name}:`, error);
    }
  }
};

/**
 * Helper function to add a specific sample server by name
 * @param serverName The name of the sample server to add
 */
export const addSampleServer = async (serverName: string): Promise<void> => {
  const serverData = SAMPLE_MCP_SERVERS.find(server => server.name === serverName);
  
  if (!serverData) {
    throw new Error(`Sample server not found: ${serverName}`);
  }
  
  const { addServer } = useMcpServerManagementStore.getState();
  await addServer(serverData);
};

/**
 * Get sample server data by name
 * @param serverName The name of the sample server
 * @returns The server data or undefined if not found
 */
export const getSampleServer = (serverName: string): AddServerFormData | undefined => {
  return SAMPLE_MCP_SERVERS.find(server => server.name === serverName);
};

/**
 * Get all available sample server names
 * @returns Array of sample server names
 */
export const getSampleServerNames = (): string[] => {
  return SAMPLE_MCP_SERVERS.map(server => server.name);
};

/**
 * Get sample servers by tag
 * @param tag The tag to filter by
 * @returns Array of servers that have the specified tag
 */
export const getSampleServersByTag = (tag: string): AddServerFormData[] => {
  return SAMPLE_MCP_SERVERS.filter(server => 
    server.tags?.includes(tag)
  );
};

/**
 * Get all unique tags from sample servers
 * @returns Array of unique tags
 */
export const getSampleServerTags = (): string[] => {
  const allTags = SAMPLE_MCP_SERVERS.flatMap(server => server.tags || []);
  return Array.from(new Set(allTags)).sort();
};