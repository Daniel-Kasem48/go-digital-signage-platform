# Zone Flow Benchmark for Digital Signage

## Purpose
This document benchmarks how leading digital signage platforms handle **zone-based content workflows**, then translates those findings into practical product guidance for the Divsuite dashboard.

---

## Platform Research Summary

### 1) Appspace
- Layout and zones are template-first.
- Users assign content per zone from a clear zone panel.
- Zone roles are explicit (for example: main area, sidebar, ticker).
- Switching layouts is intentional and visible to users.

### 2) ScreenCloud
- Zone setup is strongly channel-driven.
- Users assign content by selecting an active zone first.
- Zone scheduling and priority rules are supported.
- Advanced users can customize layout behavior with CSS when needed.

### 3) OptiSigns
- Split-screen is treated as a first-class object.
- Supports overlap/layering between zones.
- Supports a “primary zone timing” concept so other zones can align to a lead zone.
- Prevents invalid nested split-screen configurations.

### 4) Yodeck
- Supports a “playlist of layouts” concept.
- Emphasizes practical duration guidance (longer windows for smooth playback).
- Encourages predictable transitions across layouts.

### 5) Xibo
- Timeline-style authoring with granular per-item duration.
- Supports cycle/random logic and expiry rules.
- Supports synchronization keys to align playback across events/layouts.

### 6) TelemetryTV
- Zone editing is page/grid-based and visual-first.
- Advanced layout options include CSS grid behavior.
- Supports “persisting zones” so repeated areas can continue playing across page changes.

### 7) Signagelive
- Strong support for layer management (z-index style behavior).
- Zone naming and layer ordering help with complex overlapping compositions.

### 8) BrightSign
- Multi-zone behavior considers hardware/media constraints.
- Zone/media compatibility and decoder limits are explicit.
- Per-item timing inside zone playlists is supported.

### 9) Screenly (counter-example)
- Avoids native multi-zone as a product decision.
- Prioritizes simplicity and legibility over complex screen compositions.

---

## Cross-Platform Patterns (What Repeats Everywhere)

1. **Template-first setup**
- Users choose layout first, then manage content by zone.

2. **Zone-first assignment**
- The selected zone becomes the active target before selecting content.

3. **Visual map as primary control**
- Clickable zone previews are the central interaction, not hidden dropdowns.

4. **Explicit timing model**
- Clear choice between independent zone loops vs synchronized mode.

5. **Validation guardrails**
- Platforms block invalid nesting, conflicting rules, and weak timing setups.

6. **Advanced controls are optional**
- Layering, CSS, and sync logic exist, but basic workflows remain simple.

---

## Whole-Dashboard UX Patterns (Beyond Zones)

Leading platforms also share broader product UX patterns:

1. **Business-first language**
- UI avoids technical IDs and API/internal wording in primary screens.

2. **One primary action per panel**
- Each page section has a clear next action (for example: Create, Publish, Save).

3. **Progressive disclosure**
- Advanced options are hidden by default and shown only when needed.

4. **Single representation per concept**
- Avoid duplicate blocks for the same information (for example, zone status shown once).

5. **Template and workflow consistency**
- Similar create/edit flows use consistent labels, layout, and action ordering.

6. **Action confidence**
- Contextual summaries (selected zone, selected channel, selected devices) stay visible near the action button.

---

## Recommended Zone Workflow for Divsuite

### Authoring Journey
1. Select layout template.
2. Click a zone in the visual preview.
3. Add content to the selected zone.
4. Set duration using presets or manual input.
5. Repeat for other zones.
6. Review loop summary per zone and total experience.
7. Publish.

### Playback Model Options
- **Independent Zones (default):** each zone loops with its own item durations.
- **Follow Primary Zone (advanced):** one selected zone defines cycle pacing and others align to it.

---

## UX Rules for Better Zone Assignment

1. Keep one active zone at a time and make it visually obvious.
2. Show zone name, item count, and loop time in each zone card.
3. Keep duration controls next to content selection.
4. Allow both quick presets and manual duration editing.
5. Show target zone context while creating/editing an item.
6. Prevent duplicate invalid mappings in the same playlist/zone combination.
7. Warn when zone durations are too short for stable readability.

---

## Device Display Logic (When Each Item Has Its Own Duration and Zone Position)

### Independent Zones
- Every zone owns a local playlist queue.
- Every item plays for its configured duration in that zone.
- Zones advance independently.
- Effective for mixed use cases (video in one zone, ticker/weather in another).

### Follow Primary Zone
- One zone is marked primary.
- Secondary zones align updates to primary cycle boundaries.
- Reduces visual drift when coordinated storytelling is required.

### Practical Recommendation
- Default to independent loops.
- Offer primary-follow as an optional mode for coordinated campaigns.

---

## Validation and Safety Checks

1. Prevent duplicate unique collisions for playlist item placement constraints.
2. Reject invalid zone IDs for selected layout.
3. Validate duration input format and bounds.
4. Warn on empty zones when layout expects required content areas.
5. Prevent unsupported nested layout constructs.

---

## Metrics to Track After Rollout

1. Time to assign first content item to a zone.
2. Time to complete a multi-zone playlist.
3. Number of edits before publish.
4. Publish success/failure rate.
5. Re-open rate of playlists (proxy for confusion).

---

## References
- https://docs.appspace.com/latest/cloud/channels/multi-zone-channel/
- https://help.screencloud.com/en/articles/10110358-channels-setup-guide-scheduling-content-using-layouts-and-adding-music-to-your-screens
- https://help.screencloud.com/en/articles/10120826-screencloud-css-zone-layout-guide
- https://support.optisigns.com/hc/en-us/articles/360026559573-How-to-Create-and-Use-the-Split-Screen-App
- https://support.optisigns.com/hc/en-us/articles/22474034993043-Advanced-Playlist-Item-Playback-Control-Campaign-Management
- https://www.yodeck.com/docs/user-manual/playlist-of-layouts/
- https://account.xibosignage.com/manual/en/layouts_editor_playlists
- https://docs.telemetrytv.com/docs/zoned-pages
- https://docs.telemetrytv.com/docs/persisting-zones
- https://docs.telemetrytv.com/docs/playlist-configuration
- https://support.signagelive.com/en/articles/137735-how-to-use-the-layer-navigator-within-the-layout-designer
- https://brightsign.atlassian.net/wiki/spaces/BA44/pages/84414518/4.4-Multi-Zone%20Presentations
- https://support.screenly.io/hc/en-us/articles/214715143-Can-I-divide-my-screen-into-multiple-zones
