/**
 * Canonical Event Factory
 * Generates realistic test data for CanonicalEvent objects
 */

import { CanonicalEvent, EventType, Author, ImpactMetrics, VisualizationHints } from '../../src/core/CanonicalEvent';
import { faker } from '@faker-js/faker';

export class CanonicalEventFactory {
  private static eventTypeWeights = {
    [EventType.COMMIT]: 70,
    [EventType.MERGE]: 15,
    [EventType.BRANCH_CREATED]: 5,
    [EventType.BRANCH_DELETED]: 3,
    [EventType.TAG_CREATED]: 4,
    [EventType.RELEASE]: 2,
    [EventType.DEPLOYMENT]: 1
  };

  /**
   * Create a single canonical event with optional overrides
   */
  static createEvent(overrides?: Partial<CanonicalEvent>): CanonicalEvent {
    const id = overrides?.id || faker.string.uuid();
    const providerId = overrides?.providerId || 'git-local';
    const type = overrides?.type || this.randomEventType();

    const event: CanonicalEvent = {
      id,
      canonicalId: `${providerId}:${id}`,
      providerId,
      type,
      timestamp: faker.date.recent({ days: 90 }),
      title: this.generateTitle(type),
      author: this.createAuthor(),
      branches: ['main'],
      parentIds: [],
      ...overrides
    };

    return event;
  }

  /**
   * Create multiple events
   */
  static createEvents(count: number, overrides?: Partial<CanonicalEvent>): CanonicalEvent[] {
    return Array.from({ length: count }, () => this.createEvent(overrides));
  }

  /**
   * Create an event that appears on multiple branches
   */
  static createEventWithBranches(branches: string[], overrides?: Partial<CanonicalEvent>): CanonicalEvent {
    return this.createEvent({
      branches,
      primaryBranch: branches[0],
      ...overrides
    });
  }

  /**
   * Create a merge event with parent references
   */
  static createMergeEvent(parentIds: string[], overrides?: Partial<CanonicalEvent>): CanonicalEvent {
    return this.createEvent({
      type: EventType.MERGE,
      parentIds,
      title: `Merge branch '${faker.git.branch()}' into '${faker.git.branch()}'`,
      ...overrides
    });
  }

  /**
   * Create a commit event with impact metrics
   */
  static createCommitWithImpact(impact?: Partial<ImpactMetrics>, overrides?: Partial<CanonicalEvent>): CanonicalEvent {
    const defaultImpact: ImpactMetrics = {
      filesChanged: faker.number.int({ min: 1, max: 20 }),
      linesAdded: faker.number.int({ min: 1, max: 200 }),
      linesRemoved: faker.number.int({ min: 0, max: 100 }),
      impactScore: faker.number.int({ min: 1, max: 100 }),
      ...impact
    };

    return this.createEvent({
      type: EventType.COMMIT,
      impact: defaultImpact,
      ...overrides
    });
  }

  /**
   * Create a branch creation event
   */
  static createBranchCreatedEvent(branchName: string, overrides?: Partial<CanonicalEvent>): CanonicalEvent {
    return this.createEvent({
      type: EventType.BRANCH_CREATED,
      title: `Created branch ${branchName}`,
      branches: [branchName],
      primaryBranch: branchName,
      ...overrides
    });
  }

  /**
   * Create a tag/release event
   */
  static createReleaseEvent(tagName: string, overrides?: Partial<CanonicalEvent>): CanonicalEvent {
    return this.createEvent({
      type: EventType.RELEASE,
      title: `Release ${tagName}`,
      tags: [tagName],
      ...overrides
    });
  }

  /**
   * Create an author object
   */
  static createAuthor(overrides?: Partial<Author>): Author {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const name = `${firstName} ${lastName}`;
    const email = faker.internet.email({ firstName, lastName });

    return {
      id: email,
      name,
      email,
      username: faker.internet.userName({ firstName, lastName }),
      ...overrides
    };
  }

  /**
   * Create multiple unique authors
   */
  static createAuthors(count: number): Author[] {
    return Array.from({ length: count }, () => this.createAuthor());
  }

  /**
   * Create a timeline of events with realistic relationships
   */
  static createTimeline(options: {
    eventCount: number;
    branches?: string[];
    authors?: Author[];
    dateRange?: [Date, Date];
  }): CanonicalEvent[] {
    const { eventCount, branches = ['main'], authors = this.createAuthors(3), dateRange } = options;

    const events: CanonicalEvent[] = [];
    const [startDate, endDate] = dateRange || [
      faker.date.past({ years: 1 }),
      new Date()
    ];

    for (let i = 0; i < eventCount; i++) {
      const timestamp = new Date(
        startDate.getTime() + (endDate.getTime() - startDate.getTime()) * (i / eventCount)
      );

      const event = this.createEvent({
        timestamp,
        author: faker.helpers.arrayElement(authors),
        branches: [faker.helpers.arrayElement(branches)],
        parentIds: i > 0 ? [events[i - 1].id] : []
      });

      events.push(event);
    }

    return events;
  }

  /**
   * Create a repository-like event collection with branches, merges, and tags
   */
  static createRepository(options: {
    commitCount?: number;
    branchCount?: number;
    authorCount?: number;
    mergeCount?: number;
    tagCount?: number;
  } = {}): CanonicalEvent[] {
    const {
      commitCount = 50,
      branchCount = 3,
      authorCount = 4,
      mergeCount = 5,
      tagCount = 3
    } = options;

    const events: CanonicalEvent[] = [];
    const branches = Array.from({ length: branchCount }, (_, i) =>
      i === 0 ? 'main' : faker.git.branch()
    );
    const authors = this.createAuthors(authorCount);

    // Create main timeline
    const mainEvents = this.createTimeline({
      eventCount: commitCount,
      branches: ['main'],
      authors
    });
    events.push(...mainEvents);

    // Create branch events
    for (let i = 1; i < branchCount; i++) {
      const branchName = branches[i];
      const branchPoint = faker.helpers.arrayElement(mainEvents);

      // Branch creation event
      events.push(this.createBranchCreatedEvent(branchName, {
        timestamp: branchPoint.timestamp,
        parentIds: [branchPoint.id]
      }));

      // Branch commits
      const branchCommits = this.createTimeline({
        eventCount: faker.number.int({ min: 3, max: 10 }),
        branches: [branchName],
        authors,
        dateRange: [branchPoint.timestamp, new Date()]
      });
      events.push(...branchCommits);
    }

    // Create merge events
    for (let i = 0; i < mergeCount; i++) {
      const sourceBranch = faker.helpers.arrayElement(branches.slice(1));
      const targetBranch = 'main';
      const sourceEvents = events.filter(e => e.branches.includes(sourceBranch));
      const targetEvents = events.filter(e => e.branches.includes(targetBranch));

      if (sourceEvents.length > 0 && targetEvents.length > 0) {
        const mergeEvent = this.createMergeEvent(
          [
            faker.helpers.arrayElement(sourceEvents).id,
            faker.helpers.arrayElement(targetEvents).id
          ],
          {
            branches: [targetBranch],
            timestamp: new Date()
          }
        );
        events.push(mergeEvent);
      }
    }

    // Create tag/release events
    for (let i = 0; i < tagCount; i++) {
      const tagEvent = this.createReleaseEvent(`v${i + 1}.0.0`, {
        timestamp: faker.date.recent({ days: 30 }),
        parentIds: [faker.helpers.arrayElement(mainEvents).id]
      });
      events.push(tagEvent);
    }

    // Sort by timestamp
    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Create visualization hints
   */
  static createVisualizationHints(overrides?: Partial<VisualizationHints>): VisualizationHints {
    return {
      color: faker.color.rgb(),
      shape: faker.helpers.arrayElement(['circle', 'square', 'diamond', 'triangle'] as const),
      size: faker.helpers.arrayElement(['small', 'medium', 'large'] as const),
      priority: faker.number.int({ min: 0, max: 10 }),
      ...overrides
    };
  }

  // Private helper methods

  private static randomEventType(): EventType {
    const types = Object.keys(this.eventTypeWeights) as EventType[];
    const weights = Object.values(this.eventTypeWeights);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const random = faker.number.int({ min: 0, max: totalWeight });

    let cumulativeWeight = 0;
    for (let i = 0; i < types.length; i++) {
      cumulativeWeight += weights[i];
      if (random < cumulativeWeight) {
        return types[i];
      }
    }

    return EventType.COMMIT;
  }

  private static generateTitle(type: EventType): string {
    switch (type) {
      case EventType.COMMIT:
        return faker.git.commitMessage();
      case EventType.MERGE:
        return `Merge branch '${faker.git.branch()}' into '${faker.git.branch()}'`;
      case EventType.BRANCH_CREATED:
        return `Created branch ${faker.git.branch()}`;
      case EventType.BRANCH_DELETED:
        return `Deleted branch ${faker.git.branch()}`;
      case EventType.TAG_CREATED:
        return `Created tag ${faker.system.semver()}`;
      case EventType.RELEASE:
        return `Release ${faker.system.semver()}`;
      case EventType.DEPLOYMENT:
        return `Deployed to ${faker.helpers.arrayElement(['production', 'staging', 'development'])}`;
      default:
        return faker.lorem.sentence();
    }
  }
}

/**
 * Quick access helpers
 */
export const createEvent = CanonicalEventFactory.createEvent.bind(CanonicalEventFactory);
export const createEvents = CanonicalEventFactory.createEvents.bind(CanonicalEventFactory);
export const createAuthor = CanonicalEventFactory.createAuthor.bind(CanonicalEventFactory);
export const createTimeline = CanonicalEventFactory.createTimeline.bind(CanonicalEventFactory);
export const createRepository = CanonicalEventFactory.createRepository.bind(CanonicalEventFactory);
