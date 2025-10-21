/**
 * TemplateEngine - Template Management for Claude.md Files
 *
 * Handles injection, removal, and export of knowledge templates.
 * Uses HTML comment markers to delineate template sections.
 */

import {
  Template,
  KnowledgeItem,
  TemplateSection,
  TemplateApplicationResult,
  ImportOptions,
  ImportResult,
  ParseResult,
  ParsedTemplate,
  ParsedKnowledgeItem,
  ValidationResult,
  ConflictInfo,
  KnowledgeType,
  getKnowledgeTypeIcon
} from './types';
import { KnowledgeStore } from './KnowledgeStore';

export class TemplateEngine {
  constructor(private store: KnowledgeStore) {}

  /**
   * Inject a template into claude.md content
   * Returns updated content with template section added
   * @param replaceExisting If true, removes existing template before applying (idempotent)
   */
  injectTemplate(
    claudeContent: string,
    template: Template,
    replaceExisting: boolean = false
  ): TemplateApplicationResult {
    try {
      // Check if template already exists
      const existing = this.parseTemplateMarkers(claudeContent);
      const hasTemplate = existing.some(section => section.templateId === template.id);

      let workingContent = claudeContent;

      if (hasTemplate) {
        if (replaceExisting) {
          // Remove existing template first (idempotent operation)
          const removeResult = this.removeTemplate(workingContent, template.id);
          if (!removeResult.success) {
            return removeResult;
          }
          workingContent = removeResult.content!;
        } else {
          return {
            success: false,
            error: `Template "${template.name}" is already applied to this file. Use replaceExisting=true to update it.`
          };
        }
      }

      // Generate markers
      const markers = this.generateMarkers(template.id, template.name);

      // Generate template content
      const templateContent = this.generateTemplateContent(template);

      // Build the template section
      const templateSection = [
        '',
        markers.start,
        '',
        templateContent,
        '',
        markers.end,
        ''
      ].join('\n');

      // Append to the end of the file
      const updatedContent = workingContent.trimEnd() + '\n' + templateSection;

      return {
        success: true,
        content: updatedContent,
        wasReplaced: hasTemplate
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove a template from claude.md content
   */
  removeTemplate(
    claudeContent: string,
    templateId: string
  ): TemplateApplicationResult {
    try {
      const sections = this.parseTemplateMarkers(claudeContent);
      const targetSection = sections.find(s => s.templateId === templateId);

      if (!targetSection) {
        return {
          success: false,
          error: 'Template not found in file'
        };
      }

      // Build regex to match the template section
      const startMarkerEscaped = this.escapeRegExp(targetSection.startMarker);
      const endMarkerEscaped = this.escapeRegExp(targetSection.endMarker);

      // Match from start marker to end marker, including the markers themselves
      const regex = new RegExp(
        `\n*${startMarkerEscaped}[\\s\\S]*?${endMarkerEscaped}\n*`,
        'g'
      );

      const updatedContent = claudeContent.replace(regex, '\n\n');

      return {
        success: true,
        content: updatedContent.trim() + '\n'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Parse template markers from content to detect existing templates
   */
  parseTemplateMarkers(content: string): TemplateSection[] {
    const sections: TemplateSection[] = [];
    const lines = content.split('\n');

    let currentSection: Partial<TemplateSection> | null = null;
    let sectionLines: string[] = [];
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;

      // Check for start marker
      const startMatch = line.match(/<!--\s*Agent-Brain Template:\s*(.+?)\s*\[id:\s*([a-zA-Z0-9-]+)\]\s*Start\s*-->/);
      if (startMatch) {
        currentSection = {
          templateName: startMatch[1].trim(),
          templateId: startMatch[2].trim(),
          startMarker: line.trim(),
          startLine: lineNumber
        };
        sectionLines = [];
        continue;
      }

      // Check for end marker
      const endMatch = line.match(/<!--\s*Agent-Brain Template:\s*(.+?)\s*\[id:\s*([a-zA-Z0-9-]+)\]\s*End\s*-->/);
      if (endMatch && currentSection) {
        const section: TemplateSection = {
          templateId: currentSection.templateId!,
          templateName: currentSection.templateName!,
          startMarker: currentSection.startMarker!,
          endMarker: line.trim(),
          content: sectionLines.join('\n').trim(),
          startLine: currentSection.startLine!,
          endLine: lineNumber
        };
        sections.push(section);
        currentSection = null;
        sectionLines = [];
        continue;
      }

      // Collect content between markers
      if (currentSection) {
        sectionLines.push(line);
      }
    }

    return sections;
  }

  /**
   * Check if a template is already applied to the content
   */
  hasTemplate(content: string, templateId: string): boolean {
    const sections = this.parseTemplateMarkers(content);
    return sections.some(s => s.templateId === templateId);
  }

  /**
   * Generate template content from knowledge items
   */
  generateTemplateContent(template: Template): string {
    const sections: string[] = [];

    // Header
    sections.push(`# ${template.name}`);
    if (template.description) {
      sections.push('');
      sections.push(template.description);
    }
    sections.push('');

    // Add each knowledge item
    for (const itemId of template.itemIds) {
      const item = this.store.getItem(itemId);
      if (!item) {
        sections.push(`<!-- Knowledge item not found: ${itemId} -->`);
        continue;
      }

      if (!item.valid) {
        sections.push(`<!-- Skipped invalid item: ${item.title} -->`);
        continue;
      }

      // Item header with icon
      const icon = getKnowledgeTypeIcon(item.type);
      sections.push(`## ${icon} ${item.title}`);
      sections.push('');

      // Metadata
      if (item.source) {
        sections.push(`**Source:** ${item.source}`);
      }
      if (item.tags.length > 0) {
        sections.push(`**Tags:** ${item.tags.join(', ')}`);
      }
      sections.push('');

      // Body content
      sections.push(item.body);
      sections.push('');
      sections.push('---');
      sections.push('');
    }

    return sections.join('\n').trim();
  }

  /**
   * Generate start and end markers for a template
   */
  generateMarkers(templateId: string, name: string): { start: string; end: string } {
    return {
      start: `<!-- Agent-Brain Template: ${name} [id: ${templateId}] Start -->`,
      end: `<!-- Agent-Brain Template: ${name} [id: ${templateId}] End -->`
    };
  }

  /**
   * Apply individual knowledge items directly to claude.md
   * Each item gets its own marker section
   */
  injectKnowledgeItems(
    claudeContent: string,
    itemIds: string[],
    replaceExisting: boolean = false
  ): TemplateApplicationResult {
    try {
      let workingContent = claudeContent;
      const results: string[] = [];
      let replacedCount = 0;

      for (const itemId of itemIds) {
        const item = this.store.getItem(itemId);
        if (!item) {
          results.push(`Skipped missing item: ${itemId}`);
          continue;
        }

        if (!item.valid) {
          results.push(`Skipped invalid item: ${item.title}`);
          continue;
        }

        // Check if item already exists
        const existingMarkers = this.parseTemplateMarkers(workingContent);
        const hasItem = existingMarkers.some(section => section.templateId === itemId);

        if (hasItem) {
          if (replaceExisting) {
            // Remove existing first
            const removeResult = this.removeTemplate(workingContent, itemId);
            if (removeResult.success) {
              workingContent = removeResult.content!;
              replacedCount++;
            } else {
              results.push(`Failed to replace "${item.title}": ${removeResult.error}`);
              continue;
            }
          } else {
            results.push(`Skipped "${item.title}" - already applied`);
            continue;
          }
        }

        // Generate markers using itemId as template ID
        const markers = this.generateMarkers(itemId, item.title);

        // Generate item content
        const icon = getKnowledgeTypeIcon(item.type);
        const itemContent = [
          `## ${icon} ${item.title}`,
          '',
          item.source ? `**Source:** ${item.source}` : null,
          item.tags.length > 0 ? `**Tags:** ${item.tags.join(', ')}` : null,
          '',
          item.body
        ].filter(line => line !== null).join('\n');

        // Build the item section
        const itemSection = [
          '',
          markers.start,
          '',
          itemContent,
          '',
          markers.end,
          ''
        ].join('\n');

        // Append to the end
        workingContent = workingContent.trimEnd() + '\n' + itemSection;
        results.push(`Applied "${item.title}"`);
      }

      return {
        success: true,
        content: workingContent,
        message: results.join('\n'),
        wasReplaced: replacedCount > 0
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export template to standalone markdown file
   */
  exportTemplate(template: Template): string {
    const sections: string[] = [];

    // File header
    sections.push('---');
    sections.push(`template: ${template.name}`);
    sections.push(`version: ${template.version}`);
    if (template.description) {
      sections.push(`description: ${template.description}`);
    }
    sections.push(`exported: ${new Date().toISOString()}`);
    sections.push('---');
    sections.push('');

    // Template info
    sections.push(`# Agent-Brain Knowledge Template: ${template.name}`);
    sections.push('');
    if (template.description) {
      sections.push(template.description);
      sections.push('');
    }

    sections.push(`**Version:** ${template.version}`);
    sections.push(`**Items Included:** ${template.itemIds.length}`);
    sections.push(`**Exported:** ${new Date().toLocaleDateString()}`);
    sections.push('');
    sections.push('---');
    sections.push('');

    // Add template content
    sections.push(this.generateTemplateContent(template));

    return sections.join('\n');
  }

  /**
   * Detect conflicts when applying a template
   */
  detectConflicts(content: string, template: Template): string[] {
    const conflicts: string[] = [];
    const existing = this.parseTemplateMarkers(content);

    // Check for duplicate template
    if (existing.some(s => s.templateId === template.id)) {
      conflicts.push(`Template "${template.name}" is already applied`);
    }

    // Check for overlapping items
    for (const section of existing) {
      // Get items from the existing template
      const existingTemplate = this.store.getTemplate(section.templateId);
      if (existingTemplate) {
        const overlap = template.itemIds.filter(id =>
          existingTemplate.itemIds.includes(id)
        );
        if (overlap.length > 0) {
          const items = overlap
            .map(id => this.store.getItem(id)?.title || id)
            .join(', ');
          conflicts.push(
            `Items overlap with "${section.templateName}": ${items}`
          );
        }
      }
    }

    return conflicts;
  }

  /**
   * Get all templates applied to a claude.md file
   */
  getAppliedTemplates(content: string): TemplateSection[] {
    return this.parseTemplateMarkers(content);
  }

  /**
   * Check if content has valid template markers
   */
  validateTemplateMarkers(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const sections = this.parseTemplateMarkers(content);

    // Instead of counting raw markers (which includes examples in code blocks),
    // validate that each parsed section has matching start/end markers
    for (const section of sections) {
      if (!section.startMarker || !section.endMarker) {
        errors.push(`Template "${section.templateName}" has missing or malformed markers`);
      }

      // Verify the template ID matches in both markers
      if (section.startMarker && section.endMarker) {
        const startId = section.startMarker.match(/\[id:\s*([a-zA-Z0-9-]+)\]/)?.[1];
        const endId = section.endMarker.match(/\[id:\s*([a-zA-Z0-9-]+)\]/)?.[1];

        if (startId !== endId) {
          errors.push(`Template "${section.templateName}" has mismatched marker IDs: start=${startId}, end=${endId}`);
        }
      }
    }

    // Check for orphaned markers only among actual parsed sections
    // This avoids false positives from markers in code blocks or documentation
    const allLines = content.split('\n');
    let inCodeBlock = false;
    let actualStartCount = 0;
    let actualEndCount = 0;

    for (const line of allLines) {
      // Track code blocks (both ``` and indented)
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }

      // Skip lines inside code blocks
      if (inCodeBlock) {
        continue;
      }

      // Count only markers outside code blocks
      if (line.match(/<!--\s*Agent-Brain Template:[^>]+Start\s*-->/)) {
        actualStartCount++;
      }
      if (line.match(/<!--\s*Agent-Brain Template:[^>]+End\s*-->/)) {
        actualEndCount++;
      }
    }

    if (actualStartCount !== actualEndCount) {
      errors.push(`Mismatched markers outside code blocks: ${actualStartCount} start, ${actualEndCount} end`);
    }

    if (actualStartCount !== sections.length) {
      errors.push(`Marker count mismatch: found ${actualStartCount} markers but parsed ${sections.length} sections`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ============================================
  // Template Import Methods
  // ============================================

  /**
   * Parse an imported template file
   * Extracts metadata from YAML frontmatter and knowledge items from markdown
   */
  parseImportedTemplate(fileContent: string): ParseResult {
    const warnings: string[] = [];

    try {
      // Extract YAML frontmatter
      const frontmatterMatch = fileContent.match(/^---\s*\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) {
        return {
          success: false,
          error: 'No YAML frontmatter found. Expected format with "---" delimiters.',
          warnings
        };
      }

      const frontmatterText = frontmatterMatch[1];
      const bodyText = fileContent.substring(frontmatterMatch[0].length);

      // Parse YAML frontmatter
      const metadata = this.parseYAML(frontmatterText);
      if (!metadata.template) {
        return {
          success: false,
          error: 'Missing required field "template" in frontmatter',
          warnings
        };
      }

      // Parse knowledge items from markdown body
      const items = this.parseMarkdownItems(bodyText);

      if (items.length === 0) {
        warnings.push('No knowledge items found in template');
      }

      const parsedTemplate: ParsedTemplate = {
        name: metadata.template,
        version: metadata.version || 1,
        description: metadata.description,
        exported: metadata.exported,
        items
      };

      return {
        success: true,
        template: parsedTemplate,
        warnings
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Parse error: ${error.message}`,
        warnings
      };
    }
  }

  /**
   * Validate a parsed template
   */
  validateImportedTemplate(parsed: ParsedTemplate): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate template metadata
    if (!parsed.name || parsed.name.trim().length === 0) {
      errors.push('Template name is required');
    }

    if (parsed.version && (typeof parsed.version !== 'number' || parsed.version < 1)) {
      errors.push('Template version must be a positive number');
    }

    // Validate items
    if (parsed.items.length === 0) {
      warnings.push('Template contains no knowledge items');
    }

    parsed.items.forEach((item, index) => {
      if (!item.title || item.title.trim().length === 0) {
        errors.push(`Item ${index + 1}: Title is required`);
      }

      if (!item.type) {
        errors.push(`Item ${index + 1} (${item.title}): Type is required`);
      }

      if (!item.body || item.body.trim().length === 0) {
        warnings.push(`Item ${index + 1} (${item.title}): Body is empty`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Import a template from parsed content
   * Creates knowledge items and template in the store
   */
  importTemplate(
    fileContent: string,
    options: ImportOptions
  ): ImportResult {
    const result: ImportResult = {
      success: false,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      errors: [],
      warnings: [],
      conflicts: []
    };

    try {
      // Step 1: Parse the file
      const parseResult = this.parseImportedTemplate(fileContent);
      if (!parseResult.success || !parseResult.template) {
        result.errors.push(parseResult.error || 'Failed to parse template');
        return result;
      }

      result.warnings.push(...parseResult.warnings);
      const parsed = parseResult.template;

      // Step 2: Validate
      const validation = this.validateImportedTemplate(parsed);
      result.warnings.push(...validation.warnings);
      if (!validation.valid) {
        result.errors.push(...validation.errors);
        return result;
      }

      // Step 3: Check for template conflict
      const templateName = options.templateNameOverride || parsed.name;
      const existingTemplate = this.store.getTemplates().find(t => t.name === templateName);

      if (existingTemplate) {
        const conflict: ConflictInfo = {
          type: 'template',
          name: templateName,
          existingId: existingTemplate.id,
          action: options.conflictResolution === 'skip' ? 'skipped' :
                  options.conflictResolution === 'overwrite' ? 'overwritten' : 'merged'
        };
        result.conflicts!.push(conflict);

        if (options.conflictResolution === 'skip') {
          result.errors.push(`Template "${templateName}" already exists. Use different conflict resolution.`);
          return result;
        }
      }

      // Step 4: Import items
      const itemIds: string[] = [];
      for (const parsedItem of parsed.items) {
        const itemResult = this.importKnowledgeItem(parsedItem, options);

        if (itemResult.created) {
          result.itemsCreated++;
          itemIds.push(itemResult.itemId!);
        } else if (itemResult.updated) {
          result.itemsUpdated++;
          itemIds.push(itemResult.itemId!);
        } else if (itemResult.skipped) {
          result.itemsSkipped++;
          if (itemResult.itemId) {
            itemIds.push(itemResult.itemId);
          }
        }

        if (itemResult.conflict) {
          result.conflicts!.push(itemResult.conflict);
        }
      }

      // Step 5: Create or update template
      if (existingTemplate && options.conflictResolution === 'overwrite') {
        // Update existing template
        this.store.updateTemplate(existingTemplate.id, {
          ...existingTemplate,
          itemIds,
          version: parsed.version,
          description: parsed.description || existingTemplate.description,
          metadata: {
            ...existingTemplate.metadata,
            updatedAt: new Date()
          }
        });
        result.templateId = existingTemplate.id;
        result.templateName = existingTemplate.name;
      } else if (existingTemplate && options.conflictResolution === 'merge') {
        // Merge items with existing template
        const mergedIds = Array.from(new Set([...existingTemplate.itemIds, ...itemIds]));
        this.store.updateTemplate(existingTemplate.id, {
          ...existingTemplate,
          itemIds: mergedIds,
          metadata: {
            ...existingTemplate.metadata,
            updatedAt: new Date()
          }
        });
        result.templateId = existingTemplate.id;
        result.templateName = existingTemplate.name;
      } else {
        // Create new template
        const newTemplate: Template = {
          id: this.generateId(),
          name: templateName,
          description: parsed.description || '',
          version: parsed.version,
          itemIds,
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date()
          }
        };
        this.store.addTemplate(newTemplate);
        result.templateId = newTemplate.id;
        result.templateName = newTemplate.name;
      }

      result.success = true;
      return result;
    } catch (error: any) {
      result.errors.push(`Import failed: ${error.message}`);
      return result;
    }
  }

  // ============================================
  // Private Import Helpers
  // ============================================

  /**
   * Parse YAML frontmatter text
   */
  private parseYAML(yamlText: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = yamlText.split('\n');

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const key = match[1];
        let value: any = match[2].trim();

        // Try to parse as number
        if (/^\d+$/.test(value)) {
          value = parseInt(value, 10);
        }

        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Parse knowledge items from markdown body
   */
  private parseMarkdownItems(markdown: string): ParsedKnowledgeItem[] {
    const items: ParsedKnowledgeItem[] = [];

    // Split by ## headers (knowledge item boundaries)
    const sections = markdown.split(/\n##\s+/);

    for (let i = 1; i < sections.length; i++) {
      const section = sections[i];
      const lines = section.split('\n');

      if (lines.length === 0) continue;

      // First line is title (with icon)
      const titleLine = lines[0].trim();
      const { icon, title } = this.extractIconAndTitle(titleLine);
      const type = this.iconToType(icon);

      // Extract metadata and body
      let source: string | undefined;
      let tags: string[] = [];
      let bodyStartIndex = 1;

      // Parse metadata lines (**Source:**, **Tags:**)
      for (let j = 1; j < lines.length; j++) {
        const line = lines[j].trim();

        if (line.startsWith('**Source:**')) {
          source = line.replace('**Source:**', '').trim();
          bodyStartIndex = j + 1;
        } else if (line.startsWith('**Tags:**')) {
          const tagsText = line.replace('**Tags:**', '').trim();
          tags = tagsText.split(',').map(t => t.trim()).filter(t => t.length > 0);
          bodyStartIndex = j + 1;
        } else if (line.length > 0 && !line.startsWith('**')) {
          // Found body content
          break;
        }
      }

      // Remaining lines are body
      const body = lines.slice(bodyStartIndex).join('\n').trim();

      // Remove trailing --- separator if present
      const cleanBody = body.replace(/\n---\s*$/, '').trim();

      if (title) {
        items.push({
          title,
          type,
          source,
          tags,
          body: cleanBody
        });
      }
    }

    return items;
  }

  /**
   * Extract icon and title from title line
   */
  private extractIconAndTitle(titleLine: string): { icon: string; title: string } {
    // Match emoji at start
    const match = titleLine.match(/^([\u{1F300}-\u{1F9FF}]\s*|[\u{2600}-\u{27BF}]\s*)?(.+)$/u);
    if (match) {
      return {
        icon: match[1]?.trim() || '',
        title: match[2].trim()
      };
    }
    return { icon: '', title: titleLine };
  }

  /**
   * Convert icon to knowledge type
   */
  private iconToType(icon: string): KnowledgeType {
    const iconMap: Record<string, KnowledgeType> = {
      '📋': KnowledgeType.ADR,
      '🎨': KnowledgeType.DESIGN_PATTERN,
      '⚠️': KnowledgeType.ANTI_PATTERN,
      '⭐': KnowledgeType.GOLDEN_PATH,
      '📏': KnowledgeType.STANDARD,
      '🤝': KnowledgeType.CONVENTION,
      '✅': KnowledgeType.CHECKLIST,
      '📝': KnowledgeType.SNIPPET,
      '⚙️': KnowledgeType.CONFIGURATION,
      '💻': KnowledgeType.COMMAND,
      '📚': KnowledgeType.API_REFERENCE,
      '💡': KnowledgeType.LEARNING,
      '🔧': KnowledgeType.TROUBLESHOOTING,
      '⚡': KnowledgeType.GOTCHA,
      '💭': KnowledgeType.TIP,
      '📄': KnowledgeType.TEMPLATE,
      '📖': KnowledgeType.GUIDELINE,
      '🔄': KnowledgeType.WORKFLOW,
      '📗': KnowledgeType.RUNBOOK
    };

    return iconMap[icon] || KnowledgeType.CUSTOM;
  }

  /**
   * Import a single knowledge item, handling conflicts
   */
  private importKnowledgeItem(
    parsedItem: ParsedKnowledgeItem,
    options: ImportOptions
  ): {
    created?: boolean;
    updated?: boolean;
    skipped?: boolean;
    itemId?: string;
    conflict?: ConflictInfo;
  } {
    // Check if item already exists (match by title + type)
    const existing = this.store.getItems().find(
      item => item.title === parsedItem.title && item.type === parsedItem.type
    );

    if (existing) {
      const conflict: ConflictInfo = {
        type: 'item',
        name: parsedItem.title,
        existingId: existing.id,
        action: options.skipDuplicateItems ? 'skipped' :
                options.conflictResolution === 'overwrite' ? 'overwritten' : 'skipped'
      };

      if (options.skipDuplicateItems) {
        return { skipped: true, itemId: existing.id, conflict };
      }

      if (options.conflictResolution === 'overwrite') {
        // Update existing item
        const updated: KnowledgeItem = {
          ...existing,
          body: parsedItem.body,
          source: parsedItem.source || existing.source,
          tags: parsedItem.tags.length > 0 ? parsedItem.tags : existing.tags,
          metadata: {
            ...existing.metadata,
            updatedAt: new Date()
          }
        };
        this.store.updateItem(existing.id, updated);
        return { updated: true, itemId: existing.id, conflict };
      }

      // For 'merge' or 'skip', just use existing
      return { skipped: true, itemId: existing.id, conflict };
    }

    // Create new item - Note: actual file creation happens in KnowledgeManager
    // Here we just return the parsed data
    return { created: true };
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Escape special regex characters
   */
  private escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
