/**
 * JavaScriptLoader - Load JavaScript Files for Webview
 * Stage 3: Helper for loading extracted D3.js classes
 *
 * Handles loading and combining JavaScript files for the webview context.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface JavaScriptLoaderOptions {
    extensionContext: vscode.ExtensionContext;
    files: string[];
}

/**
 * JavaScript file loader for webview embedding
 */
export class JavaScriptLoader {
    private extensionContext: vscode.ExtensionContext;
    private jsPath: string;
    private cache = new Map<string, string>();

    constructor(extensionContext: vscode.ExtensionContext) {
        this.extensionContext = extensionContext;

        // Try dist first (for packaged extension), then src (for development)
        const distJsPath = path.join(
            this.extensionContext.extensionPath,
            'dist',
            'visualization',
            'd3'
        );
        const srcJsPath = path.join(
            this.extensionContext.extensionPath,
            'src',
            'visualization',
            'd3'
        );

        // Use dist path if it exists (packaged extension), otherwise use src path
        this.jsPath = fs.existsSync(distJsPath) ? distJsPath : srcJsPath;
    }

    /**
     * Load and combine multiple JavaScript files
     */
    async loadJavaScriptFiles(fileNames: string[]): Promise<string> {
        try {
            const scripts: string[] = [];

            for (const fileName of fileNames) {
                const content = await this.loadJavaScriptFile(fileName);
                scripts.push(content);
            }

            return scripts.join('\n\n');

        } catch (error) {
            console.error('Failed to load JavaScript files:', error);
            throw new Error(`JavaScript loading failed: ${error}`);
        }
    }

    /**
     * Load a single JavaScript file
     */
    async loadJavaScriptFile(fileName: string): Promise<string> {
        try {
            // Add .js extension if not present
            const jsFileName = fileName.endsWith('.js') ? fileName : `${fileName}.js`;
            const filePath = path.join(this.jsPath, jsFileName);

            // Check cache first
            let content = this.cache.get(jsFileName);
            if (!content) {
                content = await this.loadFile(filePath);
                this.cache.set(jsFileName, content);
            }

            return content;

        } catch (error) {
            console.error(`Failed to load JavaScript file '${fileName}':`, error);
            throw new Error(`JavaScript file loading failed: ${error}`);
        }
    }

    /**
     * Load file from disk
     */
    private async loadFile(filePath: string): Promise<string> {
        if (!fs.existsSync(filePath)) {
            throw new Error(`JavaScript file not found: ${filePath}`);
        }

        return fs.promises.readFile(filePath, 'utf-8');
    }

    /**
     * Clear cache (useful for development)
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Check if a JavaScript file exists
     */
    fileExists(fileName: string): boolean {
        try {
            const jsFileName = fileName.endsWith('.js') ? fileName : `${fileName}.js`;
            const filePath = path.join(this.jsPath, jsFileName);
            return fs.existsSync(filePath);
        } catch {
            return false;
        }
    }
}

/**
 * Factory function to create JavaScript loader
 */
export function createJavaScriptLoader(extensionContext: vscode.ExtensionContext): JavaScriptLoader {
    return new JavaScriptLoader(extensionContext);
}