/**
 * MCP Tool Converter
 * 
 * Utilities for converting MCP tool definitions to Orchestra ToolSpec format
 * and handling schema validation, merging, and compatibility checks.
 */

import { 
  McpToolDefinition, 
  McpSchemaProperty,
  validateMcpTool,
  convertMcpToolToSpec,
  convertMcpToolsToSpecs
} from './types';
import type { ToolSpec } from '@/utils/registerSessionTools';

// ============================================================================
// CONVERSION RESULT TYPES
// ============================================================================

export interface ConversionResult {
  success: boolean;
  toolSpec?: ToolSpec;
  errors: string[];
  warnings: string[];
}

export interface BatchConversionResult {
  success: boolean;
  toolSpecs: ToolSpec[];
  errors: ConversionError[];
  warnings: ConversionWarning[];
  summary: {
    total: number;
    converted: number;
    failed: number;
    skipped: number;
  };
}

export interface ConversionError {
  toolName: string;
  serverId: string;
  error: string;
  details?: any;
}

export interface ConversionWarning {
  toolName: string;
  serverId: string;
  warning: string;
  details?: any;
}

export interface MergeResult {
  toolSpecs: ToolSpec[];
  conflicts: ToolConflict[];
  duplicates: ToolDuplicate[];
}

export interface ToolConflict {
  toolName: string;
  servers: string[];
  reason: 'name_collision' | 'schema_mismatch' | 'version_conflict';
  details: string;
}

export interface ToolDuplicate {
  toolName: string;
  servers: string[];
  action: 'kept_first' | 'kept_latest' | 'merged';
}

// ============================================================================
// MCP TOOL CONVERTER CLASS
// ============================================================================

export class McpToolConverter {
  private static instance: McpToolConverter;

  private constructor() {}

  public static getInstance(): McpToolConverter {
    if (!McpToolConverter.instance) {
      McpToolConverter.instance = new McpToolConverter();
    }
    return McpToolConverter.instance;
  }

  // ============================================================================
  // SINGLE TOOL CONVERSION
  // ============================================================================

  /**
   * Convert a single MCP tool to Orchestra ToolSpec with detailed validation
   */
  public convertTool(
    mcpTool: McpToolDefinition, 
    serverId: string,
    options: ConversionOptions = {}
  ): ConversionResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate MCP tool structure
      if (!validateMcpTool(mcpTool)) {
        errors.push('Invalid MCP tool structure');
        return { success: false, errors, warnings };
      }

      // Check for required fields
      if (!mcpTool.name || typeof mcpTool.name !== 'string') {
        errors.push('Tool name is required and must be a string');
      }

      if (!mcpTool.description || typeof mcpTool.description !== 'string') {
        errors.push('Tool description is required and must be a string');
      }

      if (!mcpTool.inputSchema || typeof mcpTool.inputSchema !== 'object') {
        errors.push('Tool inputSchema is required and must be an object');
      }

      if (errors.length > 0) {
        return { success: false, errors, warnings };
      }

      // Validate tool name format
      if (!this.isValidToolName(mcpTool.name)) {
        if (options.strictNaming) {
          errors.push(`Invalid tool name format: ${mcpTool.name}. Must contain only letters, numbers, and underscores.`);
          return { success: false, errors, warnings };
        } else {
          warnings.push(`Tool name "${mcpTool.name}" contains special characters that may cause issues`);
        }
      }

      // Check for name conflicts if provided
      if (options.existingToolNames && options.existingToolNames.includes(mcpTool.name)) {
        const conflictStrategy = options.nameConflictStrategy || 'error';
        
        switch (conflictStrategy) {
          case 'error':
            errors.push(`Tool name "${mcpTool.name}" conflicts with existing tool`);
            return { success: false, errors, warnings };
          
          case 'prefix':
            mcpTool = { ...mcpTool, name: `${serverId}_${mcpTool.name}` };
            warnings.push(`Tool name prefixed to avoid conflict: ${mcpTool.name}`);
            break;
          
          case 'suffix':
            mcpTool = { ...mcpTool, name: `${mcpTool.name}_${serverId}` };
            warnings.push(`Tool name suffixed to avoid conflict: ${mcpTool.name}`);
            break;
          
          case 'skip':
            warnings.push(`Skipping tool "${mcpTool.name}" due to name conflict`);
            return { success: false, errors, warnings };
        }
      }

      // Validate schema complexity
      const schemaComplexity = this.calculateSchemaComplexity(mcpTool.inputSchema);
      if (schemaComplexity > (options.maxSchemaComplexity || 100)) {
        if (options.strictComplexity) {
          errors.push(`Tool schema too complex (complexity: ${schemaComplexity})`);
          return { success: false, errors, warnings };
        } else {
          warnings.push(`Tool schema is complex (complexity: ${schemaComplexity}), may impact performance`);
        }
      }

      // Convert to ToolSpec
      const toolSpec = convertMcpToolToSpec(mcpTool, serverId);

      // Add conversion metadata
      if (options.includeMetadata) {
        toolSpec.metadata = {
          ...toolSpec.metadata,
          mcp_server_id: serverId,
          converted_at: new Date().toISOString(),
          original_schema_complexity: schemaComplexity,
          conversion_warnings: warnings.length > 0 ? warnings : undefined
        };
      }

      return {
        success: true,
        toolSpec,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`Conversion failed: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false, errors, warnings };
    }
  }

  // ============================================================================
  // BATCH CONVERSION
  // ============================================================================

  /**
   * Convert multiple MCP tools from multiple servers
   */
  public convertToolsBatch(
    toolsByServer: Map<string, McpToolDefinition[]>,
    options: ConversionOptions = {}
  ): BatchConversionResult {
    const toolSpecs: ToolSpec[] = [];
    const errors: ConversionError[] = [];
    const warnings: ConversionWarning[] = [];
    
    let total = 0;
    let converted = 0;
    let failed = 0;
    let skipped = 0;

    // Collect all existing tool names for conflict detection
    const existingToolNames = new Set<string>();
    if (options.existingToolNames) {
      options.existingToolNames.forEach(name => existingToolNames.add(name));
    }

    for (const [serverId, tools] of toolsByServer) {
      for (const tool of tools) {
        total++;

        try {
          const result = this.convertTool(tool, serverId, {
            ...options,
            existingToolNames: Array.from(existingToolNames)
          });

          if (result.success && result.toolSpec) {
            toolSpecs.push(result.toolSpec);
            existingToolNames.add(result.toolSpec.name);
            converted++;

            // Add warnings
            result.warnings.forEach(warning => {
              warnings.push({
                toolName: tool.name,
                serverId,
                warning
              });
            });

          } else {
            failed++;
            result.errors.forEach(error => {
              errors.push({
                toolName: tool.name,
                serverId,
                error
              });
            });
          }

        } catch (error) {
          failed++;
          errors.push({
            toolName: tool.name,
            serverId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    return {
      success: errors.length === 0,
      toolSpecs,
      errors,
      warnings,
      summary: {
        total,
        converted,
        failed,
        skipped
      }
    };
  }

  // ============================================================================
  // TOOL MERGING AND CONFLICT RESOLUTION
  // ============================================================================

  /**
   * Merge tools from multiple servers with conflict resolution
   */
  public mergeTools(
    toolsByServer: Map<string, ToolSpec[]>,
    strategy: MergeStrategy = 'first_wins'
  ): MergeResult {
    const mergedTools: ToolSpec[] = [];
    const conflicts: ToolConflict[] = [];
    const duplicates: ToolDuplicate[] = [];
    const toolMap = new Map<string, { tool: ToolSpec; servers: string[] }>();

    // First pass: collect all tools and identify conflicts
    for (const [serverId, tools] of toolsByServer) {
      for (const tool of tools) {
        const existing = toolMap.get(tool.name);
        
        if (existing) {
          // Tool name collision detected
          existing.servers.push(serverId);
          
          if (this.areToolsCompatible(existing.tool, tool)) {
            // Compatible tools - mark as duplicate
            duplicates.push({
              toolName: tool.name,
              servers: existing.servers,
              action: this.resolveDuplicate(existing.tool, tool, strategy)
            });
          } else {
            // Incompatible tools - mark as conflict
            conflicts.push({
              toolName: tool.name,
              servers: existing.servers,
              reason: 'schema_mismatch',
              details: 'Tool schemas are incompatible'
            });
          }
        } else {
          // New tool
          toolMap.set(tool.name, {
            tool: { ...tool },
            servers: [serverId]
          });
        }
      }
    }

    // Second pass: resolve conflicts and build final tool list
    for (const [toolName, { tool, servers }] of toolMap) {
      if (servers.length === 1) {
        // No conflicts
        mergedTools.push(tool);
      } else {
        // Handle conflicts based on strategy
        const resolvedTool = this.resolveConflict(toolName, toolsByServer, servers, strategy);
        if (resolvedTool) {
          mergedTools.push(resolvedTool);
        }
      }
    }

    return {
      toolSpecs: mergedTools,
      conflicts,
      duplicates
    };
  }

  // ============================================================================
  // VALIDATION AND COMPATIBILITY
  // ============================================================================

  /**
   * Check if two tools are compatible (same schema structure)
   */
  public areToolsCompatible(tool1: ToolSpec, tool2: ToolSpec): boolean {
    try {
      // Compare basic properties
      if (tool1.description !== tool2.description) {
        return false;
      }

      // Compare input schemas
      return this.areSchemasCompatible(tool1.input_schema, tool2.input_schema);

    } catch (error) {
      return false;
    }
  }

  /**
   * Validate converted tool specs against Orchestra requirements
   */
  public validateToolSpecs(toolSpecs: ToolSpec[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validTools: ToolSpec[] = [];

    for (const tool of toolSpecs) {
      const toolErrors: string[] = [];
      const toolWarnings: string[] = [];

      // Validate required fields
      if (!tool.name) {
        toolErrors.push('Tool name is required');
      }

      if (!tool.description) {
        toolErrors.push('Tool description is required');
      }

      if (!tool.input_schema) {
        toolErrors.push('Tool input_schema is required');
      }

      // Validate name format
      if (tool.name && !this.isValidToolName(tool.name)) {
        toolWarnings.push(`Tool name "${tool.name}" may cause issues`);
      }

      // Validate schema structure
      if (tool.input_schema) {
        const schemaValidation = this.validateSchema(tool.input_schema);
        toolErrors.push(...schemaValidation.errors);
        toolWarnings.push(...schemaValidation.warnings);
      }

      if (toolErrors.length === 0) {
        validTools.push(tool);
      } else {
        errors.push(`Tool "${tool.name}": ${toolErrors.join(', ')}`);
      }

      warnings.push(...toolWarnings.map(w => `Tool "${tool.name}": ${w}`));
    }

    return {
      valid: errors.length === 0,
      validTools,
      errors,
      warnings
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Calculate schema complexity score
   */
  private calculateSchemaComplexity(schema: any, depth = 0): number {
    if (depth > 10) return 100; // Prevent infinite recursion

    let complexity = 1;

    if (schema.properties) {
      complexity += Object.keys(schema.properties).length;
      for (const prop of Object.values(schema.properties)) {
        complexity += this.calculateSchemaComplexity(prop, depth + 1);
      }
    }

    if (schema.items) {
      complexity += this.calculateSchemaComplexity(schema.items, depth + 1);
    }

    if (schema.enum) {
      complexity += schema.enum.length * 0.1;
    }

    return complexity;
  }

  /**
   * Validate tool name format
   */
  private isValidToolName(name: string): boolean {
    return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name);
  }

  /**
   * Check if two schemas are compatible
   */
  private areSchemasCompatible(schema1: any, schema2: any): boolean {
    // Simplified compatibility check
    // In a real implementation, this would be more sophisticated
    return JSON.stringify(schema1) === JSON.stringify(schema2);
  }

  /**
   * Resolve duplicate tools
   */
  private resolveDuplicate(
    tool1: ToolSpec, 
    tool2: ToolSpec, 
    strategy: MergeStrategy
  ): 'kept_first' | 'kept_latest' | 'merged' {
    switch (strategy) {
      case 'first_wins':
        return 'kept_first';
      case 'last_wins':
        return 'kept_latest';
      case 'merge':
        return 'merged';
      default:
        return 'kept_first';
    }
  }

  /**
   * Resolve tool conflicts
   */
  private resolveConflict(
    toolName: string,
    toolsByServer: Map<string, ToolSpec[]>,
    servers: string[],
    strategy: MergeStrategy
  ): ToolSpec | null {
    // Find the tool instances
    const toolInstances: ToolSpec[] = [];
    
    for (const [serverId, tools] of toolsByServer) {
      if (servers.includes(serverId)) {
        const tool = tools.find(t => t.name === toolName);
        if (tool) {
          toolInstances.push(tool);
        }
      }
    }

    if (toolInstances.length === 0) {
      return null;
    }

    switch (strategy) {
      case 'first_wins':
        return toolInstances[0];
      
      case 'last_wins':
        return toolInstances[toolInstances.length - 1];
      
      case 'merge':
        // Simple merge - combine metadata
        const baseTool = { ...toolInstances[0] };
        baseTool.metadata = {
          ...baseTool.metadata,
          merged_from_servers: servers,
          conflict_resolved: true
        };
        return baseTool;
      
      case 'prefix_server':
        // Return all tools with server prefixes
        return {
          ...toolInstances[0],
          name: `${servers[0]}_${toolName}`,
          metadata: {
            ...toolInstances[0].metadata,
            original_name: toolName,
            server_prefixed: true
          }
        };
      
      default:
        return toolInstances[0];
    }
  }

  /**
   * Validate schema structure
   */
  private validateSchema(schema: any): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!schema.type) {
      errors.push('Schema type is required');
    }

    if (schema.type === 'object' && !schema.properties) {
      warnings.push('Object schema should have properties defined');
    }

    return { errors, warnings };
  }
}

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ConversionOptions {
  strictNaming?: boolean;
  strictComplexity?: boolean;
  maxSchemaComplexity?: number;
  nameConflictStrategy?: 'error' | 'prefix' | 'suffix' | 'skip';
  existingToolNames?: string[];
  includeMetadata?: boolean;
}

export type MergeStrategy = 
  | 'first_wins' 
  | 'last_wins' 
  | 'merge' 
  | 'prefix_server' 
  | 'error_on_conflict';

export interface ValidationResult {
  valid: boolean;
  validTools: ToolSpec[];
  errors: string[];
  warnings: string[];
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const mcpToolConverter = McpToolConverter.getInstance();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Quick conversion function for single tool
 */
export function convertMcpTool(
  tool: McpToolDefinition, 
  serverId: string,
  options?: ConversionOptions
): ToolSpec | null {
  const result = mcpToolConverter.convertTool(tool, serverId, options);
  return result.success ? result.toolSpec! : null;
}

/**
 * Quick batch conversion function
 */
export function convertMcpToolsBatch(
  toolsByServer: Map<string, McpToolDefinition[]>,
  options?: ConversionOptions
): ToolSpec[] {
  const result = mcpToolConverter.convertToolsBatch(toolsByServer, options);
  return result.toolSpecs;
}

/**
 * Merge tools with default strategy
 */
export function mergeToolSpecs(
  toolsByServer: Map<string, ToolSpec[]>,
  strategy: MergeStrategy = 'first_wins'
): ToolSpec[] {
  const result = mcpToolConverter.mergeTools(toolsByServer, strategy);
  return result.toolSpecs;
}