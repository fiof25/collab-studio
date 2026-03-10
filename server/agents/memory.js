// Agent working memory store — keyed by agentId (per-operation session)
// Lives in process memory; cleared when operation completes.
const store = new Map();

export function readMemory(agentId) {
  return store.get(agentId) ?? {};
}

export function writeMemory(agentId, key, value) {
  const current = store.get(agentId) ?? {};
  store.set(agentId, { ...current, [key]: value });
}

export function clearMemory(agentId) {
  store.delete(agentId);
}
