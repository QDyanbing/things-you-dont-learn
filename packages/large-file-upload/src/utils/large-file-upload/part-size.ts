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
