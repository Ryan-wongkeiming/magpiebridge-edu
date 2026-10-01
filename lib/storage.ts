import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 client
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  // Force path style for S3-compatible services that don't support virtual hosting
  forcePathStyle: !!process.env.S3_ENDPOINT,
});

const BUCKET = process.env.S3_BUCKET || '';

/**
 * Generate a presigned PUT URL for uploading a file to S3
 * @param fileName Original filename
 * @param contentType MIME type of the file
 * @returns Object containing the presigned URL and the storage key
 */
export async function generateUploadUrl(
  fileName: string,
  contentType: string
): Promise<{
  uploadUrl: string;
  contentUrl: string;
  storageKey: string;
}> {
  if (!BUCKET) {
    throw new Error('S3_BUCKET environment variable is not set');
  }

  // Generate a unique storage key to prevent collisions.
  // crypto.randomUUID is available in Node 18+ and needs no extra dependency.
  const storageKey = `uploads/${crypto.randomUUID()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 300, // 5 minutes
  });

  // The contentUrl that will be stored in the database
  // For S3-compatible services, we construct the public URL
  let contentUrl: string;
  if (process.env.S3_ENDPOINT) {
    // Custom endpoint (like MinIO, etc.)
    contentUrl = `${process.env.S3_ENDPOINT}/${BUCKET}/${storageKey}`;
  } else {
    // AWS S3 standard format
    contentUrl = `https://${BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${storageKey}`;
  }

  return {
    uploadUrl,
    contentUrl,
    storageKey,
  };
}

/**
 * Generate a presigned GET URL for downloading/accessing a file from S3
 * @param storageKey The S3 object key
 * @returns Presigned URL for accessing the file
 */
export async function getDownloadUrl(storageKey: string): Promise<string> {
  if (!BUCKET) {
    throw new Error('S3_BUCKET environment variable is not set');
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
  });

  return await getSignedUrl(s3Client, command, {
    expiresIn: 3600, // 1 hour
  });
}

/**
 * Extract storage key from a contentUrl
 * Works with both AWS S3 format and custom endpoint format
 * @param contentUrl The full URL to the file
 * @returns The storage key or null if not recognized
 */
export function extractStorageKey(contentUrl: string): string | null {
  try {
    const url = new URL(contentUrl);
    
    // If using custom endpoint
    if (process.env.S3_ENDPOINT && url.hostname === new URL(process.env.S3_ENDPOINT).hostname) {
      // Path format: /bucket/key
      const pathParts = url.pathname.split('/').filter(part => part.length > 0);
      if (pathParts.length >= 2 && pathParts[0] === BUCKET) {
        return pathParts.slice(1).join('/');
      }
    } 
    // If using AWS S3 virtual hosted style
    else if (url.hostname.endsWith(`.s3.${process.env.S3_REGION}.amazonaws.com`)) {
      const [bucket] = url.hostname.split('.');
      if (bucket === BUCKET) {
        return url.pathname.substring(1); // Remove leading '/'
      }
    }
    // If using AWS S3 path style
    else if (url.hostname === `s3.${process.env.S3_REGION}.amazonaws.com`) {
      const pathParts = url.pathname.split('/').filter(part => part.length > 0);
      if (pathParts.length >= 2 && pathParts[0] === BUCKET) {
        return pathParts.slice(1).join('/');
      }
    }
  } catch {
    // Not a valid URL
    return null;
  }
  
  return null;
}

/**
 * Delete a file from S3 storage
 * @param storageKey The S3 object key to delete
 */
export async function deleteFile(storageKey: string): Promise<void> {
  if (!BUCKET) {
    throw new Error('S3_BUCKET environment variable is not set');
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
  });

  await s3Client.send(command);
}
