# MagpieBridge-Edu

MagpieBridge-Edu is an in-house learning platform project for building a Coursera-style internal education, training, assessment, and certification system. The project starts with a lightweight AI-agent operating harness so future planning, design, and implementation work stays traceable.

## Agent bootstrap

Before working on this project, read these files in order:

1. `AGENTS.md`
2. `agents/plans/PICKUP.md`
3. `README.md`
4. `context/foundation.md`

Every agent job should produce a named output and update `agents/plans/PICKUP.md`.

## Current status

The MVP learning loop is implemented and verified end to end. Phase 1 is complete as of 2026-09-23.

Working today: authentication (credentials), course authoring with modules and lessons, module and lesson reordering, course preview, course archiving with history preserved, enrollment (self and admin-assigned), lesson progress tracking, quizzes with automatic scoring, certificate issuance, PDF download, public certificate validation, admin revocation, admin user and role management, instructor progress views, learner personal progress, and inline playback of YouTube and Vimeo video.

### Attaching video to a lesson

Choose **Video** as the lesson content type and paste the address from your browser — a normal YouTube or Vimeo link. The editor converts it for playback automatically, shows a live preview, and offers to fill in the lesson title and duration from the video itself.

**Some videos cannot be embedded.** If the owner has disabled "playback on other websites", the video can only be watched on YouTube. The editor detects this and says so, and learners see a video card with the thumbnail and a link, instead of a player showing the owner's error.

### How lesson completion works

Completion is not a free click. For a video lesson:

- The player reports how far the learner has watched, every few seconds.
- **The lesson completes automatically once 90% has been watched.** No button is needed.
- The furthest point reached is what counts, so seeking backwards never reduces progress, and the learner resumes where they left off.
- On the course page, video lessons show only "Open lesson" (or "Review" once done) — there is no "Mark Complete" button, because completion is automatic. Non-video lessons keep the button.
- For a video that **cannot** play in-app, watching cannot be measured, so the learner ticks a confirmation box instead. That is recorded as an acknowledgement, clearly distinguished from a measured completion.

Non-video lessons (text, documents, external links) are still completed by clicking Mark Complete, as before.

The threshold is `COMPLETION_THRESHOLD_PERCENT`, defined in both `components/video-player.tsx` (for display) and `app/api/lesson-progress/route.ts` (for enforcement). Change both together.

### Adding a playlist as individual lessons

YouTube's RSS feed lists a playlist's videos without needing an API key:

```
https://www.youtube.com/feeds/videos.xml?playlist_id=<PLAYLIST_ID>
```

That returns each video's ID and title, which is enough to create one lesson per video so the course page reads like a real outline rather than a single embedded series.

Build state: `npx tsc --noEmit` reports 0 errors and `npx next build` succeeds. Styling runs on Tailwind CSS v3 via `postcss.config.js`; do not install Tailwind v4, `tailwind.config.ts` is written for v3.

## Navigating the app

A role-aware navigation bar appears once you sign in. Links shown depend on your roles:

| Role | Links |
|---|---|
| Learner | Dashboard, Catalog, My Courses, My Progress, Certificates |
| Instructor | plus Authoring, Learner Progress |
| Admin | plus Users, Assign Courses, Certificates |

## Local development

Prerequisites: Node.js 18+, PostgreSQL running locally.

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

`.env` must define `DATABASE_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`. On this machine PostgreSQL 18 is running and the database `magpiebridge_edu` is already migrated and seeded.

Seeded accounts (development only) all use the password `password123`:

| Account | Email | Roles |
|---|---|---|
| Admin | `admin@magpiebridge.edu` | admin, instructor |
| Instructor | `instructor@magpiebridge.edu` | instructor |
| Manager | `manager@magpiebridge.edu` | manager |
| Learner | `learner@magpiebridge.edu` | learner |

The app runs at http://localhost:3000. On Windows, PowerShell may block `npm.ps1`; run the dev server from cmd.exe: `cd /d D:\OneDrive\MagpieBridge-Edu && npm run dev`.

## OneDrive note

This project lives inside a OneDrive-synced folder, which is deliberate: the user wants OneDrive's version history as a backup.

That setup crashes the Next.js **dev server** with `EINVAL: readlink`. The mechanism: OneDrive marks files and folders under `.next` as reparse points, Node's `readdir` reports those as symbolic links even though they are not, and Next.js's cache cleanup then calls `readlink` on them — which throws on Windows for this kind of reparse point.

**Fix: `scripts/fix-onedrive-readlink.js`**, loaded with `node --require` by the `dev` script. It patches `readdir` so those entries stop claiming to be symlinks, which is where the false information originates. Only paths inside `.next` are inspected, so normal file walking pays nothing.

Three things worth knowing, each learned the hard way:

- **Patch `readdir`, not `readlink`.** Returning a substitute path from `readlink` looks like it works but causes infinite recursion: Next.js stats the returned path, sees a directory, and walks into it forever until the process runs out of memory.
- **`cleanDistDir: false` does not fix the dev server.** It is honoured by the build path only; the dev server's cleanup runs unconditionally.
- **The build does not need the shim.** It succeeds on its own in about a minute, which is why `npm run build` is left as plain `next build`.

**Always start the dev server with `npm run dev`**, not `npx next dev`, or the shim will not load.

Do not run `npm run build` while the dev server is running. They share the `.next` directory, and mixing production output with development output causes `EBUSY` errors. Stop one before starting the other.

If a start still fails with `EINVAL` or `EBUSY`, clear the cache from cmd.exe:

```
cmd /c "cd /d D:\OneDrive\MagpieBridge-Edu && rmdir /s /q .next"
```

PowerShell's `Remove-Item -Recurse -Force` silently skips reparse points, so it does not fix this.

### Backups

There is currently **no version control** (no git repository), so OneDrive's own file history is the only backup. That is thin protection for source code. Adding git alongside OneDrive would give proper history without giving up the OneDrive sync.

## Known limitations

- **No file upload.** There is no upload endpoint and no storage integration. Lesson media is attached by pasting an external URL. The `Lesson` model already has `contentType` and `contentUrl` fields ready for real uploads.
- **External video is not private.** An unlisted YouTube video can be watched by anyone with the link and is hosted on Google's servers. Use external video for public or non-sensitive material only; confidential content needs the storage work in Phase 2.
- **Watch tracking depends on the browser.** It uses the YouTube IFrame API, so it works for YouTube videos played in-app. A learner who disables JavaScript, or who uses a blocked video's confirmation box, is not measured — that limitation is inherent to embedding someone else's player.
- **No automated tests.** Every change so far has been verified by hand.
- Manager and admin platform-wide progress views are not built (Phase 3).
- Learning paths have database tables but no implementation.
- Audit logging has a table but no implementation.
- `lib/email.ts` does not send real mail; password reset tokens are written to the database only.
- The identity provider is still open (Entra, Google, or email-first); the credentials provider is the only one wired.
- The visual design is functional but generic; there has been no design pass.
- Two parallel certificate component sets exist (`components/certificate-*.tsx` and `components/certificates/*.tsx`); both compile, and consolidating them is a follow-up job.
