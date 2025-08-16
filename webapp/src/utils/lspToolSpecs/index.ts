// LSP ToolSpec Factory Exports
export { createFindSymbolSpec } from './createFindSymbolSpec';
export { createGetSymbolsOverviewSpec } from './createGetSymbolsOverviewSpec';
export { createFindReferencingSymbolsSpec } from './createFindReferencingSymbolsSpec';
export { createInsertAfterSymbolSpec } from './createInsertAfterSymbolSpec';
export { createInsertBeforeSymbolSpec } from './createInsertBeforeSymbolSpec';
export { createReplaceSymbolBodySpec } from './createReplaceSymbolBodySpec';
// Note: createFindReferencingCodeSnippetsSpec and createCodebaseOrientationSpec are not implemented by the onefile LSP server
export { createRestartLanguageServerSpec } from './createRestartLanguageServerSpec';
export { createPingLanguageServerSpec } from './createPingLanguageServerSpec';

// Re-export existing LSP specs for compatibility
export { createFindSymbolSpec as createFindSymbolSpecLegacy } from './createFindSymbolSpec';
export { createCompletionSpec } from './createCompletionSpec';
export { createDocumentSymbolsSpec } from './createDocumentSymbolsSpec';
export { createFindDefinitionSpec } from './createFindDefinitionSpec';
export { createFindImplementationSpec } from './createFindImplementationSpec';
export { createFindReferencesSpec } from './createFindReferencesSpec';
export { createHoverSpec } from './createHoverSpec';
export { createSignatureHelpSpec } from './createSignatureHelpSpec';
export { createWorkspaceSymbolsSpec } from './createWorkspaceSymbolsSpec';