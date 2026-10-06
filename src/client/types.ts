/**
 * Structural Client contracts this plugin consumes.
 *
 * The authoritative types live in the harness Client packages, which the
 * browser half must not import as runtime modules. Each interface below mirrors
 * only the slice this plugin reads, so the compile surface stays small and
 * independent of a published type version.
 *
 * @module dsh-mermaid-diagram/client/types
 */

/** Localized lookup handed to a component whose registration declared `locale`. */
export type Translate = (key: string, params?: Record<string, string | number>) => string

/** Registration options for a keyed slot entry. */
export interface SlotKeyedOptions {
  /** Declared slot name. */
  name: string
  /** Keyed dispatch value; for `tool.call.toolview` this is the wire tool name. */
  key: string
  /** Dictionary namespace that supplies the component's `t` seat. */
  locale?: string
}

/** The two slot methods this plugin calls. */
export interface SlotsService {
  /** Run `body` once the named slot is declared, and again if the declaration is replaced. */
  inject(name: string, body: () => void): void
  /**
   * Register one entry.
   * @param options - slot name, key, and locale namespace.
   * @param component - the React component rendered for that key.
   * @returns the disposer that removes the entry.
   */
  register(options: SlotKeyedOptions, component: unknown): () => void
}

/** Dictionary registration and lookup. */
export interface LocaleService {
  /**
   * Register one namespace's dictionaries.
   * @param namespace - dictionary namespace.
   * @param dictionaries - per-language key/value maps.
   * @returns the disposer that removes the dictionaries.
   */
  register(namespace: string, dictionaries: Record<string, Record<string, string>>): () => void
  /**
   * Bind a namespace to a lookup.
   * @param namespace - dictionary namespace.
   * @returns the bound translate function.
   */
  bind(namespace: string): Translate
}

/** The slice of the browser context this plugin touches. */
export interface ClientContextLike {
  readonly slots: SlotsService
  readonly locale: LocaleService
  effect(body: () => unknown, label?: string): void
}

/**
 * Lazy argument reader shared by every tool stage. Every reader is total: an
 * absent or differently typed field answers `undefined` or `false`.
 */
export interface ToolArgsView {
  /** Read a decoded string field, including a streaming prefix. */
  text(key: string): string | undefined
  /** Whether the field's closing delimiter has arrived. */
  complete(key: string): boolean
  /** Whether no further fields can arrive. */
  closed(): boolean
}

/** Identity shared by a tool call's preparation and dispatch stages. */
export interface ToolCallHead {
  callId: string
  name: string
  /**
   * Lazy argument view. Live streaming always supplies it, but a call
   * reconstructed from a persisted projection may omit it, so every reader
   * falls back to the recorded raw arguments.
   */
  args?: ToolArgsView
}

/** A named call whose complete arguments are not yet available. */
export interface PreparingToolCall extends ToolCallHead {
  readonly phase: 'preparing'
}

/** A dispatched call with complete arguments and no result yet. */
export interface StartedToolCall extends ToolCallHead {
  readonly phase: 'start'
  readonly argsRaw: string
}

/** One content item of a recorded tool result. */
export interface ResultContentBlock {
  type: string
  text?: string
}

/** A settled tool call paired with its recorded result. */
export interface ToolResultNode {
  kind: 'tool-result'
  callId: string
  name: string
  /** Lazy argument view; absent on a replayed projection. */
  args?: ToolArgsView
  /** Call head backfilled while the call is still in the loaded window. */
  call: { name: string; argsRaw: string } | null
  content: readonly ResultContentBlock[]
  isError: boolean
}

/** One preparing, dispatched, or settled call. */
export type ToolCallBlock = PreparingToolCall | StartedToolCall | ToolResultNode

/** Owner props the Tool layer supplies to the registered keyed view. */
export interface MermaidCardProps {
  /** Lifecycle stage; `result` carries the settled block. */
  phase: 'preparing' | 'start' | 'result'
  /** Stage-specific call material. */
  block: ToolCallBlock
  /** Wire tool name and keyed dispatch value. */
  toolName: string
  /** Call identity, stable across all stages. */
  callId: string
  /** Localized lookup from the registration's locale namespace. */
  t: Translate
}
