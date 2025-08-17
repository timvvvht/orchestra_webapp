import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '@/stores/chatStore';
import { useAgentConfigStore } from '@/stores/agentConfigStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { AgentConfigTS, ToolDefinitionTS, ToolGroupTS } from '@/types/agentConfig';
import UserGreeting from '@/components/UserGreeting';
import { getUserName } from '@/utils/userPreferences';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

// Icons
import { Bot, Zap, Info, Sparkles, Code, Database, Calendar } from 'lucide-react';

// Custom components
import AgentCard from '@/components/agent-card/AgentCard';
import { AgentSelectorButton } from '@/components/chat-interface/AgentSelectorButton';
import { ChatSession } from '@/types/chatTypes';

/*────────────────────────  Animation keyframes  ────────────────────────*/
const cursorStyle = `
  @keyframes blink {0%,100%{opacity:1}50%{opacity:0}}
  .typing-cursor{display:inline-block;width:2px;height:1em;background:currentColor;margin-left:2px;animation:blink 1s step-end infinite;vertical-align:middle}
`;

/*────────────────────────  Typing animation hook  ───────────────────────────*/
function useTypingAnimation(
  snippets: string[],
  typeMs = 40,
  deleteMs = 30,
  pauseMs = 900
) {
  const [txt, setTxt] = useState("");
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"type" | "pause" | "delete">("type");
  const [active, setActive] = useState(true);

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = cursorStyle;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const current = snippets[idx];

    if (phase === "type") {
      if (txt.length < current.length) {
        const t = setTimeout(
          () => setTxt(current.slice(0, txt.length + 1)),
          typeMs
        );
        return () => clearTimeout(t);
      }
      setPhase("pause");
    }

    if (phase === "pause") {
      const t = setTimeout(() => setPhase("delete"), pauseMs);
      return () => clearTimeout(t);
    }

    if (phase === "delete") {
      if (txt.length) {
        const t = setTimeout(
          () => setTxt(txt.slice(0, -1)),
          deleteMs
        );
        return () => clearTimeout(t);
      }
      setPhase("type");
      setIdx((i) => (i + 1) % snippets.length);
    }
  }, [txt, phase, active, snippets, idx, typeMs, deleteMs, pauseMs]);

  return { txt, active, pause: () => setActive(false) };
}

// Example queries by category
const EXAMPLE_QUERIES = {
  research: [
    'Research the latest advancements in quantum computing',
    'Summarize the key findings from recent climate change studies',
    'Find scholarly articles about machine learning in healthcare'
  ],
  coding: [
    'Help me debug this React useEffect hook',
    'Write a Python function to process CSV data',
    'Explain how to implement authentication in Next.js'
  ],
  data: [
    'Analyze this sales dataset and identify trends',
    'Create a SQL query to join these three tables',
    'Help me visualize this data using D3.js'
  ],
  planning: [
    'Create a content calendar for my blog',
    'Help me plan a project timeline',
    'Design a study schedule for my exam'
  ]
};

/*────────────────────────  Sub-Components  ───────────────────────────*/

// HeroSection Component
function HeroSection({ defaultConfig, userInput, setUserInput, handlePrimaryInputAction, handleViewDetailsFromCard, getToolSummary, txt, active, pause, setDefaultConfig }: {
  defaultConfig: AgentConfigTS | null | undefined;
  userInput: string;
  setUserInput: (input: string) => void;
  handlePrimaryInputAction: () => void;
  handleViewDetailsFromCard: (agentConfig: AgentConfigTS) => void;
  getToolSummary: (config: AgentConfigTS | null | undefined) => string;
  txt: string;
  active: boolean;
  pause: () => void;
  setDefaultConfig: (config: AgentConfigTS) => void;
}) {
  const userName = getUserName();
  
  return (
    <section className="text-center space-y-6 mb-12">
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
        {userName ? (
          <UserGreeting 
            prefix="Hi" 
            suffix=", what can I help you with today?"
            className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300"
          />
        ) : (
          "What can I help you with today?"
        )}
      </h1>
      <p className="text-lg text-slate-400 max-w-2xl mx-auto">
        Your personal AI assistant for research, coding, data analysis, and planning.
      </p>
      <InputCard
        defaultConfig={defaultConfig}
        userInput={userInput}
        setUserInput={setUserInput}
        handlePrimaryInputAction={handlePrimaryInputAction}
        handleViewDetailsFromCard={handleViewDetailsFromCard}
        getToolSummary={getToolSummary}
        txt={txt}
        active={active}
        pause={pause}
        setDefaultConfig={setDefaultConfig}
      />
    </section>
  );
}

// InputCard Component
function InputCard({ defaultConfig, userInput, setUserInput, handlePrimaryInputAction, handleViewDetailsFromCard, getToolSummary, txt, active, pause, setDefaultConfig }: {
  defaultConfig: AgentConfigTS | null | undefined;
  userInput: string;
  setUserInput: (input: string) => void;
  handlePrimaryInputAction: () => void;
  handleViewDetailsFromCard: (agentConfig: AgentConfigTS) => void;
  getToolSummary: (config: AgentConfigTS | null | undefined) => string;
  txt: string;
  active: boolean;
  pause: () => void;
  setDefaultConfig: (config: AgentConfigTS) => void;
}) {
  const userName = getUserName();
  return (
    <Card className="w-full max-w-2xl mx-auto overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur-md shadow-lg transition-all duration-300 hover:shadow-purple-500/5">
      <CardHeader className="pb-2">
        {defaultConfig && (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            {defaultConfig.agent.avatar ? (
              <img
                src={defaultConfig.agent.avatar?.startsWith('/') || defaultConfig.agent.avatar?.startsWith('http')
                  ? defaultConfig.agent.avatar
                  : `/assets/avatars/${defaultConfig.agent.avatar}`}
                alt={`${defaultConfig.agent.name} avatar`}
                className="w-5 h-5 rounded-full object-cover border border-slate-400"
              />
            ) : (
              <Bot className="w-5 h-5 text-purple-400" />
            )}
            <span>Using <span className="font-medium text-white">{defaultConfig.agent.name}</span></span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative rounded-md mx-3 my-2 shadow-inner">
          <label htmlFor="hero-query" className="sr-only">
            Ask anything
          </label>
          {active && !userInput ? (
            <button
              type="button"
              className="flex min-h-[96px] w-full cursor-text items-center px-4 py-6 font-mono text-white/70"
              onClick={pause}
            >
              {txt}
              <span className="typing-cursor" />
            </button>
          ) : (
            <textarea
              id="hero-query"
              rows={3}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onFocus={pause}
              placeholder={
                defaultConfig?.agent?.name
                  ? `Chat with ${defaultConfig.agent.name}${userName ? `, ${userName}` : ''}…`
                  : `What would you like to do${userName ? `, ${userName}` : ''}?`
              }
              className="min-h-[96px] w-full resize-none px-4 py-6 font-mono text-white placeholder:text-white/50 focus:outline-none focus:ring-0"
              style={{ background: 'transparent !important' }}
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handlePrimaryInputAction();
                }
              }}
            />
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4 border-t border-white/15 px-4 py-3">
        <div className="flex justify-end items-center w-full">
          <Button
            size="sm"
            className="bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-white shadow-md transition-all duration-300"
            onClick={handlePrimaryInputAction}
          >
            {userName ? `Assign Task, ${userName}` : 'Assign Task'}
          </Button>
        </div>
        <div className="w-full">
          <AgentSelectorButton
            currentAgentId={defaultConfig?.id}
            onAgentSelect={(agentConfig) => {
              setDefaultConfig(agentConfig);
              // Update the default agent in settings
              const { updateSettings } = useSettingsStore.getState();
              updateSettings({ defaultAgentId: agentConfig.id });
            }}
            variant="default"
            className="w-full bg-white/5 border-white/15 text-white hover:bg-white/10"
          />
        </div>
      </CardFooter>
    </Card>
  );
}

// ExampleQueries Component
function ExampleQueries({ activeTab, setActiveTab, setActive, EXAMPLE_QUERIES, handleExampleClick, renderCategoryIcon }: {
  activeTab: string;
  setActiveTab: (value: string) => void;
  setActive: (value: boolean) => void;
  EXAMPLE_QUERIES: Record<string, string[]>;
  handleExampleClick: (query: string) => void;
  renderCategoryIcon: (category: string) => JSX.Element;
}) {
  return (
    <section className="w-full max-w-2xl mx-auto mt-8">
      <Tabs
        defaultValue="research"
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          setActive(true);
        }}
        className="w-full"
      >
        <div className="flex flex-col items-center mb-4">
          <h2 className="text-lg font-medium text-slate-300 mb-3">Try an example</h2>
          <TabsList className="bg-slate-800/40 p-1">
            <TabsTrigger
              value="research"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Research
            </TabsTrigger>
            <TabsTrigger
              value="coding"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              <Code className="mr-1.5 h-3.5 w-3.5" /> Coding
            </TabsTrigger>
            <TabsTrigger
              value="data"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              <Database className="mr-1.5 h-3.5 w-3.5" /> Data
            </TabsTrigger>
            <TabsTrigger
              value="planning"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              <Calendar className="mr-1.5 h-3.5 w-3.5" /> Planning
            </TabsTrigger>
          </TabsList>
        </div>
        {Object.entries(EXAMPLE_QUERIES).map(([category, queries]) => (
          <TabsContent key={category} value={category} className="mt-0">
            <div className="flex flex-wrap justify-center gap-2">
              {queries.map((query, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="rounded-full bg-white/5 hover:bg-white/10 text-xs px-4 py-1.5 text-slate-300 hover:text-white border-white/10"
                  onClick={() => handleExampleClick(query)}
                >
                  <span className="ml-1.5">{query}</span>
                </Button>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

// AgentCards Component
function AgentCards({ agentConfigsArray, memoizedHandleStartChatFromCard, memoizedHandleViewDetailsFromCard, userInput }: {
  agentConfigsArray: AgentConfigTS[];
  memoizedHandleStartChatFromCard: (config: AgentConfigTS, userInput: string) => void;
  memoizedHandleViewDetailsFromCard: (agentConfig: AgentConfigTS) => void;
  userInput: string;
}) {
  const onStartChatForCard = useCallback((config: AgentConfigTS) => {
      memoizedHandleStartChatFromCard(config, userInput);
  }, [memoizedHandleStartChatFromCard, userInput]);

  return (
    <section className="w-full mt-16">
      <p className="text-slate-400 max-w-2xl mx-auto text-center">
        Select a specialized agent to start a focused conversation
      </p>
      {agentConfigsArray.length > 0 ? (
        <ScrollArea className="w-full pb-6">
          <div className="flex space-x-4 pb-4 px-1">
            {agentConfigsArray.map((agent) => (
              agent && agent.id ? (
                <div key={agent.id} className="w-[300px] flex-shrink-0">
                  <AgentCard
                    agentConfig={agent}
                    onStartChat={onStartChatForCard}
                    onViewDetails={memoizedHandleViewDetailsFromCard}
                  />
                </div>
              ) : null
            ))}
          </div>
        </ScrollArea>
      ) : (
        <Card className="bg-slate-900/60 border border-slate-800 p-8 text-center">
          <p className="text-slate-400">No agent configurations available yet.</p>
        </Card>
      )}
    </section>
  );
}

/*────────────────────────  Main LandingPage Component  ───────────────────────────*/

export function LandingPage() {
  // State
  const [userInput, setUserInput] = useState('');
  const [activeTab, setActiveTab] = useState('research');

  // Hooks
  const navigate = useNavigate();
  const { createSession, sendMessage } = useChatStore();
  const { agentConfigs: agentConfigsMap } = useAgentConfigStore();
  const { settings } = useSettingsStore();

  // Animation
  const { txt, active, pause } = useTypingAnimation(
    EXAMPLE_QUERIES[activeTab as keyof typeof EXAMPLE_QUERIES]
  );

  // Derived state
  const agentConfigsArray = useMemo(() =>
    Object.values(agentConfigsMap || {}).filter(Boolean),
    [agentConfigsMap]
  );

  // Get default agent ID from settings, fallback to hardcoded value
  const DEFAULT_AGENT_ID = settings.defaultAgentId || 'fac79f2c-b312-4ea9-a88a-751ae2be9169';
  const [defaultConfig, setDefaultConfig] = useState<AgentConfigTS | null | undefined>(undefined);

  // Set default agent config
  useEffect(() => {
    if (agentConfigsMap && agentConfigsMap[DEFAULT_AGENT_ID]) {
      setDefaultConfig(agentConfigsMap[DEFAULT_AGENT_ID] as AgentConfigTS);
    } else if (Object.keys(agentConfigsMap || {}).length > 0) {
      console.warn(`Default agent with ID '${DEFAULT_AGENT_ID}' not found. Using first available agent.`);
      // Use the first available agent as fallback
      const firstAgent = Object.values(agentConfigsMap)[0];
      setDefaultConfig(firstAgent as AgentConfigTS);
    } else {
      setDefaultConfig(null);
    }
  }, [agentConfigsMap, DEFAULT_AGENT_ID]);

  // Helper functions
  const prepareAgentTemplate = useCallback((config: AgentConfigTS): Partial<ChatSession> => {
    const avatar = config.agent.avatar?.startsWith('/') || config.agent.avatar?.startsWith('http')
      ? config.agent.avatar
      : (config.agent.avatar ? `/assets/avatars/${config.agent.avatar}` : '/assets/avatars/default_avatar.png');

    let template: Partial<ChatSession> = {
      name: config.agent.name || 'New Chat',
      avatar,
      specialty: config.agent.description || 'General Assistant',
      model: config.ai_config.model_id || 'gpt-4o-mini',
      tools: [],
      systemPrompt: config.agent.system_prompt || 'You are a helpful assistant.',
      temperature: config.ai_config.temperature ?? 0.7,
    };

    if (config.tool_groups && config.tool_groups.length > 0) {
      template.tools = config.tool_groups.flatMap(
        (tg: ToolGroupTS) => tg.tools.map((t: ToolDefinitionTS) => t.name)
      );
    }
    console.log(`template: ${JSON.stringify(template)}`);
    return template;
  }, []);

  const getToolSummary = (config: AgentConfigTS | null | undefined): string => {
    if (!config || !config.tool_groups || config.tool_groups.length === 0) {
      return "Standard Tools";
    }

    const allGroupNames = config.tool_groups
      .map((tg: ToolGroupTS) => tg.name)
      .filter(Boolean);

    if (allGroupNames.length === 0) return "General Purpose";
    if (allGroupNames.length <= 2) return allGroupNames.join(', ');
    return `${allGroupNames.slice(0, 2).join(', ')} & more`;
  };

  // Action handlers
  const handlePrimaryInputAction = async () => {
    if (!userInput.trim()) {
      return;
    }

    let agentConfigToUse = defaultConfig;

    try {
      const humanReadableAgentNameForAPI = (agentConfigToUse?.agent?.name) || 'general'; // Ensure fallback
      const sessionDisplayName = `Chat with ${humanReadableAgentNameForAPI}`;
      const agentTemplate = prepareAgentTemplate(agentConfigToUse as AgentConfigTS);
      const newSessionId = await createSession(
        humanReadableAgentNameForAPI, // This is now the human-readable name for backend agent selection
        sessionDisplayName,           // This is the "Chat with..." formatted name for display
        agentTemplate
      );

      if (newSessionId) {
        await sendMessage(userInput);
        navigate(`/chat/${newSessionId}`);
      } else {
        console.error("Failed to create session for primary input.");
      }
    } catch (error) {
      console.error("Error during primary input action:", error);
    }
  };

  const memoizedHandleStartChatFromCard = useCallback(async (config: AgentConfigTS, message?: string) => {
    const agentConfigToUse = config;
    const initialMessageToSend = message;

    const agentTemplate = prepareAgentTemplate(agentConfigToUse);

    try {
      const humanReadableAgentNameForAPI = agentConfigToUse.agent.name || 'general'; // Ensure fallback
      const sessionDisplayName = `Chat with ${humanReadableAgentNameForAPI}`;
      const newSessionId = await createSession(
        humanReadableAgentNameForAPI, // Human-readable name for backend agent selection
        sessionDisplayName,           // "Chat with..." formatted name for display
        agentTemplate
      );

      if (newSessionId) {
        const messageToSend = (initialMessageToSend && initialMessageToSend.trim())
          ? initialMessageToSend.trim()
          : "";

        if (messageToSend) {
          await sendMessage(messageToSend);
        }

        navigate(`/chat/${newSessionId}`);
      } else {
        console.error("Failed to create session from card.");
      }
    } catch (error) {
      console.error("Error starting chat from card:", error);
    }
  }, [createSession, sendMessage, navigate, prepareAgentTemplate]);

  const memoizedHandleViewDetailsFromCard = useCallback((agentConfig: AgentConfigTS) => {
    alert(`Details for ${agentConfig.agent.name}:\nID: ${agentConfig.id}\nModel: ${agentConfig.ai_config.model_id}\n(Full details modal to be implemented)`);
  }, []);

  const handleViewDetailsFromCard = (agentConfig: AgentConfigTS) => {
    alert(`Details for ${agentConfig.agent.name}:\nID: ${agentConfig.id}\nModel: ${agentConfig.ai_config.model_id}\n(Full details modal to be implemented)`);
  };

  const handleExampleClick = (query: string) => {
    setUserInput(query);
    pause();
    document.getElementById("hero-query")?.focus();
  };

  const renderCategoryIcon = (category: string) => {
    switch (category) {
      case 'research': return <Sparkles className="h-4 w-4" />;
      case 'coding': return <Code className="h-4 w-4" />;
      case 'data': return <Database className="h-4 w-4" />;
      case 'planning': return <Calendar className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen  text-slate-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(circle at 50% 30%, rgba(120, 41, 190, 0.3) 0%, rgba(53, 42, 140, 0.2) 25%, transparent 60%)',
          }}
        />
      </div>
      <main className="w-full max-w-5xl px-4 pt-16 pb-24 md:pt-24 md:pb-32 z-10 flex flex-col items-center">
        <HeroSection
          defaultConfig={defaultConfig}
          userInput={userInput}
          setUserInput={setUserInput}
          handlePrimaryInputAction={handlePrimaryInputAction}
          handleViewDetailsFromCard={handleViewDetailsFromCard}
          getToolSummary={getToolSummary}
          txt={txt}
          active={active}
          pause={pause}
          setDefaultConfig={setDefaultConfig}
        />
        <ExampleQueries
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setActive={(value) => { if (value) useTypingAnimation(EXAMPLE_QUERIES[activeTab as keyof typeof EXAMPLE_QUERIES]) }}
          EXAMPLE_QUERIES={EXAMPLE_QUERIES}
          handleExampleClick={handleExampleClick}
          renderCategoryIcon={renderCategoryIcon}
        />
        <AgentCards
          agentConfigsArray={agentConfigsArray as AgentConfigTS[]}
          memoizedHandleStartChatFromCard={memoizedHandleStartChatFromCard}
          memoizedHandleViewDetailsFromCard={memoizedHandleViewDetailsFromCard}
          userInput={userInput}
        />
      </main>
    </div>
  );
}

export default LandingPage;