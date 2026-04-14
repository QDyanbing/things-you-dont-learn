type Listener<T> = (payload: T) => void;

/**
 * Minimal typed event emitter used by `LargeFileUploader`.
 *
 * Keeping it local avoids coupling the upload utility to a framework runtime
 * or a heavier third-party event library.
 */
export class UploadEventEmitter<TEventMap extends object> {
  private readonly listeners = new Map<keyof TEventMap, Set<Listener<TEventMap[keyof TEventMap]>>>();

  /**
   * Registers a listener and returns an unsubscribe function so callers can
   * clean up inside component unmount hooks.
   */
  on<TKey extends keyof TEventMap>(eventName: TKey, listener: Listener<TEventMap[TKey]>) {
    const currentListeners = this.listeners.get(eventName) ?? new Set();
    currentListeners.add(listener as Listener<TEventMap[keyof TEventMap]>);
    this.listeners.set(eventName, currentListeners);

    return () => {
      this.off(eventName, listener);
    };
  }

  /**
   * Removes a single listener for a given event name.
   */
  off<TKey extends keyof TEventMap>(eventName: TKey, listener: Listener<TEventMap[TKey]>) {
    const currentListeners = this.listeners.get(eventName);
    if (!currentListeners) {
      return;
    }

    currentListeners.delete(listener as Listener<TEventMap[keyof TEventMap]>);

    if (currentListeners.size === 0) {
      this.listeners.delete(eventName);
    }
  }

  /**
   * Emits an event to the current listener snapshot.
   */
  emit<TKey extends keyof TEventMap>(eventName: TKey, payload: TEventMap[TKey]) {
    const currentListeners = this.listeners.get(eventName);
    if (!currentListeners) {
      return;
    }

    for (const listener of currentListeners) {
      listener(payload as TEventMap[keyof TEventMap]);
    }
  }

  /**
   * Clears every registered listener, typically during uploader teardown.
   */
  clear() {
    this.listeners.clear();
  }
}
