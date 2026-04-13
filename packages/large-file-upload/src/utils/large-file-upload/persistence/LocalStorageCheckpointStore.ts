import type { UploadCheckpointRecord, UploadCheckpointStore, UploadFileIdentity } from '../types';

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

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
