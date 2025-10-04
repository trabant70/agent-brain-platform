/**
 * ConnectionMapper - Visual Relationship Mapping
 *
 * ARCHITECTURE NOTE: This mapper converts GitEventRelationships from analyzers
 * into visual ConnectionLine objects for timeline rendering.
 *
 * KEY IMPROVEMENT: Uses actual git parent-child relationships instead of hardcoded logic!
 * Maps different relationship types to appropriate visual styles and paths.
 *
 * Next phase: TimelineDataAdapter will integrate this with existing timeline system.
 */

import {
    GitEvent,
    GitEventRelationship,
    ConnectionLine,
    ConnectionStyle,
    EventPosition,
    GitRelationshipType
} from '../domain/git-event.types';

/**
 * Configuration for connection visualization
 */
export interface ConnectionMappingConfig {
    enabledRelationshipTypes: GitRelationshipType[];
    curveIntensity: number;          // 0-1: How curved the lines should be
    minimumLineOpacity: number;      // Minimum opacity for visibility
    maximumLineWidth: number;        // Maximum line width
    groupSimilarConnections: boolean; // Group multiple connections of same type
    adaptiveOpacity: boolean;        // Adjust opacity based on connection density
}

export const DEFAULT_CONNECTION_CONFIG: ConnectionMappingConfig = {
    enabledRelationshipTypes: ['parent-child', 'merge-source', 'merge-target', 'branch-creation'],
    curveIntensity: 0.3,
    minimumLineOpacity: 0.2,
    maximumLineWidth: 3,
    groupSimilarConnections: true,
    adaptiveOpacity: true
};

/**
 * Visual style definitions for different relationship types
 */
interface ConnectionStyleTemplate {
    color: string;
    width: number;
    opacity: number;
    dashArray?: string;
    curveStyle: 'none' | 'gentle' | 'strong';
}

/**
 * Mapper for converting git relationships to visual connections
 */
export class ConnectionMapper {
    private readonly config: ConnectionMappingConfig;
    private readonly styleTemplates: Map<GitRelationshipType, ConnectionStyleTemplate>;

    constructor(config: Partial<ConnectionMappingConfig> = {}) {
        this.config = { ...DEFAULT_CONNECTION_CONFIG, ...config };
        this.styleTemplates = this.initializeStyleTemplates();
    }

    /**
     * Maps git relationships to visual connection lines
     */
    mapRelationshipsToConnections(
        relationships: GitEventRelationship[],
        eventPositions: Map<string, EventPosition>
    ): ConnectionLine[] {
        console.log(`ConnectionMapper: Mapping ${relationships.length} relationships to visual connections...`);

        // Filter enabled relationship types
        const enabledRelationships = relationships.filter(rel =>
            this.config.enabledRelationshipTypes.includes(rel.type)
        );

        const connections: ConnectionLine[] = [];

        for (const relationship of enabledRelationships) {
            try {
                const connection = this.createConnectionLine(relationship, eventPositions);
                if (connection) {
                    connections.push(connection);
                }
            } catch (error) {
                console.warn(`ConnectionMapper: Failed to create connection for ${relationship.id}:`, error);
            }
        }

        // Apply adaptive styling if enabled
        if (this.config.adaptiveOpacity) {
            this.applyAdaptiveOpacity(connections);
        }

        // Group similar connections if enabled
        if (this.config.groupSimilarConnections) {
            return this.groupSimilarConnections(connections);
        }

        console.log(`ConnectionMapper: Created ${connections.length} visual connections`);
        return connections;
    }

    /**
     * Creates a single connection line from a relationship
     */
    private createConnectionLine(
        relationship: GitEventRelationship,
        eventPositions: Map<string, EventPosition>
    ): ConnectionLine | null {
        const sourcePosition = eventPositions.get(relationship.sourceEventId);
        const targetPosition = eventPositions.get(relationship.targetEventId);

        if (!sourcePosition || !targetPosition) {
            return null; // Can't draw connection without both positions
        }

        // Get base style template for this relationship type
        const styleTemplate = this.styleTemplates.get(relationship.type);
        if (!styleTemplate) {
            console.warn(`ConnectionMapper: No style template for relationship type: ${relationship.type}`);
            return null;
        }

        // Create connection style, incorporating metadata overrides
        const style = this.createConnectionStyle(styleTemplate, relationship);

        // Generate SVG path based on positions and curve style
        const path = this.generateConnectionPath(
            sourcePosition,
            targetPosition,
            styleTemplate.curveStyle,
            relationship.type
        );

        return {
            id: `connection-${relationship.id}`,
            sourcePosition,
            targetPosition,
            relationship,
            path,
            style
        };
    }

    /**
     * Creates connection style from template and relationship metadata
     */
    private createConnectionStyle(
        template: ConnectionStyleTemplate,
        relationship: GitEventRelationship
    ): ConnectionStyle {
        const style: ConnectionStyle = {
            color: template.color,
            width: template.width,
            opacity: template.opacity
        };

        // Apply metadata overrides if present
        if (relationship.metadata) {
            if (relationship.metadata.color) {
                style.color = relationship.metadata.color;
            }
            if (relationship.metadata.opacity !== undefined) {
                style.opacity = Math.max(relationship.metadata.opacity, this.config.minimumLineOpacity);
            }
            if (relationship.metadata.visualStyle === 'dashed') {
                style.dashArray = '5,5';
            } else if (relationship.metadata.visualStyle === 'dotted') {
                style.dashArray = '2,3';
            }
        }

        // Ensure minimum opacity and maximum width
        style.opacity = Math.max(style.opacity, this.config.minimumLineOpacity);
        style.width = Math.min(style.width, this.config.maximumLineWidth);

        return style;
    }

    /**
     * Generates SVG path for connection based on curve style
     */
    private generateConnectionPath(
        source: EventPosition,
        target: EventPosition,
        curveStyle: 'none' | 'gentle' | 'strong',
        relationshipType: GitRelationshipType
    ): string {
        const { x: x1, y: y1 } = source;
        const { x: x2, y: y2 } = target;

        if (curveStyle === 'none' || x1 === x2) {
            // Straight line
            return `M ${x1} ${y1} L ${x2} ${y2}`;
        }

        // Calculate curve intensity based on configuration and relationship type
        let intensity = this.config.curveIntensity;
        if (curveStyle === 'strong') {
            intensity *= 1.5;
        } else if (curveStyle === 'gentle') {
            intensity *= 0.7;
        }

        // Adjust curve based on relationship type
        switch (relationshipType) {
            case 'parent-child':
                return this.generateParentChildPath(x1, y1, x2, y2, intensity);
            case 'merge-source':
            case 'merge-target':
                return this.generateMergePath(x1, y1, x2, y2, intensity, relationshipType);
            case 'branch-creation':
                return this.generateBranchCreationPath(x1, y1, x2, y2, intensity);
            default:
                return this.generateDefaultCurvedPath(x1, y1, x2, y2, intensity);
        }
    }

    /**
     * Generates curved path for parent-child relationships
     */
    private generateParentChildPath(x1: number, y1: number, x2: number, y2: number, intensity: number): string {
        if (y1 === y2) {
            // Same branch - gentle horizontal curve
            const midX = x1 + (x2 - x1) * 0.5;
            const controlY = y1 - Math.abs(x2 - x1) * intensity * 0.2;
            return `M ${x1} ${y1} Q ${midX} ${controlY} ${x2} ${y2}`;
        } else {
            // Different branches - S-curve
            const controlX1 = x1 + Math.abs(x2 - x1) * intensity;
            const controlX2 = x2 - Math.abs(x2 - x1) * intensity;
            return `M ${x1} ${y1} C ${controlX1} ${y1}, ${controlX2} ${y2}, ${x2} ${y2}`;
        }
    }

    /**
     * Generates curved path for merge relationships
     */
    private generateMergePath(
        x1: number, y1: number, x2: number, y2: number,
        intensity: number, type: 'merge-source' | 'merge-target'
    ): string {
        if (type === 'merge-source') {
            // Source to merge - arc upward
            const controlX = x1 + (x2 - x1) * 0.7;
            const controlY = Math.min(y1, y2) - Math.abs(y2 - y1) * intensity;
            return `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`;
        } else {
            // Target to merge - arc downward
            const controlX = x1 + (x2 - x1) * 0.3;
            const controlY = Math.max(y1, y2) + Math.abs(y2 - y1) * intensity;
            return `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`;
        }
    }

    /**
     * Generates curved path for branch creation relationships
     */
    private generateBranchCreationPath(x1: number, y1: number, x2: number, y2: number, intensity: number): string {
        // Branch creation - gentle fork curve
        const controlX = x1 + Math.abs(x2 - x1) * intensity * 0.5;
        const controlY = y1 + (y2 - y1) * 0.3;
        return `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`;
    }

    /**
     * Generates default curved path
     */
    private generateDefaultCurvedPath(x1: number, y1: number, x2: number, y2: number, intensity: number): string {
        const midX = x1 + (x2 - x1) * 0.5;
        const controlY = y1 + (y2 - y1) * 0.5 + Math.abs(x2 - x1) * intensity * 0.3;
        return `M ${x1} ${y1} Q ${midX} ${controlY} ${x2} ${y2}`;
    }

    /**
     * Applies adaptive opacity based on connection density
     */
    private applyAdaptiveOpacity(connections: ConnectionLine[]): void {
        if (connections.length === 0) return;

        // Calculate density metrics
        const totalConnections = connections.length;
        const densityFactor = Math.min(1.0, totalConnections / 50); // Normalize to 50 connections

        // Adjust opacity inversely to density
        const opacityMultiplier = 1.0 - (densityFactor * 0.5); // Reduce by up to 50%

        for (const connection of connections) {
            const currentOpacity = connection.style.opacity;
            const adjustedOpacity = Math.max(
                currentOpacity * opacityMultiplier,
                this.config.minimumLineOpacity
            );
            connection.style.opacity = adjustedOpacity;
        }
    }

    /**
     * Groups similar connections to reduce visual clutter
     */
    private groupSimilarConnections(connections: ConnectionLine[]): ConnectionLine[] {
        // This is a simplified grouping - in a full implementation,
        // we might combine multiple connections between the same events
        // or create bundled connection paths

        const grouped = new Map<string, ConnectionLine[]>();

        for (const connection of connections) {
            const key = `${connection.sourcePosition.eventId}-${connection.targetPosition.eventId}`;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key)!.push(connection);
        }

        // For now, just return the most important connection from each group
        const result: ConnectionLine[] = [];
        for (const group of grouped.values()) {
            if (group.length === 1) {
                result.push(group[0]);
            } else {
                // Select the most important relationship type
                const prioritized = this.prioritizeConnections(group);
                result.push(prioritized);
            }
        }

        return result;
    }

    /**
     * Prioritizes connections by relationship type importance
     */
    private prioritizeConnections(connections: ConnectionLine[]): ConnectionLine {
        const priority: Record<GitRelationshipType, number> = {
            'merge-target': 4,
            'merge-source': 3,
            'parent-child': 2,
            'branch-creation': 1,
            'tag-reference': 0
        };

        connections.sort((a, b) => {
            const aPriority = priority[a.relationship.type] || 0;
            const bPriority = priority[b.relationship.type] || 0;
            return bPriority - aPriority;
        });

        return connections[0];
    }

    /**
     * Initializes style templates for different relationship types
     */
    private initializeStyleTemplates(): Map<GitRelationshipType, ConnectionStyleTemplate> {
        const templates = new Map<GitRelationshipType, ConnectionStyleTemplate>();

        templates.set('parent-child', {
            color: '#6366f1',      // Indigo
            width: 2,
            opacity: 0.6,
            curveStyle: 'gentle'
        });

        templates.set('merge-source', {
            color: '#ef4444',      // Red
            width: 2.5,
            opacity: 0.7,
            curveStyle: 'strong'
        });

        templates.set('merge-target', {
            color: '#10b981',      // Green
            width: 2.5,
            opacity: 0.7,
            curveStyle: 'strong'
        });

        templates.set('branch-creation', {
            color: '#8b5cf6',      // Purple
            width: 2,
            opacity: 0.5,
            curveStyle: 'gentle',
            dashArray: '5,5'
        });

        templates.set('tag-reference', {
            color: '#f59e0b',      // Amber
            width: 1.5,
            opacity: 0.4,
            curveStyle: 'none'
        });

        return templates;
    }

    /**
     * Gets statistics about connection mapping
     */
    getConnectionStatistics(connections: ConnectionLine[]): {
        totalConnections: number;
        connectionsByType: Record<GitRelationshipType, number>;
        averageOpacity: number;
        curvedConnections: number;
    } {
        const connectionsByType: Record<GitRelationshipType, number> = {
            'parent-child': 0,
            'merge-source': 0,
            'merge-target': 0,
            'branch-creation': 0,
            'tag-reference': 0
        };

        let totalOpacity = 0;
        let curvedConnections = 0;

        for (const connection of connections) {
            connectionsByType[connection.relationship.type]++;
            totalOpacity += connection.style.opacity;

            if (connection.path.includes('Q') || connection.path.includes('C')) {
                curvedConnections++;
            }
        }

        return {
            totalConnections: connections.length,
            connectionsByType,
            averageOpacity: connections.length > 0 ? totalOpacity / connections.length : 0,
            curvedConnections
        };
    }

    /**
     * Updates configuration and reinitializes style templates
     */
    updateConfiguration(newConfig: Partial<ConnectionMappingConfig>): void {
        Object.assign(this.config, newConfig);
        // Style templates remain the same unless we add a method to update them
    }
}