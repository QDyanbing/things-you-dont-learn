const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? '请求失败');
  }

  return response.json() as Promise<T>;
}

export async function createUpload(payload: {
  fileName: string;
  fileHash: string;
  fileSize: number;
  partSize: number;
}) {
  return request<CreateUploadResponse>('/uploads', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getUpload(uploadId: string) {
  return request<UploadResponse>(`/uploads/${uploadId}`);
}

export async function getUploadParts(uploadId: string) {
  return request<UploadPartsResponse>(`/uploads/${uploadId}/parts`);
}

export async function putUploadPart(payload: {
  uploadId: string;
  partNumber: number;
  partHash: string;
  size: number;
}) {
  return request<UploadResponse>(`/uploads/${payload.uploadId}/parts/${payload.partNumber}`, {
    method: 'PUT',
    body: JSON.stringify({
      partHash: payload.partHash,
      size: payload.size,
    }),
  });
}

export async function completeUpload(uploadId: string) {
  return request<CompleteUploadResponse>(`/uploads/${uploadId}/complete`, {
    method: 'POST',
  });
}
