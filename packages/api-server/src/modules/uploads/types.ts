/**
 * Metadata recorded for one uploaded part in the in-memory demo store.
 */
export interface UploadPart {
  /**
   * One-based part number supplied by the client.
   */
  partNumber: number;
  /**
   * Client-provided hash for the uploaded part.
   */
  partHash: string;
  /**
   * Uploaded part size in bytes.
   */
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
