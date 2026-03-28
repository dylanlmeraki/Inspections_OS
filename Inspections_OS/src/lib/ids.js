const counters = new Map();

function normalizePrefix(prefix) {
  return String(prefix || "id")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "id";
}

function nextSequence(prefix) {
  const key = normalizePrefix(prefix);
  const next = (counters.get(key) || 0) + 1;
  counters.set(key, next);
  return next;
}

function padSequence(number) {
  return String(number).padStart(6, "0");
}

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const sortedEntries = Object.entries(value).sort(([left], [right]) =>
      left.localeCompare(right)
    );
    return `{${sortedEntries
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableSerialize(entryValue)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashString(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function uid(prefix = "id") {
  const normalizedPrefix = normalizePrefix(prefix);
  return `${normalizedPrefix}_${padSequence(nextSequence(normalizedPrefix))}`;
}

export function createExportJobId() {
  return uid("exp");
}

export function createManifestId() {
  return uid("manifest");
}

export function createManifestSourceEntryId() {
  return uid("mse");
}

export function createEvidenceId() {
  return uid("evidence");
}

export function createPacketId() {
  return uid("packet");
}

export function createContentHash(value, prefix = "hash") {
  const serialized = stableSerialize(value);
  return `${normalizePrefix(prefix)}_${hashString(serialized)}`;
}

export function resetIdState() {
  counters.clear();
}
