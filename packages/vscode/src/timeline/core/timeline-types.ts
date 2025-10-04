export type EventType = 'commit' | 'release' | 'branch' | 'pr' | 'issue' | 'ci' | 'fork' | 'star' | 'review' | 'security' | 'deployment' | 'discussion';
export type ViewMode = 'merged' | 'by-branch' | 'by-pattern' | 'by-type' | 'hybrid' | 'by-activity';

export interface TimelineEvent {
    id: string;
    timestamp: string;
    type: EventType;
    severity: 'info' | 'warning' | 'error';
    title: string;
    description: string;
    branch: string;
    branches?: string[]; // Multi-branch metadata: all branches containing this commit
    author: string;
    impact: number;
    filesChanged?: number;
    linesAdded?: number;
    linesRemoved?: number;
    hash?: string;
    metadata?: {
        authors?: Array<string | { name: string; [key: string]: any }>; // Additional authors (co-authors, etc.)
        [key: string]: any;
    };
}

export interface FilterState {
    branches: Set<string>;
    eventTypes: Set<EventType>;
    authors: Set<string>;
    dateRange: [Date | null, Date | null];
}

export interface SourceData {
    events: TimelineEvent[];
    branches: string[];
    authors: string[];
    eventTypes: EventType[];
    repoName: string;
}

export interface AvailableOptions {
    branches: { name: string; count: number }[];
    authors: { name: string; count: number }[];
    eventTypes: { type: EventType; count: number }[];
}

export interface FilteredResults {
    events: TimelineEvent[];
    stats: any;
    bands: string[];
}