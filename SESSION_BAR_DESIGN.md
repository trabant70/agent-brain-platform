# Session Timeline Bar Visualization Design

## Overview
Sessions represent work periods with start and end times. Unlike point events (commits, PRs), sessions should be visualized as **horizontal bars** spanning from startTime to endTime on the timeline.

## Current State

### Data Structure
**SessionJournal** (frontmatter):
```yaml
id: session-2025-10-15-001
title: Control Panel Redesign
startTime: 2025-10-15T09:00:00.000Z
endTime: 2025-10-15T12:30:00.000Z
summary: Brief description
tags: tag1, tag2
topics: topic1, topic2
filesModified:
  - file1.ts
  - file2.ts
```

**CanonicalEvent** transformation:
- `timestamp`: Uses `startTime` (event start point)
- `metadata.startTime`: Preserve original startTime (ISO string)
- `metadata.endTime`: Preserve original endTime (ISO string)
- `metadata.duration`: Calculate duration in milliseconds

### Timeline Support
✅ **ISO 8601 timestamps**: Fully supported via `new Date(timestamp)`
✅ **D3 time scales**: `xScale(new Date(d.timestamp))` handles date conversion
✅ **Metadata extensibility**: Can store additional time fields

## Design Approach

### 1. Visual Representation

**Session bars** rendered as horizontal rectangles:

```
Branch Line: ────────────────────────────────────────────
                    [==== Session 1 ====]
             [=== Session 2 ===]
                                      [====== Session 3 ======]

Offset Pattern: 0px, -15px, -30px, -15px, 0px (alternating 3 tracks)
```

**Specifications**:
- **Shape**: Horizontal rectangle (SVG `<rect>`)
- **Height**: 8px (thickness of bar)
- **Color**: `#8b5cf6` (violet - from EventVisualTheme.KNOWLEDGE_EVENTS['session-journal'])
- **Border**: 1px solid, slightly darker shade
- **Opacity**: 0.8 (semi-transparent to show overlaps)
- **Y-offset**: Staggered vertical positions (-30px, -15px, 0px) to handle overlaps

### 2. Vertical Offset Strategy

**Goal**: Ensure overlapping sessions are visible

**Algorithm**:
1. Group sessions by branch
2. For each branch, sort sessions by startTime
3. Assign track index (0, 1, 2) based on overlap detection:
   - Track 0: 0px offset (on branch line)
   - Track 1: -15px offset (above branch)
   - Track 2: -30px offset (further above)
4. Greedy allocation: assign to lowest available track

**Overlap Detection**:
```typescript
function overlaps(session1, session2): boolean {
  return session1.startTime < session2.endTime &&
         session2.startTime < session1.endTime;
}
```

**Track Assignment**:
```typescript
function assignTracks(sessions: SessionEvent[]): Map<string, number> {
  const tracks = new Map<string, number>();
  const activeSessions: Array<{endTime: Date, track: number}> = [];

  // Sort by startTime
  const sorted = [...sessions].sort((a, b) =>
    a.metadata.startTime - b.metadata.startTime
  );

  for (const session of sorted) {
    // Remove ended sessions from active list
    activeSessions = activeSessions.filter(s =>
      s.endTime > session.metadata.startTime
    );

    // Find lowest available track (0, 1, or 2)
    const usedTracks = new Set(activeSessions.map(s => s.track));
    const track = [0, 1, 2].find(t => !usedTracks.has(t)) ?? 0;

    tracks.set(session.id, track);
    activeSessions.push({
      endTime: session.metadata.endTime,
      track: track
    });
  }

  return tracks;
}
```

### 3. Rendering Implementation

**SVG Structure**:
```xml
<g class="timeline-event session-event" data-session-id="...">
  <!-- Background bar -->
  <rect class="session-bar"
        x="startX"
        y="baseY - offset - 4"
        width="endX - startX"
        height="8"
        fill="#8b5cf6"
        fill-opacity="0.8"
        stroke="#6d28d9"
        stroke-width="1"
        rx="2" />

  <!-- Session icon at start -->
  <text class="session-icon"
        x="startX + 4"
        y="baseY - offset"
        fill="#8b5cf6">📝</text>

  <!-- Title label (on hover or if space permits) -->
  <text class="session-label"
        x="(startX + endX) / 2"
        y="baseY - offset - 8"
        text-anchor="middle">Session Title</text>
</g>
```

**D3 Data Binding**:
```typescript
// Separate session events from point events
const sessionEvents = events.filter(e => e.type === EventType.SESSION_JOURNAL);
const pointEvents = events.filter(e => e.type !== EventType.SESSION_JOURNAL);

// Calculate track assignments
const sessionTracks = this.assignSessionTracks(sessionEvents);

// Render session bars
const sessionGroups = this.sessionsGroup
  .selectAll('.session-event')
  .data(sessionEvents, (d: any) => d.id);

sessionGroups.enter()
  .append('g')
  .attr('class', 'timeline-event session-event')
  .each(function(d: any) {
    const group = d3.select(this);

    // Add bar
    group.append('rect')
      .attr('class', 'session-bar');

    // Add icon
    group.append('text')
      .attr('class', 'session-icon');

    // Add label
    group.append('text')
      .attr('class', 'session-label');
  });

// Update positions
sessionGroups.merge(sessionGroups)
  .attr('transform', (d: any) => {
    const track = sessionTracks.get(d.id) ?? 0;
    const offset = track * 15; // 0px, 15px, 30px
    const branch = d.branch || 'main';
    const baseY = this.yScale(branch) + this.yScale.bandwidth() / 2;
    const adjustedY = baseY - offset;

    return `translate(0, ${adjustedY})`;
  });

sessionGroups.select('.session-bar')
  .attr('x', (d: any) => this.xScale(new Date(d.metadata.startTime)))
  .attr('width', (d: any) => {
    const startX = this.xScale(new Date(d.metadata.startTime));
    const endX = this.xScale(new Date(d.metadata.endTime));
    return Math.max(2, endX - startX); // Minimum 2px width
  })
  .attr('y', -4)
  .attr('height', 8)
  .attr('rx', 2)
  .style('fill', EventVisualTheme.getSemanticColor('session-journal'))
  .style('fill-opacity', 0.8)
  .style('stroke', '#6d28d9')
  .style('stroke-width', 1);
```

### 4. Interaction Design

**Hover**:
- Brighten bar color
- Show full title label above bar
- Increase opacity to 1.0
- Show tooltip with details (startTime, endTime, duration, files modified)

**Click**:
- Same behavior as point events
- Show event details popup
- Highlight associated files in timeline

**Zoom Behavior**:
- Bars scale horizontally with timeline zoom
- Minimum width: 2px (for very short sessions when zoomed out)
- When zoomed in enough, show title inside bar
- Track offsets remain constant (don't scale)

### 5. Data Flow Changes

**SessionFileSystem.parseSessionFile()**:
- ✅ Already parses `startTime` and `endTime` from frontmatter
- Need to add these fields to SessionJournal type

**SessionEventProvider.transformToCanonicalEvent()**:
```typescript
private transformToCanonicalEvent(session: SessionJournal): CanonicalEvent {
  const startTime = new Date(session.startTime);
  const endTime = new Date(session.endTime);
  const duration = endTime.getTime() - startTime.getTime();

  return {
    // ... existing fields ...
    timestamp: startTime, // Use startTime as primary timestamp

    metadata: {
      // ... existing metadata ...
      startTime: session.startTime,  // ISO string
      endTime: session.endTime,      // ISO string
      duration: duration,             // milliseconds
      durationFormatted: this.formatDuration(duration) // "3h 30m"
    }
  };
}
```

**SessionJournal Type** (types.ts):
```typescript
export interface SessionJournal {
  id: string;
  title: string;
  startTime: string;  // ISO 8601 timestamp
  endTime: string;    // ISO 8601 timestamp
  summary?: string;
  tags?: string[];
  topics?: string[];
  filesModified?: string[];
  knowledgeItemsUsed?: string[];
  filePath: string;
  content: string;
}
```

### 6. Edge Cases

**Very Short Sessions** (< 5 minutes):
- Minimum bar width: 2px
- Icon only (no label)
- Full details on hover

**Very Long Sessions** (> 8 hours):
- May span multiple zoom windows
- Show partial bar when zoomed to subset
- Indicate continuation with arrow at edge

**Overlapping Sessions**:
- Handled by 3-track system
- If > 3 sessions overlap, cycle back to track 0
- Visual stacking shows work intensity

**Missing endTime**:
- Use startTime + 1 hour as default
- Show dashed border to indicate estimate
- Label as "Session (estimated duration)"

**Sessions Across Branch Changes**:
- Rare case (session doesn't record branch changes mid-session)
- Render on primary branch from session metadata
- If no branch in metadata, use 'main'

## Implementation Checklist

- [ ] Update SessionJournal type in types.ts
- [ ] Update SessionFileSystem to parse startTime/endTime
- [ ] Update SessionEventProvider to include metadata
- [ ] Add session bar rendering in TimelineRenderer
- [ ] Implement track assignment algorithm
- [ ] Add hover/click interactions
- [ ] Add CSS styling for session bars
- [ ] Test with overlapping sessions
- [ ] Test zoom behavior
- [ ] Update session journal test data

## Visual Examples

**Single Session**:
```
10:00          11:00          12:00          13:00
  |              |              |              |
──┴──────────────┴──────────────┴──────────────┴──
  [========== Session: Control Panel ==========] 📝
```

**Overlapping Sessions**:
```
09:00          11:00          13:00          15:00
  |              |              |              |
  [==== Debug ====]                              Track 2 (-30px)
──┴─────[==== Feature Dev ====]─────────────────── Track 1 (-15px)
                 [==== Code Review ====]          Track 0 (0px)
```

**Zoom Effect**:
```
Zoomed Out (week view):
[=][===][=][====][==]

Zoomed In (day view):
[== Session 1 ==] [======= Session 2 =======]
```

## Benefits

1. **Time Awareness**: Shows actual work duration, not just start point
2. **Work Intensity**: Overlapping bars show busy periods
3. **Context**: Longer bars indicate more extensive sessions
4. **Zoom Friendly**: Bars scale naturally with timeline zoom
5. **Distinct Visual**: Bars vs points clearly differentiate session events from commits/PRs

## Alternative Considered

**Point + Duration Label**: Rejected
- Shows only start point (like current implementation)
- Duration as text label
- Less intuitive, requires reading label
- No visual weight for longer sessions

## Next Steps

1. Review and approve design
2. Implement changes in order:
   - Data layer (types, parsing)
   - Provider layer (transformation)
   - Rendering layer (D3 bars, tracks)
   - Interaction layer (hover, click)
   - Styling (CSS)
3. Test with real session data
4. Iterate based on visual feedback
