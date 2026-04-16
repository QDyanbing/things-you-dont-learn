import { v4 as uuidv4 } from 'uuid';
import type { CreateUploadInput, Upload, UploadPart } from './types.js';

const uploads = new Map<string, Upload>();
const completedByHash = new Map<string, { uploadId: string; completedAt: string }>();

function now() {
  return new Date().toISOString();
}

function toUploadResource(upload: Upload) {
  const uploadedPartNumbers = Array.from(upload.uploadedParts.keys()).sort((a, b) => a - b);

  return {
    uploadId: upload.uploadId,
    fileName: upload.fileName,
    fileHash: upload.fileHash,
    fileSize: upload.fileSize,
    partSize: upload.partSize,
    totalParts: upload.totalParts,
    uploadedPartNumbers,
    uploadedPartCount: uploadedPartNumbers.length,
    progress: Number(((uploadedPartNumbers.length / upload.totalParts) * 100).toFixed(2)),
    status: upload.status,
    createdAt: upload.createdAt,
    updatedAt: upload.updatedAt,
  };
}

export function createUpload(input: CreateUploadInput) {
  const totalParts = Math.max(1, Math.ceil(input.fileSize / input.partSize));
  const existingCompleted = completedByHash.get(input.fileHash);

  if (existingCompleted) {
    const upload = uploads.get(existingCompleted.uploadId);
    if (upload) {
      return {
        upload,
        existed: true,
        completed: true,
      };
    }
  }

  const existingUpload = Array.from(uploads.values()).find(
    (item) => item.fileHash === input.fileHash && item.status !== 'completed',
  );

  if (existingUpload) {
    existingUpload.updatedAt = now();
    return {
      upload: existingUpload,
      existed: true,
      completed: false,
    };
  }

  const timestamp = now();
  const upload: Upload = {
    uploadId: uuidv4(),
    fileName: input.fileName,
    fileHash: input.fileHash,
    fileSize: input.fileSize,
    partSize: input.partSize,
    totalParts,
    uploadedParts: new Map<number, UploadPart>(),
    status: 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  uploads.set(upload.uploadId, upload);

  return {
    upload,
    existed: false,
    completed: false,
  };
}

export function getUpload(uploadId: string) {
  return uploads.get(uploadId) ?? null;
}

export function listUploadedParts(uploadId: string) {
  const upload = uploads.get(uploadId);
  if (!upload) {
    return null;
  }

  return Array.from(upload.uploadedParts.values()).sort((a, b) => a.partNumber - b.partNumber);
}

export function putUploadPart(uploadId: string, payload: UploadPart) {
  const upload = uploads.get(uploadId);
  if (!upload) {
    return null;
  }

  upload.uploadedParts.set(payload.partNumber, payload);
  upload.updatedAt = now();
  return upload;
}

export function completeUpload(uploadId: string) {
  const upload = uploads.get(uploadId);
  if (!upload) {
    return null;
  }

  upload.status = 'completed';
  upload.updatedAt = now();
  completedByHash.set(upload.fileHash, {
    uploadId: upload.uploadId,
    completedAt: upload.updatedAt,
  });
  return upload;
}

export function abortUpload(uploadId: string) {
  const upload = uploads.get(uploadId);
  if (!upload) {
    return null;
  }

  uploads.delete(uploadId);

  const completed = completedByHash.get(upload.fileHash);
  if (completed?.uploadId === uploadId) {
    completedByHash.delete(upload.fileHash);
  }

  return upload;
}

export { toUploadResource };
