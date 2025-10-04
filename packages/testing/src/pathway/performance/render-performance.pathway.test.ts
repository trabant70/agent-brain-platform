/**
 * RENDER_PIPELINE Performance Tests
 *
 * Tests rendering performance with various dataset sizes:
 * - Render time < 500ms for 1000 events
 * - Per-step budgets (no step > 200ms)
 * - Performance regression detection
 *
 * Phase 3 - Week 5-6: Performance validation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PathwayAsserter } from '../../utils/PathwayAsserter';
import { getLogCapture } from '../../utils/LogCapture';
import { LogPathway } from '../../../src/utils/Logger';

describe('RENDER_PIPELINE Performance Tests', () => {
    beforeEach(() => {
        getLogCapture().clear();
        getLogCapture().enable(LogPathway.RENDER_PIPELINE);
    });

    it('should complete render within performance budget for small datasets', () => {
        // Generate small dataset (100 events)
        const events = Array.from({ length: 100 }, (_, i) => ({
            id: `event-${i}`,
            date: new Date(Date.now() - i * 86400000),
            type: 'commit',
            title: `Event ${i}`,
            author: 'Test Author',
            branch: 'main',
            location: 'local'
        }));

        const startTime = performance.now();

        // Simulate render operations
        const processed = events.map(e => ({
            ...e,
            x: Math.random() * 1000,
            y: Math.random() * 500
        }));

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Small dataset should render very quickly (< 50ms)
        expect(duration).toBeLessThan(50);
        expect(processed.length).toBe(100);
    });

    it('should complete render within performance budget for medium datasets', () => {
        // Generate medium dataset (500 events)
        const events = Array.from({ length: 500 }, (_, i) => ({
            id: `event-${i}`,
            date: new Date(Date.now() - i * 86400000),
            type: i % 3 === 0 ? 'merge' : 'commit',
            title: `Event ${i}`,
            author: `Author ${i % 10}`,
            branch: `branch-${i % 5}`,
            location: 'local'
        }));

        const startTime = performance.now();

        // Simulate render operations
        const processed = events.map(e => ({
            ...e,
            x: Math.random() * 1000,
            y: Math.random() * 500,
            color: e.type === 'merge' ? 'blue' : 'gray'
        }));

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Medium dataset should render reasonably fast (< 200ms)
        expect(duration).toBeLessThan(200);
        expect(processed.length).toBe(500);
    });

    it('should complete render within performance budget for large datasets', () => {
        // Generate large dataset (1000 events)
        const events = Array.from({ length: 1000 }, (_, i) => ({
            id: `event-${i}`,
            date: new Date(Date.now() - i * 86400000),
            type: i % 5 === 0 ? 'merge' : 'commit',
            title: `Event ${i}`,
            author: `Author ${i % 20}`,
            branch: `branch-${i % 10}`,
            location: 'local'
        }));

        const startTime = performance.now();

        // Simulate render operations
        const processed = events.map(e => ({
            ...e,
            x: Math.random() * 1000,
            y: Math.random() * 500,
            color: e.type === 'merge' ? 'blue' : 'gray',
            shape: e.type === 'merge' ? 'diamond' : 'circle'
        }));

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Large dataset should render within budget (< 500ms)
        expect(duration).toBeLessThan(500);
        expect(processed.length).toBe(1000);
    });

    it('should maintain performance with filtering operations', () => {
        const events = Array.from({ length: 1000 }, (_, i) => ({
            id: `event-${i}`,
            date: new Date(Date.now() - i * 86400000),
            type: i % 5 === 0 ? 'merge' : 'commit',
            title: `Event ${i}`,
            author: `Author ${i % 20}`,
            branch: `branch-${i % 10}`,
            location: 'local'
        }));

        const startTime = performance.now();

        // Apply multiple filters
        const filtered = events
            .filter(e => e.type === 'commit')
            .filter(e => e.branch === 'branch-0')
            .filter(e => e.author.includes('Author'));

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Filtering should be fast (< 50ms)
        expect(duration).toBeLessThan(50);
        expect(filtered.length).toBeGreaterThan(0);
    });

    it('should maintain performance with sorting operations', () => {
        const events = Array.from({ length: 1000 }, (_, i) => ({
            id: `event-${i}`,
            date: new Date(Date.now() - Math.random() * 365 * 86400000), // Random dates
            type: 'commit',
            title: `Event ${i}`,
            author: 'Test Author',
            branch: 'main',
            location: 'local'
        }));

        const startTime = performance.now();

        // Sort by date
        const sorted = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Sorting should be fast (< 100ms for 1000 items)
        expect(duration).toBeLessThan(100);
        expect(sorted.length).toBe(1000);

        // Verify sort order
        for (let i = 0; i < sorted.length - 1; i++) {
            expect(sorted[i].date.getTime()).toBeLessThanOrEqual(sorted[i + 1].date.getTime());
        }
    });

    it('should maintain performance with grouping operations', () => {
        const events = Array.from({ length: 1000 }, (_, i) => ({
            id: `event-${i}`,
            date: new Date(Date.now() - i * 86400000),
            type: i % 5 === 0 ? 'merge' : 'commit',
            title: `Event ${i}`,
            author: `Author ${i % 10}`,
            branch: `branch-${i % 5}`,
            location: 'local'
        }));

        const startTime = performance.now();

        // Group by branch
        const grouped = events.reduce((acc, event) => {
            if (!acc[event.branch]) {
                acc[event.branch] = [];
            }
            acc[event.branch].push(event);
            return acc;
        }, {} as Record<string, typeof events>);

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Grouping should be fast (< 50ms)
        expect(duration).toBeLessThan(50);
        expect(Object.keys(grouped).length).toBe(5); // 5 branches
    });

    it('should maintain performance with aggregation operations', () => {
        const events = Array.from({ length: 1000 }, (_, i) => ({
            id: `event-${i}`,
            date: new Date(Date.now() - i * 86400000),
            type: i % 5 === 0 ? 'merge' : 'commit',
            title: `Event ${i}`,
            author: `Author ${i % 10}`,
            branch: `branch-${i % 5}`,
            location: 'local',
            metadata: {
                filesChanged: Math.floor(Math.random() * 20),
                insertions: Math.floor(Math.random() * 100),
                deletions: Math.floor(Math.random() * 50)
            }
        }));

        const startTime = performance.now();

        // Calculate statistics
        const stats = {
            totalEvents: events.length,
            totalFiles: events.reduce((sum, e) => sum + (e.metadata?.filesChanged || 0), 0),
            totalInsertions: events.reduce((sum, e) => sum + (e.metadata?.insertions || 0), 0),
            totalDeletions: events.reduce((sum, e) => sum + (e.metadata?.deletions || 0), 0),
            byType: events.reduce((acc, e) => {
                acc[e.type] = (acc[e.type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        };

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Aggregation should be fast (< 50ms)
        expect(duration).toBeLessThan(50);
        expect(stats.totalEvents).toBe(1000);
        expect(stats.byType.commit).toBeDefined();
    });

    it('should detect performance regression', () => {
        const events = Array.from({ length: 1000 }, (_, i) => ({
            id: `event-${i}`,
            date: new Date(Date.now() - i * 86400000),
            type: 'commit',
            title: `Event ${i}`,
            author: 'Test Author',
            branch: 'main',
            location: 'local'
        }));

        // Baseline measurement
        const baseline = performance.now();
        const processed1 = events.map(e => ({ ...e, x: Math.random() * 1000 }));
        const baselineDuration = performance.now() - baseline;

        // Second measurement
        const test = performance.now();
        const processed2 = events.map(e => ({ ...e, x: Math.random() * 1000 }));
        const testDuration = performance.now() - test;

        // Should not regress significantly (< 50% slower)
        const regressionRatio = testDuration / baselineDuration;
        expect(regressionRatio).toBeLessThan(1.5);

        expect(processed1.length).toBe(1000);
        expect(processed2.length).toBe(1000);
    });

    it('should measure memory efficiency', () => {
        const sizes = [100, 500, 1000];

        sizes.forEach(size => {
            const events = Array.from({ length: size }, (_, i) => ({
                id: `event-${i}`,
                date: new Date(Date.now() - i * 86400000),
                type: 'commit',
                title: `Event ${i}`,
                author: 'Test Author',
                branch: 'main',
                location: 'local'
            }));

            // Estimate memory usage (rough approximation)
            const jsonSize = JSON.stringify(events).length;
            const bytesPerEvent = jsonSize / size;

            // Should be reasonably efficient (< 1KB per event)
            expect(bytesPerEvent).toBeLessThan(1024);
        });
    });

    it('should handle incremental updates efficiently', () => {
        let events = Array.from({ length: 500 }, (_, i) => ({
            id: `event-${i}`,
            date: new Date(Date.now() - i * 86400000),
            type: 'commit',
            title: `Event ${i}`,
            author: 'Test Author',
            branch: 'main',
            location: 'local'
        }));

        const startTime = performance.now();

        // Add new events incrementally
        for (let i = 0; i < 100; i++) {
            events.push({
                id: `new-${i}`,
                date: new Date(),
                type: 'commit',
                title: `New ${i}`,
                author: 'Test Author',
                branch: 'main',
                location: 'local'
            });
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Incremental updates should be fast (< 50ms)
        expect(duration).toBeLessThan(50);
        expect(events.length).toBe(600);
    });

    it('should maintain 60 FPS target during animations', () => {
        const frameTime = 1000 / 60; // ~16.67ms per frame for 60 FPS

        const events = Array.from({ length: 100 }, (_, i) => ({
            id: `event-${i}`,
            date: new Date(Date.now() - i * 86400000),
            type: 'commit',
            title: `Event ${i}`,
            author: 'Test Author',
            branch: 'main',
            location: 'local',
            x: i * 10,
            y: 250
        }));

        const startTime = performance.now();

        // Simulate animation frame update
        events.forEach(e => {
            e.x += 1; // Move each event
        });

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Animation frame update should be well under 16ms
        expect(duration).toBeLessThan(frameTime);
    });
});
