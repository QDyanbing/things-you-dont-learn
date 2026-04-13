type Listener<T> = (payload: T) => void;

export class UploadEventEmitter<TEventMap extends object> {
  private readonly listeners = new Map<keyof TEventMap, Set<Listener<TEventMap[keyof TEventMap]>>>();

  on<TKey extends keyof TEventMap>(eventName: TKey, listener: Listener<TEventMap[TKey]>) {
    const currentListeners = this.listeners.get(eventName) ?? new Set();
    currentListeners.add(listener as Listener<TEventMap[keyof TEventMap]>);
    this.listeners.set(eventName, currentListeners);

    return () => {
      this.off(eventName, listener);
    };
  }

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

  emit<TKey extends keyof TEventMap>(eventName: TKey, payload: TEventMap[TKey]) {
    const currentListeners = this.listeners.get(eventName);
    if (!currentListeners) {
      return;
    }

    for (const listener of currentListeners) {
      listener(payload as TEventMap[keyof TEventMap]);
    }
  }

  clear() {
    this.listeners.clear();
  }
}
