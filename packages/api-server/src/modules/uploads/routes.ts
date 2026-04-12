import type { FastifyPluginAsync } from 'fastify';
import { completeUpload, createUpload, getUpload, listUploadedParts, putUploadPart, toUploadResource } from './store.js';

interface CreateUploadBody {
  fileName: string;
  fileHash: string;
  fileSize: number;
  partSize: number;
}

interface PutPartBody {
  partHash: string;
  size: number;
}

export const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => ({ ok: true }));

  fastify.post<{ Body: CreateUploadBody }>('/uploads', async (request, reply) => {
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

  fastify.get<{ Params: { uploadId: string } }>('/uploads/:uploadId', async (request, reply) => {
    const upload = getUpload(request.params.uploadId);

    if (!upload) {
      reply.code(404);
      return { message: '上传任务不存在' };
    }

    return {
      upload: toUploadResource(upload),
    };
  });

  fastify.get<{ Params: { uploadId: string } }>('/uploads/:uploadId/parts', async (request, reply) => {
    const parts = listUploadedParts(request.params.uploadId);

    if (!parts) {
      reply.code(404);
      return { message: '上传任务不存在' };
    }

    return {
      parts,
    };
  });

  fastify.put<{ Params: { uploadId: string; partNumber: string }; Body: PutPartBody }>(
    '/uploads/:uploadId/parts/:partNumber',
    async (request, reply) => {
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

  fastify.post<{ Params: { uploadId: string } }>('/uploads/:uploadId/complete', async (request, reply) => {
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
};
