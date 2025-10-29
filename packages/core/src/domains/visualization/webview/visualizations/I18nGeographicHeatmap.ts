/**
 * I18n Geographic Heatmap
 * World map showing translation coverage by locale/region
 *
 * Purpose: Visualize internationalization coverage across regions
 * Technique: D3 geographic projection with choropleth coloring
 */

import { BaseVisualization, VisualizationConfig } from './BaseVisualization';

export interface LocaleCoverage {
  locale: string;              // e.g., 'en-US', 'fr-FR', 'de-DE'
  language: string;            // e.g., 'English', 'French', 'German'
  region: string;              // e.g., 'United States', 'France', 'Germany'
  countryCode: string;         // ISO 3166-1 alpha-2 code (e.g., 'US', 'FR', 'DE')
  totalKeys: number;           // Total translation keys
  translatedKeys: number;      // Number of translated keys
  coverage: number;            // Percentage (0-100)
  missingKeys: string[];       // List of missing translation keys
}

export interface I18nGeographicData {
  locales: LocaleCoverage[];
  defaultLocale: string;
  totalKeys: number;
  averageCoverage: number;
}

export class I18nGeographicHeatmap extends BaseVisualization {
  private selectedLocale: LocaleCoverage | null = null;

  constructor(container: HTMLElement, config: VisualizationConfig = {}) {
    super(container, config);
  }

  /**
   * Render geographic heatmap
   */
  protected async renderContent(): Promise<void> {
    const d3 = (window as any).d3;
    if (!this.svg) return;

    const data: I18nGeographicData = this.data;
    const width = this.getContentWidth();
    const height = this.getContentHeight();

    // Add controls
    this.addControls(data);

    // Create projection - using natural earth for better world view
    const projection = d3.geoNaturalEarth1()
      .translate([width / 2, height / 2])
      .scale(width / 6);

    const path = d3.geoPath().projection(projection);

    const g = this.svg!.select('.visualization-content');

    // Create country code to coverage map
    const coverageMap = new Map<string, LocaleCoverage>();
    data.locales.forEach(locale => {
      coverageMap.set(locale.countryCode.toUpperCase(), locale);
    });

    // Simplified world map data (we'll use a basic representation)
    const countries = this.getSimplifiedWorldData();

    // Color scale for coverage
    const colorScale = d3.scaleSequential()
      .domain([0, 100])
      .interpolator(d3.interpolateRgb('#ef4444', '#10b981'));

    // Draw countries
    const countryPaths = g.append('g')
      .attr('class', 'countries')
      .selectAll('path')
      .data(countries)
      .join('path')
      .attr('d', (d: any) => path(d))
      .attr('fill', (d: any) => {
        const coverage = coverageMap.get(d.id);
        if (!coverage) {
          return 'var(--vscode-input-background)';
        }
        return colorScale(coverage.coverage);
      })
      .attr('stroke', 'var(--vscode-panel-border)')
      .attr('stroke-width', 0.5)
      .attr('opacity', (d: any) => coverageMap.has(d.id) ? 1 : 0.3)
      .style('cursor', (d: any) => coverageMap.has(d.id) ? 'pointer' : 'default')
      .on('mouseenter', (event: MouseEvent, d: any) => {
        const coverage = coverageMap.get(d.id);
        if (coverage) {
          this.showCountryTooltip(event, coverage);
          this.highlightCountry(d, countryPaths);
        }
      })
      .on('mouseleave', () => {
        this.hideTooltip();
        this.clearHighlight(countryPaths);
      })
      .on('click', (_event: MouseEvent, d: any) => {
        const coverage = coverageMap.get(d.id);
        if (coverage) {
          this.handleCountryClick(coverage);
        }
      });

    // Add legend
    this.addLegend(g, colorScale, width, height);

    // Add locale labels for countries with translations
    this.addLocaleLabels(g, data.locales, projection);

    // Add statistics panel
    this.addStatisticsPanel(data);
  }

  /**
   * Get simplified world map data
   * In a real implementation, this would load GeoJSON from a file
   */
  private getSimplifiedWorldData(): any[] {
    // This is a simplified representation. In production, you'd load actual GeoJSON.
    // For now, we'll create approximate country boundaries for major regions
    const countries = [
      // North America
      { id: 'US', name: 'United States', coordinates: [[-125, 50], [-125, 25], [-65, 25], [-65, 50], [-125, 50]] },
      { id: 'CA', name: 'Canada', coordinates: [[-140, 70], [-140, 45], [-50, 45], [-50, 70], [-140, 70]] },
      { id: 'MX', name: 'Mexico', coordinates: [[-120, 32], [-120, 14], [-86, 14], [-86, 32], [-120, 32]] },

      // South America
      { id: 'BR', name: 'Brazil', coordinates: [[-74, 5], [-74, -34], [-34, -34], [-34, 5], [-74, 5]] },
      { id: 'AR', name: 'Argentina', coordinates: [[-73, -22], [-73, -55], [-53, -55], [-53, -22], [-73, -22]] },

      // Europe
      { id: 'GB', name: 'United Kingdom', coordinates: [[-8, 59], [-8, 50], [2, 50], [2, 59], [-8, 59]] },
      { id: 'FR', name: 'France', coordinates: [[-5, 51], [-5, 42], [9, 42], [9, 51], [-5, 51]] },
      { id: 'DE', name: 'Germany', coordinates: [[6, 55], [6, 47], [15, 47], [15, 55], [6, 55]] },
      { id: 'ES', name: 'Spain', coordinates: [[-10, 44], [-10, 36], [4, 36], [4, 44], [-10, 44]] },
      { id: 'IT', name: 'Italy', coordinates: [[7, 47], [7, 37], [19, 37], [19, 47], [7, 47]] },
      { id: 'PL', name: 'Poland', coordinates: [[14, 55], [14, 49], [24, 49], [24, 55], [14, 55]] },
      { id: 'SE', name: 'Sweden', coordinates: [[11, 69], [11, 55], [24, 55], [24, 69], [11, 69]] },
      { id: 'NL', name: 'Netherlands', coordinates: [[3, 54], [3, 51], [7, 51], [7, 54], [3, 54]] },

      // Asia
      { id: 'CN', name: 'China', coordinates: [[73, 54], [73, 18], [135, 18], [135, 54], [73, 54]] },
      { id: 'JP', name: 'Japan', coordinates: [[130, 46], [130, 30], [146, 30], [146, 46], [130, 46]] },
      { id: 'KR', name: 'South Korea', coordinates: [[126, 39], [126, 33], [131, 33], [131, 39], [126, 39]] },
      { id: 'IN', name: 'India', coordinates: [[68, 36], [68, 7], [97, 7], [97, 36], [68, 36]] },
      { id: 'ID', name: 'Indonesia', coordinates: [[95, 6], [95, -11], [141, -11], [141, 6], [95, 6]] },
      { id: 'TH', name: 'Thailand', coordinates: [[97, 21], [97, 6], [106, 6], [106, 21], [97, 21]] },
      { id: 'VN', name: 'Vietnam', coordinates: [[102, 24], [102, 8], [110, 8], [110, 24], [102, 24]] },

      // Middle East
      { id: 'TR', name: 'Turkey', coordinates: [[26, 42], [26, 36], [45, 36], [45, 42], [26, 42]] },
      { id: 'SA', name: 'Saudi Arabia', coordinates: [[34, 32], [34, 16], [56, 16], [56, 32], [34, 32]] },
      { id: 'IL', name: 'Israel', coordinates: [[34, 34], [34, 29], [36, 29], [36, 34], [34, 34]] },

      // Africa
      { id: 'ZA', name: 'South Africa', coordinates: [[16, -22], [16, -35], [33, -35], [33, -22], [16, -22]] },
      { id: 'EG', name: 'Egypt', coordinates: [[25, 32], [25, 22], [37, 22], [37, 32], [25, 32]] },
      { id: 'NG', name: 'Nigeria', coordinates: [[3, 14], [3, 4], [15, 4], [15, 14], [3, 14]] },

      // Oceania
      { id: 'AU', name: 'Australia', coordinates: [[113, -10], [113, -44], [154, -44], [154, -10], [113, -10]] },
      { id: 'NZ', name: 'New Zealand', coordinates: [[166, -34], [166, -47], [179, -47], [179, -34], [166, -34]] },
    ];

    // Convert to GeoJSON format
    return countries.map(country => ({
      type: 'Feature',
      id: country.id,
      properties: { name: country.name },
      geometry: {
        type: 'Polygon',
        coordinates: [country.coordinates]
      }
    }));
  }

  /**
   * Add control panel
   */
  private addControls(data: I18nGeographicData): void {
    const controls = document.createElement('div');
    controls.className = 'visualization-controls';
    controls.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 10;
    `;

    // Coverage threshold selector
    const label = document.createElement('div');
    label.textContent = 'Coverage Threshold:';
    label.style.cssText = `
      font-size: 11px;
      color: var(--vscode-foreground);
      margin-bottom: 4px;
    `;

    const select = document.createElement('select');
    select.style.cssText = `
      padding: 4px 8px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
    `;

    const thresholds = [
      { value: 0, label: 'All Locales' },
      { value: 50, label: '50%+' },
      { value: 75, label: '75%+' },
      { value: 90, label: '90%+' },
      { value: 100, label: '100% Only' }
    ];

    thresholds.forEach(threshold => {
      const option = document.createElement('option');
      option.value = threshold.value.toString();
      option.textContent = threshold.label;
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      const threshold = parseInt((e.target as HTMLSelectElement).value);
      this.filterByThreshold(threshold, data);
    });

    controls.appendChild(label);
    controls.appendChild(select);

    this.container.style.position = 'relative';
    this.container.appendChild(controls);
  }

  /**
   * Add legend
   */
  private addLegend(g: any, colorScale: any, width: number, height: number): void {
    const legendWidth = 200;
    const legendHeight = 20;
    const legendX = width - legendWidth - 20;
    const legendY = height - 50;

    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${legendX},${legendY})`);

    // Gradient
    const defs = g.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'coverage-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#ef4444');

    gradient.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', '#f59e0b');

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#10b981');

    // Legend rect
    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', 'url(#coverage-gradient)')
      .attr('stroke', 'var(--vscode-panel-border)');

    // Legend labels
    legend.append('text')
      .attr('x', 0)
      .attr('y', legendHeight + 15)
      .attr('text-anchor', 'start')
      .style('font-size', '11px')
      .style('fill', 'var(--vscode-foreground)')
      .text('0%');

    legend.append('text')
      .attr('x', legendWidth / 2)
      .attr('y', legendHeight + 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', 'var(--vscode-foreground)')
      .text('Coverage');

    legend.append('text')
      .attr('x', legendWidth)
      .attr('y', legendHeight + 15)
      .attr('text-anchor', 'end')
      .style('font-size', '11px')
      .style('fill', 'var(--vscode-foreground)')
      .text('100%');
  }

  /**
   * Add locale labels on map
   */
  private addLocaleLabels(g: any, locales: LocaleCoverage[], projection: any): void {
    // Only show labels for locales with good coverage
    const labeledLocales = locales.filter(l => l.coverage >= 75);

    const labels = g.append('g')
      .attr('class', 'locale-labels')
      .selectAll('text')
      .data(labeledLocales)
      .join('text')
      .attr('transform', (d: LocaleCoverage) => {
        // Approximate country center coordinates
        const coords = this.getCountryCenter(d.countryCode);
        const projected = projection(coords);
        return projected ? `translate(${projected[0]},${projected[1]})` : '';
      })
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('fill', 'var(--vscode-foreground)')
      .style('pointer-events', 'none')
      .text((d: LocaleCoverage) => `${d.locale} (${d.coverage.toFixed(0)}%)`);
  }

  /**
   * Get approximate country center
   */
  private getCountryCenter(countryCode: string): [number, number] {
    const centers: Record<string, [number, number]> = {
      'US': [-95, 37],
      'CA': [-95, 60],
      'MX': [-103, 23],
      'BR': [-54, -15],
      'AR': [-63, -38],
      'GB': [-3, 54],
      'FR': [2, 47],
      'DE': [10, 51],
      'ES': [-3, 40],
      'IT': [13, 42],
      'PL': [19, 52],
      'SE': [17, 62],
      'NL': [5, 52],
      'CN': [104, 36],
      'JP': [138, 38],
      'KR': [128, 36],
      'IN': [82, 22],
      'ID': [118, -2],
      'TH': [101, 14],
      'VN': [106, 16],
      'TR': [35, 39],
      'SA': [45, 24],
      'IL': [35, 32],
      'ZA': [25, -29],
      'EG': [31, 27],
      'NG': [9, 9],
      'AU': [133, -27],
      'NZ': [174, -41]
    };

    return centers[countryCode] || [0, 0];
  }

  /**
   * Add statistics panel
   */
  private addStatisticsPanel(data: I18nGeographicData): void {
    const panel = document.createElement('div');
    panel.className = 'i18n-stats-panel';
    panel.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      padding: 12px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      font-size: 11px;
      max-width: 250px;
      z-index: 10;
    `;

    const highCoverage = data.locales.filter(l => l.coverage >= 90).length;
    const mediumCoverage = data.locales.filter(l => l.coverage >= 50 && l.coverage < 90).length;
    const lowCoverage = data.locales.filter(l => l.coverage < 50).length;

    panel.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">Translation Statistics</div>
      <div style="margin-bottom: 4px;">Total Keys: <strong>${data.totalKeys}</strong></div>
      <div style="margin-bottom: 4px;">Locales: <strong>${data.locales.length}</strong></div>
      <div style="margin-bottom: 4px;">Avg Coverage: <strong>${data.averageCoverage.toFixed(1)}%</strong></div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--vscode-panel-border);">
        <div style="margin-bottom: 4px; color: #10b981;">High (90%+): <strong>${highCoverage}</strong></div>
        <div style="margin-bottom: 4px; color: #f59e0b;">Medium (50-90%): <strong>${mediumCoverage}</strong></div>
        <div style="color: #ef4444;">Low (<50%): <strong>${lowCoverage}</strong></div>
      </div>
    `;

    this.container.appendChild(panel);
  }

  /**
   * Filter countries by coverage threshold
   */
  private filterByThreshold(threshold: number, data: I18nGeographicData): void {
    if (!this.svg) return;

    const filteredLocales = new Set(
      data.locales
        .filter(l => l.coverage >= threshold)
        .map(l => l.countryCode.toUpperCase())
    );

    this.svg.selectAll('.countries path')
      .attr('opacity', (d: any) => {
        if (threshold === 0) return filteredLocales.has(d.id) || !filteredLocales.size ? 1 : 0.3;
        return filteredLocales.has(d.id) ? 1 : 0.1;
      });
  }

  /**
   * Highlight country
   */
  private highlightCountry(country: any, paths: any): void {
    paths.attr('opacity', (d: any) => d.id === country.id ? 1 : 0.3);
    paths.filter((d: any) => d.id === country.id)
      .attr('stroke-width', 2);
  }

  /**
   * Clear highlight
   */
  private clearHighlight(paths: any): void {
    paths.attr('opacity', (d: any, i: number, nodes: any[]) => {
      const originalOpacity = (nodes[i] as any).__originalOpacity || 1;
      return originalOpacity;
    });
    paths.attr('stroke-width', 0.5);
  }

  /**
   * Show country tooltip
   */
  private showCountryTooltip(event: MouseEvent, coverage: LocaleCoverage): void {
    const tooltip = this.getOrCreateTooltip();

    tooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        ${coverage.region}
      </div>
      <div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 8px;">
        ${coverage.language} (${coverage.locale})
      </div>
      <div style="margin-bottom: 4px;">
        Coverage: <strong style="color: ${this.getCoverageColor(coverage.coverage)}">${coverage.coverage.toFixed(1)}%</strong>
      </div>
      <div style="margin-bottom: 4px;">
        Translated: <strong>${coverage.translatedKeys}/${coverage.totalKeys}</strong> keys
      </div>
      ${coverage.missingKeys.length > 0 ? `
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--vscode-panel-border);">
          Missing: <strong>${coverage.missingKeys.length}</strong> keys
        </div>
      ` : ''}
      <div style="margin-top: 8px; font-size: 11px; color: var(--vscode-descriptionForeground);">
        Click for details
      </div>
    `;

    tooltip.style.display = 'block';
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;

    this.adjustTooltipPosition(tooltip);
  }

  /**
   * Get coverage color
   */
  private getCoverageColor(coverage: number): string {
    if (coverage >= 90) return '#10b981';
    if (coverage >= 75) return '#84cc16';
    if (coverage >= 50) return '#f59e0b';
    return '#ef4444';
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    const tooltip = document.getElementById('i18n-geo-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  /**
   * Get or create tooltip
   */
  private getOrCreateTooltip(): HTMLElement {
    let tooltip = document.getElementById('i18n-geo-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'i18n-geo-tooltip';
      tooltip.style.cssText = `
        position: fixed;
        max-width: 300px;
        padding: 12px;
        background: var(--vscode-editorHoverWidget-background);
        border: 1px solid var(--vscode-editorHoverWidget-border);
        border-radius: 4px;
        font-size: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        pointer-events: none;
        display: none;
      `;
      document.body.appendChild(tooltip);
    }
    return tooltip;
  }

  /**
   * Adjust tooltip position if off screen
   */
  private adjustTooltipPosition(tooltip: HTMLElement): void {
    setTimeout(() => {
      const rect = tooltip.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        tooltip.style.left = `${window.innerWidth - rect.width - 10}px`;
      }
      if (rect.bottom > window.innerHeight) {
        tooltip.style.top = `${window.innerHeight - rect.height - 10}px`;
      }
    }, 0);
  }

  /**
   * Handle country click
   */
  private handleCountryClick(coverage: LocaleCoverage): void {
    this.selectedLocale = coverage;

    window.dispatchEvent(new CustomEvent('i18n-locale-click', {
      detail: {
        locale: coverage.locale,
        language: coverage.language,
        region: coverage.region,
        coverage: coverage.coverage,
        missingKeys: coverage.missingKeys
      }
    }));
  }

  /**
   * Clean up
   */
  override destroy(): void {
    const tooltip = document.getElementById('i18n-geo-tooltip');
    if (tooltip) {
      tooltip.remove();
    }

    const controls = this.container.querySelector('.visualization-controls');
    if (controls) {
      controls.remove();
    }

    const statsPanel = this.container.querySelector('.i18n-stats-panel');
    if (statsPanel) {
      statsPanel.remove();
    }

    super.destroy();
  }
}
