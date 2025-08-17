/**
 * MCP Schema Compilation Preview
 * 
 * Preview final ToolSpec[] array that would be sent to registerSessionTools,
 * showing merge preview of local tools + MCP tools with validation and metrics.
 */

import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Tool, 
  Zap, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Copy, 
  Download, 
  Upload,
  Play,
  Eye,
  EyeOff,
  Filter,
  Search,
  BarChart3,
  Layers,
  Merge,
  Settings,
  Code,
  Server,
  Hash,
  Clock,
  Database
} from 'lucide-react';
import { clsx } from 'clsx';
import { useMcpServerStore, useRunningServers } from '@/stores/mcpServerStore';
import { mcpToolConverter } from '@/services/mcp/toolConverter';
import type { ToolSpec } from '@/utils/registerSessionTools';

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

interface McpSchemaPreviewProps {
  className?: string;
}

interface ToolSpecCardProps {
  toolSpec: ToolSpec;
  index: number;
  showDetails: boolean;
  onToggleDetails: () => void;
}

interface SchemaMetricsProps {
  toolSpecs: ToolSpec[];
  localTools: ToolSpec[];
  mcpTools: ToolSpec[];
}

interface ValidationResultsProps {
  validationResults: ValidationResult[];
}

interface ValidationResult {
  toolName: string;
  source: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  complexity: number;
}

interface MergeConflict {
  toolName: string;
  sources: string[];
  reason: string;
  resolution: string;
}

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

const generateMockLocalTools = (): ToolSpec[] => {
  return [
    {
      name: 'read_file',
      description: 'Read contents of a file from the local filesystem',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to read'
          }
        },
        required: ['path']
      },
      source: 'local_file_system'
    },
    {
      name: 'write_file',
      description: 'Write contents to a file on the local filesystem',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to write'
          },
          content: {
            type: 'string',
            description: 'Content to write to the file'
          }
        },
        required: ['path', 'content']
      },
      source: 'local_file_system'
    },
    {
      name: 'execute_command',
      description: 'Execute a shell command',
      input_schema: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Command to execute'
          },
          cwd: {
            type: 'string',
            description: 'Working directory'
          }
        },
        required: ['command']
      },
      source: 'local_shell'
    }
  ];
};

const validateToolSpec = (toolSpec: ToolSpec): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  if (!toolSpec.name) errors.push('Tool name is required');
  if (!toolSpec.description) errors.push('Tool description is required');
  if (!toolSpec.input_schema) errors.push('Input schema is required');

  // Name validation
  if (toolSpec.name && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(toolSpec.name)) {
    warnings.push('Tool name should only contain letters, numbers, and underscores');
  }

  // Schema validation
  if (toolSpec.input_schema?.type !== 'object') {
    warnings.push('Input schema should be of type "object"');
  }

  // Complexity calculation
  const complexity = calculateSchemaComplexity(toolSpec.input_schema);
  if (complexity > 50) {
    warnings.push(`Schema complexity is high (${complexity})`);
  }

  return {
    toolName: toolSpec.name,
    source: toolSpec.source || 'unknown',
    isValid: errors.length === 0,
    errors,
    warnings,
    complexity
  };
};

const calculateSchemaComplexity = (schema: any, depth = 0): number => {
  if (!schema || depth > 10) return 0;

  let complexity = 1;

  if (schema.properties) {
    complexity += Object.keys(schema.properties).length;
    for (const prop of Object.values(schema.properties)) {
      complexity += calculateSchemaComplexity(prop, depth + 1);
    }
  }

  if (schema.items) {
    complexity += calculateSchemaComplexity(schema.items, depth + 1);
  }

  return complexity;
};

// ============================================================================
// TOOL SPEC CARD COMPONENT
// ============================================================================

const ToolSpecCard: React.FC<ToolSpecCardProps> = ({ 
  toolSpec, 
  index, 
  showDetails, 
  onToggleDetails 
}) => {
  const validation = validateToolSpec(toolSpec);
  
  const getSourceColor = (source: string) => {
    if (source.startsWith('mcp_')) return 'bg-blue-600/20 text-blue-300';
    if (source.startsWith('local_')) return 'bg-green-600/20 text-green-300';
    return 'bg-gray-600/20 text-gray-300';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700">
      <div 
        className="p-4 cursor-pointer"
        onClick={onToggleDetails}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">#{index + 1}</span>
              <Tool className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h4 className="font-medium text-white font-mono">{toolSpec.name}</h4>
              <p className="text-sm text-gray-400 line-clamp-1">{toolSpec.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={clsx('px-2 py-1 text-xs rounded', getSourceColor(toolSpec.source || ''))}>
              {toolSpec.source}
            </span>
            {validation.isValid ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            {validation.warnings.length > 0 && (
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
            )}
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="px-4 pb-4 border-t border-gray-700">
          <div className="mt-4 space-y-4">
            {/* Validation Status */}
            <div>
              <h5 className="text-sm font-medium text-gray-300 mb-2">Validation</h5>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {validation.isValid ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className={clsx(
                    'text-sm',
                    validation.isValid ? 'text-green-400' : 'text-red-400'
                  )}>
                    {validation.isValid ? 'Valid' : `${validation.errors.length} errors`}
                  </span>
                </div>
                {validation.warnings.length > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-yellow-400">
                      {validation.warnings.length} warnings
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-purple-400">
                    Complexity: {validation.complexity}
                  </span>
                </div>
              </div>
            </div>

            {/* Errors and Warnings */}
            {(validation.errors.length > 0 || validation.warnings.length > 0) && (
              <div>
                <h5 className="text-sm font-medium text-gray-300 mb-2">Issues</h5>
                <div className="space-y-1">
                  {validation.errors.map((error, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-red-400">
                      <XCircle className="w-3 h-3" />
                      {error}
                    </div>
                  ))}
                  {validation.warnings.map((warning, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-yellow-400">
                      <AlertTriangle className="w-3 h-3" />
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Schema Preview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-gray-300">Input Schema</h5>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(JSON.stringify(toolSpec.input_schema, null, 2));
                  }}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <pre className="bg-gray-900 rounded p-3 text-xs text-gray-300 overflow-auto max-h-32">
                {JSON.stringify(toolSpec.input_schema, null, 2)}
              </pre>
            </div>

            {/* Metadata */}
            {toolSpec.metadata && Object.keys(toolSpec.metadata).length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-300 mb-2">Metadata</h5>
                <pre className="bg-gray-900 rounded p-3 text-xs text-gray-300 overflow-auto max-h-24">
                  {JSON.stringify(toolSpec.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SCHEMA METRICS COMPONENT
// ============================================================================

const SchemaMetrics: React.FC<SchemaMetricsProps> = ({ 
  toolSpecs, 
  localTools, 
  mcpTools 
}) => {
  const totalSize = JSON.stringify(toolSpecs).length;
  const avgComplexity = toolSpecs.reduce((sum, tool) => 
    sum + calculateSchemaComplexity(tool.input_schema), 0
  ) / toolSpecs.length;

  const validationResults = toolSpecs.map(validateToolSpec);
  const validCount = validationResults.filter(r => r.isValid).length;
  const warningCount = validationResults.reduce((sum, r) => sum + r.warnings.length, 0);
  const errorCount = validationResults.reduce((sum, r) => sum + r.errors.length, 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <Tool className="w-6 h-6 text-blue-400" />
          <div>
            <p className="text-sm text-gray-400">Total Tools</p>
            <p className="text-xl font-bold text-white">{toolSpecs.length}</p>
            <p className="text-xs text-gray-500">
              {localTools.length} local + {mcpTools.length} MCP
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-400" />
          <div>
            <p className="text-sm text-gray-400">Valid Tools</p>
            <p className="text-xl font-bold text-white">{validCount}</p>
            <p className="text-xs text-gray-500">
              {((validCount / toolSpecs.length) * 100).toFixed(1)}% valid
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-purple-400" />
          <div>
            <p className="text-sm text-gray-400">Schema Size</p>
            <p className="text-xl font-bold text-white">
              {(totalSize / 1024).toFixed(1)}KB
            </p>
            <p className="text-xs text-gray-500">
              Avg complexity: {avgComplexity.toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-400" />
          <div>
            <p className="text-sm text-gray-400">Issues</p>
            <p className="text-xl font-bold text-white">{errorCount + warningCount}</p>
            <p className="text-xs text-gray-500">
              {errorCount} errors, {warningCount} warnings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// VALIDATION RESULTS COMPONENT
// ============================================================================

const ValidationResults: React.FC<ValidationResultsProps> = ({ validationResults }) => {
  const [filterType, setFilterType] = useState<'all' | 'errors' | 'warnings'>('all');

  const filteredResults = validationResults.filter(result => {
    switch (filterType) {
      case 'errors': return result.errors.length > 0;
      case 'warnings': return result.warnings.length > 0;
      default: return true;
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-white">Validation Results</h4>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Results</option>
          <option value="errors">Errors Only</option>
          <option value="warnings">Warnings Only</option>
        </select>
      </div>

      <div className="bg-gray-800/50 rounded-lg border border-gray-700 max-h-64 overflow-auto">
        {filteredResults.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No validation issues found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredResults.map((result, index) => (
              <div key={index} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-white">{result.toolName}</span>
                    <span className="px-2 py-1 bg-gray-600/20 text-gray-300 text-xs rounded">
                      {result.source}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.isValid ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-xs text-gray-400">
                      Complexity: {result.complexity}
                    </span>
                  </div>
                </div>
                
                {result.errors.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {result.errors.map((error, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-red-400">
                        <XCircle className="w-3 h-3" />
                        {error}
                      </div>
                    ))}
                  </div>
                )}
                
                {result.warnings.length > 0 && (
                  <div className="space-y-1">
                    {result.warnings.map((warning, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-yellow-400">
                        <AlertTriangle className="w-3 h-3" />
                        {warning}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN SCHEMA PREVIEW COMPONENT
// ============================================================================

const McpSchemaPreview: React.FC<McpSchemaPreviewProps> = ({ className }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [showValidOnly, setShowValidOnly] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState('preview');

  const { getAllToolSpecs } = useMcpServerStore();
  const runningServers = useRunningServers();

  // Get MCP tools and mock local tools
  const mcpTools = getAllToolSpecs();
  const localTools = generateMockLocalTools();
  const allTools = [...localTools, ...mcpTools];

  // Filter tools
  const filteredTools = useMemo(() => {
    return allTools.filter(tool => {
      // Search filter
      const matchesSearch = !searchQuery || 
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Source filter
      const matchesSource = filterSource === 'all' || 
        (tool.source && tool.source.includes(filterSource));

      // Validation filter
      const isValid = validateToolSpec(tool).isValid;
      const matchesValidation = !showValidOnly || isValid;

      return matchesSearch && matchesSource && matchesValidation;
    });
  }, [allTools, searchQuery, filterSource, showValidOnly]);

  // Get unique sources
  const sources = useMemo(() => {
    const sourceSet = new Set<string>();
    allTools.forEach(tool => {
      if (tool.source) {
        if (tool.source.startsWith('mcp_')) {
          sourceSet.add('mcp');
        } else if (tool.source.startsWith('local_')) {
          sourceSet.add('local');
        } else {
          sourceSet.add(tool.source);
        }
      }
    });
    return Array.from(sourceSet).sort();
  }, [allTools]);

  // Validation results
  const validationResults = allTools.map(validateToolSpec);

  const toggleToolExpansion = (index: number) => {
    const newExpanded = new Set(expandedTools);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedTools(newExpanded);
  };

  const copyAllSpecs = () => {
    navigator.clipboard.writeText(JSON.stringify(filteredTools, null, 2));
  };

  const exportSpecs = () => {
    const dataStr = JSON.stringify(filteredTools, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `orchestra-tools-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const testRegistration = () => {
    // Mock test registration
    console.log('Testing tool registration with', filteredTools.length, 'tools');
    // In a real implementation, this would call registerSessionTools
  };

  const tabs = [
    { id: 'preview', label: 'Schema Preview', icon: Eye },
    { id: 'validation', label: 'Validation', icon: CheckCircle },
    { id: 'metrics', label: 'Metrics', icon: BarChart3 }
  ];

  return (
    <div className={clsx('h-full flex flex-col', className)}>
      {/* Header */}
      <div className="flex-shrink-0 space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-400" />
            Schema Compilation Preview
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={copyAllSpecs}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy All
            </button>
            <button
              onClick={exportSpecs}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={testRegistration}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Test Registration
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors relative',
                activeTab === tab.id
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
              )}
            </button>
          ))}
        </div>

        {/* Filters */}
        {activeTab === 'preview' && (
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
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Sources</option>
              {sources.map(source => (
                <option key={source} value={source}>{source.toUpperCase()}</option>
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
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'preview' && (
          <div className="space-y-6">
            {/* Metrics Overview */}
            <SchemaMetrics 
              toolSpecs={filteredTools} 
              localTools={localTools} 
              mcpTools={mcpTools} 
            />

            {/* Tool List */}
            <div className="space-y-3">
              {filteredTools.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Tool className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No tools found</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </div>
              ) : (
                filteredTools.map((tool, index) => (
                  <ToolSpecCard
                    key={`${tool.name}-${index}`}
                    toolSpec={tool}
                    index={index}
                    showDetails={expandedTools.has(index)}
                    onToggleDetails={() => toggleToolExpansion(index)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'validation' && (
          <ValidationResults validationResults={validationResults} />
        )}

        {activeTab === 'metrics' && (
          <div className="space-y-6">
            <SchemaMetrics 
              toolSpecs={allTools} 
              localTools={localTools} 
              mcpTools={mcpTools} 
            />
            
            {/* Additional metrics charts could go here */}
            <div className="text-center py-16 text-gray-400">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Detailed metrics coming soon</p>
              <p className="text-sm">Advanced analytics and performance metrics</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default McpSchemaPreview;