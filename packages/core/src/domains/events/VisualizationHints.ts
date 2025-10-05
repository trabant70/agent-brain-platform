/**
 * Visualization hints for renderers
 */
export interface VisualizationHints {
  /** Color (hex code) */
  color?: string;

  /** Icon name or emoji */
  icon?: string;

  /** Visual size (affects rendering) */
  size?: 'small' | 'medium' | 'large';

  /** Shape for graph rendering */
  shape?: 'circle' | 'square' | 'diamond' | 'triangle';

  /** Z-index for layering */
  priority?: number;

  /** Connection line style */
  connectionStyle?: 'solid' | 'dashed' | 'dotted';
}
