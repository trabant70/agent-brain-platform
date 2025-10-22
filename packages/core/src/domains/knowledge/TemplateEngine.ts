/**
 * TemplateEngine - Marker-Based Injection for Claude.md Files
 *
 * Handles injection and removal of knowledge items into claude.md files.
 * Uses HTML comment markers to delineate sections.
 * Template management is handled by MarketplaceManager.
 */

import {
  KnowledgeItem,
  TemplateSection,
  TemplateApplicationResult,
  KnowledgeType,
  getKnowledgeTypeIcon
} from './types';
import { KnowledgeStore } from './KnowledgeStore';

export class TemplateEngine {
  constructor(private store: KnowledgeStore) {}

  // ============================================
  // Marker Management
  // ============================================

  /**
   * Remove a template/item marker section from claude.md content
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
   * Generate start and end markers for a template/item
   */
  generateMarkers(templateId: string, name: string): { start: string; end: string } {
    return {
      start: `<!-- Agent-Brain Template: ${name} [id: ${templateId}] Start -->`,
      end: `<!-- Agent-Brain Template: ${name} [id: ${templateId}] End -->`
    };
  }

  // ============================================
  // Knowledge Item Injection
  // ============================================

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

  // ============================================
  // Marker Validation
  // ============================================

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
  // Private Helpers
  // ============================================

  /**
   * Escape special regex characters
   */
  private escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
