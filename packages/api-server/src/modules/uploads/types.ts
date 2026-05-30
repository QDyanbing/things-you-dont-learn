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

/**
 * In-memory upload task tracked by the demo API server.
 */
export interface Upload {
  /**
   * Server-generated upload task id.
   */
  uploadId: string;
  /**
   * Original file name supplied by the client.
   */
  fileName: string;
  /**
   * Client-provided file hash used for resume and duplicate detection.
   */
  fileHash: string;
  /**
   * Original file size in bytes.
   */
  fileSize: number;
  /**
   * Expected part size in bytes.
   */
  partSize: number;
  /**
   * Total part count derived from file size and part size.
   */
  totalParts: number;
  /**
   * Uploaded parts keyed by one-based part number.
   */
  uploadedParts: Map<number, UploadPart>;
  /**
   * Current lifecycle state of the demo upload task.
   */
  status: 'pending' | 'completed';
  /**
   * ISO timestamp when the task was created.
   */
  createdAt: string;
  /**
   * ISO timestamp when the task was last changed.
   */
  updatedAt: string;
}

export interface CreateUploadInput {
  fileName: string;
  fileHash: string;
  fileSize: number;
  partSize: number;
}
