import type { UploadPartSizeResolver } from './types';

const MB = 1024 * 1024;

export interface RecommendPartSizeOptions {
  /**
   * Lower bound for the chosen part size.
   */
  minPartSize?: number;
  /**
   * Upper bound for the chosen part size.
   */
  maxPartSize?: number;
  /**
   * Desired chunk count for a balanced upload experience.
   */
  targetChunkCount?: number;
  /**
   * Alignment size used to keep part sizes predictable for storage policies.
   */
  alignTo?: number;
}

export interface AdaptivePartSizeResolverOptions extends RecommendPartSizeOptions {}

export type UploadPartSizePresetName = 'balanced' | 'throughput' | 'recovery';

export interface UploadPartSizePreset extends AdaptivePartSizeResolverOptions {
  key: UploadPartSizePresetName;
  label: string;
  description: string;
}

export const UPLOAD_PART_SIZE_PRESETS: Record<UploadPartSizePresetName, UploadPartSizePreset> = {
  balanced: {
    key: 'balanced',
    label: '均衡模式',
    description: '兼顾请求数与失败恢复粒度，适合作为大多数业务的默认值。',
    minPartSize: 4 * MB,
    maxPartSize: 32 * MB,
    targetChunkCount: 80,
    alignTo: MB,
  },
  throughput: {
    key: 'throughput',
    label: '吞吐优先',
    description: '倾向更大的分片，减少请求数和服务端合并压力。',
    minPartSize: 8 * MB,
    maxPartSize: 64 * MB,
    targetChunkCount: 32,
    alignTo: MB,
  },
  recovery: {
    key: 'recovery',
    label: '恢复优先',
    description: '倾向更小的分片，适合弱网或失败率较高的场景。',
    minPartSize: 2 * MB,
    maxPartSize: 16 * MB,
    targetChunkCount: 120,
    alignTo: MB,
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function alignUp(value: number, base: number) {
  return Math.ceil(value / base) * base;
}

function normalizePositiveNumber(value: number | undefined, fallback: number) {
  return Number.isFinite(value) && value! > 0 ? value! : fallback;
}

/**
 * Recommends a part size based on file size and a target chunk count.
 *
 * The result is aligned to a fixed boundary so backend multipart policies stay
 * predictable and UI displays stable round numbers.
 */
export function recommendPartSize(
  fileSize: number,
  options: RecommendPartSizeOptions = {},
) {
  const minPartSize = Math.max(MB, normalizePositiveNumber(options.minPartSize, 5 * MB));
  const maxPartSize = Math.max(minPartSize, normalizePositiveNumber(options.maxPartSize, 64 * MB));
  const targetChunkCount = Math.max(1, normalizePositiveNumber(options.targetChunkCount, 80));
  const alignTo = Math.max(MB, normalizePositiveNumber(options.alignTo, MB));

  if (fileSize <= 0) {
    return minPartSize;
  }

  const roughPartSize = Math.ceil(fileSize / targetChunkCount);
  return clamp(alignUp(roughPartSize, alignTo), minPartSize, maxPartSize);
}

/**
 * Builds a resolver suitable for `LargeFileUploaderOptions.partSizeResolver`.
 *
 * This keeps policy decisions outside the uploader core so teams can reuse the
 * same sizing strategy across React, Vue, or plain TypeScript integrations.
 */
export function createAdaptivePartSizeResolver(
  options: AdaptivePartSizeResolverOptions = {},
): UploadPartSizeResolver {
  return ({ file }) => recommendPartSize(file.size, options);
}

export const PART_SIZE_UNITS = {
  MB,
};
