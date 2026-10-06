/**
 * Lazy loader for the bundled Mermaid runtime.
 *
 * The runtime is a 3.5 MB UMD asset served by the Host half at
 * {@link RUNTIME_PATH}. It is fetched once, on the first diagram, and cached on
 * `globalThis.mermaid`; the card never imports Mermaid into the boot bundle.
 *
 * @module dsh-mermaid-diagram/client/mermaid-runtime
 */

import { RUNTIME_PATH } from '../diagram.ts'

/** The subset of the Mermaid browser API the card uses. */
export interface MermaidApi {
  /**
   * Apply global render configuration.
   * @param config - Mermaid configuration object.
   */
  initialize(config: Record<string, unknown>): void
  /**
   * Render one diagram to SVG text.
   * @param id - DOM id Mermaid uses for its temporary element.
   * @param source - Mermaid diagram source.
   * @returns the rendered SVG text.
   */
  render(id: string, source: string): Promise<{ svg: string }>
}

/** Read the runtime the UMD asset publishes. */
function globalMermaid(): MermaidApi | undefined {
  return (globalThis as typeof globalThis & { mermaid?: MermaidApi }).mermaid
}

/** Test seam: replaces the network loader. Not part of the plugin's runtime contract. */
let loaderOverride: (() => Promise<MermaidApi>) | undefined
/** One in-flight asset load shared by every card on the page. */
let pending: Promise<MermaidApi> | undefined

/**
 * Replace the runtime loader for tests.
 * @param loader - loader to install, or undefined to restore the asset loader.
 */
export function setMermaidRuntimeLoaderForTesting(loader?: () => Promise<MermaidApi>): void {
  loaderOverride = loader
  pending = undefined
}

/**
 * Load the Mermaid runtime, fetching the asset at most once per page.
 * @returns the runtime API.
 * @throws {Error} when the asset fails to load or publishes no API.
 */
export function loadMermaidRuntime(): Promise<MermaidApi> {
  if (loaderOverride !== undefined) return loaderOverride()
  const ready = globalMermaid()
  if (ready !== undefined) return Promise.resolve(ready)
  pending ??= new Promise<MermaidApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = RUNTIME_PATH
    script.async = true
    script.addEventListener('load', () => {
      const api = globalMermaid()
      if (api === undefined) reject(new Error('The Mermaid runtime loaded without publishing its API.'))
      else resolve(api)
    }, { once: true })
    script.addEventListener('error', () => {
      reject(new Error('The Mermaid runtime failed to load.'))
    }, { once: true })
    document.head.append(script)
  })
  const attempt = pending
  // A failed attempt must not poison the cache: the next card retries.
  attempt.catch(() => {
    if (pending === attempt) pending = undefined
  })
  return attempt
}
