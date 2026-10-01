import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateUploadUrl } from '@/lib/storage';

// Allowed file types for upload
const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Documents
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Text files
  'text/csv',
  'text/xml',
];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    // Only instructors and admins may upload lesson media. A signed-out or
    // learner-only user must not be able to mint presigned URLs.
    const session = await auth();
    const roles = session?.user?.roles ?? [];
    const canUpload = roles.includes('admin') || roles.includes('instructor');

    if (!session?.user || !canUpload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse JSON body
    const { fileName, contentType, fileSize } = await request.json();

    // Validate required fields
    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: 'fileName and contentType are required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(contentType)) {
      return NextResponse.json(
        { 
          error: 'File type not allowed',
          allowedTypes: ALLOWED_FILE_TYPES 
        },
        { status: 400 }
      );
    }

    // Validate file size if provided
    if (fileSize !== undefined && fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes` 
        },
        { status: 400 }
      );
    }

    // Validate filename (basic security)
    if (fileName.includes('..') || fileName.startsWith('/') || fileName.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    // Generate presigned upload URL
    const { uploadUrl, contentUrl, storageKey } = await generateUploadUrl(
      fileName,
      contentType
    );

    return NextResponse.json({
      uploadUrl,      // URL to PUT the file to
      contentUrl,     // URL to store in Lesson.contentUrl
      storageKey,     // Internal storage key (for cleanup if needed)
      expiresIn: 300  // URL expires in 5 minutes
    });
  } catch (error) {
    console.error('Upload URL generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
