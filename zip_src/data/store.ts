import { StoreGenre, StoreItem } from "../types/store";

// Define store genres/filters
export const storeGenres: StoreGenre[] = [
  { id: 'packs', label: 'Packs', description: 'Multi-agent teams & dashboards', icon: '🗂️' },
  { id: 'single', label: 'Single Agents', description: 'Stand-alone specialists', icon: '🤖' },
  { id: 'tools', label: 'Tools', description: 'Capability plugins (web_search, code_run…)', icon: '🛠️' },
  { id: 'productivity', label: 'Productivity', description: 'Marketing, docs, PM, research', icon: '💼' },
  { id: 'data-web', label: 'Data / Web', description: 'Crawlers, scrapers, RAG helpers', icon: '🌐' },
  { id: 'dev', label: 'Dev', description: 'Code review, refactor bots', icon: '💻' },
  { id: 'creative', label: 'Creative', description: 'Design, copywriting', icon: '🎨' },
];

// Mock store data
export const storeItems: StoreItem[] = [
  // Featured items with hero images
  {
    id: 'research-pack',
    type: 'pack',
    title: 'Research Assistant Pack',
    cover: 'https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?q=80&w=2070',
    hero: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2070',
    publisher: 'Knowledge Labs',
    rating: 4.8,
    installs: 15243,
    tags: ['productivity', 'packs', 'research'],
    description: 'Complete research team with 5 specialized agents to help with academic research, citation management, and paper writing.',
    permissions: ['web:fetch', 'fs:read', 'fs:write'],
    agentsIncluded: 5,
    installed: false,
    agents: [
      {
        id: 'research-search',
        name: 'Research Explorer',
        role: 'Literature Finder',
        model: 'GPT-4 Turbo',
        provider: 'OpenAI',
        tools: ['web_search', 'citation_manager', 'paper_database'],
        cover: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2028',
        description: 'Specialized in searching academic databases and finding relevant research papers based on your topic of interest. Can generate comprehensive literature reviews and summarize key findings.'
      },
      {
        id: 'citation-manager',
        name: 'Citation Pro',
        role: 'Bibliography Expert',
        model: 'Claude 3 Opus',
        provider: 'Anthropic',
        tools: ['citation_generator', 'reference_checker', 'style_formatter'],
        cover: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=2073',
        description: 'Manages citations and references in multiple formats including APA, MLA, Chicago, and IEEE. Ensures proper formatting and helps avoid plagiarism issues.'
      },
      {
        id: 'paper-writer',
        name: 'Academic Writer',
        role: 'Paper Drafter',
        model: 'GPT-4o',
        provider: 'OpenAI',
        tools: ['document_editor', 'grammar_checker', 'structure_planner'],
        cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1973',
        description: 'Helps draft research papers with proper academic structure. Can generate sections like abstract, methodology, results, and discussion based on your research notes.'
      },
      {
        id: 'data-analyst',
        name: 'Data Analyst',
        role: 'Statistics Expert',
        model: 'Claude 3 Sonnet',
        provider: 'Anthropic',
        tools: ['data_visualization', 'statistical_analysis', 'hypothesis_testing'],
        cover: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070',
        description: 'Analyzes research data and helps interpret results. Can generate charts, tables, and statistical analyses to support your research findings.'
      },
      {
        id: 'research-reviewer',
        name: 'Peer Reviewer',
        role: 'Quality Control',
        model: 'GPT-4 Turbo',
        provider: 'OpenAI',
        tools: ['paper_critique', 'methodology_review', 'fact_checker'],
        cover: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=2070',
        description: 'Reviews your research work to identify potential issues, logical flaws, or areas for improvement before submission. Provides constructive feedback similar to peer review.'
      }
    ]
  },
  {
    id: 'dev-pack',
    type: 'pack',
    title: 'Full-Stack Developer Team',
    cover: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070',
    hero: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070',
    price: 19.99,
    publisher: 'CodeForge Inc.',
    rating: 4.9,
    installs: 8765,
    tags: ['dev', 'packs', 'coding'],
    description: 'The ultimate developer team with specialized agents for front-end, back-end, DevOps, testing, and code review.',
    permissions: ['web:fetch', 'fs:read', 'fs:write', 'terminal:exec'],
    agentsIncluded: 5,
    installed: false,
    agents: [
      {
        id: 'frontend-dev',
        name: 'Frontend Architect',
        role: 'UI/UX Developer',
        model: 'GPT-4 Turbo',
        provider: 'OpenAI',
        tools: ['code_editor', 'npm_manager', 'browser_preview'],
        cover: 'https://images.unsplash.com/photo-1593720213428-28a5b9e94613?q=80&w=1921',
        description: 'Specialized in modern frontend frameworks like React, Vue, and Angular. Expert in responsive design, accessibility, and performance optimization.'
      },
      {
        id: 'backend-dev',
        name: 'Backend Engineer',
        role: 'API Developer',
        model: 'Claude 3 Opus',
        provider: 'Anthropic',
        tools: ['database_manager', 'api_tester', 'server_config'],
        cover: 'https://images.unsplash.com/photo-1573495627361-d9b87960b12d?q=80&w=1969',
        description: 'Builds robust backend systems with Node.js, Python, Java, and more. Specializes in API design, database optimization, and security practices.'
      },
      {
        id: 'devops-engineer',
        name: 'DevOps Wizard',
        role: 'Infrastructure Specialist',
        model: 'GPT-4o',
        provider: 'OpenAI',
        tools: ['ci_cd', 'docker', 'kubernetes', 'cloud_deploy'],
        cover: 'https://images.unsplash.com/photo-1607743386760-88ac62b89b8a?q=80&w=2070',
        description: 'Manages the deployment pipeline, containerization, and cloud infrastructure. Expert in AWS, Azure, GCP, and CI/CD practices.'
      },
      {
        id: 'qa-tester',
        name: 'QA Specialist',
        role: 'Quality Assurance',
        model: 'Claude 3 Sonnet',
        provider: 'Anthropic',
        tools: ['test_automation', 'bug_tracker', 'performance_analyzer'],
        cover: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?q=80&w=1974',
        description: 'Creates comprehensive test plans and automated testing suites. Finds edge cases and ensures application stability and reliability.'
      },
      {
        id: 'code-reviewer',
        name: 'Code Guardian',
        role: 'Code Review Expert',
        model: 'GPT-4 Turbo',
        provider: 'OpenAI',
        tools: ['code_analyzer', 'security_scanner', 'performance_profiler'],
        cover: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2070',
        description: 'Reviews code to ensure quality, security, and adherence to best practices. Provides actionable feedback and suggestions for improvement.'
      }
    ]
  },
  {
    id: 'content-marketing',
    type: 'pack',
    title: 'Content Marketing Pack',
    cover: 'https://images.unsplash.com/photo-1533750516457-a7f992034fec?q=80&w=2070',
    hero: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2070',
    publisher: 'AgentSmith Inc.',
    rating: 4.7,
    installs: 12453,
    tags: ['productivity', 'packs', 'marketing'],
    description: 'Complete solution for content marketing with agents specialized in SEO, social media, copywriting, and analytics.',
    permissions: ['web:fetch', 'fs:read'],
    agentsIncluded: 4,
    installed: false,
    agents: [
      {
        id: 'content-strategist',
        name: 'Content Strategist',
        role: 'Planning Expert',
        model: 'GPT-4o',
        provider: 'OpenAI',
        tools: ['content_calendar', 'audience_analyzer', 'trend_tracker'],
        cover: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070',
        description: 'Develops comprehensive content strategies aligned with business goals. Creates editorial calendars and identifies content opportunities based on audience needs and market trends.'
      },
      {
        id: 'copywriter',
        name: 'Creative Copywriter',
        role: 'Content Creator',
        model: 'Claude 3 Opus',
        provider: 'Anthropic',
        tools: ['headline_generator', 'blog_writer', 'email_composer'],
        cover: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=2073',
        description: 'Crafts engaging copy for various formats including blogs, social media, emails, and advertisements. Specializes in brand voice consistency and persuasive messaging.'
      },
      {
        id: 'seo-specialist',
        name: 'SEO Wizard',
        role: 'Search Optimizer',
        model: 'GPT-4 Turbo',
        provider: 'OpenAI',
        tools: ['keyword_research', 'seo_analyzer', 'competitor_tracker'],
        cover: 'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?q=80&w=2074',
        description: 'Optimizes content for search engines to improve visibility and organic traffic. Conducts keyword research, monitors rankings, and provides SEO recommendations.'
      },
      {
        id: 'analytics-expert',
        name: 'Performance Analyst',
        role: 'Data Interpreter',
        model: 'Claude 3 Sonnet',
        provider: 'Anthropic',
        tools: ['traffic_analyzer', 'conversion_tracker', 'report_generator'],
        cover: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070',
        description: 'Analyzes content performance metrics and provides actionable insights. Tracks KPIs, identifies trends, and recommends optimization strategies based on data.'
      }
    ]
  },
  
  // Trending packs
  {
    id: 'data-analysis',
    type: 'pack',
    title: 'Data Analysis Suite',
    cover: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070',
    publisher: 'DataSense AI',
    rating: 4.6,
    installs: 7532,
    tags: ['data-web', 'packs', 'analytics'],
    description: 'Comprehensive data analysis toolkit with visualization, statistics, and reporting agents.',
    permissions: ['fs:read', 'web:fetch'],
    agentsIncluded: 3,
    installed: false
  },
  {
    id: 'creative-suite',
    type: 'pack',
    title: 'Creative Director Suite',
    cover: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=2071',
    price: 24.99,
    publisher: 'ArtificialCreative',
    rating: 4.7,
    installs: 5243,
    tags: ['creative', 'packs', 'design'],
    description: 'Complete creative team with designers, copywriters, and brand strategists.',
    permissions: ['fs:read', 'fs:write', 'web:fetch'],
    agentsIncluded: 4,
    installed: false
  },
  {
    id: 'legal-assistant',
    type: 'pack',
    title: 'Legal Assistant Pack',
    cover: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=2070',
    price: 29.99,
    publisher: 'LegalMinds AI',
    rating: 4.9,
    installs: 3214,
    tags: ['productivity', 'packs', 'legal'],
    description: 'Specialized legal assistants for contract review, research, and document preparation.',
    permissions: ['fs:read', 'web:fetch'],
    agentsIncluded: 3,
    installed: true
  },
  
  // Single agents
  {
    id: 'code-reviewer',
    type: 'agent',
    title: 'Code Review Expert',
    cover: 'https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?q=80&w=2070',
    publisher: 'CodeForge Inc.',
    rating: 4.8,
    installs: 42156,
    tags: ['dev', 'single', 'code-review'],
    description: 'Expert code reviewer that provides detailed feedback and suggestions for improving your code.',
    permissions: ['fs:read'],
    installed: false
  },
  {
    id: 'seo-specialist',
    type: 'agent',
    title: 'SEO Specialist',
    cover: 'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?q=80&w=2074',
    price: 9.99,
    publisher: 'MarketingPro AI',
    rating: 4.7,
    installs: 18734,
    tags: ['productivity', 'single', 'marketing'],
    description: 'Specialized agent for SEO optimization, keyword research, and content recommendations.',
    permissions: ['web:fetch'],
    installed: false
  },
  {
    id: 'ui-designer',
    type: 'agent',
    title: 'UI/UX Design Assistant',
    cover: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=2000',
    price: 14.99,
    publisher: 'DesignMind',
    rating: 4.6,
    installs: 12543,
    tags: ['creative', 'single', 'design'],
    description: 'UI/UX design assistant that helps with wireframing, prototyping, and design systems.',
    permissions: ['fs:read', 'fs:write'],
    installed: false
  },
  
  // Tools
  {
    id: 'web-scraper',
    type: 'tool',
    title: 'Web Scraper Pro',
    cover: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=2034',
    publisher: 'DataHarvest',
    rating: 4.5,
    installs: 28754,
    tags: ['data-web', 'tools', 'scraping'],
    description: 'Advanced web scraping tool with scheduling, data cleaning, and export features.',
    permissions: ['web:fetch', 'fs:write'],
    installed: false
  },
  {
    id: 'code-generator',
    type: 'tool',
    title: 'Code Generator',
    cover: 'https://images.unsplash.com/photo-1623479322729-28b25c16b011?q=80&w=2070',
    price: 7.99,
    publisher: 'DevTools AI',
    rating: 4.7,
    installs: 35214,
    tags: ['dev', 'tools', 'coding'],
    description: 'Powerful code generator for multiple languages and frameworks.',
    permissions: ['fs:read', 'fs:write'],
    installed: true
  },
  {
    id: 'pdf-analyzer',
    type: 'tool',
    title: 'PDF Analyzer & Extractor',
    cover: 'https://images.unsplash.com/photo-1618609378039-b572f64c5b73?q=80&w=2070',
    publisher: 'DocTools',
    rating: 4.8,
    installs: 41523,
    tags: ['productivity', 'tools', 'document'],
    description: 'Extract, analyze, and summarize content from PDF documents.',
    permissions: ['fs:read'],
    installed: false
  }
];

// Helper function to get featured items (ones with hero images)
export const getFeaturedItems = (): StoreItem[] => {
  return storeItems.filter(item => !!item.hero);
};

// Helper function to get trending items (by installs)
export const getTrendingItems = (limit: number = 6): StoreItem[] => {
  return [...storeItems].sort((a, b) => b.installs - a.installs).slice(0, limit);
};

// Helper function to get new releases (could be based on some other criteria)
export const getNewReleases = (limit: number = 8): StoreItem[] => {
  // In a real app, this would be based on release date
  return [...storeItems].sort(() => Math.random() - 0.5).slice(0, limit);
};

// Helper function to get items by genre
export const getItemsByGenre = (genreId: string, limit?: number): StoreItem[] => {
  const filtered = storeItems.filter(item => item.tags.includes(genreId));
  return limit ? filtered.slice(0, limit) : filtered;
};

// Helper function to get items by type
export const getItemsByType = (type: 'pack' | 'agent' | 'tool', limit?: number): StoreItem[] => {
  const filtered = storeItems.filter(item => item.type === type);
  return limit ? filtered.slice(0, limit) : filtered;
};
