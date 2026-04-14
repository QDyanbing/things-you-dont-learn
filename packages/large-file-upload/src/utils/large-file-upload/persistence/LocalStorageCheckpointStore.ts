import type { UploadCheckpointRecord, UploadCheckpointStore, UploadFileIdentity } from '../types';

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * Default checkpoint persistence backed by `window.localStorage`.
 *
 * It intentionally stores plain JSON so uploads can survive refreshes without
 * bringing in IndexedDB complexity for the demo package.
 */
export class LocalStorageCheckpointStore<TServerContext = unknown> implements UploadCheckpointStore<TServerContext> {
  constructor(private readonly keyPrefix = 'large-file-upload:checkpoint') {}

  load(fileIdentity: UploadFileIdentity) {
    if (!canUseLocalStorage()) {
      return null;
    }

    const rawValue = window.localStorage.getItem(this.buildStorageKey(fileIdentity.signature));
    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as UploadCheckpointRecord<TServerContext>;
    } catch {
      // If storage was corrupted, remove it and let the caller start fresh.
      window.localStorage.removeItem(this.buildStorageKey(fileIdentity.signature));
      return null;
    }
  }

  save(record: UploadCheckpointRecord<TServerContext>) {
    if (!canUseLocalStorage()) {
      return;
    }

    window.localStorage.setItem(this.buildStorageKey(record.fileIdentity.signature), JSON.stringify(record));
  }

  remove(fileSignature: string) {
    if (!canUseLocalStorage()) {
      return;
    }

    window.localStorage.removeItem(this.buildStorageKey(fileSignature));
  }

  private buildStorageKey(fileSignature: string) {
    return `${this.keyPrefix}:${fileSignature}`;
  }
}
