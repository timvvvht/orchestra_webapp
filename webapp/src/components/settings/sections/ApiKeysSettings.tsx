import React, { useEffect } from "react";
import {
  KeyRound,
  Plus,
  Check,
  Copy,
  Eye,
  EyeOff,
  Info,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { toast } from "sonner";

// API key display configuration
interface ApiKeyConfig {
  id: string;
  name: string;
  description: string;
  isVisible: boolean;
}

const API_CATEGORIES = [
  { id: "llm", label: "LLM Providers" },
  { id: "search", label: "Search APIs" },
  { id: "tools", label: "Tools" },
];

const ApiKeysSettings = () => {
  // Stubbed store values
  const llm = {};
  const search = {};
  const tools = {};
  const isLoading = false;
  const error = null;

  // Local state for UI
  const [activeCategory, setActiveCategory] = React.useState("llm");
  const [visibleKeys, setVisibleKeys] = React.useState<Record<string, boolean>>(
    {}
  );
  const [inputValues, setInputValues] = React.useState<Record<string, string>>(
    {}
  );

  // API key configurations for UI display
  const llmApiKeys: ApiKeyConfig[] = [
    {
      id: "openai",
      name: "OpenAI API Key",
      description: "Used for GPT models",
      isVisible: visibleKeys["llm.openai"] || false,
    },
    {
      id: "anthropic",
      name: "Anthropic API Key",
      description: "Used for Claude models",
      isVisible: visibleKeys["llm.anthropic"] || false,
    },
    {
      id: "google",
      name: "Google AI API Key",
      description: "Used for Gemini models",
      isVisible: visibleKeys["llm.google"] || false,
    },
    {
      id: "mistral",
      name: "Mistral API Key",
      description: "Used for Mistral models",
      isVisible: visibleKeys["llm.mistral"] || false,
    },
    {
      id: "ollama",
      name: "Ollama API Key",
      description: "Used for local models",
      isVisible: visibleKeys["llm.ollama"] || false,
    },
  ];

  const searchApiKeys: ApiKeyConfig[] = [
    {
      id: "tavily",
      name: "Tavily API Key",
      description: "For enhanced search capabilities",
      isVisible: visibleKeys["search.tavily"] || false,
    },
    {
      id: "serper",
      name: "Serper API Key",
      description: "For Google search results",
      isVisible: visibleKeys["search.serper"] || false,
    },
    {
      id: "serpapi",
      name: "SerpAPI Key",
      description: "For search engine results",
      isVisible: visibleKeys["search.serpapi"] || false,
    },
  ];

  const toolApiKeys: ApiKeyConfig[] = [
    {
      id: "github",
      name: "GitHub API Key",
      description: "For Git integrations",
      isVisible: visibleKeys["tools.github"] || false,
    },
    {
      id: "zapier",
      name: "Zapier API Key",
      description: "For workflow automation",
      isVisible: visibleKeys["tools.zapier"] || false,
    },
    {
      id: "browserless",
      name: "Browserless API Key",
      description: "For web automation",
      isVisible: visibleKeys["tools.browserless"] || false,
    },
  ];

  // Helper functions for UI
  const getActiveKeys = () => {
    switch (activeCategory) {
      case "llm":
        return llmApiKeys;
      case "search":
        return searchApiKeys;
      case "tools":
        return toolApiKeys;
      default:
        return [];
    }
  };

  // Get the API key value from the store
  const getKeyValue = (id: string): string => {
    const key = `${activeCategory}.${id}`;
    return inputValues[key] || "";
  };

  // Handle input change
  const handleInputChange = (id: string, value: string) => {
    const key = `${activeCategory}.${id}`;
    setInputValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Handle input blur (save on blur)
  const handleInputBlur = async (id: string) => {
    const value = getKeyValue(id);
    if (value) {
      await handleSaveKey(id, value);
    }
  };

  // Save API key to the store (stubbed)
  const handleSaveKey = async (id: string, value: string) => {
    toast.success(`${id} API key saved successfully`);
  };

  // Clear API key from the store (stubbed)
  const handleClearKey = async (id: string) => {
    // Clear the input value
    const key = `${activeCategory}.${id}`;
    setInputValues((prev) => ({
      ...prev,
      [key]: "",
    }));
    toast.success(`${id} API key cleared successfully`);
  };

  // Toggle visibility of API key
  const toggleVisibility = (id: string) => {
    setVisibleKeys((prev) => ({
      ...prev,
      [`${activeCategory}.${id}`]: !prev[`${activeCategory}.${id}`],
    }));
  };

  // Copy API key to clipboard
  const copyToClipboard = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success("API key copied to clipboard");
  };

  // Clear all API keys (stubbed)
  const handleClearAllKeys = async () => {
    if (
      confirm(
        "Are you sure you want to clear all API keys? This action cannot be undone."
      )
    ) {
      // Clear all input values
      setInputValues({});
      toast.success("All API keys cleared successfully");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">API Keys</h2>
        <p className="text-muted-foreground">
          Manage your API keys for various services and providers.
        </p>
      </div>

      <Card className="border border-border bg-surface-1 overflow-hidden">
        <CardContent className="p-0">
          <Tabs
            defaultValue="llm"
            value={activeCategory}
            onValueChange={setActiveCategory}
            className="w-full"
          >
            <div className="border-b border-border">
              <TabsList className="bg-transparent w-full justify-start rounded-none px-4 pt-2 h-auto">
                {API_CATEGORIES.map((category) => (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-none data-[state=active]:shadow-none data-[state=active]:text-primary pb-2 px-4"
                  >
                    {category.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="p-6">
              {API_CATEGORIES.map((category) => (
                <TabsContent
                  key={category.id}
                  value={category.id}
                  className="mt-0 space-y-6"
                >
                  {getActiveKeys().map((apiKey) => (
                    <div key={apiKey.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-foreground">
                            {apiKey.name}
                          </h3>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{apiKey.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={apiKey.isVisible ? "text" : "password"}
                            value={getKeyValue(apiKey.id)}
                            onChange={(e) =>
                              handleInputChange(apiKey.id, e.target.value)
                            }
                            onBlur={() => handleInputBlur(apiKey.id)}
                            placeholder={`Enter your ${apiKey.name}`}
                            className="pr-20 bg-surface-0 border-border"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button
                              onClick={() => toggleVisibility(apiKey.id)}
                              className="p-1 text-muted-foreground hover:text-foreground"
                            >
                              {apiKey.isVisible ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                            {getKeyValue(apiKey.id) && (
                              <button
                                onClick={() =>
                                  copyToClipboard(getKeyValue(apiKey.id))
                                }
                                className="p-1 text-muted-foreground hover:text-foreground"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="border-border hover:bg-surface-2"
                          onClick={() => handleClearKey(apiKey.id)}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="pt-4">
                    <Button
                      variant="outline"
                      className="w-full border-dashed border-border/50 hover:bg-surface-2 text-muted-foreground"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Custom API Key
                    </Button>
                  </div>
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border border-border bg-surface-1">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-foreground">
                API Key Security
              </h3>
              <p className="text-sm text-muted-foreground">
                Your API keys are stored securely on your device.
              </p>
            </div>
            <div className="flex items-center text-green-500">
              <Check className="mr-1 h-4 w-4" />
              <span className="text-sm font-medium">Secured</span>
            </div>
          </div>

          <div className="space-y-4 text-sm text-muted-foreground">
            <p>• API keys are encrypted before being stored locally</p>
            <p>• Keys are never transmitted to our servers</p>
            <p>• You can clear all stored API keys at any time</p>
          </div>

          <div className="mt-6">
            <Button
              variant="outline"
              className="text-red-400 border-red-400/20 hover:bg-red-400/10 text-foreground"
              onClick={handleClearAllKeys}
            >
              Clear All Stored API Keys
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiKeysSettings;
