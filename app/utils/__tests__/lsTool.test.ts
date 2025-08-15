import { describe, it, expect } from 'vitest';
import { getToolSpec } from '../toolSpecRegistry';
import { createLsToolSpec } from '../registerSessionTools';

describe('ls ToolSpec', () => {
  it('should exist in the tool spec registry', () => {
    const toolSpec = getToolSpec('ls');
    expect(toolSpec).not.toBeNull();
    expect(toolSpec?.name).toBe('ls');
  });

  it('should have the correct factory function', () => {
    const factorySpec = createLsToolSpec();
    expect(factorySpec.name).toBe('ls');
    expect(factorySpec.description).toContain('Lists files and directories');
    expect(factorySpec.input_schema.type).toBe('object');
  });

  it('should have correct schema properties', () => {
    const toolSpec = getToolSpec('ls');
    expect(toolSpec).not.toBeNull();
    
    const properties = toolSpec?.input_schema.properties;
    expect(properties).toBeDefined();
    
    // Check path property
    expect(properties?.path).toBeDefined();
    expect(properties?.path.type).toBe('string');
    expect(properties?.path.description).toContain('Directory path');
    
    // Check include_hidden property
    expect(properties?.include_hidden).toBeDefined();
    expect(properties?.include_hidden.type).toBe('boolean');
    expect(properties?.include_hidden.description).toContain('hidden files');
    
    // Check only_dirs property
    expect(properties?.only_dirs).toBeDefined();
    expect(properties?.only_dirs.type).toBe('boolean');
    expect(properties?.only_dirs.description).toContain('only include directories');
  });

  it('should have no required properties', () => {
    const toolSpec = getToolSpec('ls');
    expect(toolSpec).not.toBeNull();
    expect(toolSpec?.input_schema.required).toEqual([]);
  });
});