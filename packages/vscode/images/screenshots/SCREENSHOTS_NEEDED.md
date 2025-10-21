# Screenshots Needed for README

To complete the README.md, we need the following screenshots. These should be high-quality captures showing the extension in action.

## Required Screenshots

### 1. architecture-diagram.png
**Status:** ✅ Can use existing SVG
**Action:** Export the SVG to PNG for better compatibility
- Use: `docs/agentbrain-complete-diagram.svg`
- Export at 1400x1000 or higher resolution
- Use light theme version for README

**Alternative:** Copy the SVG directly and update README to reference .svg instead of .png

### 2. timeline-view.png
**Status:** ❌ Needs to be captured
**What to show:**
- AB Timeline tab active
- Timeline showing multiple event types (commits, branches, merges, knowledge items)
- Statistics bar visible at top showing metrics
- Legend button and Controls button visible
- Some events on the timeline with different colors/types
- Range selector at bottom with bar chart
- Zoom level that shows good detail

**How to capture:**
1. Open Agent Brain Platform (Ctrl+Shift+T)
2. Make sure AB Timeline tab is active
3. Adjust timeline to show interesting events
4. Click Legend to make it visible (optional, but nice to show)
5. Take screenshot of entire timeline panel
6. Recommended size: 1200x800 or larger

### 3. knowledge-view.png
**Status:** ❌ Needs to be captured
**What to show:**
- AB Knowledge tab active
- Knowledge table with several items of different types
- Left panel showing Claude.md files (if available)
- Toolbar with search, filter chips, and action buttons visible
- At least 3-5 knowledge items in the table
- Different types visible (Golden Path, ADR, Pattern, Learning, etc.)
- Template controls at bottom

**How to capture:**
1. Switch to AB Knowledge tab
2. If no knowledge items exist, create 3-4 sample items first:
   - One Golden Path
   - One ADR
   - One Learning
   - One Design Pattern
3. Make sure different scopes are visible (Personal, Team)
4. Take screenshot of entire knowledge panel
5. Recommended size: 1200x800 or larger

## Image Specifications

- **Format:** PNG (for screenshots), SVG (for diagram is fine too)
- **Resolution:** Minimum 1200px wide for good visibility
- **Color:** Use default VSCode theme (Dark+ or Light+)
- **Quality:** High quality, no compression artifacts
- **Content:** Actual data, not lorem ipsum or dummy content

## File Naming

Once captured, save files as:
- `architecture-diagram.png` (or .svg)
- `timeline-view.png`
- `knowledge-view.png`

Place in: `/packages/vscode/images/screenshots/`

## Updating README

After screenshots are captured, the README.md already references them correctly:

```markdown
![Agent Brain Architecture](images/screenshots/architecture-diagram.png)
![Timeline View](images/screenshots/timeline-view.png)
![Knowledge Management](images/screenshots/knowledge-view.png)
```

No changes needed to README.md once images are in place.

## Optional Screenshots (Nice to Have)

These would enhance the README but aren't strictly required:

- **sessions-view.png**: AB Sessions tab showing session journals
- **support-view.png**: AB Support tab showing architecture diagram
- **popup-view.png**: Event popup showing the tabbed interface
- **filters-view.png**: Controls panel open showing all filter options
- **claude-md-view.png**: Claude.md files panel expanded

## Quick Capture Checklist

- [ ] Copy/export architecture diagram SVG to screenshots folder
- [ ] Capture timeline view with diverse events
- [ ] Capture knowledge view with sample items
- [ ] Verify all images display correctly in README
- [ ] Test README rendering in VSCode preview
- [ ] Test README rendering in marketplace (if publishing)
