// /Users/tim/Code/orchestra/src/features/agents/utils/transformAgentConfig.ts

import { AgentConfigBE, AiConfigBE, ToolGroupBE } from '@/api/chatApi'; // Adjust path if AgentConfigBE is elsewhere

// Interface for the data structure tailored for displaying an agent's profile
export interface AgentProfileDisplay {
    id: string;
    name: string;
    avatarUrl?: string | null;
    description: string;
    coreIntelligence: string;
    keyCapabilityCategories: string[];
    systemPromptExcerpt?: string; // Optional: A short snippet
}

// --- Helper: Map AI Config to a user-friendly string --- 
function formatCoreIntelligence(aiConfig: AiConfigBE): string {
    let provider = aiConfig.provider_name.charAt(0).toUpperCase() + aiConfig.provider_name.slice(1);
    if (provider.toLowerCase() === 'openai' && aiConfig.model_id.startsWith('gpt-')) {
        provider = 'OpenAI'; // Friendlier casing
    }
    if (provider.toLowerCase() === 'google' || provider.toLowerCase() === 'gemini') {
        provider = 'Google';
    }
    // Basic model name cleanup (e.g., remove "-latest", replace hyphens)
    let modelName = aiConfig.model_id.replace(/-latest$/, '').replace(/-/g, ' ');
    modelName = modelName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    return `${provider} ${modelName}`.trim();
}

// --- Helper: Derive Key Capability Categories --- 
// This is a placeholder and needs to be customized based on actual tool names and desired categories
const TOOL_NAME_TO_CATEGORY_MAP: Record<string, string> = {
    // File System examples
    'read_file': 'File System',
    'write_file': 'File System',
    'list_files': 'File System',
    'str_replace_editor': 'File Editing',
    // Web examples
    'search_web': 'Web Search',
    'browse_url': 'Web Browsing',
    'exa_search': 'Advanced Web Search',
    'scrape_url': 'Web Scraping',
    // Code examples
    'execute_python_code': 'Code Execution',
    'run_shell_command': 'Terminal Access',
    'python_interpreter': 'Python Interpreter',
    // Cloud examples
    'aws_cli': 'AWS Cloud Control',
    'cloudflare_list_dns_records': 'Cloudflare DNS',
    's3_list_buckets': 'AWS S3 Storage',
    // Communication
    'send_email': 'Email',
    'slack_send_message': 'Slack Messaging',
    // Data & Analysis
    'database_query': 'Database Querying',
    'dataframe_info': 'Data Analysis',
    // Other
    'arxiv_search': 'ArXiv Search',
    // ... add more mappings as tools are defined
};

const TOOL_GROUP_NAME_TO_CATEGORY_MAP: Record<string, string> = {
    'local_terminal': 'Terminal Access',
    'local_editor': 'File Editing',
    'web_search': 'Web Search',
    'cloudflare': 'Cloudflare Control',
    'aws': 'AWS Cloud Control',
    'email': 'Email Communication',
    'mongo': 'MongoDB Database',
    'python': 'Python Execution',
    // ... add more mappings based on your tool group names
};

function deriveKeyCapabilities(toolGroups: ToolGroupBE[], maxCategories: number = 4): string[] {
    const categories = new Set<string>();

    for (const group of toolGroups) {
        // Attempt to categorize by group name first
        if (GROUP_NAME_TO_CATEGORY_MAP[group.name]) {
            categories.add(GROUP_NAME_TO_CATEGORY_MAP[group.name]);
        } else {
            // If group name not mapped, try to categorize by individual tools within it
            for (const tool of group.tools) {
                if (TOOL_NAME_TO_CATEGORY_MAP[tool.name]) {
                    categories.add(TOOL_NAME_TO_CATEGORY_MAP[tool.name]);
                } else {
                    // Fallback: use a generic category or part of the tool name if no specific mapping
                    // For example, if tool is 'image_generate', category could be 'Image Generation'
                    // This part would require more sophisticated logic or more complete mappings.
                    // For now, we only add if an explicit mapping exists.
                }
            }
        }
    }
    return Array.from(categories).slice(0, maxCategories);
}

// --- Main Transformation Function ---
export function transformAgentConfigToProfileDisplay(
    config: AgentConfigBE,
    systemPromptMaxLength: number = 150 // Max length for the excerpt
): AgentProfileDisplay {
    if (!config) {
        // Return a default/empty profile if config is null/undefined
        // This case should ideally be handled by the caller ensuring config is present
        return {
            id: 'unknown',
            name: 'Unknown Agent',
            description: 'No configuration available.',
            coreIntelligence: 'N/A',
            keyCapabilityCategories: [],
        };
    }

    const coreIntelligence = formatCoreIntelligence(config.ai_config);
    const keyCapabilityCategories = deriveKeyCapabilities(config.tool_groups);

    let systemPromptExcerpt = config.agent.system_prompt;
    if (systemPromptExcerpt.length > systemPromptMaxLength) {
        systemPromptExcerpt = systemPromptExcerpt.substring(0, systemPromptMaxLength).trim() + '...';
    }

    return {
        id: config.id || 'error_missing_id', // Ensure ID is handled if optional in AgentConfigBE
        name: config.agent.name,
        avatarUrl: config.agent.avatar,
        description: config.agent.description,
        coreIntelligence,
        keyCapabilityCategories,
        systemPromptExcerpt,
    };
}
