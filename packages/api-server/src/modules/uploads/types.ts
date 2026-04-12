export interface UploadPart {
  partNumber: number;
  partHash: string;
  size: number;
}

export interface Upload {
  uploadId: string;
  fileName: string;
  fileHash: string;
  fileSize: number;
  partSize: number;
  totalParts: number;
  uploadedParts: Map<number, UploadPart>;
  status: 'pending' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface CreateUploadInput {
  fileName: string;
  fileHash: string;
  fileSize: number;
  partSize: number;
}
