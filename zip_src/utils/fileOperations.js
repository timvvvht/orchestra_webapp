// import { promises as fs } from 'fs';
// import path from 'path';

// /**
//  * File Operations Utility for Monaco Editor Integration
//  * Provides safe file read/write operations with backup functionality
//  */
// class FileOperations {
//     /**
//      * Read file content
//      * @param {string} filepath - Path to the file
//      * @returns {Promise<string>} File content
//      */
//     static async readFile(filepath) {
//         try {
//             const content = await fs.readFile(filepath, 'utf8');
//             console.log(`✅ Successfully read file: ${filepath}`);
//             return content;
//         } catch (error) {
//             console.error(`❌ Error reading file ${filepath}:`, error.message);
//             throw error;
//         }
//     }

//     /**
//      * Write content to file
//      * @param {string} filepath - Path to the file
//      * @param {string} content - Content to write
//      * @returns {Promise<void>}
//      */
//     static async writeFile(filepath, content) {
//         try {
//             // Ensure directory exists
//             const dir = path.dirname(filepath);
//             await fs.mkdir(dir, { recursive: true });
            
//             await fs.writeFile(filepath, content, 'utf8');
//             console.log(`✅ Successfully wrote file: ${filepath}`);
//         } catch (error) {
//             console.error(`❌ Error writing file ${filepath}:`, error.message);
//             throw error;
//         }
//     }

//     /**
//      * Create a backup of a file
//      * @param {string} filepath - Path to the file to backup
//      * @returns {Promise<string>} Path to the backup file
//      */
//     static async createBackup(filepath) {
//         try {
//             const content = await this.readFile(filepath);
//             const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//             const backupPath = `${filepath}.backup.${timestamp}`;
            
//             await this.writeFile(backupPath, content);
//             console.log(`✅ Created backup: ${backupPath}`);
//             return backupPath;
//         } catch (error) {
//             console.error(`❌ Error creating backup for ${filepath}:`, error.message);
//             throw error;
//         }
//     }

//     /**
//      * Detect programming language from filename
//      * @param {string} filename - Name of the file
//      * @returns {string} Language identifier for Monaco Editor
//      */
//     static detectLanguage(filename) {
//         const ext = filename.split('.').pop()?.toLowerCase();
//         const languageMap = {
//             'ts': 'typescript',
//             'tsx': 'typescript',
//             'js': 'javascript',
//             'jsx': 'javascript',
//             'py': 'python',
//             'json': 'json',
//             'html': 'html',
//             'htm': 'html',
//             'css': 'css',
//             'scss': 'scss',
//             'sass': 'sass',
//             'md': 'markdown',
//             'yml': 'yaml',
//             'yaml': 'yaml',
//             'xml': 'xml',
//             'sql': 'sql',
//             'sh': 'shell',
//             'bash': 'shell',
//             'zsh': 'shell',
//             'php': 'php',
//             'rb': 'ruby',
//             'go': 'go',
//             'rs': 'rust',
//             'cpp': 'cpp',
//             'c': 'c',
//             'h': 'c',
//             'hpp': 'cpp',
//             'java': 'java',
//             'kt': 'kotlin',
//             'swift': 'swift',
//             'dart': 'dart',
//             'vue': 'vue',
//             'svelte': 'svelte',
//         };
//         return languageMap[ext] || 'plaintext';
//     }

//     /**
//      * Check if file exists
//      * @param {string} filepath - Path to check
//      * @returns {Promise<boolean>} True if file exists
//      */
//     static async fileExists(filepath) {
//         try {
//             await fs.access(filepath);
//             return true;
//         } catch {
//             return false;
//         }
//     }

//     /**
//      * Get file stats
//      * @param {string} filepath - Path to the file
//      * @returns {Promise<object>} File stats
//      */
//     static async getFileStats(filepath) {
//         try {
//             const stats = await fs.stat(filepath);
//             return {
//                 size: stats.size,
//                 modified: stats.mtime,
//                 created: stats.birthtime,
//                 isFile: stats.isFile(),
//                 isDirectory: stats.isDirectory()
//             };
//         } catch (error) {
//             console.error(`❌ Error getting stats for ${filepath}:`, error.message);
//             throw error;
//         }
//     }

//     /**
//      * Create diff files from file paths
//      * @param {string[]} filePaths - Array of file paths
//      * @param {string} [originalBasePath] - Base path for original files
//      * @param {string} [modifiedBasePath] - Base path for modified files
//      * @returns {Promise<Array>} Array of diff file objects
//      */
//     static async createDiffFilesFromPaths(filePaths, originalBasePath, modifiedBasePath) {
//         const diffFiles = [];

//         for (const filePath of filePaths) {
//             try {
//                 const originalPath = originalBasePath 
//                     ? path.join(originalBasePath, path.relative(process.cwd(), filePath))
//                     : filePath;
                
//                 const modifiedPath = modifiedBasePath
//                     ? path.join(modifiedBasePath, path.relative(process.cwd(), filePath))
//                     : filePath;

//                 // Read original content (empty if file doesn't exist)
//                 let originalContent = '';
//                 if (await this.fileExists(originalPath)) {
//                     originalContent = await this.readFile(originalPath);
//                 }

//                 // Read modified content
//                 let modifiedContent = '';
//                 if (await this.fileExists(modifiedPath)) {
//                     modifiedContent = await this.readFile(modifiedPath);
//                 } else if (await this.fileExists(filePath)) {
//                     modifiedContent = await this.readFile(filePath);
//                 }

//                 const filename = path.basename(filePath);
//                 const language = this.detectLanguage(filename);

//                 diffFiles.push({
//                     id: `${filePath}-${Date.now()}`,
//                     filename,
//                     filepath: filePath,
//                     originalContent,
//                     modifiedContent,
//                     currentContent: modifiedContent,
//                     language,
//                     hasUnsavedChanges: false,
//                 });
//             } catch (error) {
//                 console.error(`❌ Error processing file ${filePath}:`, error.message);
//             }
//         }

//         return diffFiles;
//     }

//     /**
//      * Save multiple files
//      * @param {Array} diffFiles - Array of diff file objects
//      * @returns {Promise<Array>} Results of save operations
//      */
//     static async saveMultipleFiles(diffFiles) {
//         const results = [];

//         for (const file of diffFiles) {
//             try {
//                 if (file.hasUnsavedChanges) {
//                     await this.writeFile(file.filepath, file.currentContent);
//                     results.push({
//                         filepath: file.filepath,
//                         success: true,
//                         message: `Saved ${file.filename}`
//                     });
//                 } else {
//                     results.push({
//                         filepath: file.filepath,
//                         success: true,
//                         message: `No changes to save in ${file.filename}`
//                     });
//                 }
//             } catch (error) {
//                 results.push({
//                     filepath: file.filepath,
//                     success: false,
//                     message: `Failed to save ${file.filename}: ${error.message}`
//                 });
//             }
//         }

//         return results;
//     }

//     /**
//      * Revert file to original content
//      * @param {object} diffFile - Diff file object
//      * @returns {Promise<void>}
//      */
//     static async revertFile(diffFile) {
//         try {
//             await this.writeFile(diffFile.filepath, diffFile.originalContent);
//             console.log(`✅ Reverted ${diffFile.filename} to original version`);
//         } catch (error) {
//             console.error(`❌ Failed to revert ${diffFile.filename}:`, error.message);
//             throw error;
//         }
//     }
// }

// // Example usage and test functions
// async function testFileOperations() {
//     console.log('🧪 Testing File Operations...');
    
//     try {
//         // Test file creation
//         const testFile = './test-file.txt';
//         const testContent = 'Hello, Monaco Editor!\nThis is a test file.';
        
//         await FileOperations.writeFile(testFile, testContent);
        
//         // Test file reading
//         const readContent = await FileOperations.readFile(testFile);
//         console.log('📖 Read content:', readContent);
        
//         // Test backup creation
//         const backupPath = await FileOperations.createBackup(testFile);
//         console.log('💾 Backup created at:', backupPath);
        
//         // Test language detection
//         const language = FileOperations.detectLanguage('example.ts');
//         console.log('🔍 Detected language:', language);
        
//         // Test file stats
//         const stats = await FileOperations.getFileStats(testFile);
//         console.log('📊 File stats:', stats);
        
//         console.log('✅ All tests passed!');
        
//     } catch (error) {
//         console.error('❌ Test failed:', error.message);
//     }
// }

// // Export for use in other modules
// export default FileOperations;

// // Run tests if this file is executed directly
// if (import.meta.url === `file://${process.argv[1]}`) {
//     testFileOperations();
// }