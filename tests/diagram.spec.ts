import { describe, expect, it } from 'vitest'
import {
  diagramKind, diagramSummary, MAX_SOURCE_CHARS, prepareDiagram,
} from '../src/diagram.ts'

describe('prepareDiagram', () => {
  it('trims the source and keeps a trimmed caption', () => {
    expect(prepareDiagram('  flowchart TD\n A --> B  ', '  Flow  '))
      .toEqual({ source: 'flowchart TD\n A --> B', title: 'Flow' })
  })

  it('omits a caption that is absent or blank', () => {
    expect(prepareDiagram('graph LR; A-->B')).toEqual({ source: 'graph LR; A-->B' })
    expect(prepareDiagram('graph LR; A-->B', '   ')).toEqual({ source: 'graph LR; A-->B' })
  })

  it('rejects a blank source', () => {
    expect(() => prepareDiagram('   \n  ')).toThrow(/must contain Mermaid diagram source/u)
  })

  it('accepts a source at the bound and rejects one over it', () => {
    const atBound = 'a'.repeat(MAX_SOURCE_CHARS)
    expect(prepareDiagram(atBound).source).toHaveLength(MAX_SOURCE_CHARS)
    expect(() => prepareDiagram('a'.repeat(MAX_SOURCE_CHARS + 1))).toThrow(/the limit is 50000/u)
  })
})

describe('diagramKind', () => {
  it('reads the leading type keyword', () => {
    expect(diagramKind('sequenceDiagram\n A->>B: hi')).toBe('sequenceDiagram')
    expect(diagramKind('   flowchart TD')).toBe('flowchart')
  })

  it('answers an empty string without a keyword', () => {
    expect(diagramKind('   ')).toBe('')
  })
})

describe('diagramSummary', () => {
  it('names the type and the caption', () => {
    expect(diagramSummary({ source: 'flowchart TD\n A-->B', title: 'Flow' }))
      .toBe('Created a flowchart Mermaid diagram titled "Flow".')
    expect(diagramSummary({ source: 'flowchart TD\n A-->B' }))
      .toBe('Created a flowchart Mermaid diagram.')
  })

  it('falls back when no type keyword is present', () => {
    expect(diagramSummary({ source: '   ' })).toBe('Created a Mermaid diagram.')
  })
})
