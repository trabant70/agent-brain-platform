/**
 * TemplateGroupingStrategy - Group items by source template (providence)
 *
 * This is the default grouping strategy that organizes items by which template they came from.
 * This matches the current V1 templates table behavior.
 *
 * Each template becomes a group containing all its items.
 */

import { KnowledgeItem, MaturityContext } from '../../../../knowledge/types';
import { GroupType } from '../../../../knowledge/GroupTypes';
import { ViewMode, GroupSection } from '../ViewMode';
import { BaseGroupingStrategy } from '../GroupingStrategy';
import { MarketplaceTemplate } from '../../../../knowledge/types';

export class TemplateGroupingStrategy extends BaseGroupingStrategy {
  private templates: MarketplaceTemplate[] = [];

  getMode(): ViewMode {
    return ViewMode.BY_TEMPLATE;
  }

  getGroupType(): GroupType {
    return GroupType.TEMPLATE;
  }

  getLabel(): string {
    return 'Template';
  }

  getIcon(): string {
    return '📦';
  }

  getDescription(): string {
    return 'Group by source template (providence)';
  }

  /**
   * Set the templates to use for grouping
   * This must be called before calculateGroups
   */
  setTemplates(templates: MarketplaceTemplate[]): void {
    this.templates = templates;
  }

  calculateGroups(items: KnowledgeItem[], context?: MaturityContext | null): GroupSection[] {
    const groups: GroupSection[] = [];

    // Group items by template
    // Note: In the current system, items are already organized by template in the templates array
    // So we can directly convert templates to groups

    this.templates.forEach(template => {
      // Show all templates, even empty ones (itemCount === 0)
      const templateItems = template.items || [];
      groups.push(
        this.createGroupSection(
          template.id,
          `📦 ${template.name}`,
          templateItems.map(item => item.id),
          {
            templateId: template.id,
            category: template.category,
            tags: template.tags,
            scope: template.scope,
            version: template.version,
            itemCount: template.itemCount
          },
          template.description
        )
      );
    });

    return groups;
  }

  /**
   * Alternative: Group items by their templateId field if templates aren't available
   */
  calculateGroupsFromItems(items: KnowledgeItem[], context?: MaturityContext | null): GroupSection[] {
    const groups: GroupSection[] = [];
    const itemsByTemplate: Map<string, KnowledgeItem[]> = new Map();

    // Group items by their template association
    items.forEach(item => {
      // Assuming items have a templateId or similar field
      // This is a fallback if templates aren't provided
      const templateId = (item as any).templateId || 'unknown';

      if (!itemsByTemplate.has(templateId)) {
        itemsByTemplate.set(templateId, []);
      }
      itemsByTemplate.get(templateId)!.push(item);
    });

    // Convert to groups
    itemsByTemplate.forEach((groupItems, templateId) => {
      groups.push(
        this.createGroupSection(
          templateId,
          `📦 ${templateId}`,
          groupItems.map(item => item.id),
          { templateId },
          undefined
        )
      );
    });

    return groups;
  }
}
