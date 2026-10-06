/**
 * Browser half of `dsh-mermaid-diagram`.
 *
 * Registers one keyed `tool.call.toolview` entry for the `mermaid` wire tool.
 * The Tool layer keeps call/result pairing, lifecycle, and replay; this half
 * only turns a logged call into a diagram card.
 *
 * @module dsh-mermaid-diagram/client
 */

import { DIAGRAM_TOOL_NAME } from '../diagram.ts'
import { dictionaries, NS } from './locales.ts'
import { MermaidCard } from './MermaidCard.tsx'
import type { ClientContextLike } from './types.ts'

/** Browser-side services this plugin needs. */
export const inject = ['slots', 'locale']

/**
 * Register the diagram card.
 * @param ctx - the browser context.
 */
export function apply(ctx: ClientContextLike): void {
  ctx.effect(() => ctx.locale.register(NS, dictionaries), 'dsh-mermaid-diagram: dictionaries')
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register(
    { name: 'tool.call.toolview', key: DIAGRAM_TOOL_NAME, locale: NS },
    MermaidCard,
  ))
}
