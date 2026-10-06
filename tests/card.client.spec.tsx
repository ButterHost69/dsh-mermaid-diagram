// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { en } from '../src/client/locales.ts'
import { MermaidCard } from '../src/client/MermaidCard.tsx'
import { setMermaidRuntimeLoaderForTesting } from '../src/client/mermaid-runtime.ts'
import type { MermaidCardProps, ToolArgsView, ToolCallBlock } from '../src/client/types.ts'

const t = (key: string): string => (en as Record<string, string>)[key] ?? key

/** An argument view over a fixed record. */
function view(record: Record<string, string>, complete = true): ToolArgsView {
  return { text: key => record[key], complete: () => complete, closed: () => complete }
}

/** A dispatched call carrying one diagram. */
function started(source: string, title?: string): MermaidCardProps {
  const record: Record<string, string> = { source }
  if (title !== undefined) record.title = title
  const block: ToolCallBlock = {
    phase: 'start', callId: 'call-1', name: 'mermaid', argsRaw: JSON.stringify(record), args: view(record),
  }
  return { phase: 'start', block, toolName: 'mermaid', callId: 'call-1', t }
}

/** A settled call with a recorded result, in the shape a replayed projection delivers (no `args` view). */
function settled(source: string, options: { error?: string } = {}): MermaidCardProps {
  const record: Record<string, string> = { source }
  const block: ToolCallBlock = {
    kind: 'tool-result', callId: 'call-1', name: 'mermaid',
    call: { name: 'mermaid', argsRaw: JSON.stringify(record) },
    content: options.error === undefined ? [{ type: 'text', text: 'Created a diagram.' }] : [{ type: 'text', text: options.error }],
    isError: options.error !== undefined,
  }
  return { phase: 'result', block, toolName: 'mermaid', callId: 'call-1', t }
}

beforeEach(() => {
  setMermaidRuntimeLoaderForTesting(async () => ({
    initialize: () => {},
    render: async (_id, source) => ({ svg: `<svg viewBox="0 0 10 10"><title>${source}</title></svg>` }),
  }))
})

afterEach(() => {
  cleanup()
  setMermaidRuntimeLoaderForTesting(undefined)
})

describe('MermaidCard', () => {
  it('renders the diagram with the caption as its accessible name', async () => {
    const { container } = render(<MermaidCard {...started('flowchart TD\n A-->B', 'Flow')} />)
    const figure = await screen.findByRole('img', { name: 'Flow' })
    expect(figure.querySelector('svg')).not.toBeNull()
    expect(container.textContent).toContain('Flow')
  })

  it('falls back to the default label without a caption', async () => {
    render(<MermaidCard {...started('flowchart TD')} />)
    expect(await screen.findByRole('img', { name: 'Mermaid diagram' })).toBeTruthy()
  })

  it('reports preparation while the source field is still open', () => {
    const record = { source: 'flowchart' }
    const block: ToolCallBlock = {
      phase: 'preparing', callId: 'call-1', name: 'mermaid', args: view(record, false),
    }
    render(<MermaidCard phase="preparing" block={block} toolName="mermaid" callId="call-1" t={t} />)
    expect(screen.getByText('Creating diagram…')).toBeTruthy()
  })

  it('shows the source and a notice when rendering fails', async () => {
    setMermaidRuntimeLoaderForTesting(async () => ({
      initialize: () => {},
      render: async () => { throw new Error('Parse error on line 2') },
    }))
    render(<MermaidCard {...started('flowchart TD\n A-->')} />)
    await waitFor(() => { expect(screen.getByText('Parse error on line 2')).toBeTruthy() })
    expect(screen.getByText('Diagram could not be rendered')).toBeTruthy()
    expect(screen.getByLabelText('Diagram source').textContent).toContain('flowchart TD')
  })

  it('shows the recorded failure of a rejected call', () => {
    render(<MermaidCard {...settled('   ', { error: 'invalid mermaid: `source` must contain Mermaid diagram source' })} />)
    expect(screen.getByText('Diagram could not be rendered')).toBeTruthy()
    expect(screen.getByText(/must contain Mermaid diagram source/u)).toBeTruthy()
  })

  it('switches to the source view', async () => {
    render(<MermaidCard {...started('sequenceDiagram\n A->>B: hi')} />)
    await screen.findByRole('img', { name: 'Mermaid diagram' })
    fireEvent.click(screen.getByRole('button', { name: 'Code' }))
    expect(screen.getByLabelText('Diagram source').textContent).toContain('sequenceDiagram')
  })

  it('copies the source to the clipboard', async () => {
    const writeText = vi.fn(async () => {})
    Object.assign(navigator, { clipboard: { writeText } })
    render(<MermaidCard {...started('flowchart TD\n A-->B')} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy source' }))
    await waitFor(() => { expect(writeText).toHaveBeenCalledWith('flowchart TD\n A-->B') })
    expect(await screen.findByText('Copied')).toBeTruthy()
  })
})
