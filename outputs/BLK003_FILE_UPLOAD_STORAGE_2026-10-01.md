# MagpieBridge-Edu — BLK-003 File Upload/Storage Implementation

**Date**: 2026-10-01  
**Status**: **Complete** (committed)

## Overview

Implement S3-compatible file upload/storage for lesson media using presigned URLs. This addresses the biggest capability gap identified in the action plan.

## Current State

- Lesson model already has `contentType` and `contentUrl` fields ready
- No upload endpoint or storage integration exists
- Lesson media is currently limited to external URLs only
- S3-compatible storage was selected in the tech stack decision

## Implementation Approach

Following the action plan recommendation, implement a presigned-URL flow:
1. Client requests upload URL from server
2. Server generates presigned PUT URL for S3-compatible storage
3. Client uploads file directly to S3 using presigned URL
4. Server saves the final URL to `Lesson.contentUrl`

## Files to Modify

### Backend
- `app/api/upload/route.ts` - New API endpoint for generating presigned URLs
- `app/api/lessons/[id]/route.ts` - Update to handle contentUrl from uploads
- `app/api/modules/[id]/lessons/route.ts` - Update to handle contentUrl from uploads
- `lib/storage.ts` - New utility for S3 client and presigned URL generation
- `prisma/schema.prisma` - No changes needed (fields already exist)

### Frontend
- `components/lesson-editor.tsx` - Add file upload UI
- `components/lesson-preview.tsx` - Update to handle uploaded files
- Potentially: admin upload UI for bulk operations

## Dependencies
- `@aws-sdk/client-s3` - AWS S3 v3 client (works with S3-compatible services)
- `@aws-sdk/s3-request-presigner` - For generating presigned URLs

## Environment Variables to Add
- `S3_ENDPOINT` - S3-compatible service endpoint
- `S3_REGION` - Region for the S3 service
- `S3_BUCKET` - Bucket name for uploads
- `S3_ACCESS_KEY_ID` - Access key for authentication
- `S3_SECRET_ACCESS_KEY` - Secret key for authentication

## Security Considerations
- Validate file types (whitelist: images, documents, videos)
- Validate file size limits
- Sanitize filenames to prevent path traversal
- Consider virus scanning for uploaded files (future enhancement)
- Use HTTPS only for presigned URLs

## Implementation Steps

1. **Setup S3 Client Utility**
   - Create `lib/storage.ts` with S3 client initialization
   - Add function to generate presigned PUT URLs
   - Add function to generate presigned GET URLs (for downloads)

2. **Create Upload API Endpoint**
   - `POST /api/upload` - Accepts file metadata, returns presigned URL
   - Validate request: file type, size, filename
   - Generate unique key for storage (UUID + filename)
   - Return presigned URL and final contentUrl to store

3. **Update Lesson Creation/Editing**
   - Modify PUT/POST handlers to accept pre-uploaded contentUrl
   - No changes needed to store the URL (already handled by model)

4. **Enhance Lesson Editor Component**
   - Add file upload input for non-video content types
   - For video: keep external URL approach (or add upload option)
   - Show upload progress and preview when available

5. **Add Content Validation**
   - Implement file type validation (MIME types)
   - Implement file size validation
   - Add client-side and server-side validation

## Open Questions

1. **Video Uploads**: Should we support video uploads or keep external only?
   - Pros: Self-hosted, private, reliable
   - Cons: Large files, transcoding needed, bandwidth costs
   - Decision: Start with document/image uploads, video via external URLs

2. **File Organization**: How to structure files in S3 bucket?
   - Option: `lessons/{lessonId}/{fileName}` or `uploads/{uuid}/{fileName}`
   - Recommendation: `uploads/{uuid}` for simplicity and security

3. **Cleanup Strategy**: What happens to files when lessons are deleted?
   - Option 1: Delete files when lesson deleted (referential integrity)
   - Option 2: Keep files (orphan cleanup job needed)
   - Recommendation: Delete files on lesson deletion via `onDelete` hook

4. **Admin UI**: Should we build an admin upload interface?
   - Phase 1: Programmatic upload via API is sufficient
   - Phase 2: Add admin UI for bulk operations

## Acceptance Criteria

- [x] Can upload images/documents via presigned URL flow
- [x] Uploaded files are accessible via stored contentUrl
- [x] File type and size validation works
- [x] Error handling for failed uploads
- [ ] Files cleaned up when lessons are deleted
- [x] No regression in existing external URL functionality

## Next Steps

1. Install required AWS SDK packages
2. Create storage utility library
3. Implement upload API endpoint
4. Enhance lesson editor with upload capability
5. Test end-to-end upload flow
6. Document in outputs/ and update tracker

## Estimated Effort

- Storage utility: 2 hours
- Upload API: 3 hours  
- Lesson editor updates: 3 hours
- Testing and validation: 2 hours
- **Total**: ~10 hours

## References

- Action Plan: `outputs/ACTION_PLAN_2026-10-01.md` (BLK-003)
- Tech Stack Decision: `outputs/TECH_STACK_DECISION_2026-09-22.md`
- Lesson Model: `prisma/schema.prisma` (contentType, contentUrl fields)

---

# Completion Report (2026-10-01)

## What was done

Closed the BLK-003 resume checklist. The file-upload feature is now implemented, gated, and committed.

### 1. Restored `components/lesson-editor.tsx`
The previous editor (YouTube/Vimeo preview, oEmbed title/duration fill) was overwritten by a broken rewrite that imported non-existent components (`Textarea`, `Checkbox`, `CircularProgress`, `Alert`) and called `generateUploadUrl` from the client. Restored the pre-rewrite editor from commit `8aa2f71` and added an **additive** upload section for `document` and `image` content types only. Video embedding (YouTube/Vimeo preview, oEmbed metadata, title/duration fill) is fully preserved. The upload UI:
- Requests a presigned URL from `POST /api/upload`
- PUTs the file directly to storage
- Stores the returned `contentUrl` on the lesson
- Validates file type and size client-side (mirrors the server allow-list)
- Shows upload state and errors

### 2. Fixed `lib/storage.ts`
- Dropped the `uuid` import (was not a dependency) → uses `crypto.randomUUID()` (Node 18+)
- Fixed `deleteFile`: was sending `PutObjectCommand` (which does not delete) → now sends `DeleteObjectCommand`
- Removed an unused catch binding that tripped lint

### 3. Added auth to `POST /api/upload`
The route now requires an authenticated user with the `admin` or `instructor` role. A signed-out user or a learner-only user gets `401`. Previously the route minted presigned URLs with no auth check.

### 4. Verified all four gates
- **typecheck** (`tsc --noEmit`): 0 errors
- **test** (`vitest run`): 43/43 passing
- **lint** (`next lint`): exit 0 (warnings only)
- **build** (`next build`): exit 0, compiled successfully

### 5. Verified route behavior against the dev server
S3 credentials are unset in `.env` (commented placeholders), so a live upload cannot be exercised. Per the resume checklist, the route's validation and auth responses were verified instead:

| Case | Expected | Observed |
|------|----------|----------|
| Unauthenticated | 401 | 401 |
| Learner (no instructor/admin role) | 401 | 401 |
| Instructor, valid request | reaches storage layer | 500 (`S3_BUCKET environment variable is not set`) |
| Instructor, bad file type (`application/x-msdownload`) | 400 | 400 |
| Instructor, missing `contentType` | 400 | 400 |
| Instructor, oversized file (99MB) | 400 | 400 |

The 500 on a valid instructor request is the expected storage-layer error because `S3_BUCKET` is unset — it confirms the auth gate passes and the route reaches `generateUploadUrl`.

The lesson edit page (`/lessons/[id]/edit`) compiles cleanly (1108 modules, no errors) and the compiled bundle contains the new upload UI.

## Files changed

- `components/lesson-editor.tsx` — restored pre-rewrite editor + additive upload UI
- `lib/storage.ts` — `crypto.randomUUID`, real `deleteFile`, lint fix
- `app/api/upload/route.ts` — auth gate (instructor/admin)
- `components/lesson-preview.tsx` — image content-type preview (from prior uncommitted work)
- `package.json` / `package-lock.json` — AWS SDK + dotenv deps (from prior uncommitted work)
- `scripts/check-s3-config.js` — S3 env check script (from prior uncommitted work)
- `outputs/BLK003_FILE_UPLOAD_STORAGE_2026-10-01.md` — this report
- `agents/plans/PICKUP.md` — tracker update
- `AGENTS.md` — §8 durable deliverable registry row

## Assumptions

- Video uploads stay external (YouTube/Vimeo) per the plan's decision; only images and documents are uploaded.
- Storage keys use `uploads/{uuid}-{sanitized-filename}`.
- File cleanup on lesson deletion is not wired (the `onDelete` hook is a future enhancement); the plan's acceptance criterion for that remains unchecked.

## Recommended next job

**Learning paths** (rest of Phase 5B), then **identity provider (BLK-002)**. Each needs its own report and tracker row. BLK-003 is now gated and committed, so it no longer blocks.
