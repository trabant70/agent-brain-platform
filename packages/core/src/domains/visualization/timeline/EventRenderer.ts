/**
 * EventRenderer - Event Analysis and Event Details Management
 * Stage 3: Extracted from embedded JavaScript code
 *
 * Handles:
 * - Event impact analysis and calculations
 * - Finding related events
 * - Event details popup management
 * - Drag and drop functionality for popups
 */

export interface EventAnalysis {
    baseScore: number;
    finalScore: number;
    multiplier: number;
    reason: string;
    breakdown: {
        files: number;
        lines: number;
    };
}

export interface RelatedEvent {
    event: any;
    relationship: string;
    similarity: number;
}

/**
 * Event Analysis Helper Class
 */
export class EventAnalyzer {
    /**
     * Calculate impact breakdown for commit events
     */
    static calculateImpactBreakdown(event: any): EventAnalysis | null {
        if (event.type !== 'commit') return null;

        const filesWeight = (event.filesChanged || 0) * 3;
        const linesWeight = ((event.linesAdded || 0) + (event.linesRemoved || 0)) / 10;
        const baseImpact = Math.min(filesWeight + linesWeight, 100);

        let multiplier = 1.0;
        let reason = 'Standard commit';

        const message = (event.title || '').toLowerCase();
        if (message.includes('fix') || message.includes('bug')) {
            multiplier = 1.2;
            reason = 'Bug fix (+20% impact)';
        } else if (message.includes('feat') || message.includes('feature')) {
            multiplier = 1.1;
            reason = 'Feature addition (+10% impact)';
        } else if (message.includes('refactor') || message.includes('perf')) {
            multiplier = 0.8;
            reason = 'Refactoring (-20% impact)';
        }

        return {
            baseScore: Math.round(baseImpact),
            finalScore: Math.round(Math.min(baseImpact * multiplier, 100)),
            multiplier,
            reason,
            breakdown: {
                files: filesWeight,
                lines: linesWeight
            }
        };
    }

    /**
     * Find events related to the target event
     */
    static findRelatedEvents(targetEvent: any, allEvents: any[]): RelatedEvent[] {
        const related: RelatedEvent[] = [];

        // Find events on same branch around same time
        const targetTime = new Date(targetEvent.timestamp).getTime();
        const timeWindow = 7 * 24 * 60 * 60 * 1000; // 7 days

        allEvents.forEach(event => {
            if (event.id === targetEvent.id) return;

            const eventTime = new Date(event.timestamp).getTime();
            const timeDiff = Math.abs(eventTime - targetTime);

            // Same branch events
            if (event.branch === targetEvent.branch && timeDiff <= timeWindow) {
                const daysDiff = Math.floor(timeDiff / (24 * 60 * 60 * 1000));
                related.push({
                    event,
                    relationship: `Same branch (${daysDiff} days apart)`,
                    similarity: Math.max(0, 100 - (daysDiff * 15))
                });
            }

            // Same author events
            if (event.author === targetEvent.author && timeDiff <= timeWindow && event.branch !== targetEvent.branch) {
                const daysDiff = Math.floor(timeDiff / (24 * 60 * 60 * 1000));
                related.push({
                    event,
                    relationship: `Same author (${daysDiff} days apart)`,
                    similarity: Math.max(0, 80 - (daysDiff * 10))
                });
            }

            // PR connections
            if (targetEvent.type === 'pr' && event.type === 'commit') {
                if (targetEvent.metadata?.connectedCommitId === event.id) {
                    related.push({
                        event,
                        relationship: 'Connected commit',
                        similarity: 95
                    });
                }
            }
        });

        // Sort by similarity (highest first) and limit to top 10
        return related
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 10);
    }

    /**
     * Get color for event type
     */
    static getEventColor(type: string): string {
        const colorMap: { [key: string]: string } = {
            commit: '#00d4ff',
            branch: '#ff3366',
            release: '#ff00ff',
            pr: '#00ff88',
            issue: '#ffaa00'
        };
        return colorMap[type] || '#999';
    }
}

/**
 * Enhanced Event Details Popup Class
 */
export class EventDetailsPopup {
    private popup: any;
    private closeBtn: any;
    private tabs: any;
    public currentEvent: any = null;
    private allEvents: any[] = [];
    public isLocked: boolean = false;
    public currentTab: string = 'overview';
    private dragOffset: { x: number; y: number } | null = null;
    private hideTimeout: NodeJS.Timeout | null = null;

    constructor() {
        this.setupElements();
        this.setupEventHandlers();

        // Hide any secondary popups
        this.hideSecondaryPopups();
    }

    /**
     * Setup D3 element selections
     */
    private setupElements(): void {
        const d3 = (window as any).d3;
        this.popup = d3.select('#event-popup');
        this.closeBtn = d3.select('#popup-close');
        this.tabs = d3.select('#popup-tabs');
    }

    /**
     * Bind external close handler from PopupController
     */
    public bindCloseHandler(handler: () => void): void {
        const d3 = (window as any).d3;
        this.closeBtn = d3.select('#popup-close');

        if (!this.closeBtn.empty()) {
            // Remove any existing handlers first
            this.closeBtn.on('click.external', null);

            // Attach new handler with proper context
            this.closeBtn.on('click.external', (event: Event) => {
                event.stopPropagation();
                event.preventDefault();
                console.log('EventDetailsPopup: Close button clicked - calling external handler');
                handler();
            });
        } else {
            console.warn('EventDetailsPopup: Close button not found in DOM');
        }
    }

    /**
     * Hide secondary popups and toast notifications
     */
    private hideSecondaryPopups(): void {
        // Remove any toast notifications
        const toast = document.getElementById('toast');
        if (toast) {
            toast.style.display = 'none';
            toast.remove(); // Remove from DOM entirely
        }

        // Remove any commit action popups
        const commitPopup = document.querySelector('.commit-action-popup');
        if (commitPopup) {
            commitPopup.remove();
        }

        // Remove any secondary popups
        const secondaryPopups = document.querySelectorAll('.secondary-popup');
        secondaryPopups.forEach(popup => popup.remove());
    }

    /**
     * Setup event handlers for popup interaction
     */
    private setupEventHandlers(): void {
        const d3 = (window as any).d3;

        // Only setup internal popup behaviors, not external triggers
        // Let PopupController handle show/hide logic

        // Tab switching (internal to popup)
        this.tabs.selectAll('.popup-tab').on('click', (event: Event) => {
            event.stopPropagation();
            const target = event.target as HTMLElement;
            const tab = target.dataset.tab;
            if (tab) {
                this.switchTab(tab);
            }
        });

        // Drag behavior (internal to popup)
        if (d3.drag) {
            const drag = d3.drag()
                .on('start', (event: any) => this.dragStart(event))
                .on('drag', (event: any) => this.dragMove(event))
                .on('end', (event: any) => this.dragEnd(event));

            this.popup.select('.popup-header').call(drag);
        }

        // DO NOT setup close button here - let PopupController handle it
        // DO NOT setup escape key here - let PopupController handle it
        // DO NOT setup click outside here - let PopupController handle it
    }

    /**
     * Clear any pending timeouts to prevent interference between popup modes
     */
    private clearPendingTimeouts(): void {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }

    /**
     * Setup drag and drop functionality
     */
    private setupDragHandlers(): void {
        const d3 = (window as any).d3;

        // Make the entire popup draggable (except for interactive elements)
        this.popup.call(d3.drag()
            .filter((event: Event) => {
                // Don't drag when clicking interactive elements
                const target = event.target as Element;
                return !target.matches('button, .popup-tab, .popup-action-btn, a, input, select, textarea') &&
                       !target.closest('button, .popup-tab, .popup-action-btn, a, input, select, textarea');
            })
            .on('start', this.dragStart.bind(this))
            .on('drag', this.dragMove.bind(this))
            .on('end', this.dragEnd.bind(this))
        );

        // Visual feedback - show move cursor on draggable areas
        this.popup.style('cursor', 'move');

        // Don't show move cursor on interactive elements
        this.popup.selectAll('button, .popup-tab, .popup-action-btn, a, input, select, textarea')
            .style('cursor', 'pointer');
    }

    /**
     * Handle drag start
     */
    private dragStart(event: any): void {
        // Store initial offset between mouse and popup top-left
        const popupNode = this.popup.node();
        const popupRect = popupNode.getBoundingClientRect();
        const vizContainer = document.getElementById('visualization');
        const containerRect = vizContainer!.getBoundingClientRect();

        this.dragOffset = {
            x: event.x - (popupRect.left - containerRect.left),
            y: event.y - (popupRect.top - containerRect.top)
        };

        // Add visual feedback for dragging
        this.popup.classed('dragging', true);
        this.popup.style('transition', 'none'); // Disable transitions during drag
    }

    /**
     * Handle drag move
     */
    private dragMove(event: any): void {
        if (!this.dragOffset) return;

        // Calculate new position accounting for initial offset
        let newX = event.x - this.dragOffset.x;
        let newY = event.y - this.dragOffset.y;

        // Apply boundary constraints to ensure popup stays partially visible
        const constrainedPos = this.constrainToContainer(newX, newY);

        // Update popup position
        this.popup
            .style('left', `${constrainedPos.left}px`)
            .style('top', `${constrainedPos.top}px`);
    }

    /**
     * Handle drag end
     */
    private dragEnd(event: any): void {
        // Remove drag visual feedback
        this.popup.classed('dragging', false);
        this.popup.style('transition', ''); // Re-enable transitions

        // Clear drag offset
        this.dragOffset = null;
    }

    /**
     * Constrain popup to container bounds
     */
    private constrainToContainer(left: number, top: number): { left: number; top: number } {
        const vizContainer = document.getElementById('visualization');
        if (!vizContainer) return { left, top };

        const containerRect = vizContainer.getBoundingClientRect();
        const popupNode = this.popup.node();
        const popupRect = popupNode.getBoundingClientRect();

        // More generous constraints for better UX
        const margin = 10; // Minimum margin from container edges
        const popupWidth = popupRect.width || 400;
        const popupHeight = popupRect.height || 300;

        // Container-relative bounds
        const maxLeft = containerRect.width - popupWidth - margin;
        const maxTop = containerRect.height - popupHeight - margin;
        const minLeft = margin;
        const minTop = margin;

        // Keep popup fully within container bounds
        const constrainedLeft = Math.max(minLeft, Math.min(maxLeft, left));
        const constrainedTop = Math.max(minTop, Math.min(maxTop, top));

        return {
            left: constrainedLeft,
            top: constrainedTop
        };
    }

    /**
     * Show hover popup (non-locked) - Pure UI operation
     */
    showHover(event: any, position: { x: number; y: number }, allEvents: any[]): void {
        console.log('EventDetailsPopup: [EDP] Showing hover popup');

        // Clear any pending timeouts from previous interactions
        this.clearPendingTimeouts();

        this.currentEvent = event;
        this.allEvents = allEvents || [];
        this.isLocked = false;

        this.updateHeader(event);
        this.buildHoverContent(event);
        this.positionPopup(position);

        this.popup
            .style('display', 'block')
            .style('visibility', 'visible')
            .style('opacity', '1')
            .style('pointer-events', 'none') // CRITICAL: Allow mouse events to pass through to prevent flicker
            .classed('visible', true)
            .classed('locked', false)
            .classed('show', true);

        this.tabs.style('display', 'none');
    }

    /**
     * Show locked popup (clickable) - Pure UI operation
     */
    showLocked(event: any, position: { x: number; y: number }, allEvents: any[]): void {
        console.log('EventDetailsPopup: [EDP] Showing locked popup');

        // Clear any pending timeouts from previous interactions
        this.clearPendingTimeouts();

        this.currentEvent = event;
        this.allEvents = allEvents || [];
        this.isLocked = true;
        this.currentTab = 'overview';

        this.updateHeader(event);
        this.buildTabContent(event);
        this.buildActionBar(event);
        this.positionPopup(position);

        this.popup
            .style('display', 'block')
            .style('visibility', 'visible')
            .style('opacity', '1')
            .style('pointer-events', 'auto')
            .classed('visible', true)
            .classed('locked', true)
            .classed('show', true);

        this.tabs.style('display', 'flex');

        // Set initial tab state
        this.switchTab('overview');
    }

    /**
     * Hide the popup - Pure UI operation
     */
    hide(): void {
        console.log('EventDetailsPopup: [EDP] Hiding popup');

        if (!this.popup) return;

        // Clear any pending timeouts first
        this.clearPendingTimeouts();

        this.popup
            .classed('visible', false)
            .classed('locked', false)
            .classed('show', false)
            .style('display', 'none')
            .style('visibility', 'hidden')
            .style('opacity', '0')
            .style('pointer-events', 'none');

        // Reset state
        this.isLocked = false;
        this.currentEvent = null;
        this.dragOffset = null;
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName: string): void {
        this.currentTab = tabName;

        // Update tab appearance
        this.tabs.selectAll('.popup-tab').classed('active', false);
        this.tabs.select(`[data-tab="${tabName}"]`).classed('active', true);

        // Update content
        const d3 = (window as any).d3;
        d3.selectAll('.popup-tab-content').classed('active', false);
        d3.select(`#tab-${tabName}`).classed('active', true);

        // Build content for the active tab
        this.buildTabContentFor(tabName, this.currentEvent);
    }

    /**
     * Update popup header
     */
    private updateHeader(event: any): void {
        const d3 = (window as any).d3;
        d3.select('#popup-event-type').text(event.type.toUpperCase());
        d3.select('#popup-timestamp').text(new Date(event.timestamp).toLocaleString());
        d3.select('#popup-title').text(event.title || 'No title');
    }

    /**
     * Build hover content (simplified)
     */
    private buildHoverContent(event: any): void {
        const d3 = (window as any).d3;
        const content = d3.select('#tab-overview');

        let html = `<div class="popup-section">`;

        if (event.author) {
            html += `<p><strong>Author:</strong> ${event.author}</p>`;
        }

        if (event.branch) {
            html += `<p><strong>Branch:</strong> ${event.branch}</p>`;
        }

        if (event.type === 'commit' && event.impact) {
            html += `<p><strong>Impact:</strong> ${event.impact}</p>`;
        }

        html += `</div>`;
        content.html(html);
    }

    /**
     * Build tab content for locked popup
     */
    private buildTabContent(event: any): void {
        this.buildTabContentFor('overview', event);
        this.buildTabContentFor('impact', event);
        this.buildTabContentFor('related', event);
        this.buildTabContentFor('technical', event);
    }

    /**
     * Build action bar with Copy Hash button
     */
    private buildActionBar(event: any): void {
        const d3 = (window as any).d3;
        const actionBar = d3.select('#popup-action-bar');

        // Clear existing content
        actionBar.html('');

        // Only show actions for commits that have a hash
        if (event.type === 'commit' && event.hash) {
            // Copy Hash button
            const copyBtn = actionBar.append('button')
                .classed('popup-action-btn copy-hash', true)
                .text('Copy Hash')
                .on('click', (e: Event) => {
                    e.stopPropagation();
                    this.copyCommitHash(event.hash);
                });
        }
    }

    /**
     * Copy commit hash to clipboard
     */
    private copyCommitHash(hash: string): void {
        console.log('EventDetailsPopup: [EDP] Copying hash:', hash);

        // Use the clipboard API if available
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(hash).then(() => {
                this.showToast('Hash copied to clipboard');
            }).catch(() => {
                this.fallbackCopyText(hash);
            });
        } else {
            this.fallbackCopyText(hash);
        }
    }

    /**
     * Fallback copy method for older browsers
     */
    private fallbackCopyText(text: string): void {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'absolute';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            this.showToast('Hash copied to clipboard');
        } catch (err) {
            this.showToast('Failed to copy hash');
        }
        document.body.removeChild(textArea);
    }

    /**
     * Show commit diff via VSCode message
     */
    private showCommitDiff(event: any): void {
        console.log('EventDetailsPopup: [EDP] Opening diff for commit:', event.hash);

        if ((window as any).vscode) {
            (window as any).vscode.postMessage({
                type: 'openCommitDiff',
                commitHash: event.hash,
                event: event
            });
            this.showToast('Opening diff...');
        } else {
            this.showToast('VSCode integration not available');
        }
    }

    /**
     * Show toast notification
     */
    private showToast(message: string): void {
        const d3 = (window as any).d3;
        const toast = d3.select('#toast');

        toast.text(message)
            .style('display', 'block')
            .style('opacity', '1');

        setTimeout(() => {
            toast.style('opacity', '0');
            setTimeout(() => {
                toast.style('display', 'none');
            }, 300);
        }, 2000);
    }

    /**
     * Build content for specific tab
     */
    private buildTabContentFor(tabName: string, event: any): void {
        const d3 = (window as any).d3;
        const content = d3.select(`#tab-${tabName}`);

        switch (tabName) {
            case 'overview':
                this.buildOverviewTab(content, event);
                break;
            case 'impact':
                this.buildImpactTab(content, event);
                break;
            case 'related':
                this.buildRelatedTab(content, event);
                break;
            case 'technical':
                this.buildTechnicalTab(content, event);
                break;
        }
    }

    /**
     * Build overview tab content
     */
    private buildOverviewTab(content: any, event: any): void {
        let html = `<div class="popup-section">`;

        if (event.author) {
            html += `<p><strong>Author:</strong> ${event.author}</p>`;
        }

        if (event.branch) {
            html += `<p><strong>Branch:</strong> ${event.branch}</p>`;
        }

        if (event.description) {
            html += `<p><strong>Description:</strong> ${event.description}</p>`;
        }

        html += `</div>`;
        content.html(html);
    }

    /**
     * Build impact tab content
     */
    private buildImpactTab(content: any, event: any): void {
        const analysis = EventAnalyzer.calculateImpactBreakdown(event);

        let html = `<div class="popup-section">`;

        if (analysis) {
            html += `
                <p><strong>Impact Score:</strong> ${analysis.finalScore}</p>
                <p><strong>Reason:</strong> ${analysis.reason}</p>
                <p><strong>Files Changed:</strong> ${event.filesChanged || 0}</p>
                <p><strong>Lines Added:</strong> ${event.linesAdded || 0}</p>
                <p><strong>Lines Removed:</strong> ${event.linesRemoved || 0}</p>
            `;
        } else {
            html += `<p>Impact analysis not available for this event type.</p>`;
        }

        html += `</div>`;
        content.html(html);
    }

    /**
     * Build related events tab content
     */
    private buildRelatedTab(content: any, event: any): void {
        const related = EventAnalyzer.findRelatedEvents(event, this.allEvents);

        let html = `<div class="popup-section">`;

        if (related.length > 0) {
            html += `<h4>Related Events:</h4>`;
            related.forEach(rel => {
                html += `
                    <div class="related-event">
                        <p><strong>${rel.event.title}</strong></p>
                        <p><small>${rel.relationship} (${rel.similarity}% similarity)</small></p>
                    </div>
                `;
            });
        } else {
            html += `<p>No related events found.</p>`;
        }

        html += `</div>`;
        content.html(html);
    }

    /**
     * Build technical tab content
     */
    private buildTechnicalTab(content: any, event: any): void {
        let html = `<div class="popup-section">`;

        html += `<p><strong>Event ID:</strong> ${event.id}</p>`;
        html += `<p><strong>Type:</strong> ${event.type}</p>`;
        html += `<p><strong>Timestamp:</strong> ${event.timestamp}</p>`;

        if (event.metadata) {
            html += `<h4>Metadata:</h4>`;
            html += `<pre>${JSON.stringify(event.metadata, null, 2)}</pre>`;
        }

        html += `</div>`;
        content.html(html);
    }

    /**
     * Position popup near the event
     */
    private positionPopup(position: { x: number; y: number }): void {
        const container = document.getElementById('visualization');
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const popupNode = this.popup.node();
        const popupRect = popupNode.getBoundingClientRect();

        // Convert absolute page coordinates to container-relative coordinates
        const relativeX = position.x - containerRect.left;
        const relativeY = position.y - containerRect.top;

        // Offset to prevent popup from covering event circle and nearby circles
        const minOffsetRight = 25; // Safe distance when placing to right of circle
        const minOffsetLeft = 60; // Larger offset when placing to left (popup is wide, ~400px)
        const popupWidth = popupRect.width || 400;
        const popupHeight = popupRect.height || 300;

        let left: number;
        let top: number;

        // Intelligent quadrant detection for optimal positioning
        const centerX = containerRect.width / 2;
        const centerY = containerRect.height / 2;
        const inRightHalf = relativeX > centerX;
        const inBottomHalf = relativeY > centerY;

        // Position based on quadrant to avoid covering event circles
        if (inRightHalf) {
            // Right half: place popup to LEFT of circle with extra offset to avoid nearby circles
            left = relativeX - popupWidth - minOffsetLeft;
        } else {
            // Left half: place popup to RIGHT of circle
            left = relativeX + minOffsetRight;
        }

        // Vertical centering with bias toward click point
        if (inBottomHalf) {
            top = relativeY - popupHeight + 50; // Show above, partially overlapping
        } else {
            top = relativeY - 50; // Show below, partially overlapping
        }

        // Constrain to viewport
        left = Math.max(5, Math.min(containerRect.width - popupWidth - 5, left));
        top = Math.max(5, Math.min(containerRect.height - popupHeight - 5, top));

        // Apply position with smooth animation
        this.popup
            .style('left', `${left}px`)
            .style('top', `${top}px`)
            .style('opacity', 0)
            .style('pointer-events', 'auto')
            .transition()
            .duration(150)
            .style('opacity', 1);
    }
}