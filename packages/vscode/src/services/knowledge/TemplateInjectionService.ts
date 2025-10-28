/**
 * TemplateInjectionService
 *
 * Handles template injection and removal from files (e.g., CLAUDE.md).
 * Responsible for:
 * - Injecting full templates into files
 * - Injecting individual items into files
 * - Removing templates from files
 * - Recording injection metadata
 */

import * as vscode from 'vscode';
import {
  TemplateStore,
  TemplateEngine,
  MaturityFootprint,
  KnowledgeItem,
  MaturityFilterEngine,
  MaturityContext as CoreMaturityContext,
  GroupType,
  GroupInjectionOptions,
  InjectionPreview
} from '@agent-brain/core/domains/knowledge';
import { KnowledgeEventStorage } from '@agent-brain/core/domains/events';
import { logger, LogCategory, LogPathway } from '@agent-brain/core/infrastructure/logging/Logger';

/**
 * Current maturity context for filtering items
 */
export interface MaturityContext {
  operatorLevel: number;  // 1-5
  projectLevel: number;   // 1-5
  complexityLevel: number; // 1-3 (Simple=1, Standard=2, Complex=3)
}

export class TemplateInjectionService {
  private currentMaturityContext: MaturityContext | null = null;
  private maturityFilterEngine: MaturityFilterEngine;

  constructor(
    private templateStore: TemplateStore,
    private templateEngine: TemplateEngine,
    private eventStorage: KnowledgeEventStorage
  ) {
    this.maturityFilterEngine = new MaturityFilterEngine();
  }

  /**
   * Set current maturity context for filtering injections
   */
  setMaturityContext(context: MaturityContext | null): void {
    this.currentMaturityContext = context;
    logger.info(
      LogCategory.EXTENSION,
      'Maturity context updated',
      'TemplateInjectionService.setMaturityContext',
      { context },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Check if an item matches the current maturity context
   */
  private matchesMaturityContext(item: KnowledgeItem): boolean {
    // If no maturity footprint on item, it applies to all contexts
    if (!item.maturity) {
      return true;
    }

    // If no current context set, allow all items (backwards compatibility)
    if (!this.currentMaturityContext) {
      return true;
    }

    const { operatorLevel, projectLevel, complexityLevel } = this.currentMaturityContext;
    const { operator, project, complexity } = item.maturity;

    // Check if current context falls within the item's maturity ranges
    const operatorMatch = operatorLevel >= operator.min && operatorLevel <= operator.max;
    const projectMatch = projectLevel >= project.min && projectLevel <= project.max;
    const complexityMatch = complexityLevel >= complexity.min && complexityLevel <= complexity.max;

    return operatorMatch && projectMatch && complexityMatch;
  }

  /**
   * Inject full template to a file (e.g., CLAUDE.md)
   */
  async injectTemplate(templateId: string, targetFilePath: string): Promise<void> {
    const template = this.templateStore.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    if (!template.items || template.items.length === 0) {
      throw new Error(`Template "${template.name}" has no items to inject`);
    }

    // Filter items based on current maturity context
    const matchingItems = template.items.filter(item => this.matchesMaturityContext(item));

    if (matchingItems.length === 0) {
      throw new Error(`No items from template "${template.name}" match the current maturity context`);
    }

    logger.info(
      LogCategory.EXTENSION,
      'Filtered items by maturity context',
      'TemplateInjectionService.injectTemplate',
      {
        templateId,
        totalItems: template.items.length,
        matchingItems: matchingItems.length,
        context: this.currentMaturityContext
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Read current file content
    const fileUri = vscode.Uri.file(targetFilePath);
    let currentContent: string;
    try {
      const contentBytes = await vscode.workspace.fs.readFile(fileUri);
      currentContent = Buffer.from(contentBytes).toString('utf8');
    } catch (error) {
      throw new Error(`Failed to read file ${targetFilePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Prepare template content with matching items only
    // NOTE: We only use template-level markers (not individual item markers)
    // since templates are removed as a whole unit. This makes the system
    // more resilient to tag corruption and easier to manually clean up.
    const templateMarker = `template-${templateId}`;
    let templateContent = `\n<!-- AGENT-BRAIN:${templateMarker}:START -->\n`;
    templateContent += `<!-- Template: ${template.name} (${matchingItems.length} of ${template.items.length} items) -->\n\n`;

    for (const item of matchingItems) {
      // No individual item markers - just the content
      templateContent += `${item.body}\n\n`;
    }

    templateContent += `<!-- AGENT-BRAIN:${templateMarker}:END -->\n`;

    // Check if template is already injected
    if (currentContent.includes(`<!-- AGENT-BRAIN:${templateMarker}:START -->`)) {
      throw new Error(`Template "${template.name}" is already injected in ${targetFilePath}`);
    }

    // Append template to file
    const updatedContent = currentContent + templateContent;

    // Write updated content back to file
    try {
      await vscode.workspace.fs.writeFile(
        fileUri,
        Buffer.from(updatedContent, 'utf8')
      );
    } catch (error) {
      throw new Error(`Failed to write to file ${targetFilePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Record injection for all items in template store (audit log)
    this.templateStore.recordTemplateInjection(templateId, targetFilePath, 'user');

    // Record timeline events for each injected item
    for (const item of matchingItems) {
      await this.eventStorage.recordEvent({
        type: 'apply',
        knowledgeItemId: item.id,
        knowledgeItemTitle: item.title,
        knowledgeItemType: item.type,
        targetFile: targetFilePath,
        actor: 'user'
      });
    }

    logger.info(
      LogCategory.EXTENSION,
      'Injected template and recorded timeline events',
      'TemplateInjectionService.injectTemplate',
      {
        templateId,
        targetFilePath,
        totalItems: template.items.length,
        injectedItems: matchingItems.length,
        eventsRecorded: matchingItems.length
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Inject single item to a file (e.g., CLAUDE.md)
   */
  async injectItem(templateId: string, itemId: string, targetFilePath: string): Promise<void> {
    const template = this.templateStore.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const item = template.items.find(i => i.id === itemId);
    if (!item) {
      throw new Error(`Item ${itemId} not found in template ${templateId}`);
    }

    // Check if item matches current maturity context
    if (!this.matchesMaturityContext(item)) {
      logger.warn(
        LogCategory.EXTENSION,
        'Injecting item that does not match current maturity context',
        'TemplateInjectionService.injectItem',
        {
          itemId,
          itemMaturity: item.maturity,
          currentContext: this.currentMaturityContext
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      // We still allow the injection, but log a warning
    }

    // Read current file content
    const fileUri = vscode.Uri.file(targetFilePath);
    let currentContent: string;
    try {
      const contentBytes = await vscode.workspace.fs.readFile(fileUri);
      currentContent = Buffer.from(contentBytes).toString('utf8');
    } catch (error) {
      throw new Error(`Failed to read file ${targetFilePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Prepare item content with markers
    const itemMarker = `item-${itemId}`;
    let itemContent = `\n<!-- AGENT-BRAIN:${itemMarker}:START -->\n`;
    itemContent += `<!-- Item: ${item.title} -->\n`;
    itemContent += `${item.body}\n`;
    itemContent += `<!-- AGENT-BRAIN:${itemMarker}:END -->\n`;

    // Check if item is already injected
    if (currentContent.includes(`<!-- AGENT-BRAIN:${itemMarker}:START -->`)) {
      throw new Error(`Item "${item.title}" is already injected in ${targetFilePath}`);
    }

    // Append item to file
    const updatedContent = currentContent + itemContent;

    // Write updated content back to file
    try {
      await vscode.workspace.fs.writeFile(
        fileUri,
        Buffer.from(updatedContent, 'utf8')
      );
    } catch (error) {
      throw new Error(`Failed to write to file ${targetFilePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Record injection in template store (audit log)
    this.templateStore.recordItemInjection(itemId, targetFilePath, 'item', templateId, 'user');

    // Record timeline event
    await this.eventStorage.recordEvent({
      type: 'apply',
      knowledgeItemId: item.id,
      knowledgeItemTitle: item.title,
      knowledgeItemType: item.type,
      targetFile: targetFilePath,
      actor: 'user'
    });

    logger.info(
      LogCategory.EXTENSION,
      'Injected item and recorded timeline event',
      'TemplateInjectionService.injectItem',
      { templateId, itemId, targetFilePath, itemTitle: item.title },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Remove template from a file (e.g., CLAUDE.md)
   */
  async removeTemplate(templateId: string, targetFilePath: string): Promise<void> {
    logger.info(
      LogCategory.EXTENSION,
      'Removing template',
      'TemplateInjectionService.removeTemplate',
      { templateId, targetFilePath },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Get template to record events for all items
    const template = this.templateStore.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Read current file content
    const fileUri = vscode.Uri.file(targetFilePath);
    let currentContent: string;
    try {
      const contentBytes = await vscode.workspace.fs.readFile(fileUri);
      currentContent = Buffer.from(contentBytes).toString('utf8');
    } catch (error) {
      throw new Error(`Failed to read file ${targetFilePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Use TemplateEngine to remove the template section
    // templateId already includes "template-" prefix (e.g., "template-bundled.agent-brain-base")
    const result = this.templateEngine.removeTemplate(currentContent, templateId);

    if (!result.success) {
      throw new Error(result.error || 'Failed to remove template');
    }

    // Write updated content back to file
    try {
      await vscode.workspace.fs.writeFile(
        fileUri,
        Buffer.from(result.content!, 'utf8')
      );
    } catch (error) {
      throw new Error(`Failed to write to file ${targetFilePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Record removal in template store (audit log)
    this.templateStore.recordTemplateRemoval(templateId, targetFilePath, 'user');

    // Record timeline events for each removed item
    for (const item of template.items) {
      await this.eventStorage.recordEvent({
        type: 'remove',
        knowledgeItemId: item.id,
        knowledgeItemTitle: item.title,
        knowledgeItemType: item.type,
        targetFile: targetFilePath,
        actor: 'user'
      });
    }

    logger.info(
      LogCategory.EXTENSION,
      'Removed template and recorded timeline events',
      'TemplateInjectionService.removeTemplate',
      { templateId, targetFilePath, itemsRemoved: template.items.length },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  // ============================================
  // V2 Maturity-Based Group Injections
  // ============================================

  /**
   * Convert local MaturityContext to core MaturityContext
   */
  private toCoreContext(context: MaturityContext): CoreMaturityContext {
    // Convert operator/project levels to quadrant (1-25)
    const quadrant = (context.projectLevel - 1) * 5 + context.operatorLevel;

    // Convert complexity level to enum
    const complexityMap: Record<number, any> = {
      1: 'simple',
      2: 'standard',
      3: 'complex'
    };

    return {
      complexity: complexityMap[context.complexityLevel] || 'standard',
      quadrant,
      maxItems: 25
    };
  }

  /**
   * Preview what will be injected for maturity-based group
   * Returns filtered items and metadata without actually injecting
   */
  async previewMaturityGroupInjection(
    templateId: string,
    groupType: GroupType,
    context?: MaturityContext
  ): Promise<InjectionPreview> {
    const template = this.templateStore.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Use provided context or current context
    const effectiveContext = context || this.currentMaturityContext;

    let matched: any[];
    let excluded: any[];

    if (effectiveContext) {
      // Filter items using MaturityFilterEngine
      // Check if context is already in core format or needs conversion
      let coreContext: CoreMaturityContext;
      if ('complexity' in effectiveContext && 'quadrant' in effectiveContext) {
        // Already in core format
        coreContext = effectiveContext as CoreMaturityContext;
      } else {
        // Convert from local format
        coreContext = this.toCoreContext(effectiveContext);
      }
      const filterResult = this.maturityFilterEngine.filterItems(
        template.items,
        coreContext
      );
      matched = filterResult.matched;
      excluded = filterResult.excluded;
    } else {
      // No maturity context - include all items as matched
      matched = template.items.map(item => ({
        itemId: item.id,
        itemTitle: item.title,
        distance: 0,
        relevanceScore: 1.0
      }));
      excluded = [];
    }

    // Generate markers for preview
    const groupId = `${groupType.toLowerCase()}-${templateId}`;
    const markers = this.templateEngine.generateGroupMarkers(
      groupType,
      groupId,
      {
        version: template.version,
        itemCount: matched.length
      }
    );

    // Estimate content size
    const matchedItems = template.items.filter(item =>
      matched.some(m => m.itemId === item.id)
    );
    const contentSize = matchedItems.reduce(
      (sum, item) => sum + item.body.length,
      0
    );

    return {
      groupType,
      groupId,
      totalItems: template.items.length,
      matchedItems: matched,
      excludedItems: excluded,
      markers,
      estimatedSize: contentSize
    };
  }

  /**
   * Inject maturity-based group (OPERATOR_RANGE, PROJECT_RANGE, COMPLEXITY_RANGE, CATCHMENT)
   * Uses V2 group markers with metadata
   */
  async injectMaturityGroup(
    options: GroupInjectionOptions & { targetFilePath: string; maturityContext?: MaturityContext; includeAllItems?: boolean }
  ): Promise<void> {
    const {
      groupType,
      groupId,
      itemIds,
      replaceExisting = false,
      metadata = {},
      targetFilePath,
      maturityContext,
      includeAllItems = false
    } = options;

    logger.info(
      LogCategory.EXTENSION,
      'Injecting maturity group',
      'TemplateInjectionService.injectMaturityGroup',
      { groupType, groupId, itemCount: itemIds.length, targetFilePath, includeAllItems },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Read current file content
    const fileUri = vscode.Uri.file(targetFilePath);
    let currentContent: string;
    try {
      const contentBytes = await vscode.workspace.fs.readFile(fileUri);
      currentContent = Buffer.from(contentBytes).toString('utf8');
    } catch (error) {
      throw new Error(`Failed to read file ${targetFilePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Check if group already exists
    const groupMarkerCheck = `AGENT-BRAIN-GROUP-START: TYPE=${groupType} ID=${groupId}`;
    if (currentContent.includes(groupMarkerCheck)) {
      if (!replaceExisting) {
        throw new Error(`Group ${groupId} already exists in ${targetFilePath}`);
      }
      // TODO: Remove existing group before injecting new one
      logger.warn(
        LogCategory.EXTENSION,
        'Replace existing group not yet implemented',
        'TemplateInjectionService.injectMaturityGroup',
        { groupId },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    }

    // Get items from store
    let items: KnowledgeItem[] = [];

    if (itemIds.length > 0) {
      // Use provided item IDs
      for (const itemId of itemIds) {
        const item = this.templateStore.getItem(itemId);
        if (item) {
          items.push(item);
        }
      }
    } else if (groupType === GroupType.TEMPLATE) {
      // For templates with no specific itemIds, get all items from the template
      const template = this.templateStore.getTemplate(groupId);
      if (!template || !template.items) {
        throw new Error(`Template ${groupId} not found or has no items`);
      }

      if (includeAllItems || !maturityContext) {
        // Include all items (no filtering)
        items = template.items;
      } else {
        // Filter items based on maturity context
        // Check if maturityContext is already in core format or needs conversion
        let coreContext: CoreMaturityContext;
        if ('complexity' in maturityContext && 'quadrant' in maturityContext) {
          // Already in core format
          coreContext = maturityContext as CoreMaturityContext;
        } else {
          // Convert from local format
          coreContext = this.toCoreContext(maturityContext);
        }
        const { matched } = this.maturityFilterEngine.filterItems(template.items, coreContext);
        items = template.items.filter(item => matched.some(m => m.itemId === item.id));
      }
    }

    // Generate group markers with metadata
    const enrichedMetadata = {
      ...metadata,
      injectedAt: new Date().toISOString(),
      itemCount: items.length
    };

    const markers = this.templateEngine.generateGroupMarkers(
      groupType,
      groupId,
      enrichedMetadata
    );

    // Build group content
    let groupContent = `\n${markers.start}\n`;
    groupContent += `<!-- Group: ${groupType} (${items.length} items) -->\n\n`;

    for (const item of items) {
      groupContent += `${item.body}\n\n`;
    }

    groupContent += `${markers.end}\n`;

    // Append to file
    const updatedContent = currentContent + groupContent;

    // Write updated content back to file
    try {
      await vscode.workspace.fs.writeFile(
        fileUri,
        Buffer.from(updatedContent, 'utf8')
      );
    } catch (error) {
      throw new Error(`Failed to write to file ${targetFilePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Record timeline events for each injected item
    for (const item of items) {
      await this.eventStorage.recordEvent({
        type: 'apply',
        knowledgeItemId: item.id,
        knowledgeItemTitle: item.title,
        knowledgeItemType: item.type,
        targetFile: targetFilePath,
        actor: 'user'
      });
    }

    logger.info(
      LogCategory.EXTENSION,
      'Injected maturity group',
      'TemplateInjectionService.injectMaturityGroup',
      { groupType, groupId, itemCount: items.length, targetFilePath },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Inject items filtered by catchment basin
   * Only injects items that fall within the catchment of current context
   */
  async injectCatchmentGroup(
    templateId: string,
    targetFilePath: string,
    context?: MaturityContext
  ): Promise<void> {
    const template = this.templateStore.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Use provided context or current context
    const effectiveContext = context || this.currentMaturityContext;
    if (!effectiveContext) {
      throw new Error('No maturity context available for catchment injection');
    }

    // Check if context is already in core format or needs conversion
    let coreContext: CoreMaturityContext;
    if ('complexity' in effectiveContext && 'quadrant' in effectiveContext) {
      // Already in core format
      coreContext = effectiveContext as CoreMaturityContext;
    } else {
      // Convert from local format
      coreContext = this.toCoreContext(effectiveContext);
    }

    // Filter items using MaturityFilterEngine
    const { matched } = this.maturityFilterEngine.filterItems(
      template.items,
      coreContext
    );

    if (matched.length === 0) {
      throw new Error(`No items from template "${template.name}" fall within the catchment basin`);
    }

    // Get the actual item IDs
    const itemIds = matched.map(m => m.itemId);

    // Inject as CATCHMENT group
    await this.injectMaturityGroup({
      groupType: GroupType.CATCHMENT,
      groupId: `catchment-${templateId}`,
      itemIds,
      targetFilePath,
      metadata: {
        range: `Q${coreContext.quadrant}`,
        status: 'IN'
      }
    });
  }
}
