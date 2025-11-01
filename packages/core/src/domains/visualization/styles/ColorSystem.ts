/**
 * Unified Color System
 * Provides consistent color palette across all visualizations
 *
 * Purpose:
 * - Standardize severity, status, and category colors
 * - Ensure visual consistency throughout the extension
 * - Support accessibility (WCAG AA compliant)
 * - Enable theme-aware coloring (VSCode dark/light themes)
 */

/**
 * Severity Color Palette
 * Used for issue severity indicators
 */
export const SEVERITY_COLORS = {
  critical: '#dc2626',  // red-600 (danger)
  high: '#ea580c',      // orange-600 (warning)
  medium: '#f59e0b',    // amber-500 (caution)
  low: '#65a30d',       // lime-600 (info)
  info: '#0284c7'       // sky-600 (neutral)
} as const;

/**
 * Status/Quality Color Palette
 * Used for score indicators, quality metrics
 */
export const STATUS_COLORS = {
  excellent: '#16a34a', // green-600 (90-100)
  good: '#65a30d',      // lime-600 (70-89)
  warning: '#f59e0b',   // amber-500 (50-69)
  poor: '#ea580c',      // orange-600 (30-49)
  critical: '#dc2626'   // red-600 (0-29)
} as const;

/**
 * Category Color Palette
 * 20-color palette for consistent category assignment
 * Based on D3's category schemes with enhanced contrast
 */
export const CATEGORY_COLORS = [
  '#1f77b4', // blue
  '#ff7f0e', // orange
  '#2ca02c', // green
  '#d62728', // red
  '#9467bd', // purple
  '#8c564b', // brown
  '#e377c2', // pink
  '#7f7f7f', // gray
  '#bcbd22', // olive
  '#17becf', // cyan
  '#aec7e8', // light blue
  '#ffbb78', // light orange
  '#98df8a', // light green
  '#ff9896', // light red
  '#c5b0d5', // light purple
  '#c49c94', // light brown
  '#f7b6d2', // light pink
  '#c7c7c7', // light gray
  '#dbdb8d', // light olive
  '#9edae5'  // light cyan
] as const;

/**
 * Neutral Colors
 * For backgrounds, borders, text
 */
export const NEUTRAL_COLORS = {
  text: {
    primary: 'var(--vscode-foreground)',
    secondary: 'var(--vscode-descriptionForeground)',
    disabled: 'var(--vscode-disabledForeground)'
  },
  background: {
    primary: 'var(--vscode-editor-background)',
    secondary: 'var(--vscode-sideBar-background)',
    hover: 'var(--vscode-list-hoverBackground)',
    active: 'var(--vscode-list-activeSelectionBackground)'
  },
  border: {
    default: 'var(--vscode-panel-border)',
    focus: 'var(--vscode-focusBorder)',
    active: 'var(--vscode-list-activeSelectionForeground)'
  }
} as const;

/**
 * Get severity color
 */
export function getSeverityColor(severity: string): string {
  const normalized = severity.toLowerCase();
  return SEVERITY_COLORS[normalized as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.medium;
}

/**
 * Get status color based on score
 * @param score - Score value (0-100)
 */
export function getStatusColorByScore(score: number): string {
  if (score >= 90) return STATUS_COLORS.excellent;
  if (score >= 70) return STATUS_COLORS.good;
  if (score >= 50) return STATUS_COLORS.warning;
  if (score >= 30) return STATUS_COLORS.poor;
  return STATUS_COLORS.critical;
}

/**
 * Get status color by name
 */
export function getStatusColor(status: string): string {
  const normalized = status.toLowerCase();
  return STATUS_COLORS[normalized as keyof typeof STATUS_COLORS] || STATUS_COLORS.warning;
}

/**
 * Get consistent category color
 * Uses simple hash function for stable color assignment
 */
export function getCategoryColor(categoryId: string): string {
  const hash = simpleHash(categoryId);
  const index = hash % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[index];
}

/**
 * Simple string hash function for consistent color assignment
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Get D3-compatible color scale for categories
 * Returns a function that maps category IDs to colors
 */
export function getCategoryColorScale() {
  const colorMap = new Map<string, string>();

  return (categoryId: string): string => {
    if (!colorMap.has(categoryId)) {
      colorMap.set(categoryId, getCategoryColor(categoryId));
    }
    return colorMap.get(categoryId)!;
  };
}

/**
 * Get color for file type
 */
export function getFileTypeColor(fileType: string): string {
  const typeColors: Record<string, string> = {
    component: '#1f77b4',  // blue
    service: '#2ca02c',    // green
    utility: '#ff7f0e',    // orange
    config: '#9467bd',     // purple
    test: '#d62728',       // red
    other: '#7f7f7f'       // gray
  };

  return typeColors[fileType] || typeColors.other;
}

/**
 * Get opacity for severity
 * Used in visualizations to show intensity
 */
export function getSeverityOpacity(severity: string): number {
  const opacityMap: Record<string, number> = {
    critical: 1.0,
    high: 0.8,
    medium: 0.6,
    low: 0.4,
    info: 0.3
  };

  return opacityMap[severity.toLowerCase()] || 0.5;
}

/**
 * Create color gradient
 * @param start - Start color
 * @param end - End color
 * @param steps - Number of steps in gradient
 */
export function createGradient(start: string, end: string, steps: number): string[] {
  // This is a simplified version - in production, use a proper color interpolation library
  const gradient: string[] = [];
  for (let i = 0; i < steps; i++) {
    // For now, just return variations of the colors
    // TODO: Implement proper RGB interpolation
    gradient.push(i < steps / 2 ? start : end);
  }
  return gradient;
}

/**
 * Export unified color system object
 */
export const ColorSystem = {
  severity: SEVERITY_COLORS,
  status: STATUS_COLORS,
  category: CATEGORY_COLORS,
  neutral: NEUTRAL_COLORS,
  getSeverityColor,
  getStatusColor,
  getStatusColorByScore,
  getCategoryColor,
  getCategoryColorScale,
  getFileTypeColor,
  getSeverityOpacity,
  createGradient
} as const;

/**
 * CSS Custom Properties
 * Can be injected into the document for use in CSS
 */
export function injectColorSystemCSS(): void {
  const style = document.createElement('style');
  style.id = 'color-system-vars';

  // Remove existing if present
  const existing = document.getElementById('color-system-vars');
  if (existing) {
    existing.remove();
  }

  style.textContent = `
    :root {
      /* Severity Colors */
      --severity-critical: ${SEVERITY_COLORS.critical};
      --severity-high: ${SEVERITY_COLORS.high};
      --severity-medium: ${SEVERITY_COLORS.medium};
      --severity-low: ${SEVERITY_COLORS.low};
      --severity-info: ${SEVERITY_COLORS.info};

      /* Status Colors */
      --status-excellent: ${STATUS_COLORS.excellent};
      --status-good: ${STATUS_COLORS.good};
      --status-warning: ${STATUS_COLORS.warning};
      --status-poor: ${STATUS_COLORS.poor};
      --status-critical: ${STATUS_COLORS.critical};
    }
  `;

  document.head.appendChild(style);
}

export default ColorSystem;
