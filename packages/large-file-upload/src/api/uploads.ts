const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

/**
 * Lightweight metadata passed into auth/header resolvers so callers can tailor
 * credentials for create, resume, part upload, and completion requests.
 */
export interface UploadApiRequestContext {
  path: string;
  method: string;
  uploadId?: string;
  partNumber?: number;
}

/**
 * Allows auth-related options to be either static values or per-request
 * resolvers, which is useful when tokens must be read lazily.
 */
export type UploadApiResolvable<TValue> =
  | TValue
  | ((context: UploadApiRequestContext) => TValue | Promise<TValue>);

/**
 * Shared configuration for the demo upload API client.
 *
 * The auth-related hooks live here so business projects can keep login/session
 * logic centralized instead of duplicating it across adapter methods.
 */
export interface UploadApiClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
  /**
   * Static headers or a resolver that can derive headers from request context.
   * Typical usage is injecting bearer tokens or tenant identifiers.
   */
  headers?: UploadApiResolvable<HeadersInit | undefined>;
  /**
   * Static credentials mode or a resolver for cookie-based auth scenarios.
   */
  credentials?: UploadApiResolvable<RequestCredentials | undefined>;
  /**
   * Called once when a request receives 401. Return `true` after refreshing
   * login state to trigger a single automatic retry with freshly resolved auth.
   */
  onUnauthorized?: (input: {
    context: UploadApiRequestContext;
    response: Response;
  }) => boolean | Promise<boolean>;
}

export interface UploadDto {
  uploadId: string;
  fileName: string;
  fileHash: string;
  fileSize: number;
  partSize: number;
  totalParts: number;
  uploadedPartNumbers: number[];
  uploadedPartCount: number;
  progress: number;
  status: 'pending' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface CreateUploadResponse {
  upload: UploadDto;
  existed: boolean;
  completed: boolean;
}

export interface UploadResponse {
  upload: UploadDto;
}

export interface CompleteUploadResponse {
  upload: UploadDto;
  file: {
    url: string;
  };
}

export interface UploadPartDto {
  partNumber: number;
  partHash: string;
  size: number;
}

export interface UploadPartsResponse {
  parts: UploadPartDto[];
}

function isResolver<TValue>(
  value: UploadApiResolvable<TValue> | undefined,
): value is (context: UploadApiRequestContext) => TValue | Promise<TValue> {
  return typeof value === 'function';
}

async function resolveOption<TValue>(
  value: UploadApiResolvable<TValue> | undefined,
  context: UploadApiRequestContext,
) {
  if (isResolver(value)) {
    return value(context);
  }

  return value;
}

function mergeHeaders(
  baseHeaders: HeadersInit | undefined,
  nextHeaders: HeadersInit | undefined,
) {
  const headers = new Headers(baseHeaders);

  if (nextHeaders) {
    new Headers(nextHeaders).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
}

export interface UploadsApiClient {
  createUpload(payload: {
    fileName: string;
    fileHash: string;
    fileSize: number;
    partSize: number;
  }): Promise<CreateUploadResponse>;
  getUpload(uploadId: string): Promise<UploadResponse>;
  getUploadParts(uploadId: string): Promise<UploadPartsResponse>;
  putUploadPart(payload: {
    uploadId: string;
    partNumber: number;
    partHash: string;
    size: number;
  }): Promise<UploadResponse>;
  completeUpload(uploadId: string): Promise<CompleteUploadResponse>;
}

/**
 * Creates a small JSON API client used by the demo adapter.
 *
 * The client intentionally resolves auth options for every request so freshly
 * rotated tokens/cookies can be picked up without recreating the adapter.
 */
export function createUploadsApiClient(options: UploadApiClientOptions = {}): UploadsApiClient {
  const baseUrl = options.baseUrl ?? API_BASE_URL;
  const executeFetch = options.fetch ?? fetch;

  async function request<T>(
    path: string,
    requestOptions: RequestInit | undefined,
    context: UploadApiRequestContext,
    retryOnUnauthorized = true,
  ): Promise<T> {
    const dynamicHeaders = await resolveOption(options.headers, context);
    const dynamicCredentials = await resolveOption(options.credentials, context);

    const response = await executeFetch(`${baseUrl}${path}`, {
      ...requestOptions,
      credentials: dynamicCredentials ?? requestOptions?.credentials,
      headers: mergeHeaders(
        {
          'Content-Type': 'application/json',
        },
        mergeHeaders(dynamicHeaders, requestOptions?.headers),
      ),
    });

    if (response.status === 401 && retryOnUnauthorized && options.onUnauthorized) {
      const shouldRetry = await options.onUnauthorized({
        context,
        response,
      });

      if (shouldRetry) {
        // Re-enter `request` so header/credential resolvers run again after the
        // caller refreshes login state. Retrying only once avoids infinite loops.
        return request<T>(path, requestOptions, context, false);
      }
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? '请求失败');
    }

    return response.json() as Promise<T>;
  }

  return {
    createUpload(payload) {
      return request<CreateUploadResponse>(
        '/uploads',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        {
          path: '/uploads',
          method: 'POST',
        },
      );
    },

    getUpload(uploadId) {
      return request<UploadResponse>(
        `/uploads/${uploadId}`,
        undefined,
        {
          path: `/uploads/${uploadId}`,
          method: 'GET',
          uploadId,
        },
      );
    },

    getUploadParts(uploadId) {
      return request<UploadPartsResponse>(
        `/uploads/${uploadId}/parts`,
        undefined,
        {
          path: `/uploads/${uploadId}/parts`,
          method: 'GET',
          uploadId,
        },
      );
    },

    putUploadPart(payload) {
      return request<UploadResponse>(
        `/uploads/${payload.uploadId}/parts/${payload.partNumber}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            partHash: payload.partHash,
            size: payload.size,
          }),
        },
        {
          path: `/uploads/${payload.uploadId}/parts/${payload.partNumber}`,
          method: 'PUT',
          uploadId: payload.uploadId,
          partNumber: payload.partNumber,
        },
      );
    },

    completeUpload(uploadId) {
      return request<CompleteUploadResponse>(
        `/uploads/${uploadId}/complete`,
        {
          method: 'POST',
        },
        {
          path: `/uploads/${uploadId}/complete`,
          method: 'POST',
          uploadId,
        },
      );
    },
  };
}

const uploadsApiClient = createUploadsApiClient();

export const createUpload = uploadsApiClient.createUpload;
export const getUpload = uploadsApiClient.getUpload;
export const getUploadParts = uploadsApiClient.getUploadParts;
export const putUploadPart = uploadsApiClient.putUploadPart;
export const completeUpload = uploadsApiClient.completeUpload;
