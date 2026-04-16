import {
  type CompleteUploadPayload,
  completeUpload,
  createUpload,
  createUploadsApiClient,
  getUploadParts,
  putUploadPart,
  type CreateUploadPayload,
  type PutUploadPartPayload,
  type UploadApiClientOptions,
  type UploadDto,
  type UploadsApiClient,
} from '../../../api/uploads';
import type {
  CompleteUploadResult,
  UploadAdapter,
  UploadChunkDescriptor,
  UploadMaybePromise,
  UploadPartRecord,
} from '../types';

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

export interface DemoUploadRequestDataContext {
  stage: 'createUpload' | 'uploadPart' | 'completeUpload';
  file: File;
  fileHash: string;
  partSize: number;
  totalParts: number;
  uploadId?: string;
  chunk?: UploadChunkDescriptor;
  completedParts?: UploadPartRecord[];
  serverContext?: DemoUploadServerContext;
}

export type DemoUploadRequestDataValue = Record<string, unknown> | undefined;

export type DemoUploadRequestDataResolver = (
  context: DemoUploadRequestDataContext,
) => UploadMaybePromise<DemoUploadRequestDataValue>;

export interface DemoUploadRequestDataOptions {
  createUpload?: DemoUploadRequestDataValue | DemoUploadRequestDataResolver;
  uploadPart?: DemoUploadRequestDataValue | DemoUploadRequestDataResolver;
  completeUpload?: DemoUploadRequestDataValue | DemoUploadRequestDataResolver;
}

export interface DemoUploadAdapterOptions {
  /**
   * Fully constructed API client. When provided, it takes precedence over the
   * convenience `apiClientOptions` path below.
   */
  apiClient?: UploadsApiClient;
  /**
   * Convenience options for teams that only need to inject auth or base URL
   * without building a custom client by hand.
   */
  apiClientOptions?: UploadApiClientOptions;
  /**
   * Business-side extra request payload injected into create / part / complete
   * calls, for fields such as bizType, folderId, tenantId, or traceId.
   */
  requestData?: DemoUploadRequestDataOptions;
}

function isRequestDataResolver(
  value: DemoUploadRequestDataValue | DemoUploadRequestDataResolver | undefined,
): value is DemoUploadRequestDataResolver {
  return typeof value === 'function';
}

async function resolveRequestData(
  value: DemoUploadRequestDataValue | DemoUploadRequestDataResolver | undefined,
  context: DemoUploadRequestDataContext,
) {
  if (isRequestDataResolver(value)) {
    return value(context);
  }

  return value;
}

function mergePayload<TPayload extends Record<string, unknown>>(
  payload: TPayload,
  extraData: Record<string, unknown> | undefined,
) {
  return {
    ...payload,
    ...extraData,
  };
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
  // Prefer an injected client so business projects can share a centralized
  // request layer. Fall back to demo defaults when no customization is needed.
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
      const createRequestData = await resolveRequestData(options.requestData?.createUpload, {
        stage: 'createUpload',
        file: input.file,
        fileHash: input.fileHash,
        partSize: input.partSize,
        totalParts: input.totalParts,
        uploadId: input.existingUploadId,
        serverContext: input.checkpoint?.serverContext as DemoUploadServerContext | undefined,
      });
      const response = await api.createUpload(
        mergePayload<CreateUploadPayload>(
          {
            fileName: input.file.name,
            fileHash: input.fileHash,
            fileSize: input.file.size,
            partSize: input.partSize,
          },
          createRequestData,
        ),
      );

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
      const uploadPartRequestData = await resolveRequestData(options.requestData?.uploadPart, {
        stage: 'uploadPart',
        file: input.file,
        fileHash: input.fileHash,
        partSize: input.serverContext?.upload.partSize ?? input.chunk.size,
        totalParts: input.serverContext?.upload.totalParts ?? Math.max(1, input.chunk.index + 1),
        uploadId: input.uploadId,
        chunk: input.chunk,
        serverContext: input.serverContext,
      });
      const response = await api.putUploadPart(
        mergePayload<PutUploadPartPayload>(
          {
            uploadId: input.uploadId,
            partHash: input.partHash ?? `${input.fileHash}-${input.chunk.partNumber}`,
            partNumber: input.chunk.partNumber,
            size: input.chunk.size,
          },
          uploadPartRequestData,
        ),
      );

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
      const completeRequestData = await resolveRequestData(options.requestData?.completeUpload, {
        stage: 'completeUpload',
        file: input.file,
        fileHash: input.fileHash,
        partSize: input.partSize,
        totalParts: input.totalParts,
        uploadId: input.uploadId,
        completedParts: input.completedParts,
        serverContext: input.serverContext,
      });
      const response = await api.completeUpload(
        input.uploadId,
        mergePayload<CompleteUploadPayload>({}, completeRequestData),
      );

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
