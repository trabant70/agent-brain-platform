/**
 * KnowledgeFileSystem - File I/O for Knowledge Items and Templates
 *
 * Handles loading and saving:
 * - Knowledge items as markdown files with frontmatter
 * - Templates as JSON files with embedded items, audit logs, and version history
 * Provides graceful error handling for malformed files.
 */

import * as path from 'path';
import * as crypto from 'crypto';
import {
  KnowledgeItem,
  KnowledgeType,
  KnowledgeScope,
  KnowledgeFrontmatter,
  MarketplaceTemplate,
  isKnowledgeType,
  isKnowledgeScope
} from './types';

export class KnowledgeFileSystem {
  constructor(private workspaceRoot: string) {}

  /**
   * Load a knowledge item from a markdown file
   * Returns a valid KnowledgeItem even if the file is malformed
   */
  async loadMarkdownFile(absolutePath: string, fileContent: string, stats?: { size: number; mtime: Date; ctime: Date }): Promise<KnowledgeItem> {
    try {
      // Parse frontmatter
      const { data, body } = this.parseFrontmatter(fileContent);

      // Generate ID from path
      const id = this.generateId(absolutePath);

      // Get relative path
      const relativePath = this.getRelativePath(absolutePath);

      // Extract metadata
      const type = this.parseType(data.type, absolutePath);
      const scope = this.parseScope(data.scope);
      const title = this.parseTitle(data.title, body, path.basename(absolutePath));
      const tags = this.parseTags(data.tags);

      // Create knowledge item
      // Allow empty body - use placeholder if completely empty
      const trimmedBody = body.trim();
      const finalBody = trimmedBody.length > 0 ? trimmedBody : '_No description provided._';

      const item: KnowledgeItem = {
        id,
        type,
        scope,
        title,
        body: finalBody,
        source: data.source,
        tags,
        path: absolutePath,
        relativePath,
        valid: true,
        metadata: {
          createdAt: stats?.ctime || new Date(),
          updatedAt: stats?.mtime || new Date(),
          author: data.author,
          version: data.version,
          fileSize: stats?.size || Buffer.byteLength(fileContent, 'utf8')
        }
      };

      return item;
    } catch (error) {
      // Return a fallback item for malformed files
      return this.createFallbackItem(absolutePath, fileContent, error);
    }
  }

  /**
   * Load all markdown files from a directory recursively
   */
  async loadAllMarkdownFiles(
    baseDir: string,
    fileReader: (path: string) => Promise<{ content: string; stats: any }>
  ): Promise<KnowledgeItem[]> {
    // This will be called from the VSCode layer which has access to the file system
    // The implementation here is just the parsing logic
    throw new Error('loadAllMarkdownFiles should be called from VSCode layer with file system access');
  }

  /**
   * Save a knowledge item as a markdown file with frontmatter
   */
  toMarkdownWithFrontmatter(item: KnowledgeItem): string {
    const frontmatter: string[] = ['---'];

    // Required fields
    frontmatter.push(`title: ${this.escapeYamlValue(item.title)}`);
    frontmatter.push(`type: ${item.type}`);
    frontmatter.push(`scope: ${item.scope}`);

    // Optional fields
    if (item.source) {
      frontmatter.push(`source: ${this.escapeYamlValue(item.source)}`);
    }

    if (item.tags.length > 0) {
      if (item.tags.length === 1) {
        frontmatter.push(`tags: ${this.escapeYamlValue(item.tags[0])}`);
      } else {
        frontmatter.push('tags:');
        item.tags.forEach(tag => {
          frontmatter.push(`  - ${this.escapeYamlValue(tag)}`);
        });
      }
    }

    if (item.metadata.author) {
      frontmatter.push(`author: ${this.escapeYamlValue(item.metadata.author)}`);
    }

    if (item.metadata.version) {
      frontmatter.push(`version: ${item.metadata.version}`);
    }

    frontmatter.push('---');
    frontmatter.push('');  // Empty line after frontmatter

    // Add body
    return frontmatter.join('\n') + item.body;
  }

  /**
   * Parse frontmatter from markdown content
   * Returns both frontmatter data and body content
   */
  parseFrontmatter(content: string): { data: KnowledgeFrontmatter; body: string } {
    // Check for frontmatter delimiters
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      // No frontmatter found
      return {
        data: {},
        body: content
      };
    }

    const [, frontmatterText, body] = match;

    // Parse frontmatter as simple YAML (key: value pairs)
    const data: KnowledgeFrontmatter = {};
    const lines = frontmatterText.split('\n');
    let currentKey: string | null = null;
    let currentArray: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;  // Skip empty lines and comments
      }

      // Check for array item
      if (trimmed.startsWith('- ')) {
        if (currentKey) {
          currentArray.push(this.unescapeYamlValue(trimmed.substring(2).trim()));
        }
        continue;
      }

      // Flush previous array
      if (currentKey && currentArray.length > 0) {
        data[currentKey] = currentArray;
        currentArray = [];
      }

      // Parse key-value pair
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) {
        continue;  // Invalid line
      }

      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();

      if (!value) {
        // Key with no value, probably start of array
        currentKey = key;
      } else {
        // Key-value pair
        data[key] = this.unescapeYamlValue(value);
        currentKey = null;
      }
    }

    // Flush final array
    if (currentKey && currentArray.length > 0) {
      data[currentKey] = currentArray;
    }

    return { data, body };
  }

  /**
   * Generate a unique ID for a file path
   */
  generateId(filePath: string): string {
    // Use MD5 hash of the relative path for stable IDs
    const relativePath = this.getRelativePath(filePath);
    const hash = crypto.createHash('md5').update(relativePath).digest('hex');
    return `knowledge-${hash.substring(0, 12)}`;
  }

  /**
   * Extract title from markdown body (first heading or first line)
   */
  extractTitleFromMarkdown(body: string): string {
    const lines = body.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Check for markdown heading
      if (trimmed.startsWith('#')) {
        return trimmed.replace(/^#+\s*/, '').trim();
      }

      // Check for non-empty line
      if (trimmed.length > 0 && !trimmed.startsWith('```')) {
        // Take first 60 characters
        return trimmed.substring(0, 60) + (trimmed.length > 60 ? '...' : '');
      }
    }

    return 'Untitled';
  }

  /**
   * Infer knowledge type from file path
   */
  inferTypeFromPath(filePath: string): KnowledgeType {
    const relativePath = this.getRelativePath(filePath).toLowerCase();

    // Check directory names
    if (relativePath.includes('/golden-paths/') || relativePath.includes('/golden_paths/')) {
      return KnowledgeType.GOLDEN_PATH;
    }
    if (relativePath.includes('/patterns/')) {
      return KnowledgeType.DESIGN_PATTERN;
    }
    if (relativePath.includes('/standards/')) {
      return KnowledgeType.STANDARD;
    }
    if (relativePath.includes('/learnings/')) {
      return KnowledgeType.LEARNING;
    }
    if (relativePath.includes('/adrs/') || relativePath.includes('/decisions/')) {
      return KnowledgeType.ADR;
    }
    if (relativePath.includes('/snippets/')) {
      return KnowledgeType.SNIPPET;
    }
    if (relativePath.includes('/commands/')) {
      return KnowledgeType.COMMAND;
    }
    if (relativePath.includes('/troubleshooting/')) {
      return KnowledgeType.TROUBLESHOOTING;
    }
    if (relativePath.includes('/workflows/')) {
      return KnowledgeType.WORKFLOW;
    }
    if (relativePath.includes('/runbooks/')) {
      return KnowledgeType.RUNBOOK;
    }

    // Check filename
    const filename = path.basename(filePath, '.md').toLowerCase();
    if (filename.includes('adr-') || filename.startsWith('adr_')) {
      return KnowledgeType.ADR;
    }
    if (filename.includes('pattern')) {
      return KnowledgeType.DESIGN_PATTERN;
    }
    if (filename.includes('golden')) {
      return KnowledgeType.GOLDEN_PATH;
    }

    // Default
    return KnowledgeType.CUSTOM;
  }

  /**
   * Validate markdown content
   */
  validateMarkdown(content: string): { valid: boolean; error?: string } {
    // Allow empty content - frontmatter is optional, body is optional
    // An empty file is still a valid knowledge item
    if (!content) {
      content = '';
    }

    // Check for basic markdown validity
    try {
      this.parseFrontmatter(content);
      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get relative path from workspace root
   */
  getRelativePath(absolutePath: string): string {
    if (absolutePath.startsWith(this.workspaceRoot)) {
      return absolutePath.substring(this.workspaceRoot.length).replace(/^[\/\\]/, '');
    }
    return absolutePath;
  }

  // ============================================
  // Template JSON Persistence (V1)
  // ============================================

  /**
   * Load a template from a JSON file
   * Handles deserialization of dates and validates structure
   */
  async loadTemplateJson(absolutePath: string, fileContent: string): Promise<MarketplaceTemplate> {
    try {
      const data = JSON.parse(fileContent);

      // Validate required fields
      if (!data.id || !data.name || !data.version) {
        throw new Error('Invalid template: missing required fields (id, name, version)');
      }

      // Deserialize dates
      const template: MarketplaceTemplate = {
        ...data,
        createdAt: this.parseDate(data.createdAt),
        updatedAt: this.parseDate(data.updatedAt),
        lastVersionedAt: data.lastVersionedAt ? this.parseDate(data.lastVersionedAt) : undefined,

        // Deserialize item dates
        items: data.items?.map((item: any) => ({
          ...item,
          metadata: {
            ...item.metadata,
            createdAt: this.parseDate(item.metadata?.createdAt),
            updatedAt: this.parseDate(item.metadata?.updatedAt)
          },
          injectedTo: item.injectedTo?.map((record: any) => ({
            ...record,
            injectedAt: this.parseDate(record.injectedAt)
          })) || []
        })) || [],

        // Deserialize audit log dates
        auditLog: data.auditLog?.map((entry: any) => ({
          ...entry,
          timestamp: this.parseDate(entry.timestamp)
        })) || [],

        // Deserialize version history dates
        versionHistory: data.versionHistory?.map((version: any) => ({
          ...version,
          createdAt: this.parseDate(version.createdAt),
          snapshot: {
            ...version.snapshot,
            items: version.snapshot?.items?.map((item: any) => ({
              ...item,
              metadata: {
                ...item.metadata,
                createdAt: this.parseDate(item.metadata?.createdAt),
                updatedAt: this.parseDate(item.metadata?.updatedAt)
              }
            })) || []
          }
        })) || []
      };

      return template;
    } catch (error: any) {
      throw new Error(`Failed to load template from ${absolutePath}: ${error.message}`);
    }
  }

  /**
   * Save a template to a JSON file
   * Handles serialization with pretty printing for human readability
   */
  toTemplateJson(template: MarketplaceTemplate, options?: { pretty?: boolean }): string {
    const pretty = options?.pretty !== false; // Default to true

    // Create a clean copy without undefined values
    const cleanTemplate = this.cleanUndefinedValues(template);

    // Serialize with pretty printing (2 space indentation)
    return JSON.stringify(cleanTemplate, null, pretty ? 2 : 0);
  }

  /**
   * Validate template JSON structure
   */
  validateTemplateJson(content: string): { valid: boolean; error?: string; template?: MarketplaceTemplate } {
    try {
      const data = JSON.parse(content);

      // Check required fields
      if (!data.id) {
        return { valid: false, error: 'Missing required field: id' };
      }
      if (!data.name) {
        return { valid: false, error: 'Missing required field: name' };
      }
      if (!data.version) {
        return { valid: false, error: 'Missing required field: version' };
      }
      if (!Array.isArray(data.items)) {
        return { valid: false, error: 'Invalid field: items must be an array' };
      }

      // Try to deserialize (this will catch date parsing errors)
      const template = {
        ...data,
        createdAt: this.parseDate(data.createdAt),
        updatedAt: this.parseDate(data.updatedAt)
      } as MarketplaceTemplate;

      return { valid: true, template };
    } catch (error: any) {
      return { valid: false, error: `JSON parse error: ${error.message}` };
    }
  }

  /**
   * Generate a template file name from template metadata
   */
  generateTemplateFileName(template: MarketplaceTemplate): string {
    // Sanitize name for filesystem
    const safeName = template.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Use name + template ID (without "template-" prefix if present)
    const templateIdPart = template.id.startsWith('template-')
      ? template.id.substring(9)  // Remove "template-" prefix
      : template.id;

    return `${safeName}-${templateIdPart}.json`;
  }

  /**
   * Get template file path based on source
   */
  getTemplateFilePath(template: MarketplaceTemplate, baseDir: string): string {
    const fileName = this.generateTemplateFileName(template);

    // Flat structure - all templates in single directory
    // Source information is already in the template JSON itself
    return path.join(baseDir, fileName);
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Create a fallback knowledge item for malformed files
   */
  private createFallbackItem(absolutePath: string, content: string, error: any): KnowledgeItem {
    const id = this.generateId(absolutePath);
    const relativePath = this.getRelativePath(absolutePath);
    const filename = path.basename(absolutePath);

    return {
      id,
      type: KnowledgeType.CUSTOM,
      scope: KnowledgeScope.PERSONAL,
      title: `⚠️ ${filename}`,
      body: content,
      tags: ['parse-error'],
      path: absolutePath,
      relativePath,
      valid: false,
      parseError: error?.message || 'Unknown parsing error',
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
  }

  /**
   * Parse type from frontmatter
   */
  private parseType(typeValue: any, filePath: string): KnowledgeType {
    if (typeof typeValue === 'string' && isKnowledgeType(typeValue)) {
      return typeValue;
    }
    // Infer from path
    return this.inferTypeFromPath(filePath);
  }

  /**
   * Parse scope from frontmatter
   */
  private parseScope(scopeValue: any): KnowledgeScope {
    if (typeof scopeValue === 'string' && isKnowledgeScope(scopeValue)) {
      return scopeValue;
    }
    // Default to personal
    return KnowledgeScope.PERSONAL;
  }

  /**
   * Parse title from frontmatter or body
   */
  private parseTitle(titleValue: any, body: string, filename: string): string {
    if (typeof titleValue === 'string' && titleValue.trim().length > 0) {
      return titleValue.trim();
    }

    // Try to extract from body
    const extracted = this.extractTitleFromMarkdown(body);
    if (extracted !== 'Untitled') {
      return extracted;
    }

    // Use filename without extension
    return path.basename(filename, '.md');
  }

  /**
   * Parse tags from frontmatter
   */
  private parseTags(tagsValue: any): string[] {
    if (Array.isArray(tagsValue)) {
      return tagsValue.filter(t => typeof t === 'string').map(t => t.trim());
    }
    if (typeof tagsValue === 'string') {
      // Split by comma or space
      return tagsValue.split(/[,\s]+/).filter(t => t.length > 0);
    }
    return [];
  }

  /**
   * Escape YAML value (simple implementation)
   */
  private escapeYamlValue(value: string): string {
    // If value contains special characters, wrap in quotes
    if (/[:#\[\]{}|>]/.test(value) || value.includes('\n')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }

  /**
   * Unescape YAML value
   */
  private unescapeYamlValue(value: string): string {
    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.substring(1, value.length - 1).replace(/\\"/g, '"');
    }
    return value;
  }

  /**
   * Parse date from string or Date object
   * Handles both ISO strings and Date objects (for postMessage compatibility)
   */
  private parseDate(value: any): Date {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'string') {
      return new Date(value);
    }
    if (typeof value === 'number') {
      return new Date(value);
    }
    return new Date(); // Fallback
  }

  /**
   * Recursively remove undefined values from object
   * This ensures clean JSON serialization
   */
  private cleanUndefinedValues(obj: any): any {
    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanUndefinedValues(item));
    }

    // Handle null and primitives
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Handle Date objects - leave as-is for JSON.stringify
    if (obj instanceof Date) {
      return obj;
    }

    // Handle plain objects
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = this.cleanUndefinedValues(obj[key]);
      }
    }
    return cleaned;
  }
}
