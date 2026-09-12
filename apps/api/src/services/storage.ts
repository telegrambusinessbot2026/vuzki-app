import { config } from '../config';
import { ApiErrorResponse } from '@vuzki/types';
import path from 'path';
import fs from 'fs';
import { generateToken } from '@vuzki/utils';

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const ALLOWED_AUDIO_MIMES = ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/wav'];
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export const ALLOWED_MIME_BY_TYPE: Record<string, { mimes: string[]; maxBytes: number }> = {
  avatar: { mimes: [...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES], maxBytes: MAX_IMAGE_BYTES },
  photo: { mimes: ALLOWED_IMAGE_MIMES, maxBytes: MAX_IMAGE_BYTES },
  message_image: { mimes: ALLOWED_IMAGE_MIMES, maxBytes: MAX_IMAGE_BYTES },
  message_voice: { mimes: ALLOWED_AUDIO_MIMES, maxBytes: MAX_AUDIO_BYTES },
  gift: { mimes: ALLOWED_IMAGE_MIMES, maxBytes: MAX_IMAGE_BYTES },
  kyc: { mimes: [...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES], maxBytes: MAX_VIDEO_BYTES },
};

export function validateUpload(type: string, mime: string, sizeBytes: number) {
  const rule = ALLOWED_MIME_BY_TYPE[type];
  if (!rule) throw new ApiErrorResponse(400, 'INVALID_UPLOAD_TYPE', 'Invalid upload type');
  if (!rule.mimes.includes(mime)) {
    throw new ApiErrorResponse(400, 'INVALID_FILE_TYPE', `File type "${mime}" not allowed for ${type}`);
  }
  if (sizeBytes > rule.maxBytes) {
    throw new ApiErrorResponse(400, 'FILE_TOO_LARGE', `File exceeds max size of ${Math.round(rule.maxBytes / 1024 / 1024)}MB`);
  }
  return true;
}

export async function saveFile(params: { type: string; mime: string; originalName: string; buffer: Buffer; userId: string }): Promise<{ url: string; key: string }> {
  validateUpload(params.type, params.mime, params.buffer.length);

  if (config.storageProvider === 's3' && config.s3Bucket) {
    return saveToS3(params);
  }

  return saveToLocal(params);
}

async function saveToLocal(params: { type: string; originalName: string; buffer: Buffer; userId: string; mime?: string }): Promise<{ url: string; key: string }> {
  const folder = path.join(process.cwd(), config.uploadDir, params.type);
  fs.mkdirSync(folder, { recursive: true });
  const ext = path.extname(params.originalName) || '.bin';
  const filename = `${generateToken(8)}${ext}`;
  const fullPath = path.join(folder, filename);
  fs.writeFileSync(fullPath, params.buffer);

  const relPath = `/uploads/${params.type}/${filename}`;
  return { url: relPath, key: relPath };
}

async function saveToS3(params: { type: string; originalName: string; buffer: Buffer; userId: string }): Promise<{ url: string; key: string }> {
  // S3-compatible storage integration. Requires @aws-sdk/client-s3
  // This is a clean integration layer - implement with AWS SDK when creds provided.
  throw new ApiErrorResponse(501, 'STORAGE_NOT_CONFIGURED', 'S3 storage requires configuration');
}
