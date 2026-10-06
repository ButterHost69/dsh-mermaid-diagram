/**
 * Pure card model: reads the diagram source and caption out of a tool call's
 * argument view (or, when the paired call left the loaded window, out of the
 * recorded raw arguments), and derives the states the card renders.
 *
 * @module dsh-mermaid-diagram/client/model
 */

import { MAX_SOURCE_CHARS } from '../diagram.ts'
import type { ResultContentBlock, ToolCallBlock } from './types.ts'

/** Diagram source and caption as far as the current stage reveals them. */
export interface DiagramInput {
  source: string | null
  title: string | null
}

/**
 * Parse recorded raw arguments into a string-field record.
 * @param raw - recorded `argsRaw` JSON text.
 * @returns the parsed object, or null when the text is absent or not an object.
 */
function parseRecord(raw: string): Record<string, unknown> | null {
  if (raw.trim() === '') return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    // A truncated or malformed record yields no diagram rather than an exception.
    return null
  }
}

/** Read one optional string field from a parsed record. */
function recordString(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key]
  return typeof value === 'string' ? value : null
}

/**
 * Read the diagram a call carries.
 *
 * The live argument view is authoritative while a call streams; a call
 * reconstructed from a persisted projection omits that view, so the recorded
 * raw arguments are the fallback for both a dispatched and a settled call.
 * @param block - the call's current stage.
 * @returns the source and caption, each null when not yet available.
 */
export function readDiagram(block: ToolCallBlock): DiagramInput {
  const view = block.args
  const viewSource = view?.text('source') ?? null
  const viewTitle = view?.text('title') ?? null
  if (viewSource !== null && viewSource.trim() !== '') {
    return { source: viewSource, title: viewTitle }
  }
  const raw = 'kind' in block
    ? block.call?.argsRaw ?? null
    : block.phase === 'start' ? block.argsRaw : null
  const record = raw === null ? null : parseRecord(raw)
  return {
    source: recordString(record, 'source') ?? viewSource,
    title: recordString(record, 'title') ?? viewTitle,
  }
}

/**
 * Whether the call's arguments are complete enough to render.
 * @param block - the call's current stage.
 * @returns true once the source field closed, or immediately for a dispatched call.
 */
export function argsReady(block: ToolCallBlock): boolean {
  if ('kind' in block || block.phase === 'start') return true
  const view = block.args
  if (view === undefined) return false
  return view.complete('source') && view.closed()
}

/**
 * Flatten a settled result's content into display text.
 * @param content - recorded result content blocks.
 * @returns joined text, or null when the result carries no text.
 */
export function resultText(content: readonly ResultContentBlock[]): string | null {
  const parts: string[] = []
  for (const item of content) {
    if (item.type === 'text' && typeof item.text === 'string') parts.push(item.text)
    else parts.push(JSON.stringify(item, null, 2))
  }
  const joined = parts.join('\n')
  return joined === '' ? null : joined
}

/**
 * Whether the card refuses to render a source.
 * @param source - diagram source, or null when unavailable.
 * @returns true when the source exceeds the shared {@link MAX_SOURCE_CHARS} bound.
 */
export function exceedsRenderBound(source: string | null): boolean {
  return source !== null && source.length > MAX_SOURCE_CHARS
}

/**
 * Turn an unknown render failure into display text.
 * @param error - the caught value.
 * @returns the error message, or a generic fallback.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message !== '') return error.message
  if (typeof error === 'string' && error !== '') return error
  return 'Unknown rendering error.'
}
