import { describe, expect, it } from 'vitest'
import {
  argsReady, errorMessage, exceedsRenderBound, readDiagram, resultText,
} from '../src/client/model.ts'
import type { ToolArgsView, ToolCallBlock } from '../src/client/types.ts'

/** An argument view over a fixed record. */
function view(record: Record<string, string>, complete = true): ToolArgsView {
  return {
    text: key => record[key],
    complete: () => complete,
    closed: () => complete,
  }
}

describe('readDiagram', () => {
  it('reads the streaming view while a call is running', () => {
    const block: ToolCallBlock = {
      phase: 'start', callId: 'c1', name: 'mermaid', argsRaw: '{"source":"flowchart TD"}',
      args: view({ source: 'flowchart TD', title: 'Flow' }),
    }
    expect(readDiagram(block)).toEqual({ source: 'flowchart TD', title: 'Flow' })
  })

  it('falls back to recorded raw arguments when the view is empty', () => {
    const block: ToolCallBlock = {
      kind: 'tool-result', callId: 'c1', name: 'mermaid', args: view({}),
      call: { name: 'mermaid', argsRaw: '{"source":"pie title Pets","title":"Pets"}' },
      content: [], isError: false,
    }
    expect(readDiagram(block)).toEqual({ source: 'pie title Pets', title: 'Pets' })
  })

  it('falls back to recorded raw arguments when a replay omits the view', () => {
    const block: ToolCallBlock = {
      kind: 'tool-result', callId: 'c1', name: 'mermaid',
      call: { name: 'mermaid', argsRaw: '{"source":"flowchart TD"}' },
      content: [], isError: false,
    }
    expect(readDiagram(block)).toEqual({ source: 'flowchart TD', title: null })
  })

  it('answers nulls for malformed or absent recorded arguments', () => {
    const base = {
      kind: 'tool-result', callId: 'c1', name: 'mermaid', args: view({}),
      content: [], isError: false,
    } as const
    expect(readDiagram({ ...base, call: { name: 'mermaid', argsRaw: '{"source":' } }))
      .toEqual({ source: null, title: null })
    expect(readDiagram({ ...base, call: null })).toEqual({ source: null, title: null })
    expect(readDiagram({ ...base, call: { name: 'mermaid', argsRaw: '["x"]' } }))
      .toEqual({ source: null, title: null })
  })
})

describe('argsReady', () => {
  it('is false while the source field is still open', () => {
    const block: ToolCallBlock = {
      phase: 'preparing', callId: 'c1', name: 'mermaid', args: view({ source: 'flow' }, false),
    }
    expect(argsReady(block)).toBe(false)
  })

  it('is true for a dispatched call and a settled result', () => {
    const started: ToolCallBlock = {
      phase: 'start', callId: 'c1', name: 'mermaid', argsRaw: '{}', args: view({}, false),
    }
    const settled: ToolCallBlock = {
      kind: 'tool-result', callId: 'c1', name: 'mermaid',
      call: null, content: [], isError: false,
    }
    expect(argsReady(started)).toBe(true)
    expect(argsReady(settled)).toBe(true)
  })

  it('is false for a preparing call whose view a projection omitted', () => {
    const block: ToolCallBlock = { phase: 'preparing', callId: 'c1', name: 'mermaid' }
    expect(argsReady(block)).toBe(false)
  })
})

describe('resultText', () => {
  it('joins text blocks and serializes others', () => {
    expect(resultText([{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }])).toBe('a\nb')
    expect(resultText([{ type: 'image', text: undefined }])).toContain('"type": "image"')
    expect(resultText([])).toBeNull()
  })
})

describe('exceedsRenderBound', () => {
  it('compares against the shared bound', () => {
    expect(exceedsRenderBound(null)).toBe(false)
    expect(exceedsRenderBound('a'.repeat(50_000))).toBe(false)
    expect(exceedsRenderBound('a'.repeat(50_001))).toBe(true)
  })
})

describe('errorMessage', () => {
  it('prefers a non-empty Error message', () => {
    expect(errorMessage(new Error('bad syntax'))).toBe('bad syntax')
    expect(errorMessage(new Error(''))).toBe('Unknown rendering error.')
    expect(errorMessage('plain')).toBe('plain')
    expect(errorMessage(undefined)).toBe('Unknown rendering error.')
  })
})
