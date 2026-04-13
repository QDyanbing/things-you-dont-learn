import { completeUpload, createUpload, getUploadParts, putUploadPart, type UploadDto } from '../../../api/uploads';
import type { CompleteUploadResult, UploadAdapter, UploadPartRecord } from '../types';

export interface DemoUploadServerContext {
  upload: UploadDto;
}

export interface DemoUploadResult {
  fileUrl: string;
}

function buildResult(fileName: string): DemoUploadResult {
  return {
    fileUrl: `/files/${encodeURIComponent(fileName)}`,
  };
}

function mapUploadedParts(parts: number[] | UploadPartRecord[]) {
  if (parts.length === 0) {
    return [];
  }

  if (typeof parts[0] === 'number') {
    return (parts as number[]).map((partNumber) => ({ partNumber }));
  }

  return parts as UploadPartRecord[];
}

export function createDemoUploadAdapter(): UploadAdapter<DemoUploadServerContext, DemoUploadResult> {
  return {
    async createUploadSession(input) {
      const response = await createUpload({
        fileName: input.file.name,
        fileHash: input.fileHash,
        fileSize: input.file.size,
        partSize: input.partSize,
      });

      return {
        uploadId: response.upload.uploadId,
        partSize: response.upload.partSize,
        uploadedParts: mapUploadedParts(response.upload.uploadedPartNumbers),
        completed: response.completed,
        result: response.completed ? buildResult(response.upload.fileName) : undefined,
        serverContext: {
          upload: response.upload,
        },
      };
    },

    async listUploadedParts(input) {
      const response = await getUploadParts(input.uploadId);
      return response.parts.map((part) => ({
        partNumber: part.partNumber,
        partHash: part.partHash,
        size: part.size,
      }));
    },

    async uploadPart(input) {
      const response = await putUploadPart({
        uploadId: input.uploadId,
        partHash: input.partHash ?? `${input.fileHash}-${input.chunk.partNumber}`,
        partNumber: input.chunk.partNumber,
        size: input.chunk.size,
      });

      return {
        part: {
          partNumber: input.chunk.partNumber,
          partHash: input.partHash,
          size: input.chunk.size,
        },
        serverContext: {
          upload: response.upload,
        },
      };
    },

    async completeUpload(input): Promise<CompleteUploadResult<DemoUploadServerContext, DemoUploadResult>> {
      const response = await completeUpload(input.uploadId);

      return {
        result: {
          fileUrl: response.file.url,
        },
        serverContext: {
          upload: response.upload,
        },
      };
    },
  };
}
