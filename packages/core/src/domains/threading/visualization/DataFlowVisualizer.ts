/**
 * DataFlowVisualizer
 *
 * Generates visual representations of data flow:
 * - Interactive HTML visualization
 * - Timeline of execution events
 * - Data flow diagrams
 * - Violation highlighting
 * - Transformation display
 */

import { ExecutionTrace, DataFlowDiagram, DataFlowNode, DataFlowEdge, ContractViolation } from '../types';
import { ViolationRenderer } from './ViolationRenderer';

/**
 * Visualization options
 */
export interface VisualizationOptions {
  format?: 'text' | 'markdown' | 'html' | 'mermaid';
  includeTimeline?: boolean;
  includeViolations?: boolean;
  includeTransformations?: boolean;
  includeMutations?: boolean;
  theme?: 'light' | 'dark';
}

/**
 * Default options
 */
const DEFAULT_VISUALIZATION_OPTIONS: VisualizationOptions = {
  format: 'markdown',
  includeTimeline: true,
  includeViolations: true,
  includeTransformations: true,
  includeMutations: true,
  theme: 'light'
};

/**
 * DataFlowVisualizer
 */
export class DataFlowVisualizer {
  private violationRenderer: ViolationRenderer;

  constructor(violationRenderer?: ViolationRenderer) {
    this.violationRenderer = violationRenderer || new ViolationRenderer();
  }

  /**
   * Visualize execution trace
   */
  visualize(trace: ExecutionTrace, options?: VisualizationOptions): string {
    const opts = { ...DEFAULT_VISUALIZATION_OPTIONS, ...options };

    switch (opts.format) {
      case 'mermaid':
        return this.visualizeMermaid(trace, opts);
      case 'html':
        return this.visualizeHTML(trace, opts);
      case 'text':
        return this.visualizeText(trace, opts);
      default:
        return this.visualizeMarkdown(trace, opts);
    }
  }

  /**
   * Visualize as Markdown
   */
  private visualizeMarkdown(trace: ExecutionTrace, opts: VisualizationOptions): string {
    const parts: string[] = [];

    // Header
    parts.push(`# Execution Trace: ${trace.context}`);
    parts.push(`**Execution ID**: \`${trace.executionId}\``);
    parts.push('');

    // Timeline
    if (opts.includeTimeline) {
      parts.push('## Timeline');
      parts.push(this.renderTimelineMarkdown(trace));
      parts.push('');
    }

    // Data Flow
    if (trace.dataFlow) {
      parts.push('## Data Flow');
      parts.push(this.renderDataFlowMarkdown(trace.dataFlow));
      parts.push('');
    }

    // Transformations
    if (opts.includeTransformations && trace.transformations.length > 0) {
      parts.push('## Transformations');
      parts.push(this.renderTransformationsMarkdown(trace.transformations));
      parts.push('');
    }

    // Mutations
    if (opts.includeMutations && trace.mutations.length > 0) {
      parts.push('## Mutations');
      parts.push(this.renderMutationsMarkdown(trace.mutations));
      parts.push('');
    }

    // Violations
    if (opts.includeViolations && trace.violations.length > 0) {
      parts.push('## Contract Violations');
      parts.push(this.violationRenderer.renderAll(trace.violations, { format: 'markdown' }));
      parts.push('');
    }

    // Summary
    parts.push('## Summary');
    parts.push(this.renderSummaryMarkdown(trace));

    return parts.join('\n');
  }

  /**
   * Visualize as Mermaid diagram
   */
  private visualizeMermaid(trace: ExecutionTrace, opts: VisualizationOptions): string {
    if (!trace.dataFlow) {
      return '```mermaid\ngraph TD\n  NoDataFlow[No Data Flow Available]\n```';
    }

    const parts: string[] = [];
    parts.push('```mermaid');
    parts.push('graph TD');

    // Add nodes
    trace.dataFlow.nodes.forEach(node => {
      const nodeId = this.sanitizeMermaidId(node.id);
      const label = node.label.replace(/"/g, '\\"');
      const shape = this.getMermaidNodeShape(node.type);

      parts.push(`  ${nodeId}${shape[0]}"${label}"${shape[1]}`);
    });

    // Add edges
    trace.dataFlow.edges.forEach((edge, index) => {
      const fromId = this.sanitizeMermaidId(edge.from);
      const toId = this.sanitizeMermaidId(edge.to);
      const label = edge.label ? `|${edge.label}|` : '';

      parts.push(`  ${fromId} -->${label} ${toId}`);
    });

    // Add violation highlighting
    if (opts.includeViolations && trace.violations.length > 0) {
      parts.push('');
      parts.push('  %% Violations');
      trace.violations.forEach((v, index) => {
        const violationId = `violation${index}`;
        parts.push(`  ${violationId}["❌ ${v.message}"]`);
        parts.push(`  style ${violationId} fill:#fee,stroke:#f00`);
      });
    }

    parts.push('```');

    return parts.join('\n');
  }

  /**
   * Visualize as HTML
   */
  private visualizeHTML(trace: ExecutionTrace, opts: VisualizationOptions): string {
    const parts: string[] = [];

    parts.push('<div class="execution-trace">');

    // Header
    parts.push('<div class="trace-header">');
    parts.push(`<h2>Execution Trace: ${trace.context}</h2>`);
    parts.push(`<div class="execution-id">ID: <code>${trace.executionId}</code></div>`);
    parts.push('</div>');

    // Timeline
    if (opts.includeTimeline) {
      parts.push('<div class="trace-timeline">');
      parts.push('<h3>Timeline</h3>');
      parts.push(this.renderTimelineHTML(trace));
      parts.push('</div>');
    }

    // Data Flow
    if (trace.dataFlow) {
      parts.push('<div class="trace-dataflow">');
      parts.push('<h3>Data Flow</h3>');
      parts.push(this.renderDataFlowHTML(trace.dataFlow));
      parts.push('</div>');
    }

    // Violations
    if (opts.includeViolations && trace.violations.length > 0) {
      parts.push('<div class="trace-violations">');
      parts.push('<h3>Contract Violations</h3>');
      parts.push(this.violationRenderer.renderAll(trace.violations, { format: 'html' }));
      parts.push('</div>');
    }

    parts.push('</div>');

    return parts.join('\n');
  }

  /**
   * Visualize as text
   */
  private visualizeText(trace: ExecutionTrace, opts: VisualizationOptions): string {
    const parts: string[] = [];

    parts.push(`\n${'='.repeat(60)}`);
    parts.push(`EXECUTION TRACE: ${trace.context}`);
    parts.push(`${'='.repeat(60)}`);
    parts.push(`Execution ID: ${trace.executionId}`);
    parts.push(`${'='.repeat(60)}\n`);

    // Entry
    parts.push('ENTRY:');
    parts.push(`  Args: ${trace.entry.args.length} arguments`);
    parts.push(`  Timestamp: ${new Date(trace.entry.timestamp).toISOString()}`);
    parts.push('');

    // Exit or Error
    if (trace.exit) {
      parts.push('EXIT:');
      parts.push(`  Duration: ${trace.exit.duration}ms`);
      parts.push(`  Timestamp: ${new Date(trace.exit.timestamp).toISOString()}`);
      parts.push('');
    } else if (trace.error) {
      parts.push('ERROR:');
      parts.push(`  ${trace.error.error.name}: ${trace.error.error.message}`);
      parts.push('');
    }

    // Transformations
    if (opts.includeTransformations && trace.transformations.length > 0) {
      parts.push(`TRANSFORMATIONS: ${trace.transformations.length}`);
      trace.transformations.forEach((t, index) => {
        parts.push(`  ${index + 1}. ${t.from} → ${t.to}${t.transformType ? ` (${t.transformType})` : ''}`);
      });
      parts.push('');
    }

    // Mutations
    if (opts.includeMutations && trace.mutations.length > 0) {
      parts.push(`MUTATIONS: ${trace.mutations.length}`);
      trace.mutations.forEach((m, index) => {
        parts.push(`  ${index + 1}. ${m.mutationType}: ${m.path}`);
      });
      parts.push('');
    }

    // Violations
    if (opts.includeViolations && trace.violations.length > 0) {
      parts.push(`VIOLATIONS: ${trace.violations.length}`);
      parts.push(this.violationRenderer.renderAll(trace.violations, { format: 'text' }));
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Render timeline as Markdown
   */
  private renderTimelineMarkdown(trace: ExecutionTrace): string {
    const events: string[] = [];

    events.push(`1. **Entry** - ${new Date(trace.entry.timestamp).toISOString()}`);
    events.push(`   - Arguments: ${trace.entry.args.length}`);

    let eventIndex = 2;

    trace.transformations.forEach(t => {
      events.push(`${eventIndex}. **Transformation** - ${new Date(t.timestamp).toISOString()}`);
      events.push(`   - ${t.from} → ${t.to}${t.transformType ? ` (${t.transformType})` : ''}`);
      eventIndex++;
    });

    trace.mutations.forEach(m => {
      events.push(`${eventIndex}. **Mutation** - ${new Date(m.timestamp).toISOString()}`);
      events.push(`   - ${m.mutationType}: ${m.path}`);
      eventIndex++;
    });

    if (trace.exit) {
      events.push(`${eventIndex}. **Exit** - ${new Date(trace.exit.timestamp).toISOString()}`);
      events.push(`   - Duration: ${trace.exit.duration}ms`);
    } else if (trace.error) {
      events.push(`${eventIndex}. **Error** - ${new Date(trace.error.timestamp).toISOString()}`);
      events.push(`   - ${trace.error.error.name}: ${trace.error.error.message}`);
    }

    return events.join('\n');
  }

  /**
   * Render timeline as HTML
   */
  private renderTimelineHTML(trace: ExecutionTrace): string {
    let html = '<ol class="timeline">';

    html += `<li class="timeline-event entry">`;
    html += `<span class="event-type">Entry</span>`;
    html += `<span class="event-time">${new Date(trace.entry.timestamp).toISOString()}</span>`;
    html += `</li>`;

    trace.transformations.forEach(t => {
      html += `<li class="timeline-event transformation">`;
      html += `<span class="event-type">Transformation</span>`;
      html += `<span class="event-detail">${t.from} → ${t.to}</span>`;
      html += `</li>`;
    });

    trace.mutations.forEach(m => {
      html += `<li class="timeline-event mutation">`;
      html += `<span class="event-type">Mutation</span>`;
      html += `<span class="event-detail">${m.mutationType}: ${m.path}</span>`;
      html += `</li>`;
    });

    if (trace.exit) {
      html += `<li class="timeline-event exit">`;
      html += `<span class="event-type">Exit</span>`;
      html += `<span class="event-time">${trace.exit.duration}ms</span>`;
      html += `</li>`;
    }

    html += '</ol>';

    return html;
  }

  /**
   * Render data flow as Markdown
   */
  private renderDataFlowMarkdown(dataFlow: DataFlowDiagram): string {
    const parts: string[] = [];

    parts.push('### Nodes');
    dataFlow.nodes.forEach(node => {
      parts.push(`- **${node.label}** (${node.type})`);
    });

    parts.push('');
    parts.push('### Edges');
    dataFlow.edges.forEach(edge => {
      const fromNode = dataFlow.nodes.find(n => n.id === edge.from);
      const toNode = dataFlow.nodes.find(n => n.id === edge.to);
      const label = edge.label ? ` [${edge.label}]` : '';
      parts.push(`- ${fromNode?.label} → ${toNode?.label}${label}`);
    });

    return parts.join('\n');
  }

  /**
   * Render data flow as HTML
   */
  private renderDataFlowHTML(dataFlow: DataFlowDiagram): string {
    let html = '<div class="dataflow-diagram">';

    // Simple list representation (full D3 visualization would be more complex)
    html += '<div class="dataflow-nodes">';
    html += '<h4>Nodes</h4><ul>';
    dataFlow.nodes.forEach(node => {
      html += `<li class="node node-${node.type}">${node.label}</li>`;
    });
    html += '</ul></div>';

    html += '<div class="dataflow-edges">';
    html += '<h4>Edges</h4><ul>';
    dataFlow.edges.forEach(edge => {
      const fromNode = dataFlow.nodes.find(n => n.id === edge.from);
      const toNode = dataFlow.nodes.find(n => n.id === edge.to);
      html += `<li>${fromNode?.label} → ${toNode?.label}</li>`;
    });
    html += '</ul></div>';

    html += '</div>';

    return html;
  }

  /**
   * Render transformations as Markdown
   */
  private renderTransformationsMarkdown(transformations: any[]): string {
    const parts: string[] = [];

    transformations.forEach((t, index) => {
      parts.push(`${index + 1}. **${t.from}** → **${t.to}**`);
      if (t.transformType) {
        parts.push(`   - Type: ${t.transformType}`);
      }
      parts.push(`   - Before: \`${t.beforeValue.preview || 'N/A'}\``);
      parts.push(`   - After: \`${t.afterValue.preview || 'N/A'}\``);
    });

    return parts.join('\n');
  }

  /**
   * Render mutations as Markdown
   */
  private renderMutationsMarkdown(mutations: any[]): string {
    const parts: string[] = [];

    mutations.forEach((m, index) => {
      parts.push(`${index + 1}. **${m.mutationType}**: ${m.path}`);
      parts.push(`   - Before: \`${m.beforeValue.preview || 'N/A'}\``);
      parts.push(`   - After: \`${m.afterValue.preview || 'N/A'}\``);
    });

    return parts.join('\n');
  }

  /**
   * Render summary as Markdown
   */
  private renderSummaryMarkdown(trace: ExecutionTrace): string {
    const parts: string[] = [];

    parts.push(`- **Transformations**: ${trace.transformations.length}`);
    parts.push(`- **Mutations**: ${trace.mutations.length}`);
    parts.push(`- **Violations**: ${trace.violations.length}`);

    if (trace.exit) {
      parts.push(`- **Duration**: ${trace.exit.duration}ms`);
      parts.push(`- **Status**: ${trace.violations.length > 0 ? '❌ Failed' : '✅ Success'}`);
    } else if (trace.error) {
      parts.push(`- **Status**: ❌ Error`);
    }

    return parts.join('\n');
  }

  /**
   * Sanitize ID for Mermaid
   */
  private sanitizeMermaidId(id: string): string {
    return id.replace(/[^a-zA-Z0-9]/g, '_');
  }

  /**
   * Get Mermaid node shape
   */
  private getMermaidNodeShape(type: string): [string, string] {
    switch (type) {
      case 'input':
        return ['[', ']'];
      case 'output':
        return ['([', '])'];
      case 'transformation':
        return ['[[', ']]'];
      case 'validation':
        return ['{', '}'];
      case 'mutation':
        return ['[(', ')]'];
      default:
        return ['[', ']'];
    }
  }
}

/**
 * Global data flow visualizer instance
 */
let globalDataFlowVisualizer: DataFlowVisualizer | undefined;

/**
 * Get global data flow visualizer
 */
export function getGlobalDataFlowVisualizer(): DataFlowVisualizer {
  if (!globalDataFlowVisualizer) {
    globalDataFlowVisualizer = new DataFlowVisualizer();
  }
  return globalDataFlowVisualizer;
}

/**
 * Convenience function to visualize trace
 */
export function visualizeTrace(trace: ExecutionTrace, options?: VisualizationOptions): string {
  return getGlobalDataFlowVisualizer().visualize(trace, options);
}
