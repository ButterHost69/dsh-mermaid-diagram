/**
 * Pure Host-side diagram logic: argument normalization and the model-facing
 * summary. Kept free of Cordis and filesystem access so the tool's behavior is
 * testable without a runtime.
 *
 * @module dsh-mermaid-diagram/diagram
 */

/** Wire tool name; the Client view registers under this same key. */
export const DIAGRAM_TOOL_NAME = 'mermaid'

/** Same-origin path serving the bundled Mermaid runtime to the browser half. */
export const RUNTIME_PATH = '/dsh-mermaid-diagram/mermaid-runtime.js'

/**
 * Largest accepted diagram source, in UTF-16 code units.
 *
 * Mermaid parses and lays out synchronously in the browser, so an unbounded
 * source would freeze the page. The bound is a safety invariant shared by the
 * model-facing contract and the Client's render guard, not a deployment
 * preference.
 */
export const MAX_SOURCE_CHARS = 50_000

/** Canonical value of one accepted diagram call. */
export interface DiagramValue {
  /** Trimmed Mermaid source. */
  source: string
  /** Trimmed caption; absent when the model omitted or blanked it. */
  title?: string
}

/**
 * Normalize one diagram call.
 * @param source - model-supplied Mermaid source.
 * @param title - optional model-supplied caption.
 * @returns the canonical value.
 * @throws {Error} when the source is blank or exceeds {@link MAX_SOURCE_CHARS}.
 */
export function prepareDiagram(source: string, title?: string): DiagramValue {
  const trimmed = source.trim()
  if (trimmed.length === 0) {
    throw new Error('`source` must contain Mermaid diagram source')
  }
  if (trimmed.length > MAX_SOURCE_CHARS) {
    throw new Error(
      `\`source\` is ${trimmed.length} characters; the limit is ${MAX_SOURCE_CHARS}. `
      + 'Split the diagram or reduce its detail.',
    )
  }
  const cleanTitle = title?.trim()
  if (cleanTitle === undefined || cleanTitle.length === 0) return { source: trimmed }
  return { source: trimmed, title: cleanTitle }
}

/**
 * Read the leading diagram-type keyword from Mermaid source.
 * @param source - Mermaid diagram source.
 * @returns the first word, or an empty string when none is present.
 */
export function diagramKind(source: string): string {
  return /^\s*([A-Za-z][\w-]*)/u.exec(source)?.[1] ?? ''
}

/**
 * Model-facing result summary for one accepted call.
 * @param value - canonical diagram value.
 * @returns one sentence naming the diagram type and caption.
 */
export function diagramSummary(value: DiagramValue): string {
  const kind = diagramKind(value.source)
  const what = kind === '' ? 'Mermaid diagram' : `${kind} Mermaid diagram`
  return value.title === undefined
    ? `Created a ${what}.`
    : `Created a ${what} titled ${JSON.stringify(value.title)}.`
}
