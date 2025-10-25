/**
 * ResizeHandler
 *
 * Handles resize events and tab change events for timeline rendering.
 * Responsible for:
 * - Window resize coordination
 * - Tab change resize handling
 * - RequestAnimationFrame (RAF) coordination
 * - Timeline pause/resume on tab switches
 */

import { webviewLogger, LogCategory, LogPathway } from '../WebviewLogger';

interface ResizeOptions {
    isTimelineActive: boolean;
    hasData: boolean;
    containerWidth: number;
    containerHeight: number;
}

export class ResizeHandler {
    /**
     * Handle window resize with RAF coordination
     */
    handleResize(
        renderer: any,
        container: HTMLElement,
        isTimelineActive: boolean,
        currentProcessedData: any
    ): void {
        webviewLogger.debug(
            LogCategory.UI,
            'Window resize triggered',
            'handleResize',
            undefined,
            LogPathway.USER_INTERACTION
        );

        if (!renderer) {
            webviewLogger.warn(LogCategory.VISUALIZATION, 'No renderer to resize', 'handleResize');
            return;
        }

        const rect = container.getBoundingClientRect();

        webviewLogger.debug(
            LogCategory.VISUALIZATION,
            'Resize context',
            'handleResize',
            {
                isTimelineActive,
                hasData: !!currentProcessedData,
                containerWidth: rect.width,
                containerHeight: rect.height
            },
            LogPathway.RENDER_PIPELINE
        );

        if (isTimelineActive && currentProcessedData) {
            // Timeline is active - use robust restoration logic
            // This is critical when returning from window focus loss (Terminal, etc.)
            webviewLogger.info(
                LogCategory.VISUALIZATION,
                'Timeline active - using robust resize with RAF',
                'handleResize',
                undefined,
                LogPathway.RENDER_PIPELINE
            );

            this.performRobustResize(renderer, currentProcessedData);
        } else {
            // Other tab active or no data - simple resize
            webviewLogger.debug(
                LogCategory.VISUALIZATION,
                'Simple resize (non-timeline tab or no data)',
                'handleResize',
                { width: rect.width, height: rect.height },
                LogPathway.RENDER_PIPELINE
            );

            renderer.resize();

            if (currentProcessedData) {
                renderer.update(currentProcessedData);
            }
        }
    }

    /**
     * Perform robust resize with RAF coordination
     * Uses multiple RAF cycles and delayed renders to ensure brush dimensions are correct
     */
    private performRobustResize(renderer: any, currentProcessedData: any): void {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                webviewLogger.debug(LogCategory.VISUALIZATION, 'RAF #1-2 complete - first resize', 'performRobustResize');
                renderer.resize();

                setTimeout(() => {
                    webviewLogger.debug(LogCategory.VISUALIZATION, 'Second resize and full render', 'performRobustResize');
                    renderer.resize();
                    renderer.render(currentProcessedData); // Full render for brush recalculation

                    setTimeout(() => {
                        webviewLogger.debug(LogCategory.VISUALIZATION, 'Final safety resize', 'performRobustResize');
                        renderer.resize();
                    }, 100);
                }, 100);
            });
        });
    }

    /**
     * Handle tab change to timeline (activation)
     */
    handleTimelineTabActivated(
        renderer: any,
        currentProcessedData: any,
        vscode: any
    ): void {
        webviewLogger.debug(LogCategory.UI, 'Timeline tab activated', 'handleTimelineTabActivated', undefined, LogPathway.DATA_INGESTION);

        // Check if we have timeline data
        const hasData = currentProcessedData &&
                        currentProcessedData.allEvents &&
                        currentProcessedData.allEvents.length > 0;

        if (!hasData && vscode) {
            // No data yet - request it
            webviewLogger.debug(LogCategory.UI, 'No timeline data loaded yet - requesting', 'handleTimelineTabActivated', undefined, LogPathway.DATA_INGESTION);
            vscode.postMessage({ type: 'requestData' });
        } else if (hasData) {
            // Data exists - resume rendering
            webviewLogger.debug(LogCategory.VISUALIZATION, 'Resuming timeline rendering (tab switched back)', 'handleTimelineTabActivated');

            this.performTabSwitchResize(renderer, currentProcessedData);
        }
    }

    /**
     * Perform resize and re-render after tab switch
     * Uses double-RAF to ensure CSS layout has fully settled
     */
    private performTabSwitchResize(renderer: any, currentProcessedData: any): void {
        // RAF 1: Browser paints the active tab
        // RAF 2: Layout calculations are complete
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                webviewLogger.debug(LogCategory.VISUALIZATION, 'RAF cycle complete - performing resize', 'performTabSwitchResize');

                // First resize with fresh dimensions
                renderer.resize();

                // Delayed full re-render to ensure brush dimensions are perfect
                setTimeout(() => {
                    webviewLogger.debug(LogCategory.VISUALIZATION, 'Second resize and render', 'performTabSwitchResize');
                    renderer.resize(); // Second resize before render

                    // Force a complete re-render with current data
                    if (currentProcessedData) {
                        renderer.render(currentProcessedData);
                    }

                    // THIRD resize after render completes (catches any layout shifts from render)
                    setTimeout(() => {
                        webviewLogger.debug(LogCategory.VISUALIZATION, 'Final safety resize', 'performTabSwitchResize');
                        renderer.resize();
                    }, 100);
                }, 100); // Increased from 50ms to allow full reflow
            });
        });
    }

    /**
     * Handle tab change to non-timeline tab (deactivation)
     */
    handleTimelineTabDeactivated(): void {
        webviewLogger.debug(LogCategory.VISUALIZATION, 'Pausing timeline rendering (tab switched away)', 'handleTimelineTabDeactivated');
        // D3 renderer doesn't need to animate when hidden (performance optimization)
    }

    /**
     * Re-render timeline with current data (for color mode changes)
     */
    rerender(renderer: any, currentProcessedData: any): void {
        webviewLogger.debug(
            LogCategory.VISUALIZATION,
            'Re-render triggered (color mode change or config update)',
            'rerender',
            undefined,
            LogPathway.CONFIG_SYNC
        );

        if (!renderer) {
            webviewLogger.warn(LogCategory.VISUALIZATION, 'No renderer to re-render', 'rerender');
            return;
        }

        // Re-render with current data if available
        if (currentProcessedData) {
            webviewLogger.debug(
                LogCategory.VISUALIZATION,
                'Re-rendering with current data',
                'rerender',
                { eventCount: currentProcessedData.allEvents.length },
                LogPathway.RENDER_PIPELINE
            );
            renderer.update(currentProcessedData);
        }
    }
}
