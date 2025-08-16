/**
 * Unit tests for session metadata builder utilities.
 */

import { 
  buildSessionMetadata, 
  isSessionMetadataComplete, 
  repairSessionMetadata,
  SessionMetadata,
  SessionMetadataInput 
} from '../buildSessionMetadata';
import { DEFAULT_AGENT_CONFIG } from '@/constants/defaultAgentConfig';

describe('buildSessionMetadata', () => {
  it('should create complete metadata with defaults when no input provided', () => {
    const metadata = buildSessionMetadata();
    
    expect(metadata).toEqual({
      model: DEFAULT_AGENT_CONFIG.model,
      tools: DEFAULT_AGENT_CONFIG.tools,
      specialty: DEFAULT_AGENT_CONFIG.specialty,
      avatar: DEFAULT_AGENT_CONFIG.avatar,
      system_prompt: DEFAULT_AGENT_CONFIG.systemPrompt,
      temperature: DEFAULT_AGENT_CONFIG.temperature
    });
  });

  it('should merge input with defaults', () => {
    const input: SessionMetadataInput = {
      model: 'gpt-4',
      specialty: 'Code Assistant'
    };
    
    const metadata = buildSessionMetadata(input);
    
    expect(metadata.model).toBe('gpt-4');
    expect(metadata.specialty).toBe('Code Assistant');
    expect(metadata.tools).toEqual(DEFAULT_AGENT_CONFIG.tools);
    expect(metadata.avatar).toBe(DEFAULT_AGENT_CONFIG.avatar);
    expect(metadata.system_prompt).toBe(DEFAULT_AGENT_CONFIG.systemPrompt);
    expect(metadata.temperature).toBe(DEFAULT_AGENT_CONFIG.temperature);
  });

  it('should preserve additional custom fields', () => {
    const input: SessionMetadataInput = {
      model: 'gpt-4',
      customField: 'custom value',
      anotherField: 42
    };
    
    const metadata = buildSessionMetadata(input);
    
    expect(metadata.model).toBe('gpt-4');
    expect(metadata.customField).toBe('custom value');
    expect(metadata.anotherField).toBe(42);
  });

  it('should clone tools array to prevent mutations', () => {
    const metadata1 = buildSessionMetadata();
    const metadata2 = buildSessionMetadata();
    
    metadata1.tools.push('new_tool');
    
    expect(metadata2.tools).not.toContain('new_tool');
    expect(metadata2.tools).toEqual(DEFAULT_AGENT_CONFIG.tools);
  });

  it('should handle empty input object', () => {
    const metadata = buildSessionMetadata({});
    
    expect(metadata).toEqual({
      model: DEFAULT_AGENT_CONFIG.model,
      tools: DEFAULT_AGENT_CONFIG.tools,
      specialty: DEFAULT_AGENT_CONFIG.specialty,
      avatar: DEFAULT_AGENT_CONFIG.avatar,
      system_prompt: DEFAULT_AGENT_CONFIG.systemPrompt,
      temperature: DEFAULT_AGENT_CONFIG.temperature
    });
  });
});

describe('isSessionMetadataComplete', () => {
  it('should return true for complete metadata', () => {
    const metadata: SessionMetadata = {
      model: 'gpt-4',
      tools: ['web_search'],
      specialty: 'Assistant',
      avatar: 'robot.png',
      system_prompt: 'You are helpful',
      temperature: 0.7
    };
    
    expect(isSessionMetadataComplete(metadata)).toBe(true);
  });

  it('should return false for missing required fields', () => {
    const incompleteMetadata = {
      model: 'gpt-4',
      tools: ['web_search']
      // Missing specialty, avatar, system_prompt, temperature
    };
    
    expect(isSessionMetadataComplete(incompleteMetadata)).toBe(false);
  });

  it('should return false for invalid field types', () => {
    const invalidMetadata = {
      model: 123, // Should be string
      tools: 'not_array', // Should be array
      specialty: '',
      avatar: '',
      system_prompt: '',
      temperature: 'invalid' // Should be number
    };
    
    expect(isSessionMetadataComplete(invalidMetadata)).toBe(false);
  });

  it('should return false for empty strings in required fields', () => {
    const emptyStringMetadata = {
      model: '',
      tools: [],
      specialty: '',
      avatar: '',
      system_prompt: '',
      temperature: 0.7
    };
    
    expect(isSessionMetadataComplete(emptyStringMetadata)).toBe(false);
  });

  it('should return false for null or undefined input', () => {
    expect(isSessionMetadataComplete(null)).toBe(false);
    expect(isSessionMetadataComplete(undefined)).toBe(false);
  });

  it('should return false for invalid temperature range', () => {
    const invalidTempMetadata = {
      model: 'gpt-4',
      tools: ['web_search'],
      specialty: 'Assistant',
      avatar: 'robot.png',
      system_prompt: 'You are helpful',
      temperature: 5 // Invalid: should be 0-2
    };
    
    expect(isSessionMetadataComplete(invalidTempMetadata)).toBe(false);
  });

  it('should accept valid temperature range', () => {
    const validTempMetadata = {
      model: 'gpt-4',
      tools: ['web_search'],
      specialty: 'Assistant',
      avatar: 'robot.png',
      system_prompt: 'You are helpful',
      temperature: 1.5 // Valid: within 0-2 range
    };
    
    expect(isSessionMetadataComplete(validTempMetadata)).toBe(true);
  });
});

describe('repairSessionMetadata', () => {
  it('should return complete metadata unchanged', () => {
    const completeMetadata: SessionMetadata = {
      model: 'gpt-4',
      tools: ['web_search'],
      specialty: 'Assistant',
      avatar: 'robot.png',
      system_prompt: 'You are helpful',
      temperature: 0.7
    };
    
    const repaired = repairSessionMetadata(completeMetadata);
    
    expect(repaired).toEqual(completeMetadata);
  });

  it('should repair incomplete metadata by filling missing fields', () => {
    const incompleteMetadata = {
      model: 'gpt-4',
      specialty: 'Code Assistant'
      // Missing tools, avatar, system_prompt, temperature
    };
    
    const repaired = repairSessionMetadata(incompleteMetadata);
    
    expect(repaired.model).toBe('gpt-4');
    expect(repaired.specialty).toBe('Code Assistant');
    expect(repaired.tools).toEqual(DEFAULT_AGENT_CONFIG.tools);
    expect(repaired.avatar).toBe(DEFAULT_AGENT_CONFIG.avatar);
    expect(repaired.system_prompt).toBe(DEFAULT_AGENT_CONFIG.systemPrompt);
    expect(repaired.temperature).toBe(DEFAULT_AGENT_CONFIG.temperature);
  });

  it('should create complete metadata from null input', () => {
    const repaired = repairSessionMetadata(null);
    
    expect(repaired).toEqual({
      model: DEFAULT_AGENT_CONFIG.model,
      tools: DEFAULT_AGENT_CONFIG.tools,
      specialty: DEFAULT_AGENT_CONFIG.specialty,
      avatar: DEFAULT_AGENT_CONFIG.avatar,
      system_prompt: DEFAULT_AGENT_CONFIG.systemPrompt,
      temperature: DEFAULT_AGENT_CONFIG.temperature
    });
  });

  it('should create complete metadata from undefined input', () => {
    const repaired = repairSessionMetadata(undefined);
    
    expect(repaired).toEqual({
      model: DEFAULT_AGENT_CONFIG.model,
      tools: DEFAULT_AGENT_CONFIG.tools,
      specialty: DEFAULT_AGENT_CONFIG.specialty,
      avatar: DEFAULT_AGENT_CONFIG.avatar,
      system_prompt: DEFAULT_AGENT_CONFIG.systemPrompt,
      temperature: DEFAULT_AGENT_CONFIG.temperature
    });
  });

  it('should preserve custom fields while repairing', () => {
    const incompleteMetadata = {
      model: 'gpt-4',
      customField: 'preserved',
      // Missing other required fields
    };
    
    const repaired = repairSessionMetadata(incompleteMetadata);
    
    expect(repaired.model).toBe('gpt-4');
    expect(repaired.customField).toBe('preserved');
    expect(repaired.tools).toEqual(DEFAULT_AGENT_CONFIG.tools);
    expect(repaired.specialty).toBe(DEFAULT_AGENT_CONFIG.specialty);
  });
});