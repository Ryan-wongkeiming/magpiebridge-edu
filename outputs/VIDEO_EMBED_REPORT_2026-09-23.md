# MagpieBridge-Edu — External Video Embedding Report

Date: 2026-09-23
Author: Grok
Job: Video embedding from external sources (YouTube, Vimeo)
Output path: `outputs/VIDEO_EMBED_REPORT_2026-09-23.md`

---

## 1. Summary

Instructors can now attach a YouTube or Vimeo video by pasting the address from
their browser, and learners can play it inside the platform. This required no
storage decision and no infrastructure: it works with video that is already
hosted elsewhere.

Verified against a real case supplied by the user:

```
https://www.youtube.com/watch?v=35X6v3aE86o&list=PLzj7TwUeMQ3jaNyy4v_plf_5PMNK0bb5w&index=1
```

- `npx tsc --noEmit` → 0 errors
- `npx next build` → exit code 0
- 12 URL formats tested directly against the conversion logic

## 2. The defect this fixes

The previous implementation placed the instructor's URL directly into an iframe:

```tsx
<iframe src={lesson.contentUrl} />
```

YouTube and Vimeo both refuse to render their normal "watch" pages inside a
frame. Confirmed by test:

```
HEAD https://www.youtube.com/watch?v=35X6v3aE86o   -> 302 (refuses framing)
HEAD https://www.youtube.com/embed/35X6v3aE86o     -> 200 (embeddable)
HEAD https://youtu.be/35X6v3aE86o                  -> 303 (refuses framing)
```

Only the `/embed/` endpoint works. Because instructors copy the address bar,
every YouTube lesson was broken. The instructor did nothing wrong; the
application simply passed through a URL that could never have worked.

A second problem: when a source cannot be embedded, the old code rendered a
blank iframe with no explanation and no way out. Learners saw an empty grey box.

## 3. What was built

### `lib/video-embed.ts`

Converts any supplied URL into an embeddable one. Handles:

| Input | Output |
|---|---|
| `youtube.com/watch?v=ID` | `youtube.com/embed/ID` |
| `youtu.be/ID` | `youtube.com/embed/ID` |
| `youtube.com/embed/ID` | unchanged |
| `youtube.com/shorts/ID` | `youtube.com/embed/ID` |
| `youtube.com/playlist?list=ID` | `youtube.com/embed/videoseries?list=ID` |
| watch URL with `&list=` | embed URL carrying the playlist |
| `&t=90` or `&t=1h2m3s` | `?start=90` / `?start=3723` |
| bare `youtube.com/...` with no scheme | treated as `https://` |
| `vimeo.com/ID` | `player.vimeo.com/video/ID` |
| anything else | marked non-embeddable, with a reason |

Playlists are handled deliberately: a whole course series can be one lesson,
played through YouTube's own playlist controls. That suits the user's case, where
the 8.5-hour course is published as a playlist.

### `components/video-player.tsx`

Renders a responsive 16:9 player for embeddable sources. For sources that cannot
be embedded it shows an explanatory panel with a link that opens in a new tab,
rather than a blank frame.

### `app/api/video/metadata/route.ts`

Looks up title, author, thumbnail, and duration through oEmbed. **This needs no
API key and no Google Cloud project.** Verified response for the user's URL:

```
provider   : youtube
canEmbed   : True
embedUrl   : https://www.youtube.com/embed/35X6v3aE86o?list=PLzj7TwUeMQ3jaNyy4v_plf_5PMNK0bb5w
videoId    : 35X6v3aE86o
playlistId : PLzj7TwUeMQ3jaNyy4v_plf_5PMNK0bb5w
title      : Microsoft Project 2019 Beginner to Advanced Training: 8.5-Hour Course!
author     : Simon Sez IT
thumbnail  : https://i.ytimg.com/vi/35X6v3aE86o/hqdefault.jpg
```

The lookup is a convenience and never blocks saving: a timeout or failure falls
back to the URL-derived values.

### `components/lesson-editor.tsx`

The video URL field now checks the address as the instructor types (debounced),
and reports one of two states:

- **Ready to play inside the platform** — with source, author, and whether a
  playlist is included
- **Cannot be embedded** — with the reason

It also offers to fill in the lesson title from the video's own title and the
estimated duration from the video's length, and renders a live preview.

On save, the canonical watch URL is stored rather than whatever was pasted, so
short links and embed links normalise to one stable form.

## 4. Verification

### URL conversion (12 cases, run directly)

```
YOUR URL (with playlist + index) -> youtube.com/embed/35X6v3aE86o?list=PLzj7TwUeMQ3...
Simple watch URL                 -> youtube.com/embed/35X6v3aE86o
Short youtu.be                   -> youtube.com/embed/35X6v3aE86o
Already an embed URL             -> youtube.com/embed/35X6v3aE86o
Playlist only                    -> youtube.com/embed/videoseries?list=PLzj7TwUeMQ3...
Timestamp t=90                   -> youtube.com/embed/35X6v3aE86o?start=90
Timestamp t=1h2m3s               -> youtube.com/embed/35X6v3aE86o?start=3723
Shorts                           -> youtube.com/embed/35X6v3aE86o
Bare paste (no scheme)           -> youtube.com/embed/35X6v3aE86o
Vimeo                            -> player.vimeo.com/video/76979871
Non-embeddable                   -> (cannot embed) + reason
Garbage                          -> (cannot embed) + reason
```

### End-to-end with the user's video

Built a real course from the supplied URL:

```
course   : Microsoft Project 2019: Beginner to Advanced  (published)
module   : Full Course
lesson   : Microsoft Project 2019 Beginner to Advanced Training: 8.5-Hour Course!
           type=video  duration=510 min
```

Then, as the learner:

```
catalog      : course visible under published courses
enroll       : enrollment created
lesson page  : HTTP 200
lesson API   : contentType=video, contentUrl=watch URL preserved
```

## 5. What this does not solve

- **Confidential content.** An unlisted YouTube video is not private: anyone
  with the link can watch it, and it sits on Google's servers. This route is
  appropriate for public or non-sensitive material only. Internal or
  confidential content still requires the storage work in Phase 2.
- **Ads and branding.** YouTube's own interface, ads, and suggested videos are
  visible. The lesson does not look fully like MagpieBridge.
- **Availability.** If the source video is deleted or made private, the lesson
  breaks with no warning. Nothing detects this.
- **Watch-position tracking.** Progress is still marked by the learner clicking
  "Mark Complete". The player does not report how much was watched, which needs
  the YouTube IFrame API.
- **Uploads.** There is still no way to upload a file from a computer.

## 6. Decision context

This delivers the "Tier 1" approach discussed: link to content that already
exists. It is independent of the storage decision (BLK-003), which remains open
and is still required for videos the organisation produces itself or that carry
confidential material.

## 7. Files

| File | Change |
|---|---|
| `lib/video-embed.ts` | New — URL normalisation for YouTube, Vimeo, and fallbacks |
| `components/video-player.tsx` | New — embeddable player with a safe fallback |
| `app/api/video/metadata/route.ts` | New — oEmbed lookup, no API key required |
| `components/lesson-preview.tsx` | Replaced the raw iframe with `VideoPlayer` |
| `components/lesson-editor.tsx` | URL validation, live preview, title and duration suggestions |
