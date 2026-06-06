import type { FastifyPluginAsync } from 'fastify';
import {
  DEMO_ACCESS_TOKEN,
  DEMO_EXPIRED_ACCESS_TOKEN,
  DEMO_UPLOAD_SESSION_COOKIE,
  DEMO_UPLOAD_SESSION_VALUE,
} from '../demo-auth/constants.js';
import { abortUpload, completeUpload, createUpload, getUpload, listUploadedParts, putUploadPart, toUploadResource } from './store.js';

/**
 * Request body used to create or resume an upload task.
 */
interface CreateUploadBody {
  /**
   * Original file name displayed by the demo client.
   */
  fileName: string;
  /**
   * Client-provided file hash used as the resume lookup key.
   */
  fileHash: string;
  /**
   * Total file size in bytes used to compute the part count.
   */
  fileSize: number;
  /**
   * Requested part size in bytes used by the current upload session.
   */
  partSize: number;
}

/**
 * Request body used to record a single uploaded part.
 */
interface PutPartBody {
  /**
   * Client-provided hash for the uploaded part payload.
   */
  partHash: string;
  /**
   * Uploaded part size in bytes.
   */
  size: number;
}

/**
 * Demo-only access modes used to exercise public, bearer, and cookie flows.
 */
type DemoUploadAccessMode = 'public' | 'bearer' | 'cookie';

/**
 * Resolves the requested demo access mode from the custom route header.
 */
function resolveUploadAccessMode(headerValue: string | string[] | undefined): DemoUploadAccessMode {
  const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (value === 'bearer' || value === 'cookie') {
    return value;
  }

  return 'public';
}

/**
 * Reads a single header value from Fastify's string-or-array header shape.
 */
function readHeaderValue(headerValue: string | string[] | undefined) {
  return Array.isArray(headerValue) ? headerValue[0] : headerValue;
}

/**
 * Checks whether the demo upload session cookie is present in the request.
 */
function hasDemoSessionCookie(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    return false;
  }

  return cookieHeader
    .split(';')
    .map((item) => item.trim())
    .some((item) => item === `${DEMO_UPLOAD_SESSION_COOKIE}=${DEMO_UPLOAD_SESSION_VALUE}`);
}

/**
 * Applies the selected demo access mode and returns either `true` or an error body.
 */
function ensureUploadAccess(
  request: {
    headers: Record<string, string | string[] | undefined>;
  },
  reply: {
    code: (statusCode: number) => void;
  },
) {
  const accessMode = resolveUploadAccessMode(request.headers['x-demo-upload-access']);

  if (accessMode === 'public') {
    return true;
  }

  if (accessMode === 'bearer') {
    const authorization = readHeaderValue(request.headers.authorization);
    const token = authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      reply.code(401);
      return {
        message: '缺少 Bearer Token',
        code: 'MISSING_TOKEN',
      };
    }

    if (token === DEMO_EXPIRED_ACCESS_TOKEN) {
      reply.code(401);
      return {
        message: '访问令牌已过期',
        code: 'TOKEN_EXPIRED',
      };
    }

    if (token !== DEMO_ACCESS_TOKEN) {
      reply.code(401);
      return {
        message: 'Bearer Token 无效',
        code: 'INVALID_TOKEN',
      };
    }

    return true;
  }

  if (!hasDemoSessionCookie(readHeaderValue(request.headers.cookie))) {
    reply.code(401);
    return {
      message: '缺少有效的会话 Cookie',
      code: 'MISSING_SESSION',
    };
  }

  return true;
}

/**
 * Registers demo upload routes under the API prefix configured by the app.
 */
export const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Lightweight health endpoint for checking that the upload plugin is mounted.
   */
  fastify.get('/health', async () => ({ ok: true }));

  /**
   * Creates a new upload task or returns an existing task for the same file hash.
   */
  fastify.post<{ Body: CreateUploadBody }>('/uploads', async (request, reply) => {
    const access = ensureUploadAccess(request, reply);
    if (access !== true) {
      return access;
    }

    const { fileName, fileHash, fileSize, partSize } = request.body;

    if (!fileName || !fileHash || !fileSize || !partSize) {
      reply.code(400);
      return { message: '缺少必要参数' };
    }

    const result = createUpload({
      fileName,
      fileHash,
      fileSize,
      partSize,
    });

    reply.code(result.existed ? 200 : 201);
    return {
      upload: toUploadResource(result.upload),
      existed: result.existed,
      completed: result.completed,
    };
  });

  /**
   * Returns the current server-side state of one upload task.
   */
  fastify.get<{ Params: { uploadId: string } }>('/uploads/:uploadId', async (request, reply) => {
    const access = ensureUploadAccess(request, reply);
    if (access !== true) {
      return access;
    }

    const upload = getUpload(request.params.uploadId);

    if (!upload) {
      reply.code(404);
      return { message: '上传任务不存在' };
    }

    return {
      upload: toUploadResource(upload),
    };
  });

  /**
   * Lists uploaded parts for resume checks.
   */
  fastify.get<{ Params: { uploadId: string } }>('/uploads/:uploadId/parts', async (request, reply) => {
    const access = ensureUploadAccess(request, reply);
    if (access !== true) {
      return access;
    }

    const parts = listUploadedParts(request.params.uploadId);

    if (!parts) {
      reply.code(404);
      return { message: '上传任务不存在' };
    }

    return {
      parts,
    };
  });

  /**
   * Records or replaces one uploaded part for the current upload task.
   */
  fastify.put<{ Params: { uploadId: string; partNumber: string }; Body: PutPartBody }>(
    '/uploads/:uploadId/parts/:partNumber',
    async (request, reply) => {
      const access = ensureUploadAccess(request, reply);
      if (access !== true) {
        return access;
      }

      const { uploadId, partNumber } = request.params;
      const { partHash, size } = request.body;
      const parsedPartNumber = Number(partNumber);

      if (!partHash || !size || !Number.isInteger(parsedPartNumber) || parsedPartNumber < 1) {
        reply.code(400);
        return { message: '分片参数不合法' };
      }

      const upload = putUploadPart(uploadId, {
        partNumber: parsedPartNumber,
        partHash,
        size,
      });

      if (!upload) {
        reply.code(404);
        return { message: '上传任务不存在' };
      }

      return {
        upload: toUploadResource(upload),
      };
    },
  );

  /**
   * Completes an upload once every expected part has been recorded.
   */
  fastify.post<{ Params: { uploadId: string } }>('/uploads/:uploadId/complete', async (request, reply) => {
    const access = ensureUploadAccess(request, reply);
    if (access !== true) {
      return access;
    }

    const upload = getUpload(request.params.uploadId);

    if (!upload) {
      reply.code(404);
      return { message: '上传任务不存在' };
    }

    if (upload.uploadedParts.size !== upload.totalParts) {
      reply.code(400);
      return {
        message: '分片未全部上传完成，不能完成上传',
        upload: toUploadResource(upload),
      };
    }

    const completedUpload = completeUpload(request.params.uploadId);

    return {
      upload: toUploadResource(completedUpload!),
      file: {
        url: `/files/${encodeURIComponent(upload.fileName)}`,
      },
    };
  });

  /**
   * Aborts an upload task and removes its in-memory records.
   */
  fastify.delete<{ Params: { uploadId: string } }>('/uploads/:uploadId', async (request, reply) => {
    const access = ensureUploadAccess(request, reply);
    if (access !== true) {
      return access;
    }

    const upload = abortUpload(request.params.uploadId);
    if (!upload) {
      reply.code(404);
      return { message: '上传任务不存在' };
    }

    return {
      ok: true,
      upload: toUploadResource(upload),
    };
  });
};
