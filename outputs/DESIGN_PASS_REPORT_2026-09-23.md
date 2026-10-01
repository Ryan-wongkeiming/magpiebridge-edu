# MagpieBridge-Edu — Design Pass Report

Date: 2026-09-23
Author: Grok
Job: Coursera-inspired design pass (brand tokens, course page restructure, learner dashboard)
Output path: `outputs/DESIGN_PASS_REPORT_2026-09-23.md`

---

## 1. Summary

Applied a design pass inspired by Coursera's public patterns, in three steps as
requested. The goal was to make the app read as a learning product rather than a
prototype, without copying Coursera's brand.

- `npx tsc --noEmit` → 0 errors
- `npm run build` → exit code 0
- All pages return 200; new components confirmed compiled into the bundle

## 2. Research basis

Coursera's public pages and published design guidance were studied, not guessed:

- Their homepage (card carousels, category browsing)
- A real course page (*Introduction to Data Analysis Using Excel*, Rice University)
- Their documented patterns for course pages and the learner dashboard

The patterns adopted are structural ideas, not Coursera's trade dress. The
palette is MagpieBridge's own (deep teal), not Coursera Blue.

## 3. Step 1 — Brand tokens

Replaced the default shadcn grey palette in `app/globals.css` with a MagpieBridge
palette:

- **Primary**: deep teal (`190 80% 30%`) — the accent colour for buttons, links,
  and progress
- **Neutrals**: warm off-whites and slate greys
- **Radius**: slightly larger (0.625rem) for a softer feel
- **Dark mode**: a matching dark variant

Typography: added the Inter typeface via `next/font/google`, exposed as
`--font-sans`, and wired it into `tailwind.config.ts` so `font-sans` resolves to
Inter. Previously the app used the browser default sans-serif.

## 4. Step 2 — Course page restructure

`app/enrollments/[id]/page.tsx` was rebuilt as a three-column layout, mirroring
Coursera's enrolled-course page:

| Column | Content |
|---|---|
| **Left (3/12)** | Course outline — modules and lessons with completion ticks, collapsible structure, active lesson highlighted |
| **Centre (6/12)** | The current lesson — title, video player, previous/next navigation |
| **Right (3/12)** | Progress panel — overall percentage, completed/remaining counts, progress bar, "Open lesson" button |

Module headers now show item counts and durations, e.g.:

```
1. Full Course
15 items · 15 videos · 510 min
```

This is the "9 videos · 10 readings · 7 assignments" pattern from Coursera,
adapted to our content types.

The page defaults to the first incomplete lesson, so a returning learner lands
where they left off.

## 5. Step 3 — Learner dashboard

`app/dashboard/page.tsx` gained a **Resume card** at the top of the My Courses
tab, mirroring Coursera's resume pattern:

- "Continue learning" heading
- The most recent in-progress course
- "Next up: <lesson title>"
- Overall progress percentage and bar
- A **Resume** button that jumps straight to the next incomplete lesson

The existing enrollment list and progress stats remain below it.

## 6. Verification

- All pages return 200: `/dashboard`, `/enrollments`, `/my-progress`, `/catalog`,
  and the course detail page.
- The new theme is applied: the teal primary (`190 80% 30%`) and `--font-sans`
  are present in the served CSS.
- The new components are compiled into the bundle: "Course outline", "Your
  progress", "Continue learning", and "Resume" all appear in the built JS.
- The content is client-rendered, so it does not appear in the initial server
  HTML — it renders after React hydrates. This is expected for `'use client'`
  pages and is not a defect.

## 7. What was NOT done

Deliberately skipped, because they serve a commercial marketplace rather than an
internal tool:

- Ratings and reviews
- Weekly goals and deadlines
- Discussion forums
- Social proof ("303,246 already enrolled")
- Transcripts and video notes (deferred)

## 8. Files

| File | Change |
|---|---|
| `app/globals.css` | MagpieBridge palette + dark mode |
| `app/layout.tsx` | Inter font loaded and applied |
| `tailwind.config.ts` | `font-sans` mapped to Inter |
| `app/enrollments/[id]/page.tsx` | Three-column course page |
| `app/dashboard/page.tsx` | Resume card added |
| `components/resume-card.tsx` | New — resume card component |

## 9. Limitations

- **Not verified visually.** No browser is available in this session. The layout
  structure, theme variables, and compiled components are confirmed, but how the
  three-column grid and the resume card actually look on screen — and on mobile —
  is unconfirmed. The grid collapses to a single column below the `lg` breakpoint,
  but that has not been seen.
- The course page's centre column shows the lesson inline and wires watch-progress
  reporting: it records position via `/api/video/progress` and auto-completes at
  the 90% threshold, matching the full lesson page. A learner who watches a
  lesson from the outline gets the same tracking as one who opens the lesson
  page.
