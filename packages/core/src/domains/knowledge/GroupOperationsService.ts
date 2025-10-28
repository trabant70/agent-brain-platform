/**
 * GroupOperationsService - Group Injection/Removal Operations
 *
 * Handles all group-related operations for knowledge management:
 * - Injecting new groups
 * - Removing existing groups
 * - Updating group content
 * - Validating group integrity
 *
 * Works with both V1 (AGENT-BRAIN:id:START) and V2 (AGENT-BRAIN-GROUP-START) markers.
 */

import {
  GroupType,
  GroupInjectionOptions,
  GroupInjectionResult,
  GroupRemovalOptions,
  GroupRemovalResult,
  GroupDefinition
} from './GroupTypes';
import { TemplateEngine } from './TemplateEngine';
import { ClaudeMdScanner } from './ClaudeMdScanner';
import { logger, LogCategory, LogPathway } from '../../infrastructure/logging/Logger';

export class GroupOperationsService {
  constructor(
    private templateEngine: TemplateEngine,
    private scanner: ClaudeMdScanner
  ) {}

  /**
   * Inject a group into file content
   * Returns updated content with the new group
   */
  injectGroup(
    content: string,
    options: GroupInjectionOptions
  ): GroupInjectionResult {
    try {
      // Add defensive checks with defaults
      const safeOptions = {
        ...options,
        itemIds: options.itemIds || [],
        replaceExisting: options.replaceExisting ?? false,
        metadata: options.metadata || {}
      };

      logger.info(
        LogCategory.DATA,
        'Injecting group',
        'GroupOperationsService.injectGroup',
        { groupType: safeOptions.groupType, groupId: safeOptions.groupId, itemCount: safeOptions.itemIds.length },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Check if group already exists
      const existingGroups = this.scanner.scanFile(content);
      const groupExists = existingGroups.groups.some(g => g.id === safeOptions.groupId);

      if (groupExists) {
        if (!safeOptions.replaceExisting) {
          return {
            success: false,
            error: `Group ${safeOptions.groupId} already exists`
          };
        }

        // Remove existing group first
        const removeResult = this.removeGroup(content, {
          groupType: safeOptions.groupType,
          groupId: safeOptions.groupId
        });

        if (!removeResult.success) {
          return {
            success: false,
            error: `Failed to replace existing group: ${removeResult.error}`
          };
        }

        content = removeResult.content!;
      }

      // Generate group markers
      const metadata = {
        ...safeOptions.metadata,
        injectedAt: new Date().toISOString(),
        itemCount: safeOptions.itemIds.length
      };

      const markers = this.templateEngine.generateGroupMarkers(
        safeOptions.groupType,
        safeOptions.groupId,
        metadata
      );

      // Build group content
      // Note: In a real implementation, you'd fetch the actual item content
      // For now, we'll just list the item IDs as placeholders
      let groupContent = `\n${markers.start}\n`;
      groupContent += `<!-- Group: ${safeOptions.groupType} (${safeOptions.itemIds.length} items) -->\n\n`;

      for (const itemId of safeOptions.itemIds) {
        groupContent += `<!-- Item: ${itemId} -->\n`;
        groupContent += `[Content for ${itemId} would be here]\n\n`;
      }

      groupContent += `${markers.end}\n`;

      // Append to content
      const updatedContent = content.trimEnd() + '\n' + groupContent;

      logger.info(
        LogCategory.DATA,
        'Group injected successfully',
        'GroupOperationsService.injectGroup',
        { groupType: safeOptions.groupType, groupId: safeOptions.groupId, itemsInjected: safeOptions.itemIds.length },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      return {
        success: true,
        groupType: safeOptions.groupType,
        groupId: safeOptions.groupId,
        itemsInjected: safeOptions.itemIds.length,
        itemsExcluded: 0,
        content: updatedContent
      };
    } catch (error: any) {
      logger.error(
        LogCategory.DATA,
        'Failed to inject group',
        'GroupOperationsService.injectGroup',
        { error: error.message },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove a group from file content
   * Returns updated content without the group
   */
  removeGroup(
    content: string,
    options: GroupRemovalOptions
  ): GroupRemovalResult {
    try {
      logger.info(
        LogCategory.DATA,
        'Removing group',
        'GroupOperationsService.removeGroup',
        { groupType: options.groupType, groupId: options.groupId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Scan file to find the group
      const scanResult = this.scanner.scanFile(content);
      const targetGroup = scanResult.groups.find(g => g.id === options.groupId);

      if (!targetGroup) {
        return {
          success: false,
          error: `Group ${options.groupId} not found`
        };
      }

      // Build regex to match the group section
      const startMarkerEscaped = this.escapeRegExp(
        content.substring(
          content.indexOf(targetGroup.content) - 100,
          content.indexOf(targetGroup.content)
        ).split('\n').pop() || ''
      );

      // For V2 markers, we can use a more specific pattern
      const v2Pattern = `<!--\\s*AGENT-BRAIN-GROUP-START:.*ID=${options.groupId}.*-->`;
      const v2EndPattern = `<!--\\s*AGENT-BRAIN-GROUP-END:.*ID=${options.groupId}.*-->`;

      // Try to match V2 pattern first
      const v2Regex = new RegExp(
        `\n*${v2Pattern}[\\s\\S]*?${v2EndPattern}\n*`,
        'g'
      );

      let updatedContent = content.replace(v2Regex, '\n\n');

      // If V2 didn't match (still same content), try V1 pattern
      if (updatedContent === content) {
        // V1 pattern: AGENT-BRAIN:groupId:START/END
        const v1Pattern = `<!--\\s*AGENT-BRAIN:${this.escapeRegExp(options.groupId)}:START\\s*-->`;
        const v1EndPattern = `<!--\\s*AGENT-BRAIN:${this.escapeRegExp(options.groupId)}:END\\s*-->`;

        const v1Regex = new RegExp(
          `\n*${v1Pattern}[\\s\\S]*?${v1EndPattern}\n*`,
          'g'
        );

        updatedContent = content.replace(v1Regex, '\n\n');
      }

      // Check if anything was removed
      if (updatedContent === content) {
        return {
          success: false,
          error: `Failed to remove group ${options.groupId} - markers not found`
        };
      }

      const itemsRemoved = targetGroup.items.length;

      logger.info(
        LogCategory.DATA,
        'Group removed successfully',
        'GroupOperationsService.removeGroup',
        { groupType: options.groupType, groupId: options.groupId, itemsRemoved },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      return {
        success: true,
        groupType: options.groupType,
        groupId: options.groupId,
        itemsRemoved,
        content: updatedContent.trim() + '\n'
      };
    } catch (error: any) {
      logger.error(
        LogCategory.DATA,
        'Failed to remove group',
        'GroupOperationsService.removeGroup',
        { error: error.message },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update a group's content (remove + re-inject)
   */
  updateGroup(
    content: string,
    options: GroupInjectionOptions
  ): GroupInjectionResult {
    try {
      // First remove the existing group
      const removeResult = this.removeGroup(content, {
        groupType: options.groupType,
        groupId: options.groupId
      });

      if (!removeResult.success) {
        return {
          success: false,
          error: `Failed to remove existing group: ${removeResult.error}`
        };
      }

      // Then inject the updated group
      return this.injectGroup(removeResult.content!, options);
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove all groups from content
   */
  removeAllGroups(content: string): GroupRemovalResult {
    try {
      const scanResult = this.scanner.scanFile(content);
      let updatedContent = content;
      let totalItemsRemoved = 0;

      for (const group of scanResult.groups) {
        const removeResult = this.removeGroup(updatedContent, {
          groupType: group.type,
          groupId: group.id
        });

        if (removeResult.success) {
          updatedContent = removeResult.content!;
          totalItemsRemoved += removeResult.itemsRemoved || 0;
        }
      }

      return {
        success: true,
        itemsRemoved: totalItemsRemoved,
        content: updatedContent
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate group integrity
   * Checks that markers are properly paired and content is valid
   */
  validateGroups(content: string): { valid: boolean; errors: string[] } {
    const scanResult = this.scanner.scanFile(content);

    const errors: string[] = [];

    // Check for warnings from scanner
    if (scanResult.warnings.length > 0) {
      errors.push(...scanResult.warnings);
    }

    // Check for orphaned items
    if (scanResult.orphanedItems.length > 0) {
      errors.push(`Found ${scanResult.orphanedItems.length} orphaned items`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get all groups from content
   */
  getGroups(content: string): GroupDefinition[] {
    const scanResult = this.scanner.scanFile(content);
    return scanResult.groups;
  }

  /**
   * Check if content has any groups
   */
  hasGroups(content: string): boolean {
    return this.scanner.hasInjections(content);
  }

  /**
   * Escape special regex characters
   */
  private escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
