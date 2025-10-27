/**
 * ClaudeMdScanner - Read-Only File Scanner for Knowledge Injection
 *
 * Scans claude.md files to detect and report on injected knowledge groups.
 * This is a read-only service - no caching, no file watching, just on-demand scanning.
 *
 * Responsibilities:
 * - Parse file content to find all group markers (V1 and V2)
 * - Detect individual items outside of groups
 * - Identify orphaned items (items with mismatched or missing markers)
 * - Report warnings for malformed markers
 * - Count total injections (groups + individual items)
 *
 * NOT responsible for:
 * - File watching or monitoring
 * - Caching scan results
 * - Modifying files
 * - Making injection decisions
 */

import {
  GroupDefinition,
  ScanResult,
  IndividualItemMarker,
  GroupType,
  GroupMarker
} from './GroupTypes';
import { TemplateEngine } from './TemplateEngine';
import { logger, LogCategory, LogPathway } from '../../infrastructure/logging/Logger';

export class ClaudeMdScanner {
  constructor(private templateEngine: TemplateEngine) {}

  /**
   * Scan a single file for all groups and items
   * Returns comprehensive scan result with warnings
   */
  scanFile(content: string): ScanResult {
    try {
      const groups: GroupDefinition[] = [];
      const individualItems: IndividualItemMarker[] = [];
      const orphanedItems: string[] = [];
      const warnings: string[] = [];

      // Parse all markers (V1 and V2) using TemplateEngine
      const allMarkers = this.templateEngine.parseAllMarkers(content);

      logger.info(
        LogCategory.DATA,
        `ClaudeMdScanner found ${allMarkers.length} markers`,
        'ClaudeMdScanner.scanFile',
        { markerCount: allMarkers.length },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Convert parsed markers to GroupDefinition format
      for (const marker of allMarkers) {
        // Extract item IDs from content
        const itemIds = this.extractItemIds(marker.content);

        const group: GroupDefinition = {
          type: this.mapMarkerTypeToGroupType(marker.type),
          id: marker.id,
          content: marker.content,
          items: itemIds,
          lineStart: marker.startLine,
          lineEnd: marker.endLine,
          // Include optional metadata
          version: marker.metadata?.version,
          range: marker.metadata?.range,
          status: marker.metadata?.status,
          injectedAt: marker.metadata?.injectedAt,
          itemCount: itemIds.length
        };

        groups.push(group);
      }

      // Scan for individual items outside groups
      const itemsOutsideGroups = this.findIndividualItems(content, groups);
      individualItems.push(...itemsOutsideGroups);

      // Detect orphaned items (items mentioned but not properly enclosed)
      const orphaned = this.detectOrphanedItems(content, groups);
      orphanedItems.push(...orphaned);
      if (orphaned.length > 0) {
        warnings.push(`Found ${orphaned.length} orphaned item(s): ${orphaned.join(', ')}`);
      }

      // Validate marker pairing
      const pairingWarnings = this.validateMarkerPairing(content);
      warnings.push(...pairingWarnings);

      const totalInjectionCount = groups.length + individualItems.length;

      logger.info(
        LogCategory.DATA,
        'ClaudeMdScanner scan complete',
        'ClaudeMdScanner.scanFile',
        {
          groups: groups.length,
          individualItems: individualItems.length,
          orphanedItems: orphanedItems.length,
          totalInjections: totalInjectionCount,
          warnings: warnings.length
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      return {
        groups,
        individualItems,
        orphanedItems,
        totalInjectionCount,
        warnings
      };
    } catch (error: any) {
      logger.error(
        LogCategory.DATA,
        'ClaudeMdScanner scan failed',
        'ClaudeMdScanner.scanFile',
        { error: error.message },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      return {
        groups: [],
        individualItems: [],
        orphanedItems: [],
        totalInjectionCount: 0,
        warnings: [`Scan failed: ${error.message}`]
      };
    }
  }

  /**
   * Extract item IDs from group content
   * Looks for patterns like:
   * - <!-- AGENT-BRAIN:item-xxx:START -->
   * - Item references in markdown
   */
  private extractItemIds(content: string): string[] {
    const itemIds: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // Match V1 item markers inside group content
      const itemMatch = line.match(/<!--\s*AGENT-BRAIN:(item-[^:]+):START\s*-->/);
      if (itemMatch) {
        itemIds.push(itemMatch[1]);
      }

      // Match V2 item markers inside group content
      const v2ItemMatch = line.match(/<!--\s*AGENT-BRAIN-GROUP-START:\s*TYPE=\w+\s+ID=(item-[^\s]+)/);
      if (v2ItemMatch) {
        itemIds.push(v2ItemMatch[1]);
      }
    }

    return itemIds;
  }

  /**
   * Map marker type string to GroupType enum
   */
  private mapMarkerTypeToGroupType(type: string): GroupType {
    // Check if it's already a GroupType
    if (Object.values(GroupType).includes(type as GroupType)) {
      return type as GroupType;
    }

    // Default to TEMPLATE for V1 legacy markers
    return GroupType.TEMPLATE;
  }

  /**
   * Find individual items that exist outside any group
   * These are standalone knowledge items injected without a parent group
   */
  private findIndividualItems(content: string, groups: GroupDefinition[]): IndividualItemMarker[] {
    const individualItems: IndividualItemMarker[] = [];
    const lines = content.split('\n');

    // Build list of line ranges covered by groups
    const groupRanges = groups.map(g => ({ start: g.lineStart, end: g.lineEnd }));

    let lineNumber = 0;
    for (const line of lines) {
      lineNumber++;

      // Check if this line is inside any group
      const insideGroup = groupRanges.some(
        range => lineNumber >= range.start && lineNumber <= range.end
      );

      if (insideGroup) {
        continue;
      }

      // Look for item markers outside groups
      const itemMatch = line.match(/<!--\s*AGENT-BRAIN:(item-[^:]+):START\s*-->/);
      if (itemMatch) {
        individualItems.push({
          id: itemMatch[1],
          line: lineNumber
        });
      }

      // Look for V2 item markers outside groups
      const v2ItemMatch = line.match(/<!--\s*AGENT-BRAIN-GROUP-START:\s*TYPE=\w+\s+ID=(item-[^\s]+)/);
      if (v2ItemMatch) {
        individualItems.push({
          id: v2ItemMatch[1],
          line: lineNumber
        });
      }
    }

    return individualItems;
  }

  /**
   * Detect orphaned items - items referenced but not properly enclosed
   */
  private detectOrphanedItems(content: string, groups: GroupDefinition[]): string[] {
    const orphaned: string[] = [];

    // For now, just check for item IDs that appear in content but have no matching markers
    // This is a simplified implementation - could be enhanced later

    return orphaned;
  }

  /**
   * Validate that all start markers have matching end markers
   */
  private validateMarkerPairing(content: string): string[] {
    const warnings: string[] = [];
    const lines = content.split('\n');

    // Count V1 markers
    let v1StartCount = 0;
    let v1EndCount = 0;

    // Count V2 markers
    let v2StartCount = 0;
    let v2EndCount = 0;

    let inFencedCodeBlock = false;

    for (const line of lines) {
      // Track fenced code blocks to skip markers in code examples
      const trimmed = line.trim();
      if (trimmed.match(/^```[a-z0-9]*$/i)) {
        inFencedCodeBlock = !inFencedCodeBlock;
        continue;
      }

      if (inFencedCodeBlock) {
        continue;
      }

      // Skip inline code containing markers
      if (line.match(/`[^`]*<!--\s*AGENT-BRAIN/)) {
        continue;
      }

      // Count V1 markers
      if (line.match(/<!--\s*AGENT-BRAIN:[^:]+:START\s*-->/)) {
        v1StartCount++;
      }
      if (line.match(/<!--\s*AGENT-BRAIN:[^:]+:END\s*-->/)) {
        v1EndCount++;
      }

      // Count V2 markers
      if (line.match(/<!--\s*AGENT-BRAIN-GROUP-START:/)) {
        v2StartCount++;
      }
      if (line.match(/<!--\s*AGENT-BRAIN-GROUP-END:/)) {
        v2EndCount++;
      }
    }

    // Validate counts
    if (v1StartCount !== v1EndCount) {
      warnings.push(
        `Mismatched V1 markers: ${v1StartCount} START, ${v1EndCount} END`
      );
    }

    if (v2StartCount !== v2EndCount) {
      warnings.push(
        `Mismatched V2 markers: ${v2StartCount} START, ${v2EndCount} END`
      );
    }

    return warnings;
  }

  /**
   * Quick check if file has any injections (groups or items)
   */
  hasInjections(content: string): boolean {
    return (
      content.includes('<!-- AGENT-BRAIN:') ||
      content.includes('<!-- AGENT-BRAIN-GROUP-START:')
    );
  }

  /**
   * Get injection summary for quick display
   */
  getInjectionSummary(content: string): {
    totalGroups: number;
    totalItems: number;
    hasV1Markers: boolean;
    hasV2Markers: boolean;
  } {
    const result = this.scanFile(content);

    return {
      totalGroups: result.groups.length,
      totalItems: result.individualItems.length,
      hasV1Markers: content.includes('<!-- AGENT-BRAIN:'),
      hasV2Markers: content.includes('<!-- AGENT-BRAIN-GROUP-START:')
    };
  }
}
