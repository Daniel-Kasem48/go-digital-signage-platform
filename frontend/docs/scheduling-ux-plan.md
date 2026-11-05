# Scheduling UX Redesign Plan (Dedicated Tab + Weekly Timeline)

## Summary
Build a dedicated `Schedules` experience that is separate from channel CRUD, with a weekly timeline UX, strict overlap prevention, and batch save per channel.
This will replace the current basic schedule form/list inside `ChannelManagement` for day-to-day scheduling operations.

## Implementation Scope
1. Add a top-level `Schedules` tab in the dashboard navigation.
2. Create a new scheduling feature UI with:
- Channel selector
- Weekly timeline lanes (`All days`, `Mon`..`Sun`)
- Form-driven add/edit windows (`playlist`, `day`, `start`, `end`)
- Draft changes state with `Save` and `Discard`
- Conflict visualization and blocking validation
3. Integrate batch persistence via `POST /api/channels/:id/schedules`.
4. Keep existing single create/delete repository methods for compatibility, but stop using them in the primary scheduling UI.

## Design Patterns to Apply
1. Repository Pattern extension:
- Add batch schedule replace method in `DashboardRepository` and expose via `useDashboardData`.
2. ViewModel Mapper:
- Map API schedule rows into timeline-ready view models (day labels, minutes, playlist names, conflict flags).
3. Reducer-based Editor State:
- Use `useReducer` for draft scheduling actions (`load`, `add`, `edit`, `delete`, `saveSuccess`, `discard`) to keep behavior deterministic.
4. Validation Strategy:
- Isolate overlap and time validation in pure utility functions for reuse and testability.

## Public Interfaces / Type Changes
1. `frontend/src/app/layout/navigation.ts`
- Extend `DashboardTab` with `"schedules"`.
- Add `Schedules` nav item in `DASHBOARD_NAV_ITEMS`.

2. `frontend/src/entities/dashboard/types.ts`
- Add scheduling editor/view types:
- `ScheduleDraftEntry` (id/tempId, channelId, playlistId, day, startDatetime, endDatetime)
- `ScheduleValidationError` (code, message, entryId)
- `DayKey` union (`0 | 1 | 2 | 3 | 4 | 5 | 6 | 7`)

3. `frontend/src/entities/dashboard/repository.ts`
- Add:
- `replaceChannelSchedules(channelId: string, entries: ChannelScheduleMutationInput[]): Promise<void>`
- Request body for each entry will include `channel_id`, `playlist_id`, `day`, `start_datetime`, `end_datetime` to satisfy backend validation.
- Keep current `getChannelSchedules`, `createChannelSchedule`, `deleteChannelSchedule` unchanged.

4. `frontend/src/features/dashboard/useDashboardData.ts`
- Expose `replaceChannelSchedules`.

5. `frontend/src/pages/DashboardPage.tsx`
- Add `schedules` tab rendering branch.
- Add handlers/state for schedule editor lifecycle (`selectedChannel`, `draft`, `dirty`, `saving`, `validationErrors`).

## UX / Interaction Spec
1. Navigation
- `Schedules` is a top-level tab.
- `Channels` tab keeps create/publish only.
- Scheduling controls are removed from `ChannelManagement`.

2. Schedules tab layout
- Left column: channel selector + add/edit form.
- Right column: weekly timeline board + compact list.
- Timeline lanes: one `All days` lane plus 7 weekday lanes.

3. Entry creation/editing
- Inputs:
- Playlist select (labels by playlist name)
- Day select (`All days`, `Monday`..`Sunday`)
- Start and end as `input type="time"` (browser local timezone semantics)
- Validation on change and save:
- Required fields
- `start < end`
- Overlap blocking for same channel using day-set intersection rules
- `day=0` conflicts against all weekday entries if times overlap

4. Draft and save behavior
- Load channel schedules into draft on channel selection.
- Add/edit/delete modify local draft only.
- Show unsaved changes badge.
- `Save Changes` calls batch replace endpoint for selected channel.
- `Discard` resets draft to last loaded server state.
- After successful save, reload schedules and refresh dashboard counts.

5. List and timeline readability improvements
- Show day labels instead of numeric day values.
- Show playlist names instead of IDs.
- Sort entries by day then start time.
- Highlight conflicting entries inline.

## Validation / Data Rules (Decision Complete)
1. Time parsing format: `HH:mm` only in frontend editor.
2. Overlap logic: intervals treated as `[start, end)`.
3. Day intersection:
- `0` intersects with every day (`1..7`) and with `0`.
- Specific day intersects only with itself and `0`.
4. Save blocked when any validation error exists.
5. Timezone mode: browser local timezone for labels/input only; no UTC conversion applied to stored strings.

## Files to Add / Modify
1. Modify `frontend/src/app/layout/navigation.ts`.
2. Modify `frontend/src/pages/DashboardPage.tsx`.
3. Modify `frontend/src/features/dashboard/components/ChannelManagement.tsx` (remove schedules panel).
4. Add `frontend/src/features/dashboard/components/ScheduleManagement.tsx`.
5. Add `frontend/src/features/dashboard/lib/schedule-utils.ts` (parse/sort/overlap/day-label helpers).
6. Modify `frontend/src/entities/dashboard/types.ts`.
7. Modify `frontend/src/entities/dashboard/repository.ts`.
8. Modify `frontend/src/features/dashboard/useDashboardData.ts`.

## Test Cases and Scenarios
1. Channel load
- Selecting a channel loads existing schedules into draft and timeline.
2. Add valid entry
- New non-overlapping window appears in timeline and list.
3. Overlap blocked
- Adding overlapping window shows validation error and disables save.
4. `All days` conflict
- `day=0` entry overlaps with specific day entry and is blocked.
5. Edit flow
- Editing a draft entry updates visuals and validation in real time.
6. Discard flow
- Draft changes fully reset to last loaded server state.
7. Batch save
- Save sends full current draft via `/api/channels/:id/schedules` and reloads from backend.
8. Navigation separation
- Channels tab no longer contains scheduling controls; schedules are in dedicated tab.
9. Build safety
- `npm run build` passes with new types and components.

## Assumptions and Defaults
1. Backend `POST /api/channels/:id/schedules` remains available and tenant-auth protected.
2. Backend validator accepts payload entries that include `channel_id` per schedule item.
3. Schedule strings are simple wall-clock values (`HH:mm`) and backend logic supports this existing format.
4. Drag-and-drop timeline editing is out of scope for this iteration; interaction is form + selectable timeline/list.
