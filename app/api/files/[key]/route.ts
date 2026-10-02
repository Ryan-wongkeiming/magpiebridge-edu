import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDownloadUrl, extractStorageKey } from '@/lib/storage';

/**
 * Serves an uploaded file from S3-compatible storage (Cloudflare R2) via a
 * presigned GET URL.
 *
 * The bucket is private (the secure default), so the stored contentUrl is not
 * directly readable. This route takes the storage key, mints a short-lived
 * presigned GET URL, and redirects the browser to it. Any authenticated user
 * may fetch a file this way; the lesson/course authorization is enforced by
 * the page that links here.
 *
 * Route: GET /api/files/[key]
 *   key is the storage key, e.g. uploads/<uuid>-<filename>
 */
export async function GET(
  request: Request,
  { params }: { params: { key: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const key = decodeURIComponent(params.key);
    if (!key) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    }

    const url = await getDownloadUrl(key);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('File access error:', error);
    return NextResponse.json({ error: 'Failed to access file' }, { status: 500 });
  }
}
