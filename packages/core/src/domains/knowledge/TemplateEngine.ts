/**
 * TemplateEngine - Marker-Based Injection for Claude.md Files
 *
 * Handles injection and removal of knowledge items into claude.md files.
 * Uses HTML comment markers to delineate sections.
 *
 * V1 Enhancement: Supports two types of markers:
 * 1. Template-level markers: <!-- TEMPLATE: name [id] --> ... <!-- END TEMPLATE: name -->
 * 2. Item-level markers: <!-- ITEM: name [id] --> ... <!-- END ITEM: name -->
 *
 * Also maintains backward compatibility with legacy markers:
 * <!-- Agent-Brain Template: name [id: id] Start/End -->
 */

import {
  KnowledgeItem,
  TemplateSection,
  TemplateApplicationResult,
  KnowledgeType,
  getKnowledgeTypeIcon,
  MarketplaceTemplate
} from './types';
import { KnowledgeStore } from './KnowledgeStore';
import { logger, LogCategory, LogPathway } from '../../infrastructure/logging/Logger';
import { GroupType, GroupMarker } from './GroupTypes';

/**
 * Marker type for injection
 */
export enum MarkerType {
  TEMPLATE = 'template',  // Template-level marker (entire template as group)
  ITEM = 'item',         // Item-level marker (individual item)
  LEGACY = 'legacy'       // Backward compatibility with old markers
}

export class TemplateEngine {
  constructor(private store: KnowledgeStore) {}

  // ============================================
  // V1 Marker Management (Template-level and Item-level)
  // ============================================

  /**
   * Generate V1 template-level markers for grouped injection/removal
   */
  generateTemplateMarkers(templateId: string, templateName: string): { start: string; end: string } {
    return {
      start: `<!-- AGENT-BRAIN:${templateId}:START -->`,
      end: `<!-- AGENT-BRAIN:${templateId}:END -->`
    };
  }

  /**
   * Generate V1 item-level markers for individual item injection
   */
  generateItemMarkers(itemId: string, itemTitle: string): { start: string; end: string } {
    return {
      start: `<!-- AGENT-BRAIN:${itemId}:START -->`,
      end: `<!-- AGENT-BRAIN:${itemId}:END -->`
    };
  }

  // ============================================
  // V2 Multi-Group Marker Management
  // ============================================

  /**
   * Generate V2 group markers with extended metadata support
   * Format: <!-- AGENT-BRAIN-GROUP-START: TYPE=X ID=Y [KEY=VALUE...] -->
   *
   * Examples:
   * - TEMPLATE: <!-- AGENT-BRAIN-GROUP-START: TYPE=TEMPLATE ID=template-123 VERSION=1.0 -->
   * - OPERATOR_RANGE: <!-- AGENT-BRAIN-GROUP-START: TYPE=OPERATOR_RANGE ID=mid-senior RANGE=3-4 -->
   * - CATCHMENT: <!-- AGENT-BRAIN-GROUP-START: TYPE=CATCHMENT ID=q13-standard STATUS=IN -->
   */
  generateGroupMarkers(
    groupType: GroupType,
    id: string,
    metadata?: Partial<GroupMarker>
  ): { start: string; end: string } {
    // Build metadata string
    const metaParts = [`TYPE=${groupType}`, `ID=${id}`];

    if (metadata?.version) {
      metaParts.push(`VERSION=${metadata.version}`);
    }
    if (metadata?.range) {
      metaParts.push(`RANGE=${metadata.range}`);
    }
    if (metadata?.status) {
      metaParts.push(`STATUS=${metadata.status}`);
    }
    if (metadata?.injectedAt) {
      metaParts.push(`INJECTED_AT=${metadata.injectedAt}`);
    }
    if (metadata?.itemCount !== undefined) {
      metaParts.push(`ITEM_COUNT=${metadata.itemCount}`);
    }

    const metaString = metaParts.join(' ');

    return {
      start: `<!-- AGENT-BRAIN-GROUP-START: ${metaString} -->`,
      end: `<!-- AGENT-BRAIN-GROUP-END: ${metaString.split(' ').slice(0, 2).join(' ')} -->`
    };
  }

  /**
   * Parse V2 group markers from content
   * Returns array of parsed group sections with metadata
   */
  parseGroupMarkers(content: string): Array<{
    groupType: GroupType;
    id: string;
    metadata: Partial<GroupMarker>;
    startMarker: string;
    endMarker: string;
    content: string;
    startLine: number;
    endLine: number;
  }> {
    const groups: Array<any> = [];
    const lines = content.split('\n');

    let currentGroup: any = null;
    let groupLines: string[] = [];
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;

      // Check for V2 group start marker
      const startMatch = line.match(/<!--\s*AGENT-BRAIN-GROUP-START:\s*(.+?)\s*-->/);
      if (startMatch) {
        const metaString = startMatch[1];
        const metadata = this.parseGroupMetadata(metaString);

        currentGroup = {
          groupType: metadata.type,
          id: metadata.id,
          metadata,
          startMarker: line.trim(),
          startLine: lineNumber
        };
        groupLines = [];
        continue;
      }

      // Check for V2 group end marker
      const endMatch = line.match(/<!--\s*AGENT-BRAIN-GROUP-END:\s*(.+?)\s*-->/);
      if (endMatch && currentGroup) {
        groups.push({
          ...currentGroup,
          endMarker: line.trim(),
          content: groupLines.join('\n').trim(),
          endLine: lineNumber
        });
        currentGroup = null;
        groupLines = [];
        continue;
      }

      // Collect content between markers
      if (currentGroup) {
        groupLines.push(line);
      }
    }

    return groups;
  }

  /**
   * Parse metadata from group marker string
   * Input: "TYPE=TEMPLATE ID=template-123 VERSION=1.0"
   * Output: { type: 'TEMPLATE', id: 'template-123', version: '1.0' }
   */
  private parseGroupMetadata(metaString: string): any {
    const metadata: any = {};
    const parts = metaString.split(/\s+/);

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key && value) {
        const normalizedKey = key.toLowerCase();
        if (normalizedKey === 'type') {
          metadata.type = value as GroupType;
        } else if (normalizedKey === 'id') {
          metadata.id = value;
        } else if (normalizedKey === 'version') {
          metadata.version = value;
        } else if (normalizedKey === 'range') {
          metadata.range = value;
        } else if (normalizedKey === 'status') {
          metadata.status = value;
        } else if (normalizedKey === 'injected_at') {
          metadata.injectedAt = value;
        } else if (normalizedKey === 'item_count') {
          metadata.itemCount = parseInt(value, 10);
        }
      }
    }

    return metadata;
  }

  /**
   * Parse all marker types (V1 and V2) for unified scanning
   * Returns unified format combining legacy and new markers
   */
  parseAllMarkers(content: string): Array<{
    id: string;
    name?: string;
    type: MarkerType | GroupType;
    startMarker: string;
    endMarker: string;
    content: string;
    startLine: number;
    endLine: number;
    metadata?: any;
  }> {
    const allMarkers: Array<any> = [];

    // Parse V1 markers (AGENT-BRAIN:id:START/END)
    const v1Markers = this.parseV1Markers(content);
    for (const v1 of v1Markers) {
      allMarkers.push({
        id: v1.id,
        name: v1.name,
        type: v1.type,
        startMarker: v1.startMarker,
        endMarker: v1.endMarker,
        content: v1.content,
        startLine: v1.startLine,
        endLine: v1.endLine
      });
    }

    // Parse V2 group markers (AGENT-BRAIN-GROUP-START/END)
    const v2Groups = this.parseGroupMarkers(content);
    for (const v2 of v2Groups) {
      allMarkers.push({
        id: v2.id,
        type: v2.groupType,
        startMarker: v2.startMarker,
        endMarker: v2.endMarker,
        content: v2.content,
        startLine: v2.startLine,
        endLine: v2.endLine,
        metadata: v2.metadata
      });
    }

    // Sort by startLine
    allMarkers.sort((a, b) => a.startLine - b.startLine);

    return allMarkers;
  }

  /**
   * Inject an entire template with template-level markers (V1)
   */
  injectTemplate(
    claudeContent: string,
    template: MarketplaceTemplate,
    replaceExisting: boolean = false
  ): TemplateApplicationResult {
    try {
      let workingContent = claudeContent;

      // Check if template already exists
      if (this.hasTemplate(workingContent, template.id)) {
        if (replaceExisting) {
          const removeResult = this.removeTemplate(workingContent, template.id);
          if (!removeResult.success) {
            return {
              success: false,
              error: `Failed to replace existing template: ${removeResult.error}`
            };
          }
          workingContent = removeResult.content!;
        } else {
          return {
            success: false,
            error: `Template "${template.name}" is already applied`
          };
        }
      }

      // Generate template-level markers
      const markers = this.generateTemplateMarkers(template.id, template.name);

      // Generate content for all items WITHOUT individual markers
      // NOTE: We only use template-level markers since templates are removed
      // as a whole unit. This makes the system more resilient to tag corruption.
      const itemsContent = template.items.map(item => {
        const icon = getKnowledgeTypeIcon(item.type);
        return item.body;
      }).join('\n\n');

      // Build the template section
      const templateSection = [
        '',
        markers.start,
        `<!-- Template: ${template.name} (${template.items.length} items) -->`,
        '',
        `# ${template.name} v${template.version}`,
        '',
        template.description,
        '',
        itemsContent,
        '',
        markers.end,
        ''
      ].join('\n');

      // Append to the end
      workingContent = workingContent.trimEnd() + '\n' + templateSection;

      return {
        success: true,
        content: workingContent,
        message: `Applied template "${template.name}" with ${template.items.length} items`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Inject a single item with item-level markers (V1)
   */
  injectItem(
    claudeContent: string,
    item: KnowledgeItem,
    replaceExisting: boolean = false
  ): TemplateApplicationResult {
    try {
      let workingContent = claudeContent;

      // Check if item already exists
      if (this.hasTemplate(workingContent, item.id)) {
        if (replaceExisting) {
          const removeResult = this.removeTemplate(workingContent, item.id);
          if (!removeResult.success) {
            return {
              success: false,
              error: `Failed to replace existing item: ${removeResult.error}`
            };
          }
          workingContent = removeResult.content!;
        } else {
          return {
            success: false,
            error: `Item "${item.title}" is already applied`
          };
        }
      }

      // Generate item-level markers
      const markers = this.generateItemMarkers(item.id, item.title);

      // Build the item section
      const itemSection = [
        '',
        markers.start,
        item.body,
        markers.end,
        ''
      ].join('\n');

      // Append to the end
      workingContent = workingContent.trimEnd() + '\n' + itemSection;

      return {
        success: true,
        content: workingContent,
        message: `Applied item "${item.title}"`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Parse V1 template-level and item-level markers
   */
  parseV1Markers(content: string): Array<{
    id: string;
    name: string;
    type: MarkerType;
    startMarker: string;
    endMarker: string;
    content: string;
    startLine: number;
    endLine: number;
  }> {
    const markers: Array<any> = [];
    const lines = content.split('\n');

    let currentMarker: any = null;
    let markerLines: string[] = [];
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;

      // Check for V1 template start marker
      const templateStartMatch = line.match(/<!--\s*TEMPLATE:\s*(.+?)\s*\[([a-zA-Z0-9.-]+)\]\s*-->/);
      if (templateStartMatch) {
        currentMarker = {
          name: templateStartMatch[1].trim(),
          id: templateStartMatch[2].trim(),
          type: MarkerType.TEMPLATE,
          startMarker: line.trim(),
          startLine: lineNumber
        };
        markerLines = [];
        continue;
      }

      // Check for V1 item start marker
      const itemStartMatch = line.match(/<!--\s*ITEM:\s*(.+?)\s*\[([a-zA-Z0-9.-]+)\]\s*-->/);
      if (itemStartMatch) {
        currentMarker = {
          name: itemStartMatch[1].trim(),
          id: itemStartMatch[2].trim(),
          type: MarkerType.ITEM,
          startMarker: line.trim(),
          startLine: lineNumber
        };
        markerLines = [];
        continue;
      }

      // Check for V1 template end marker
      const templateEndMatch = line.match(/<!--\s*END TEMPLATE:\s*(.+?)\s*-->/);
      if (templateEndMatch && currentMarker && currentMarker.type === MarkerType.TEMPLATE) {
        markers.push({
          ...currentMarker,
          endMarker: line.trim(),
          content: markerLines.join('\n').trim(),
          endLine: lineNumber
        });
        currentMarker = null;
        markerLines = [];
        continue;
      }

      // Check for V1 item end marker
      const itemEndMatch = line.match(/<!--\s*END ITEM:\s*(.+?)\s*-->/);
      if (itemEndMatch && currentMarker && currentMarker.type === MarkerType.ITEM) {
        markers.push({
          ...currentMarker,
          endMarker: line.trim(),
          content: markerLines.join('\n').trim(),
          endLine: lineNumber
        });
        currentMarker = null;
        markerLines = [];
        continue;
      }

      // Collect content between markers
      if (currentMarker) {
        markerLines.push(line);
      }
    }

    return markers;
  }

  /**
   * Remove template or item by ID (supports all marker types)
   */
  removeByMarkerId(claudeContent: string, markerId: string): TemplateApplicationResult {
    try {
      // Try V1 markers first
      const v1Markers = this.parseV1Markers(claudeContent);
      const v1Marker = v1Markers.find(m => m.id === markerId);

      if (v1Marker) {
        const startMarkerEscaped = this.escapeRegExp(v1Marker.startMarker);
        const endMarkerEscaped = this.escapeRegExp(v1Marker.endMarker);

        const regex = new RegExp(
          `\n*${startMarkerEscaped}[\\s\\S]*?${endMarkerEscaped}\n*`,
          'g'
        );

        const updatedContent = claudeContent.replace(regex, '\n\n');

        return {
          success: true,
          content: updatedContent.trim() + '\n'
        };
      }

      // Fall back to legacy markers
      return this.removeTemplate(claudeContent, markerId);
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================
  // Legacy Marker Management (Backward Compatibility)
  // ============================================

  /**
   * Remove a template/item marker section from claude.md content (legacy support)
   */
  removeTemplate(
    claudeContent: string,
    templateId: string
  ): TemplateApplicationResult {
    try {
      const sections = this.parseTemplateMarkers(claudeContent);

      logger.info(
        LogCategory.DATA,
        `Attempting to remove template`,
        'TemplateEngine.removeTemplate',
        {
          templateId,
          sectionsFound: sections.length,
          sectionIds: sections.map(s => s.templateId)
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      const targetSection = sections.find(s => s.templateId === templateId);

      if (!targetSection) {
        logger.warn(
          LogCategory.DATA,
          `Template not found in parsed sections`,
          'TemplateEngine.removeTemplate',
          { templateId, availableIds: sections.map(s => s.templateId) },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        return {
          success: false,
          error: 'Template not found in file'
        };
      }

      logger.info(
        LogCategory.DATA,
        `Found template section to remove`,
        'TemplateEngine.removeTemplate',
        {
          templateId,
          startMarker: targetSection.startMarker,
          endMarker: targetSection.endMarker
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );


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
   * Supports V1 AGENT-BRAIN markers with nesting
   */
  parseTemplateMarkers(content: string): TemplateSection[] {
    const sections: TemplateSection[] = [];
    const lines = content.split('\n');

    // Use a stack to handle nested markers (templates containing items)
    const sectionStack: Array<Partial<TemplateSection> & { sectionLines: string[] }> = [];
    let lineNumber = 0;
    let debugMatchCount = 0;

    for (const line of lines) {
      lineNumber++;

      // Skip lines with inline code that contains markers (backticks around marker)
      // Match patterns like: `<!-- AGENT-BRAIN:...:START -->` or **text**:`marker`
      if (line.match(/`[^`]*<!--\s*AGENT-BRAIN:[^`]+`/)) {
        // Don't process this line for markers, but do collect it as content if we're inside a section
        if (sectionStack.length > 0) {
          sectionStack[sectionStack.length - 1].sectionLines.push(line);
        }
        continue;
      }

      // Check for V1 AGENT-BRAIN template marker
      const v1TemplateMatch = line.match(/<!--\s*AGENT-BRAIN:(template-[^:]+):START\s*-->/);
      if (v1TemplateMatch) {
        const templateId = v1TemplateMatch[1];
        debugMatchCount++;
        logger.info(
          LogCategory.DATA,
          `Matched V1 template START at line ${lineNumber}`,
          'TemplateEngine.parseTemplateMarkers',
          { templateId, lineNumber, stackDepth: sectionStack.length },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        // Default to ID-derived name, but will try to read actual name from next line
        sectionStack.push({
          templateName: templateId.replace('template-', ''),
          templateId: templateId,
          startMarker: line.trim(),
          startLine: lineNumber,
          sectionLines: []
        });
        continue;
      }

      // Check for template name comment (follows V1 template START marker)
      const templateNameMatch = line.match(/<!--\s*Template:\s*(.+?)\s*\((\d+)\s+items?\)\s*-->/);
      if (templateNameMatch && sectionStack.length > 0) {
        const currentSection = sectionStack[sectionStack.length - 1];
        // Only update if this is a template marker (not an item marker)
        if (currentSection.templateId?.startsWith('template-')) {
          currentSection.templateName = templateNameMatch[1].trim();
        }
        continue;
      }

      // Check for V1 AGENT-BRAIN item marker
      const v1ItemMatch = line.match(/<!--\s*AGENT-BRAIN:(item-[^:]+):START\s*-->/);
      if (v1ItemMatch) {
        const itemId = v1ItemMatch[1];
        // Default to ID-derived name, but will try to read actual title from next line
        sectionStack.push({
          templateName: itemId.replace('item-', ''),
          templateId: itemId,
          startMarker: line.trim(),
          startLine: lineNumber,
          sectionLines: []
        });
        continue;
      }

      // Check for item title comment (follows V1 item START marker)
      const itemTitleMatch = line.match(/<!--\s*Item:\s*(.+?)\s*-->/);
      if (itemTitleMatch && sectionStack.length > 0) {
        const currentSection = sectionStack[sectionStack.length - 1];
        // Only update if this is an item marker (not a template marker)
        if (currentSection.templateId?.startsWith('item-')) {
          currentSection.templateName = itemTitleMatch[1].trim();
        }
        continue;
      }

      // Check for V1 AGENT-BRAIN end marker (both template and item)
      const v1EndMatch = line.match(/<!--\s*AGENT-BRAIN:(template-[^:]+|item-[^:]+):END\s*-->/);
      if (v1EndMatch && sectionStack.length > 0) {
        const currentSection = sectionStack.pop()!;
        debugMatchCount++;
        logger.info(
          LogCategory.DATA,
          `Matched V1 END at line ${lineNumber}`,
          'TemplateEngine.parseTemplateMarkers',
          { markerId: v1EndMatch[1], lineNumber, stackDepthAfterPop: sectionStack.length },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        const section: TemplateSection = {
          templateId: currentSection.templateId!,
          templateName: currentSection.templateName!,
          startMarker: currentSection.startMarker!,
          endMarker: line.trim(),
          content: currentSection.sectionLines.join('\n').trim(),
          startLine: currentSection.startLine!,
          endLine: lineNumber
        };
        // Only add TOP-LEVEL TEMPLATE sections (when stack is now empty)
        // Nested items inside templates are NOT returned as separate sections
        // Individual items (item-xxx) are NOT returned - they're tracked by ClaudeMdScanner
        if (sectionStack.length === 0) {
          // Only include template markers, not standalone item markers
          if (section.templateId.startsWith('template-')) {
            logger.info(
              LogCategory.DATA,
              'Adding top-level template section',
              'TemplateEngine.parseTemplateMarkers',
              { templateId: section.templateId, templateName: section.templateName, startLine: section.startLine, endLine: section.endLine },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
            sections.push(section);
          } else if (section.templateId.startsWith('item-')) {
            logger.info(
              LogCategory.DATA,
              'Skipping top-level item marker (tracked by scanner)',
              'TemplateEngine.parseTemplateMarkers',
              { templateId: section.templateId },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
          }
        } else {
          logger.info(
            LogCategory.DATA,
            'Skipping nested section',
            'TemplateEngine.parseTemplateMarkers',
            { templateId: section.templateId, stackDepth: sectionStack.length },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        }
        continue;
      }

      // Collect content between markers (add to the most recent section in stack)
      if (sectionStack.length > 0) {
        sectionStack[sectionStack.length - 1].sectionLines.push(line);
      }
    }

    logger.info(
      LogCategory.DATA,
      'parseTemplateMarkers complete',
      'TemplateEngine.parseTemplateMarkers',
      {
        markersMatched: debugMatchCount,
        topLevelSectionsFound: sections.length,
        sections: sections.map(s => ({
          templateId: s.templateId,
          templateName: s.templateName,
          startLine: s.startLine,
          endLine: s.endLine
        }))
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

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
   * @deprecated Use generateTemplateMarkers() or generateItemMarkers() instead
   */
  generateMarkers(templateId: string, name: string): { start: string; end: string } {
    // Delegate to generateItemMarkers for backward compatibility
    return this.generateItemMarkers(templateId, name);
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
   * Validates V1 AGENT-BRAIN marker format
   */
  validateTemplateMarkers(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Parse template sections
    const sections = this.parseTemplateMarkers(content);

    // Validate sections have both start and end markers
    for (const section of sections) {
      if (!section.startMarker || !section.endMarker) {
        errors.push(`Template "${section.templateName}" has missing or malformed markers`);
      }
    }

    // Count AGENT-BRAIN markers (excluding those in code blocks/examples)
    const allLines = content.split('\n');
    let v1StartCount = 0;
    let v1EndCount = 0;
    let inFencedCodeBlock = false;

    for (const line of allLines) {
      // Track fenced code blocks (```)
      // Must be ONLY ``` followed by optional language identifier, not inline code like ```text```
      const trimmed = line.trim();
      if (trimmed.match(/^```[a-z0-9]*$/i)) {
        inFencedCodeBlock = !inFencedCodeBlock;
        continue;
      }

      // Skip lines inside fenced code blocks
      if (inFencedCodeBlock) {
        continue;
      }

      // Skip lines with inline code that contains markers (backticks around marker)
      // Match patterns like: `<!-- AGENT-BRAIN:...:START -->` or **text**:`marker`
      if (line.match(/`[^`]*<!--\s*AGENT-BRAIN:[^`]+`/)) {
        continue;
      }

      // Count V1 AGENT-BRAIN markers (both template and item level)
      // Only count actual markers, not documentation examples
      if (line.match(/<!--\s*AGENT-BRAIN:(template-[^:]+|item-[^:]+):START\s*-->/)) {
        v1StartCount++;
      }
      if (line.match(/<!--\s*AGENT-BRAIN:(template-[^:]+|item-[^:]+):END\s*-->/)) {
        v1EndCount++;
      }
    }

    // Validate V1 marker counts (START and END should match)
    if (v1StartCount !== v1EndCount) {
      errors.push(`Mismatched AGENT-BRAIN markers: ${v1StartCount} START, ${v1EndCount} END`);
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

  /**
   * Generate a URL-safe slug from a title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
