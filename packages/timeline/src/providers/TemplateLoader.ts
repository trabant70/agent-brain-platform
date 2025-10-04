/**
 * TemplateLoader - Template Management System
 *
 * Handles loading and rendering of HTML templates with variable substitution.
 * Stage 1 of visualization architecture refactoring.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface TemplateVariables {
    readonly cspSource: string;
    readonly nonce: string;
    readonly scriptUri: string;
    readonly timelineCode: string;
    readonly cssContent?: string; // Stage 2: Optional embedded CSS content
}

export interface ITemplateLoader {
    /**
     * Load and render a template with variable substitution
     */
    loadTemplate(templateName: string, variables: TemplateVariables): Promise<string>;

    /**
     * Load CSS content from external files
     */
    loadCSS(cssFileName: string): Promise<string>;

    /**
     * Check if a template exists
     */
    templateExists(templateName: string): boolean;

    /**
     * Get the path to a template file
     */
    getTemplatePath(templateName: string): string;
}

/**
 * File-based template loader
 */
export class TemplateLoader implements ITemplateLoader {
    private readonly templateCache = new Map<string, string>();
    private readonly cssCache = new Map<string, string>();
    private readonly templatesPath: string;
    private readonly stylesPath: string;

    constructor(private readonly extensionContext: vscode.ExtensionContext) {
        // Try dist first (for packaged extension), then src (for development)
        const distTemplatesPath = path.join(
            this.extensionContext.extensionPath,
            'dist',
            'visualization',
            'templates'
        );
        const srcTemplatesPath = path.join(
            this.extensionContext.extensionPath,
            'src',
            'visualization',
            'templates'
        );

        const distStylesPath = path.join(
            this.extensionContext.extensionPath,
            'dist',
            'visualization',
            'styles'
        );
        const srcStylesPath = path.join(
            this.extensionContext.extensionPath,
            'src',
            'visualization',
            'styles'
        );

        // Use dist paths if they exist (packaged extension), otherwise use src paths
        this.templatesPath = fs.existsSync(distTemplatesPath) ? distTemplatesPath : srcTemplatesPath;
        this.stylesPath = fs.existsSync(distStylesPath) ? distStylesPath : srcStylesPath;
    }

    /**
     * Load and render a template with variable substitution
     */
    async loadTemplate(templateName: string, variables: TemplateVariables): Promise<string> {
        try {
            const templatePath = this.getTemplatePath(templateName);

            // Load template content (with caching)
            let template = this.templateCache.get(templateName);
            if (!template) {
                template = await this.loadTemplateFile(templatePath);
                this.templateCache.set(templateName, template);
            }

            // Perform variable substitution
            const rendered = this.substituteVariables(template, variables);

            return rendered;

        } catch (error) {
            console.error(`Failed to load template '${templateName}':`, error);
            throw new TemplateLoadError(templateName, error as Error);
        }
    }

    /**
     * Check if a template exists
     */
    templateExists(templateName: string): boolean {
        try {
            const templatePath = this.getTemplatePath(templateName);
            return fs.existsSync(templatePath);
        } catch {
            return false;
        }
    }

    /**
     * Get the path to a template file
     */
    getTemplatePath(templateName: string): string {
        // Add .html extension if not present
        const fileName = templateName.endsWith('.html') ? templateName : `${templateName}.html`;
        return path.join(this.templatesPath, fileName);
    }

    /**
     * Load CSS content from external files with import resolution
     */
    async loadCSS(cssFileName: string): Promise<string> {
        try {
            // Add .css extension if not present
            const fileName = cssFileName.endsWith('.css') ? cssFileName : `${cssFileName}.css`;
            const cssPath = path.join(this.stylesPath, fileName);

            // Load CSS content (with caching)
            let cssContent = this.cssCache.get(cssFileName);
            if (!cssContent) {
                cssContent = await this.loadCSSFile(cssPath);
                // Resolve @import statements
                cssContent = await this.resolveImports(cssContent, this.stylesPath);
                this.cssCache.set(cssFileName, cssContent);
            }

            return cssContent;

        } catch (error) {
            console.error(`Failed to load CSS file '${cssFileName}':`, error);
            throw new TemplateLoadError(cssFileName, error as Error);
        }
    }

    /**
     * Clear template and CSS cache (useful for development)
     */
    clearCache(): void {
        this.templateCache.clear();
        this.cssCache.clear();
    }

    /**
     * Load template file from disk
     */
    private async loadTemplateFile(templatePath: string): Promise<string> {
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template file not found: ${templatePath}`);
        }

        return fs.promises.readFile(templatePath, 'utf-8');
    }

    /**
     * Load CSS file from disk
     */
    private async loadCSSFile(cssPath: string): Promise<string> {
        if (!fs.existsSync(cssPath)) {
            throw new Error(`CSS file not found: ${cssPath}`);
        }

        return fs.promises.readFile(cssPath, 'utf-8');
    }

    /**
     * Resolve @import statements in CSS content
     */
    private async resolveImports(cssContent: string, basePath: string): Promise<string> {
        // Match @import url('./path') and @import './path'
        const importRegex = /@import\s+(?:url\()?['"]([^'"]+)['"](?:\))?;?/g;
        let resolvedContent = cssContent;
        let match;

        while ((match = importRegex.exec(cssContent)) !== null) {
            const importPath = match[1];
            const fullImportPath = path.resolve(basePath, importPath);

            try {
                if (fs.existsSync(fullImportPath)) {
                    const importedContent = fs.readFileSync(fullImportPath, 'utf-8');
                    // Recursively resolve imports in imported files
                    const resolvedImportContent = await this.resolveImports(
                        importedContent,
                        path.dirname(fullImportPath)
                    );
                    // Replace the @import statement with the actual content
                    resolvedContent = resolvedContent.replace(match[0], resolvedImportContent);
                } else {
                    console.warn(`CSS import not found: ${fullImportPath}`);
                    // Remove the @import statement if file not found
                    resolvedContent = resolvedContent.replace(match[0], '');
                }
            } catch (error) {
                console.warn(`Failed to resolve CSS import ${importPath}:`, error);
                resolvedContent = resolvedContent.replace(match[0], '');
            }
        }

        return resolvedContent;
    }

    /**
     * Substitute template variables using simple string replacement
     * Uses {{variableName}} syntax for variable placeholders
     */
    private substituteVariables(template: string, variables: TemplateVariables): string {
        let result = template;

        // Replace each variable
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            const stringValue = typeof value === 'string' ? value : String(value);

            // Replace all instances of the placeholder
            result = result.replace(new RegExp(this.escapeRegExp(placeholder), 'g'), stringValue);
        }

        // Check for unreplaced placeholders (useful for debugging)
        const unreplacedMatches = result.match(/\{\{[^}]+\}\}/g);
        if (unreplacedMatches) {
            console.warn('Template contains unreplaced placeholders:', unreplacedMatches);
        }

        return result;
    }

    /**
     * Escape special regex characters in string
     */
    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

/**
 * In-memory template loader for testing or fallback scenarios
 */
export class InMemoryTemplateLoader implements ITemplateLoader {
    private templates = new Map<string, string>();
    private cssFiles = new Map<string, string>();

    /**
     * Add a template to memory
     */
    addTemplate(name: string, content: string): void {
        this.templates.set(name, content);
    }

    /**
     * Add CSS content to memory
     */
    addCSS(name: string, content: string): void {
        this.cssFiles.set(name, content);
    }

    /**
     * Load and render a template with variable substitution
     */
    async loadTemplate(templateName: string, variables: TemplateVariables): Promise<string> {
        const template = this.templates.get(templateName);
        if (!template) {
            throw new TemplateLoadError(templateName, new Error('Template not found in memory'));
        }

        return this.substituteVariables(template, variables);
    }

    /**
     * Load CSS content from memory
     */
    async loadCSS(cssFileName: string): Promise<string> {
        const cssContent = this.cssFiles.get(cssFileName);
        if (!cssContent) {
            throw new TemplateLoadError(cssFileName, new Error('CSS file not found in memory'));
        }
        return cssContent;
    }

    /**
     * Check if a template exists
     */
    templateExists(templateName: string): boolean {
        return this.templates.has(templateName);
    }

    /**
     * Get the path to a template file (returns template name for in-memory)
     */
    getTemplatePath(templateName: string): string {
        return `memory://${templateName}`;
    }

    /**
     * Substitute template variables
     */
    private substituteVariables(template: string, variables: TemplateVariables): string {
        let result = template;

        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            const stringValue = typeof value === 'string' ? value : String(value);
            result = result.replace(new RegExp(this.escapeRegExp(placeholder), 'g'), stringValue);
        }

        return result;
    }

    /**
     * Escape special regex characters in string
     */
    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

/**
 * Template loading error
 */
export class TemplateLoadError extends Error {
    public readonly name = 'TemplateLoadError';

    constructor(
        public readonly templateName: string,
        public readonly cause: Error
    ) {
        super(`Failed to load template '${templateName}': ${cause.message}`);
    }
}

/**
 * Factory function to create appropriate template loader
 */
export function createTemplateLoader(
    extensionContext: vscode.ExtensionContext,
    useInMemory = false
): ITemplateLoader {
    if (useInMemory) {
        return new InMemoryTemplateLoader();
    }

    return new TemplateLoader(extensionContext);
}