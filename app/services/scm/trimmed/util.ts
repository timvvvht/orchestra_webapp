/**
 * Trimmed SCM Utilities - Core Path and String Operations Only
 * Removed: VS Code workspace APIs, UI utilities, configuration
 * Kept: Essential path normalization, string utilities, and file operations
 */

import * as path from 'path';
import * as fs from 'fs';

export function isDescendant(parent: string, descendant: string): boolean {
  if (parent === descendant) {
    return true;
  }

  if (parent.charAt(parent.length - 1) !== path.sep) {
    parent += path.sep;
  }

  // Windows is case insensitive
  if (process.platform === 'win32') {
    parent = parent.toLowerCase();
    descendant = descendant.toLowerCase();
  }

  return descendant.startsWith(parent);
}

export function pathEquals(a: string, b: string): boolean {
  // Windows is case insensitive
  if (process.platform === 'win32') {
    a = a.toLowerCase();
    b = b.toLowerCase();
  }

  return a === b;
}

export function relativePath(from: string, to: string): string {
  return path.relative(from, to);
}

export function sanitizePath(filePath: string): string {
  return filePath.replace(/^[a-z]:/i, (drive) => drive.toUpperCase());
}

export function normalizeGitPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

export function denormalizeGitPath(filePath: string): string {
  if (process.platform === 'win32') {
    return filePath.replace(/\//g, '\\');
  }
  return filePath;
}

export function readBytes(stream: NodeJS.ReadableStream, bytes: number): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytesRead = 0;

    stream.on('data', (chunk: Buffer) => {
      bytesRead += chunk.length;
      chunks.push(chunk);

      if (bytesRead >= bytes) {
        resolve(Buffer.concat(chunks));
      }
    });

    stream.on('error', reject);
    stream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

export function detectUnicodeEncoding(buffer: Buffer): string {
  if (buffer.length < 2) {
    return 'utf8';
  }

  if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return 'utf16le';
  }

  if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
    return 'utf16be';
  }

  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return 'utf8';
  }

  return 'utf8';
}

export function isBinaryFile(buffer: Buffer): boolean {
  if (buffer.length === 0) {
    return false;
  }

  // Check for null bytes in first 8000 bytes
  const bytesToCheck = Math.min(buffer.length, 8000);
  for (let i = 0; i < bytesToCheck; i++) {
    if (buffer[i] === 0) {
      return true;
    }
  }

  return false;
}

export function splitInChunks(array: string[], maxChunkLength: number): string[][] {
  const result: string[][] = [];
  let totalLength = 0;
  let group: string[] = [];

  for (const str of array) {
    let length = str.length + 1; // +1 for the space

    if (totalLength + length > maxChunkLength && group.length > 0) {
      result.push(group);
      group = [];
      totalLength = 0;
    }

    group.push(str);
    totalLength += length;
  }

  if (group.length > 0) {
    result.push(group);
  }

  return result;
}

export function grep(filename: string, pattern: RegExp): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    fs.readFile(filename, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(pattern.test(data));
    });
  });
}

export function readdir(path: string): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    fs.readdir(path, (err, children) => err ? reject(err) : resolve(children));
  });
}

export function exists(path: string): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    fs.access(path, err => resolve(!err));
  });
}

export function mkdirp(path: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    fs.mkdir(path, { recursive: true }, err => {
      if (err && err.code !== 'EEXIST') {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
}

export function rimraf(path: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.rm(path, { recursive: true, force: true }, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export function stat(path: string): Promise<fs.Stats> {
  return new Promise<fs.Stats>((resolve, reject) => {
    fs.stat(path, (err, stat) => err ? reject(err) : resolve(stat));
  });
}

export function lstat(path: string): Promise<fs.Stats> {
  return new Promise<fs.Stats>((resolve, reject) => {
    fs.lstat(path, (err, stat) => err ? reject(err) : resolve(stat));
  });
}

export function readfile(path: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    fs.readFile(path, (err, data) => err ? reject(err) : resolve(data));
  });
}

export function writeFile(path: string, content: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.writeFile(path, content, 'utf8', err => err ? reject(err) : resolve());
  });
}