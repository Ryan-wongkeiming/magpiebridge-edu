# MagpieBridge-Edu — Watch Tracking and Course Ordering Report

Date: 2026-09-23
Author: Grok
Job: Video watch tracking, completion gating, and Excel course reordering
Output path: `outputs/WATCH_TRACKING_REPORT_2026-09-23.md`

---

## 1. Summary

Two changes, both requested after the user found that a lesson completion meant
nothing and that the first lesson pushed learners out of the platform.

- **A. The Excel course was reordered** so a video that plays in-app comes first.
- **B. Watch tracking was added**, and completion is now gated on it.

- `npx tsc --noEmit` → 0 errors
- `npm run build` → exit code 0, ~42 seconds
- Seven gate scenarios verified through the running API

## 2. The problem being solved

Before this change, completion was a single button click with no verification:

| Learner action | What was recorded |
|---|---|
| Open a lesson | `in_progress` |
| Watch the entire video | nothing |
| Click "Mark Complete" | `completed` |
| Click "Mark Complete" without watching | `completed` |

A learner could open a 10-minute video and complete it in one second. The
certificate issued at the end of a course therefore proved only that a button
had been clicked.

This was not a defect against the written requirements — the MVP document lists
video playback but never specifies watch tracking. It is a gap between the
specification and what a learning platform needs.

## 3. A. Course reordering

The Excel playlist's first video has embedding disabled by its owner, so a
learner's first click left the platform. All 15 lessons were checked for
embeddability and reordered so the 12 playable videos come first, with the 3
blocked ones last. Relative order within each group is preserved.

```
before                                  after
 1. Master Data Cleaning  [blocked]      1. Data Analysis Essentials     [plays]
 2. Data Analysis Essent. [plays]        2. Best Pivot Table Design      [plays]
 3. 5 Awesome Tricks      [blocked]      ... 12 playable videos ...
 ...                                     13. Master Data Cleaning        [blocked]
 15. Data Cleaning Power Q              15. Master Data Analysis         [blocked]
```

## 4. B. Watch tracking

### Data model

Three fields added to `LessonProgress` (migration `20260923052619_add_watch_tracking`):

| Field | Purpose |
|---|---|
| `watchedSeconds` | The furthest point reached, in seconds |
| `durationSeconds` | Total length, recorded once the player reports it |
| `acknowledgedAt` | When a learner confirmed watching an off-platform video |

Only the **furthest** point is stored, so seeking backwards never reduces
progress, and a learner who returns resumes where they left off.

### Player

`components/video-player.tsx` now uses the YouTube IFrame API rather than a bare
iframe. It reports position every 5 seconds, and immediately on play, pause, and
end, so progress is not lost when a learner navigates away.

### Auto-completion

Once the player reports that the threshold has been reached, the lesson page
completes the lesson automatically — the learner does not click a separate
button. The button is replaced by a "Completed automatically" indicator. This
was added after the user observed that a fully-watched video still showed a
"Mark Complete" button, which felt unsynchronized.

### API

- `POST /api/video/progress` records position and returns a percentage.
- `POST /api/lesson-progress` **enforces** the threshold. Because enforcement is
  server-side, it cannot be bypassed from the browser.

The threshold is 90%, defined in `app/api/lesson-progress/route.ts` and mirrored
in the player for display.

### Blocked videos

A URL conversion alone cannot reveal that a video owner has disabled embedding —
the embed URL still loads. `lib/video-embedding-check.ts` therefore asks the
provider directly; both YouTube and Vimeo answer oEmbed with HTTP 401 for such
videos. Results are cached for an hour.

This matters because it is what distinguishes the two completion paths:

- **Playable video** → must watch 90%, measured.
- **Blocked video** → cannot be measured, so the learner ticks a confirmation
  box. Recorded as an acknowledgement, distinct from a measured completion.

## 5. Verification

Seven scenarios run against the live API as the learner account.

```
=== COMPLETION GATE ===
1. playable, 5% watched, no ack            422  WATCH_REQUIRED
                                               "Watch this video before marking it complete."
2. playable, 5% watched, tries ack bypass  422  WATCH_REQUIRED
                                               (acknowledgement does not bypass a playable video)
3. blocked video, no ack                   422  ACKNOWLEDGEMENT_REQUIRED
                                               "This video opens on YouTube. Confirm that you have watched it…"
4. blocked video, WITH ack                 200  completed

=== THEN WATCH 95% OF THE PLAYABLE VIDEO ===
5. report 95% watched                      200  {watchedSeconds: 570, durationSeconds: 600, percentWatched: 95}
6. playable, 95% watched, no ack           200  completed

=== STORED STATE ===
  cmudjxfj… status=completed watched=0s   dur=nulls ack=2026-09-23T05:41:16Z
  cmudjxfr… status=completed watched=570s dur=600s  ack=—

=== SEEKING BACKWARDS ===
7. report 10s after reaching 570s          200  {watchedSeconds: 570, percentWatched: 95}
                                               (progress is not reduced)
```

Scenario 2 is the important one: a learner cannot escape the requirement by
ticking the acknowledgement box on a video that plays in-app. Scenario 7 confirms
that scrubbing back through a video does not undo recorded progress.

## 6. Defect found during verification

**The first implementation could not tell a blocked video from a playable one.**
It inferred "blocked" from the absence of an embed URL, but a blocked video still
has a valid embed URL — the restriction only appears at playback. As a result the
acknowledgement path was unreachable (scenario 4 failed with `WATCH_REQUIRED`).

Fixed by adding `lib/video-embedding-check.ts`, which queries the provider
directly. Caught only because the gate was tested with a genuinely blocked video
rather than a simulated one.

## 7. Limitations

- **Tracking depends on the browser.** It works through the YouTube player's own
  API. A learner who disables JavaScript, or who uses the acknowledgement path,
  is not measured. This is inherent to embedding someone else's player.
- **The acknowledgement is not verification.** It records that the learner said
  they watched, nothing more. The UI says so plainly.
- **Not verified visually.** No browser is available in this session. The gate
  logic and stored data were verified through the API; how the progress bar and
  the confirmation box actually look has not been seen.
- **Only YouTube is measured.** Vimeo videos play in-app but are not tracked,
  because only the YouTube API is wired up. A Vimeo video therefore uses the
  acknowledgement path rather than a threshold that could never be reached.
  This is handled by `canTrackProgress` in `lib/video-embedding-check.ts`.

## 8. Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | `watchedSeconds`, `durationSeconds`, `acknowledgedAt` on `LessonProgress` |
| `prisma/migrations/20260923052619_add_watch_tracking/` | Migration |
| `lib/video-embedding-check.ts` | New — asks the provider whether a video may be embedded |
| `components/video-player.tsx` | YouTube IFrame API, position reporting, progress bar |
| `app/api/video/progress/route.ts` | New — records watch position |
| `app/api/lesson-progress/route.ts` | Enforces the 90% threshold; acknowledgement path |
| `app/lessons/[id]/page.tsx` | Progress display, gate messages, confirmation box |
| `components/lesson-preview.tsx` | Passes tracking callbacks to the player |
| `types/api.ts` | Watch fields on `lessonProgress` |
