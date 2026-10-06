/**
 * Diagram card: the registered `tool.call.toolview` entry for the `mermaid`
 * tool. It reads the diagram out of the call's argument view, lazily loads the
 * bundled Mermaid runtime, renders the SVG, and falls back to the source with a
 * notice whenever rendering is unavailable or fails.
 *
 * @module dsh-mermaid-diagram/client/MermaidCard
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { argsReady, errorMessage, exceedsRenderBound, readDiagram, resultText } from './model.ts'
import { loadMermaidRuntime } from './mermaid-runtime.ts'
import type { MermaidCardProps } from './types.ts'
import css from './MermaidCard.module.css'

/** Render lifecycle of one card. */
type RenderState =
  | { readonly status: 'pending' }
  | { readonly status: 'ready'; readonly svg: string }
  | { readonly status: 'failed'; readonly message: string }

/** Read the resolved color scheme the host publishes on the root element. */
function readColorScheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light'
  const declared = document.documentElement.style.colorScheme
  if (declared === 'dark' || declared === 'light') return declared
  if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

/**
 * Follow the host's resolved color scheme so a diagram is re-rendered when the
 * user switches themes.
 * @returns the current scheme.
 */
function useColorScheme(): 'light' | 'dark' {
  const [scheme, setScheme] = useState(readColorScheme)
  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return
    const observer = new MutationObserver(() => { setScheme(readColorScheme()) })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
    return () => { observer.disconnect() }
  }, [])
  return scheme
}

/**
 * Render one diagram tool call.
 * @param props - owner props supplied by the Tool layer plus the locale seat.
 * @returns the diagram card.
 */
export function MermaidCard(props: MermaidCardProps): ReactNode {
  const { phase, block, callId, t } = props
  const diagram = useMemo(() => readDiagram(block), [block])
  const ready = argsReady(block)
  const settledError = 'kind' in block && block.isError
  const failureText = 'kind' in block ? resultText(block.content) : null
  const source = diagram.source
  const tooLarge = exceedsRenderBound(source)
  const scheme = useColorScheme()
  const [view, setView] = useState<'diagram' | 'code'>('diagram')
  const [state, setState] = useState<RenderState>({ status: 'pending' })
  const [copied, setCopied] = useState(false)
  const [retry, setRetry] = useState(0)
  const sequence = useRef(0)
  const copyTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => {
    if (copyTimer.current !== undefined) window.clearTimeout(copyTimer.current)
  }, [])

  useEffect(() => {
    if (settledError || !ready || source === null || source.trim() === '' || exceedsRenderBound(source)) return
    const id = ++sequence.current
    let cancelled = false
    setState({ status: 'pending' })
    void (async () => {
      try {
        const mermaid = await loadMermaidRuntime()
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          suppressErrorRendering: true,
          theme: scheme === 'dark' ? 'dark' : 'default',
          fontFamily: 'inherit',
        })
        const { svg } = await mermaid.render(`dsh-mermaid-diagram-${callId}-${id}`, source)
        if (!cancelled && sequence.current === id) setState({ status: 'ready', svg })
      } catch (error) {
        if (!cancelled && sequence.current === id) {
          setState({ status: 'failed', message: errorMessage(error) })
          setView('code')
        }
      }
    })()
    return () => { cancelled = true }
  }, [settledError, ready, source, scheme, callId, retry])

  const copy = useCallback(() => {
    if (source === null) return
    const clipboard = navigator.clipboard
    if (clipboard === undefined) return
    void clipboard.writeText(source).then(() => {
      setCopied(true)
      if (copyTimer.current !== undefined) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => { setCopied(false) }, 1500)
    }, () => { /* A denied clipboard write leaves the label unchanged. */ })
  }, [source])

  const selectDiagram = useCallback(() => {
    setView('diagram')
    if (state.status === 'failed') setRetry(count => count + 1)
  }, [state.status])

  const hasSource = source !== null && source.trim() !== ''
  const showCode = view === 'code' || settledError || tooLarge
  const label = diagram.title ?? t('label')
  const notice = settledError
    ? failureText ?? t('errorTitle')
    : tooLarge
      ? t('tooLarge')
      : state.status === 'failed' ? state.message : null

  const noticeNode = notice === null ? null : (
    <div className={css.notice}>
      <span className={css.noticeTitle}>{t('errorTitle')}</span>
      <span className={css.noticeText}>{notice}</span>
    </div>
  )
  const codeNode = hasSource
    ? <pre className={css.code} aria-label={t('sourceLabel')}><code>{source}</code></pre>
    : null

  let body: ReactNode
  if (phase === 'preparing' && !ready) {
    body = <div className={css.status}>{t('preparing')}</div>
  } else if (settledError || showCode) {
    body = <>{noticeNode}{codeNode}</>
  } else if (!hasSource) {
    body = <div className={css.status}>{t('rendering')}</div>
  } else if (state.status === 'ready') {
    body = (
      <div
        className={css.diagram}
        role="img"
        aria-label={label}
        dangerouslySetInnerHTML={{ __html: state.svg }}
      />
    )
  } else {
    body = <div className={css.status}>{t('rendering')}</div>
  }

  return (
    <div className={css.card}>
      <div className={css.header}>
        <span className={css.title} title={label}>{label}</span>
        {hasSource && (
          <div className={css.toggle} role="group" aria-label={t('viewGroup')}>
            <button
              type="button"
              className={css.toggleButton}
              aria-pressed={!showCode}
              onClick={selectDiagram}
            >{t('diagram')}</button>
            <button
              type="button"
              className={css.toggleButton}
              aria-pressed={showCode}
              onClick={() => { setView('code') }}
            >{t('code')}</button>
          </div>
        )}
        {hasSource && (
          <button type="button" className={css.action} onClick={copy}>
            {copied ? t('copied') : t('copy')}
          </button>
        )}
      </div>
      <div className={css.body}>{body}</div>
    </div>
  )
}
