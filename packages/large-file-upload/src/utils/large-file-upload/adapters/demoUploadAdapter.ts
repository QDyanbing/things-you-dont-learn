import {
  completeUpload,
  createUpload,
  createUploadsApiClient,
  getUploadParts,
  putUploadPart,
  type UploadApiClientOptions,
  type UploadDto,
  type UploadsApiClient,
} from '../../../api/uploads';
import type { CompleteUploadResult, UploadAdapter, UploadPartRecord } from '../types';

/**
 * Demo backend state mirrored into uploader snapshots so the page can inspect
 * the latest upload resource returned by the mock API.
 */
export interface DemoUploadServerContext {
  upload: UploadDto;
}

/**
 * Minimal result surface used by the demo UI after completion.
 */
export interface DemoUploadResult {
  fileUrl: string;
}

export interface DemoUploadAdapterOptions {
  apiClient?: UploadsApiClient;
  apiClientOptions?: UploadApiClientOptions;
}

/**
 * Normalizes the file URL format expected by the demo page.
 */
function buildResult(fileName: string): DemoUploadResult {
  return {
    fileUrl: `/files/${encodeURIComponent(fileName)}`,
  };
}

/**
 * The mock create endpoint only returns part numbers, while the uploader core
 * expects normalized `UploadPartRecord` objects.
 */
function mapUploadedParts(parts: number[] | UploadPartRecord[]) {
  if (parts.length === 0) {
    return [];
  }

  if (typeof parts[0] === 'number') {
    return (parts as number[]).map((partNumber) => ({ partNumber }));
  }

  return parts as UploadPartRecord[];
}

/**
 * Adapter that translates the demo REST endpoints into the generic uploader protocol.
 */
export function createDemoUploadAdapter(
  options: DemoUploadAdapterOptions = {},
): UploadAdapter<DemoUploadServerContext, DemoUploadResult> {
  const apiClient =
    options.apiClient ?? (options.apiClientOptions ? createUploadsApiClient(options.apiClientOptions) : null);
  const api = {
    createUpload: apiClient?.createUpload ?? createUpload,
    getUploadParts: apiClient?.getUploadParts ?? getUploadParts,
    putUploadPart: apiClient?.putUploadPart ?? putUploadPart,
    completeUpload: apiClient?.completeUpload ?? completeUpload,
  };

  return {
    async createUploadSession(input) {
      const response = await api.createUpload({
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
      const response = await api.getUploadParts(input.uploadId);
      return response.parts.map((part) => ({
        partNumber: part.partNumber,
        partHash: part.partHash,
        size: part.size,
      }));
    },

    async uploadPart(input) {
      const response = await api.putUploadPart({
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
      const response = await api.completeUpload(input.uploadId);

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
