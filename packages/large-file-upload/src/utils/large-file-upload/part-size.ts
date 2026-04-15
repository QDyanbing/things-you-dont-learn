import type { UploadPartSizeResolver } from './types';

const MB = 1024 * 1024;

export interface RecommendPartSizeOptions {
  minPartSize?: number;
  maxPartSize?: number;
  targetChunkCount?: number;
  alignTo?: number;
}

export interface AdaptivePartSizeResolverOptions extends RecommendPartSizeOptions {}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function alignUp(value: number, base: number) {
  return Math.ceil(value / base) * base;
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
  const minPartSize = Math.max(MB, options.minPartSize ?? 5 * MB);
  const maxPartSize = Math.max(minPartSize, options.maxPartSize ?? 64 * MB);
  const targetChunkCount = Math.max(1, options.targetChunkCount ?? 80);
  const alignTo = Math.max(MB, options.alignTo ?? MB);

  if (fileSize <= 0) {
    return minPartSize;
  }

  const roughPartSize = Math.ceil(fileSize / targetChunkCount);
  return clamp(alignUp(roughPartSize, alignTo), minPartSize, maxPartSize);
}

/**
 * Builds a resolver suitable for `LargeFileUploaderOptions.partSizeResolver`.
 */
export function createAdaptivePartSizeResolver(
  options: AdaptivePartSizeResolverOptions = {},
): UploadPartSizeResolver {
  return ({ file }) => recommendPartSize(file.size, options);
}

export const PART_SIZE_UNITS = {
  MB,
};
