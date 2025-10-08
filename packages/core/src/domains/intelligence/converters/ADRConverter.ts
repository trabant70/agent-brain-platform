/**
 * ADR to Canonical Event Converter
 * Converts ADRs to CanonicalEvents for timeline visualization
 */

import { CanonicalEvent, EventType, Author } from '../../events';
import { ADR } from '../../knowledge/adrs/types';

export class ADRConverter {
  /**
   * Convert an ADR to a CanonicalEvent
   */
  convertToEvent(adr: ADR): CanonicalEvent {
    const author: Author = {
      id: adr.author.email || adr.author.name,
      name: adr.author.name,
      email: adr.author.email
    };

    return {
      id: adr.id,
      canonicalId: `adr-system:${adr.id}`,
      providerId: 'adr-system',
      timestamp: adr.timestamp,
      type: EventType.ADR_RECORDED,

      title: `ADR-${String(adr.number).padStart(3, '0')}: ${adr.title}`,
      description: this.buildDescription(adr),

      author,

      branches: [], // ADRs are not branch-specific
      parentIds: adr.supersedes ? [adr.supersedes] : [],

      tags: adr.tags,

      metadata: {
        adrNumber: adr.number,
        status: adr.status,
        supersedes: adr.supersedes,
        supersededBy: adr.supersededBy,
        alternatives: adr.alternatives,
        decision: adr.decision,
        context: adr.context,
        consequences: adr.consequences,
        relatedFiles: adr.relatedFiles || [],
        codeSnippet: adr.codeSnippet
      }
    };
  }

  /**
   * Convert multiple ADRs to CanonicalEvents
   */
  convertToEvents(adrs: ADR[]): CanonicalEvent[] {
    return adrs.map(adr => this.convertToEvent(adr));
  }

  /**
   * Build human-readable description from ADR
   */
  private buildDescription(adr: ADR): string {
    const parts: string[] = [];

    parts.push(`**Status**: ${adr.status}`);
    parts.push(`**Decision**: ${adr.decision}`);

    if (adr.supersedes) {
      parts.push(`*Supersedes ${adr.supersedes}*`);
    }

    if (adr.supersededBy) {
      parts.push(`*Superseded by ${adr.supersededBy}*`);
    }

    return parts.join('\n\n');
  }

}
