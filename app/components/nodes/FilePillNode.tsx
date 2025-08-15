/**
 * FilePillNode - Custom Lexical Node for File References
 * 
 * Represents file references as interactive pills within the Lexical editor.
 * Each pill displays a filename and can be deleted by the user.
 */

import React from 'react';
import {
  DecoratorNode,
  NodeKey,
  LexicalNode,
  SerializedLexicalNode,
  LexicalEditor,
  EditorConfig,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
} from 'lexical';
import { FilePill } from '../ui/FilePill';

export interface FilePillNodeData {
  fileName: string;
  filePath: string;
}

export interface SerializedFilePillNode extends SerializedLexicalNode {
  fileName: string;
  filePath: string;
  type: 'file-pill';
  version: 1;
}

export class FilePillNode extends DecoratorNode<JSX.Element> {
  __fileName: string;
  __filePath: string;

  static getType(): string {
    return 'file-pill';
  }

  static clone(node: FilePillNode): FilePillNode {
    return new FilePillNode(node.__fileName, node.__filePath, node.__key);
  }

  constructor(fileName: string, filePath: string, key?: NodeKey) {
    super(key);
    this.__fileName = fileName;
    this.__filePath = filePath;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    span.className = 'file-pill-node';
    span.setAttribute('data-lexical-decorator', 'true');
    span.setAttribute('contenteditable', 'false');
    return span;
  }

  updateDOM(): false {
    // FilePillNode is immutable - return false to prevent updates
    return false;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('span');
    element.setAttribute('data-file-pill', 'true');
    element.setAttribute('data-file-name', this.__fileName);
    element.setAttribute('data-file-path', this.__filePath);
    element.textContent = `[@${this.__fileName}](@file:${this.__filePath})`;
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (node: Node) => ({
        conversion: convertFilePillElement,
        priority: 1,
      }),
    };
  }

  exportJSON(): SerializedFilePillNode {
    return {
      fileName: this.__fileName,
      filePath: this.__filePath,
      type: 'file-pill',
      version: 1,
    };
  }

  static importJSON(serializedNode: SerializedFilePillNode): FilePillNode {
    const { fileName, filePath } = serializedNode;
    return $createFilePillNode(fileName, filePath);
  }

  getTextContent(): string {
    return `[@${this.__fileName}](@file:${this.__filePath})`;
  }

  setFileName(fileName: string): void {
    const writable = this.getWritable();
    writable.__fileName = fileName;
  }

  setFilePath(filePath: string): void {
    const writable = this.getWritable();
    writable.__filePath = filePath;
  }

  getFileName(): string {
    return this.__fileName;
  }

  getFilePath(): string {
    return this.__filePath;
  }

  decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element {
    return (
      <FilePill
        fileName={this.__fileName}
        filePath={this.__filePath}
        onDelete={() => {
          editor.update(() => {
            this.remove();
          });
        }}
      />
    );
  }

  isInline(): boolean {
    return true;
  }

  isKeyboardSelectable(): boolean {
    return true;
  }
}

// Helper function to create FilePillNode instances
export function $createFilePillNode(fileName: string, filePath: string): FilePillNode {
  return new FilePillNode(fileName, filePath);
}

// Type guard to check if a node is a FilePillNode
export function $isFilePillNode(node: LexicalNode | null | undefined): node is FilePillNode {
  return node instanceof FilePillNode;
}

// DOM conversion function for importing HTML
function convertFilePillElement(domNode: Node): DOMConversionOutput | null {
  if (domNode instanceof HTMLElement) {
    const fileName = domNode.getAttribute('data-file-name');
    const filePath = domNode.getAttribute('data-file-path');
    
    if (fileName && filePath) {
      const node = $createFilePillNode(fileName, filePath);
      return { node };
    }
  }
  return null;
}