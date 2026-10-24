/** Ask the browser to keep local data from automatic eviction. Best effort. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (!navigator.storage?.persist) return
    if (await navigator.storage.persisted()) return
    await navigator.storage.persist()
  } catch {
    // Not supported; nothing else to do.
  }
}
