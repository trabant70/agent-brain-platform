/**
 * EventTypeDiscovery - Determines what event types are possible
 *
 * This is how we know to show chips for event types even when count is 0
 */

import { NormalizedEventType } from './interfaces';

export class EventTypeDiscovery {
    /**
     * Provider capabilities mapping
     * Defines what event types each provider CAN produce
     */
    private static readonly PROVIDER_CAPABILITIES = new Map<string, Set<NormalizedEventType>>([
        ['git-local', new Set([
            NormalizedEventType.COMMIT,
            NormalizedEventType.MERGE,
            NormalizedEventType.BRANCH_CREATED,
            NormalizedEventType.BRANCH_DELETED,
            NormalizedEventType.TAG_CREATED
        ])],
        ['github', new Set([
            NormalizedEventType.COMMIT,
            NormalizedEventType.MERGE,
            NormalizedEventType.BRANCH_CREATED,
            NormalizedEventType.BRANCH_DELETED,
            NormalizedEventType.TAG_CREATED,
            NormalizedEventType.PULL_REQUEST_OPENED,
            NormalizedEventType.PULL_REQUEST_MERGED,
            NormalizedEventType.PULL_REQUEST_CLOSED,
            NormalizedEventType.ISSUE_OPENED,
            NormalizedEventType.ISSUE_CLOSED,
            NormalizedEventType.RELEASE,
            NormalizedEventType.DEPLOYMENT
        ])],
        ['agent-brain', new Set([
            NormalizedEventType.REQUIREMENT_CREATED,
            NormalizedEventType.REQUIREMENT_UPDATED,
            NormalizedEventType.CUSTOM
        ])]
    ]);

    /**
     * Get all possible event types for connected providers
     */
    public getAllPossibleEventTypes(providerIds: string[]): string[] {
        const allTypes = new Set<string>();

        providerIds.forEach(providerId => {
            const capabilities = EventTypeDiscovery.PROVIDER_CAPABILITIES.get(providerId);
            if (capabilities) {
                capabilities.forEach(type => allTypes.add(type));
            }
        });

        // Convert enum values to strings and sort
        return Array.from(allTypes).sort();
    }

    /**
     * Check if a provider supports an event type
     */
    public providerSupportsEventType(providerId: string, eventType: NormalizedEventType): boolean {
        const capabilities = EventTypeDiscovery.PROVIDER_CAPABILITIES.get(providerId);
        return capabilities ? capabilities.has(eventType) : false;
    }

    /**
     * Get capabilities for a specific provider
     */
    public getProviderCapabilities(providerId: string): NormalizedEventType[] {
        const capabilities = EventTypeDiscovery.PROVIDER_CAPABILITIES.get(providerId);
        return capabilities ? Array.from(capabilities) : [];
    }
}
