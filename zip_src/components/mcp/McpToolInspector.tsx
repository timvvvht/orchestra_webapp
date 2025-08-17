/**
 * MCP Tool Inspector Component
 * 
 * Detailed view of discovered MCP tool definitions with side-by-side comparison
 * of raw MCP schema vs converted ToolSpec, validation indicators, and debugging tools.
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Copy, 
  Download, 
  Eye, 
  EyeOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Code,
  Tool,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Hash,
  Type,
  List,
  FileText,
  Zap
} from 'lucide-react';
import { clsx } from 'clsx';
import { McpToolDefinition, McpSchemaProperty, validateMcpTool } from '@/services/mcp/types';
import { mcpToolConverter } from '@/services/mcp/toolConverter';
import type { ToolSpec } from '@/utils/registerSessionTools';

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

interface McpToolInspectorProps {
  tools: McpToolDefinition[];
  serverId: string;
  className?: string;
}

interface ToolListItemProps {
  tool: McpToolDefinition;
  serverId: string;
  isSelected: boolean;
  onSelect: (tool: McpToolDefinition) => void;
}

interface SchemaComparisonProps {
  mcpTool: McpToolDefinition;
  toolSpec: ToolSpec | null;
  serverId: string;
}

interface SchemaPropertyViewProps {
  property: McpSchemaProperty;
  name: string;
  level?: number;
}

interface ValidationIndicatorProps {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

// ============================================================================
// VALIDATION INDICATOR COMPONENT
// ============================================================================

const ValidationIndicator: React.FC<ValidationIndicatorProps> = ({ 
  isValid, 
  errors = [], 
  warnings = [] 
}) => {
  if (isValid && warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-400">
        <CheckCircle className="w-4 h-4" />
        <span className="text-sm">Valid</span>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="flex items-center gap-2 text-red-400">
        <XCircle className="w-4 h-4" />
        <span className="text-sm">Invalid ({errors.length} errors)</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-yellow-400">
      <AlertTriangle className="w-4 h-4" />
      <span className="text-sm">Valid ({warnings.length} warnings)</span>
    </div>
  );
};

// ============================================================================
// SCHEMA PROPERTY VIEW COMPONENT
// ============================================================================

const SchemaPropertyView: React.FC<SchemaPropertyViewProps> = ({ 
  property, 
  name, 
  level = 0 
}) => {
  const [isExpanded, setIsExpanded] = useState(level < 2);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'string': return Type;
      case 'number': 
      case 'integer': return Hash;
      case 'boolean': return CheckCircle;
      case 'array': return List;
      case 'object': return FileText;
      default: return Code;
    }
  };

  const TypeIcon = getTypeIcon(property.type);
  const hasChildren = property.type === 'object' && property.properties;
  const hasItems = property.type === 'array' && property.items;

  return (
    <div className={clsx('border-l border-gray-700', level > 0 && 'ml-4 pl-4')}>
      <div className="flex items-center gap-2 py-2">
        {(hasChildren || hasItems) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-300"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}
        
        <TypeIcon className={clsx(
          'w-4 h-4',
          property.type === 'string' && 'text-green-400',
          property.type === 'number' && 'text-blue-400',
          property.type === 'integer' && 'text-blue-400',
          property.type === 'boolean' && 'text-purple-400',
          property.type === 'array' && 'text-yellow-400',
          property.type === 'object' && 'text-red-400'
        )} />
        
        <span className="font-mono text-white">{name}</span>
        <span className={clsx(
          'px-2 py-0.5 text-xs rounded',
          property.type === 'string' && 'bg-green-600/20 text-green-300',
          property.type === 'number' && 'bg-blue-600/20 text-blue-300',
          property.type === 'integer' && 'bg-blue-600/20 text-blue-300',
          property.type === 'boolean' && 'bg-purple-600/20 text-purple-300',
          property.type === 'array' && 'bg-yellow-600/20 text-yellow-300',
          property.type === 'object' && 'bg-red-600/20 text-red-300'
        )}>
          {property.type}
        </span>
        
        {property.required && (
          <span className="px-2 py-0.5 bg-red-600/20 text-red-300 text-xs rounded">
            required
          </span>
        )}
        
        {property.enum && (
          <span className="px-2 py-0.5 bg-gray-600/20 text-gray-300 text-xs rounded">
            enum
          </span>
        )}
      </div>

      {property.description && (
        <p className="text-sm text-gray-400 ml-6 mb-2">{property.description}</p>
      )}

      {property.enum && (
        <div className="ml-6 mb-2">
          <span className="text-xs text-gray-500">Values: </span>
          <span className="text-xs text-gray-300">
            {property.enum.map(v => JSON.stringify(v)).join(', ')}
          </span>
        </div>
      )}

      {property.default !== undefined && (
        <div className="ml-6 mb-2">
          <span className="text-xs text-gray-500">Default: </span>
          <span className="text-xs text-gray-300 font-mono">
            {JSON.stringify(property.default)}
          </span>
        </div>
      )}

      {isExpanded && hasChildren && property.properties && (
        <div className="ml-2">
          {Object.entries(property.properties).map(([propName, propSchema]) => (
            <SchemaPropertyView
              key={propName}
              name={propName}
              property={propSchema}
              level={level + 1}
            />
          ))}
        </div>
      )}

      {isExpanded && hasItems && property.items && (
        <div className="ml-2">
          <SchemaPropertyView
            name="[items]"
            property={property.items}
            level={level + 1}
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SCHEMA COMPARISON COMPONENT
// ============================================================================

const SchemaComparison: React.FC<SchemaComparisonProps> = ({ 
  mcpTool, 
  toolSpec, 
  serverId 
}) => {
  const [activeView, setActiveView] = useState<'side-by-side' | 'mcp-only' | 'toolspec-only'>('side-by-side');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Schema Comparison</h3>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveView('side-by-side')}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                activeView === 'side-by-side'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              )}
            >
              Side by Side
            </button>
            <button
              onClick={() => setActiveView('mcp-only')}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                activeView === 'mcp-only'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              )}
            >
              MCP Only
            </button>
            <button
              onClick={() => setActiveView('toolspec-only')}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                activeView === 'toolspec-only'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              )}
            >
              ToolSpec Only
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={clsx(
        'grid gap-4',
        activeView === 'side-by-side' ? 'grid-cols-2' : 'grid-cols-1'
      )}>
        {/* MCP Schema */}
        {(activeView === 'side-by-side' || activeView === 'mcp-only') && (
          <div className="bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-400" />
                <h4 className="font-medium text-white">MCP Schema</h4>
              </div>
              <button
                onClick={() => copyToClipboard(JSON.stringify(mcpTool, null, 2))}
                className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </div>
            
            <div className="p-4">
              <div className="space-y-4">
                {/* Basic Info */}
                <div>
                  <h5 className="text-sm font-medium text-gray-300 mb-2">Basic Information</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Name:</span>
                      <span className="text-white font-mono">{mcpTool.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Description:</span>
                      <span className="text-white text-right max-w-xs truncate">
                        {mcpTool.description}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                {mcpTool.metadata && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-300 mb-2">Metadata</h5>
                    <div className="flex flex-wrap gap-2">
                      {mcpTool.metadata.category && (
                        <span className="px-2 py-1 bg-blue-600/20 text-blue-300 text-xs rounded">
                          {mcpTool.metadata.category}
                        </span>
                      )}
                      {mcpTool.metadata.version && (
                        <span className="px-2 py-1 bg-green-600/20 text-green-300 text-xs rounded">
                          v{mcpTool.metadata.version}
                        </span>
                      )}
                      {mcpTool.metadata.tags?.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Schema Properties */}
                <div>
                  <h5 className="text-sm font-medium text-gray-300 mb-2">Input Schema</h5>
                  <div className="bg-gray-900 rounded border border-gray-700 p-3">
                    {mcpTool.inputSchema.properties && Object.keys(mcpTool.inputSchema.properties).length > 0 ? (
                      Object.entries(mcpTool.inputSchema.properties).map(([name, property]) => (
                        <SchemaPropertyView
                          key={name}
                          name={name}
                          property={property}
                        />
                      ))
                    ) : (
                      <p className="text-gray-400 text-sm">No properties defined</p>
                    )}
                  </div>
                </div>

                {/* Required Fields */}
                {mcpTool.inputSchema.required && mcpTool.inputSchema.required.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-300 mb-2">Required Fields</h5>
                    <div className="flex flex-wrap gap-2">
                      {mcpTool.inputSchema.required.map(field => (
                        <span key={field} className="px-2 py-1 bg-red-600/20 text-red-300 text-xs rounded font-mono">
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ToolSpec Schema */}
        {(activeView === 'side-by-side' || activeView === 'toolspec-only') && (
          <div className="bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-400" />
                <h4 className="font-medium text-white">Orchestra ToolSpec</h4>
              </div>
              {toolSpec && (
                <button
                  onClick={() => copyToClipboard(JSON.stringify(toolSpec, null, 2))}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              )}
            </div>
            
            <div className="p-4">
              {toolSpec ? (
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-300 mb-2">Converted Information</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Name:</span>
                        <span className="text-white font-mono">{toolSpec.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Description:</span>
                        <span className="text-white text-right max-w-xs truncate">
                          {toolSpec.description}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Source:</span>
                        <span className="text-white font-mono">{toolSpec.source}</span>
                      </div>
                    </div>
                  </div>

                  {/* Input Schema */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-300 mb-2">Input Schema</h5>
                    <pre className="bg-gray-900 rounded border border-gray-700 p-3 text-xs text-gray-300 overflow-auto max-h-64">
                      {JSON.stringify(toolSpec.input_schema, null, 2)}
                    </pre>
                  </div>

                  {/* Metadata */}
                  {toolSpec.metadata && Object.keys(toolSpec.metadata).length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-300 mb-2">Metadata</h5>
                      <pre className="bg-gray-900 rounded border border-gray-700 p-3 text-xs text-gray-300 overflow-auto max-h-32">
                        {JSON.stringify(toolSpec.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <XCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Conversion failed</p>
                  <p className="text-sm">Unable to convert MCP tool to ToolSpec</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Conversion Arrow (only in side-by-side view) */}
      {activeView === 'side-by-side' && (
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="bg-gray-800 border border-gray-600 rounded-full p-2">
            <ArrowRight className="w-6 h-6 text-blue-400" />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// TOOL LIST ITEM COMPONENT
// ============================================================================

const ToolListItem: React.FC<ToolListItemProps> = ({ 
  tool, 
  serverId, 
  isSelected, 
  onSelect 
}) => {
  const isValid = validateMcpTool(tool);
  const conversionResult = mcpToolConverter.convertTool(tool, serverId);

  return (
    <div
      className={clsx(
        'p-4 rounded-lg border cursor-pointer transition-all duration-200',
        isSelected
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
      )}
      onClick={() => onSelect(tool)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-white mb-1">{tool.name}</h4>
          <p className="text-sm text-gray-400 line-clamp-2 mb-2">
            {tool.description}
          </p>
        </div>
        <ValidationIndicator
          isValid={conversionResult.success}
          errors={conversionResult.errors}
          warnings={conversionResult.warnings}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {tool.metadata?.category && (
            <span className="px-2 py-1 bg-blue-600/20 text-blue-300 text-xs rounded">
              {tool.metadata.category}
            </span>
          )}
          {tool.metadata?.version && (
            <span className="px-2 py-1 bg-green-600/20 text-green-300 text-xs rounded">
              v{tool.metadata.version}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{Object.keys(tool.inputSchema.properties || {}).length} params</span>
          <span>•</span>
          <span>{tool.inputSchema.required?.length || 0} required</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN TOOL INSPECTOR COMPONENT
// ============================================================================

const McpToolInspector: React.FC<McpToolInspectorProps> = ({ 
  tools, 
  serverId, 
  className 
}) => {
  const [selectedTool, setSelectedTool] = useState<McpToolDefinition | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showValidOnly, setShowValidOnly] = useState(false);

  // Filter and search tools
  const filteredTools = useMemo(() => {
    return tools.filter(tool => {
      // Search filter
      const matchesSearch = !searchQuery || 
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory = filterCategory === 'all' || 
        tool.metadata?.category === filterCategory;

      // Validation filter
      const isValid = validateMcpTool(tool);
      const matchesValidation = !showValidOnly || isValid;

      return matchesSearch && matchesCategory && matchesValidation;
    });
  }, [tools, searchQuery, filterCategory, showValidOnly]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    tools.forEach(tool => {
      if (tool.metadata?.category) {
        cats.add(tool.metadata.category);
      }
    });
    return Array.from(cats).sort();
  }, [tools]);

  // Auto-select first tool if none selected
  React.useEffect(() => {
    if (!selectedTool && filteredTools.length > 0) {
      setSelectedTool(filteredTools[0]);
    }
  }, [selectedTool, filteredTools]);

  // Convert selected tool to ToolSpec
  const selectedToolSpec = useMemo(() => {
    if (!selectedTool) return null;
    const result = mcpToolConverter.convertTool(selectedTool, serverId);
    return result.success ? result.toolSpec! : null;
  }, [selectedTool, serverId]);

  return (
    <div className={clsx('h-full flex flex-col', className)}>
      {/* Header */}
      <div className="flex-shrink-0 space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Tool Inspector</h2>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Tool className="w-4 h-4" />
            <span>{filteredTools.length} of {tools.length} tools</span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <button
            onClick={() => setShowValidOnly(!showValidOnly)}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
              showValidOnly
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700'
            )}
          >
            <Filter className="w-4 h-4" />
            Valid Only
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Tool List */}
        <div className="space-y-3 overflow-auto">
          {filteredTools.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Tool className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No tools found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            filteredTools.map((tool, index) => (
              <ToolListItem
                key={`${tool.name}-${index}`}
                tool={tool}
                serverId={serverId}
                isSelected={selectedTool?.name === tool.name}
                onSelect={setSelectedTool}
              />
            ))
          )}
        </div>

        {/* Tool Details */}
        <div className="lg:col-span-2 overflow-auto">
          {selectedTool ? (
            <SchemaComparison
              mcpTool={selectedTool}
              toolSpec={selectedToolSpec}
              serverId={serverId}
            />
          ) : (
            <div className="text-center py-16 text-gray-400">
              <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a tool to inspect</p>
              <p className="text-sm">Choose a tool from the list to view its schema details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default McpToolInspector;