export const STORAGE_SCHEMA_VERSION = 1;
export const STORAGE_NAMESPACE = "sphinx-yaq";

const DEFAULT_SAVE_DELAY = 250;

export function normalizeDocumentScope(pathname) {
  try {
    const normalized = new URL(pathname || "/", "https://sphinx-yaq.invalid")
      .pathname.replace(/\/{2,}/g, "/");
    return normalized.length > 1 ? normalized.replace(/\/$/, "") : "/";
  } catch (_error) {
    return "/";
  }
}

function hashString(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function fingerprintQuizDefinition(questionDefinitions) {
  return `fnv1a-${hashString(JSON.stringify(questionDefinitions))}`;
}

export function storageKey(documentScope, quizId) {
  return [
    STORAGE_NAMESPACE,
    `v${STORAGE_SCHEMA_VERSION}`,
    encodeURIComponent(normalizeDocumentScope(documentScope)),
    encodeURIComponent(quizId),
  ].join(":");
}

function validPayload(payload, expectedFingerprint) {
  return Boolean(
    payload &&
      payload.schemaVersion === STORAGE_SCHEMA_VERSION &&
      payload.fingerprint === expectedFingerprint &&
      payload.state &&
      typeof payload.state === "object" &&
      !Array.isArray(payload.state),
  );
}

export class QuizStorage {
  constructor({
    globalObject = globalThis,
    documentScope = globalObject?.location?.pathname || "/",
    saveDelay = DEFAULT_SAVE_DELAY,
    setTimer = globalObject?.setTimeout?.bind(globalObject) || setTimeout,
    clearTimer = globalObject?.clearTimeout?.bind(globalObject) || clearTimeout,
  } = {}) {
    this.globalObject = globalObject;
    this.documentScope = normalizeDocumentScope(documentScope);
    this.saveDelay = saveDelay;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.pending = new Map();
    this.lastAvailable = undefined;
  }

  key(quizId) {
    return storageKey(this.documentScope, quizId);
  }

  getStorage() {
    try {
      const storage = this.globalObject.localStorage;
      if (!storage) {
        this.lastAvailable = false;
        return null;
      }
      return storage;
    } catch (_error) {
      this.lastAvailable = false;
      return null;
    }
  }

  isAvailable() {
    const storage = this.getStorage();
    if (!storage) {
      return false;
    }
    const probe = `${STORAGE_NAMESPACE}:probe`;
    try {
      storage.setItem(probe, probe);
      storage.removeItem(probe);
      this.lastAvailable = true;
      return true;
    } catch (_error) {
      this.lastAvailable = false;
      return false;
    }
  }

  get available() {
    return this.isAvailable();
  }

  load(quizId, expectedFingerprint) {
    const storage = this.getStorage();
    if (!storage) {
      return null;
    }
    try {
      const serialized = storage.getItem(this.key(quizId));
      if (serialized === null) {
        this.lastAvailable = true;
        return null;
      }
      const payload = JSON.parse(serialized);
      if (!validPayload(payload, expectedFingerprint)) {
        return null;
      }
      this.lastAvailable = true;
      return payload.state;
    } catch (_error) {
      this.lastAvailable = false;
      return null;
    }
  }

  save(quizId, fingerprint, state) {
    let serialized;
    try {
      serialized = JSON.stringify({
        schemaVersion: STORAGE_SCHEMA_VERSION,
        fingerprint,
        state,
      });
    } catch (_error) {
      return false;
    }

    const key = this.key(quizId);
    this.cancel(key);
    const timer = this.setTimer(() => {
      this.pending.delete(key);
      this.write(key, serialized);
    }, this.saveDelay);
    this.pending.set(key, { timer, serialized });
    return true;
  }

  write(key, serialized) {
    const storage = this.getStorage();
    if (!storage) {
      return false;
    }
    try {
      storage.setItem(key, serialized);
      this.lastAvailable = true;
      return true;
    } catch (_error) {
      this.lastAvailable = false;
      return false;
    }
  }

  flush(quizId) {
    const keys = quizId === undefined ? [...this.pending.keys()] : [this.key(quizId)];
    let succeeded = true;
    for (const key of keys) {
      const entry = this.pending.get(key);
      if (!entry) {
        continue;
      }
      this.clearTimer(entry.timer);
      this.pending.delete(key);
      succeeded = this.write(key, entry.serialized) && succeeded;
    }
    return succeeded;
  }

  cancel(key) {
    const entry = this.pending.get(key);
    if (entry) {
      this.clearTimer(entry.timer);
      this.pending.delete(key);
    }
  }

  remove(quizId) {
    const key = this.key(quizId);
    this.cancel(key);
    const storage = this.getStorage();
    if (!storage) {
      return false;
    }
    try {
      storage.removeItem(key);
      this.lastAvailable = true;
      return true;
    } catch (_error) {
      this.lastAvailable = false;
      return false;
    }
  }

  clearAll() {
    for (const entry of this.pending.values()) {
      this.clearTimer(entry.timer);
    }
    this.pending.clear();

    const storage = this.getStorage();
    if (!storage) {
      return false;
    }
    try {
      const keys = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key?.startsWith(`${STORAGE_NAMESPACE}:`)) {
          keys.push(key);
        }
      }
      keys.forEach((key) => storage.removeItem(key));
      this.lastAvailable = true;
      return true;
    } catch (_error) {
      this.lastAvailable = false;
      return false;
    }
  }
}
