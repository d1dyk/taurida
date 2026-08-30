import fs from 'fs';
import path from 'path';

export const VALID_FOLDERS = ['products', 'news', 'hero', 'site'] as const;
export type UploadFolder = typeof VALID_FOLDERS[number];

export function isValidFolder(folder: string): folder is UploadFolder {
  return VALID_FOLDERS.includes(folder as UploadFolder);
}

export function ensureUploadDir(folder: string): string {
  const dirPath = path.join(process.cwd(), 'public', 'uploads', folder);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

/**
 * Validate binary buffer by checking real magic bytes / file signatures
 */
export function getValidExtension(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 4) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return '.jpg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return '.png';
  }

  // WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return '.webp';
  }

  // MP4 / MOV: ftyp box
  if (buffer.length >= 8 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    return '.mp4';
  }

  // WEBM / MKV: 1A 45 DF A3
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return '.webm';
  }

  // JXL: FF 0A or 00 00 00 0C 4A 58 4C 20
  if (
    (buffer[0] === 0xff && buffer[1] === 0x0a) ||
    (buffer.length >= 12 && buffer.toString('hex', 0, 8) === '0000000c4a584c20')
  ) {
    return '.jxl';
  }

  // Fallback for SVG or plain text images if needed, otherwise strict return null
  return null;
}
