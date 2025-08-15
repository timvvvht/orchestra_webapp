import { describe, it, expect } from 'vitest';
import { createGetSymbolsOverviewSpec } from '../createGetSymbolsOverviewSpec';
import { createFindSymbolSpec } from '../createFindSymbolSpec';
import { createFindReferencingSymbolsSpec } from '../createFindReferencingSymbolsSpec';
import { createFindReferencingCodeSnippetsSpec } from '../createFindReferencingCodeSnippetsSpec';
import { createRestartLanguageServerSpec } from '../createRestartLanguageServerSpec';
import { createInsertAfterSymbolSpec } from '../createInsertAfterSymbolSpec';
import { createInsertBeforeSymbolSpec } from '../createInsertBeforeSymbolSpec';
import { createReplaceSymbolBodySpec } from '../createReplaceSymbolBodySpec';

describe('LSP ToolSpec Alignment', () => {
    it('get_symbols_overview spec should only have max_items', () => {
        const spec = createGetSymbolsOverviewSpec();
        
        expect(spec.name).toBe('get_symbols_overview');
        expect(spec.input_schema.properties).toEqual({
            max_items: {
                type: 'integer',
                description: 'Maximum number of symbols to return',
                default: 250,
                minimum: 1
            }
        });
        expect(spec.input_schema.required).toEqual([]);
    });

    it('find_symbol spec should only have name_path and depth', () => {
        const spec = createFindSymbolSpec();
        
        expect(spec.name).toBe('find_symbol');
        expect(spec.input_schema.properties).toEqual({
            name_path: {
                type: 'string',
                description: 'The symbol name or path to search for'
            },
            depth: {
                type: 'integer',
                description: 'Search depth limit',
                default: 0,
                minimum: 0
            }
        });
        expect(spec.input_schema.required).toEqual(['name_path']);
    });

    it('find_referencing_symbols spec should only have symbol_name', () => {
        const spec = createFindReferencingSymbolsSpec();
        
        expect(spec.name).toBe('find_referencing_symbols');
        expect(spec.input_schema.properties).toEqual({
            symbol_name: {
                type: 'string',
                description: 'The name of the symbol to find references for'
            }
        });
        expect(spec.input_schema.required).toEqual(['symbol_name']);
    });

    it('find_referencing_code_snippets spec should have symbol_name, context_lines, max_results', () => {
        const spec = createFindReferencingCodeSnippetsSpec();
        
        expect(spec.name).toBe('find_referencing_code_snippets');
        expect(spec.input_schema.properties).toEqual({
            symbol_name: {
                type: 'string',
                description: 'The name of the symbol to find referencing snippets for'
            },
            context_lines: {
                type: 'integer',
                description: 'Number of context lines to include around each snippet',
                default: 3,
                minimum: 0
            },
            max_results: {
                type: 'integer',
                description: 'Maximum number of snippets to return',
                default: 10,
                minimum: 1
            }
        });
        expect(spec.input_schema.required).toEqual(['symbol_name']);
    });

    it('restart_language_server spec should have empty properties', () => {
        const spec = createRestartLanguageServerSpec();
        
        expect(spec.name).toBe('restart_language_server');
        expect(spec.input_schema.properties).toEqual({});
        expect(spec.input_schema.required).toEqual([]);
    });

    it('insert_after_symbol spec should include dry_run', () => {
        const spec = createInsertAfterSymbolSpec();
        
        expect(spec.name).toBe('insert_after_symbol');
        expect(spec.input_schema.properties).toHaveProperty('symbol_name');
        expect(spec.input_schema.properties).toHaveProperty('content');
        expect(spec.input_schema.properties).toHaveProperty('file_path');
        expect(spec.input_schema.properties).toHaveProperty('dry_run');
        expect(spec.input_schema.properties.dry_run).toEqual({
            type: 'boolean',
            description: 'If true, return a preview instead of modifying files',
            default: false
        });
        expect(spec.input_schema.required).toEqual(['symbol_name', 'content']);
    });

    it('insert_before_symbol spec should include dry_run', () => {
        const spec = createInsertBeforeSymbolSpec();
        
        expect(spec.name).toBe('insert_before_symbol');
        expect(spec.input_schema.properties).toHaveProperty('symbol_name');
        expect(spec.input_schema.properties).toHaveProperty('content');
        expect(spec.input_schema.properties).toHaveProperty('file_path');
        expect(spec.input_schema.properties).toHaveProperty('dry_run');
        expect(spec.input_schema.properties.dry_run).toEqual({
            type: 'boolean',
            description: 'If true, return a preview instead of modifying files',
            default: false
        });
        expect(spec.input_schema.required).toEqual(['symbol_name', 'content']);
    });

    it('replace_symbol_body spec should include dry_run', () => {
        const spec = createReplaceSymbolBodySpec();
        
        expect(spec.name).toBe('replace_symbol_body');
        expect(spec.input_schema.properties).toHaveProperty('symbol_name');
        expect(spec.input_schema.properties).toHaveProperty('new_body');
        expect(spec.input_schema.properties).toHaveProperty('file_path');
        expect(spec.input_schema.properties).toHaveProperty('dry_run');
        expect(spec.input_schema.properties.dry_run).toEqual({
            type: 'boolean',
            description: 'If true, return a preview instead of modifying files',
            default: false
        });
        expect(spec.input_schema.required).toEqual(['symbol_name', 'new_body']);
    });
});