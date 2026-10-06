/**
 * Host half of `dsh-mermaid-diagram`.
 *
 * Registers the model-facing `mermaid` tool and serves the bundled Mermaid
 * runtime that the browser half loads on demand. The tool is the only
 * model-visible contribution: its call and result are ordinary session events,
 * so a diagram card replays from the log with no extra state.
 *
 * @module dsh-mermaid-diagram
 */

import { readFile } from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  DIAGRAM_TOOL_NAME, diagramSummary, MAX_SOURCE_CHARS, prepareDiagram, RUNTIME_PATH,
} from './diagram.ts'
// Type-only: applies the ctx.webServer Context merge.
import type {} from './types.ts'

export const name = 'dsh-mermaid-diagram'
export const inject = ['tools']

export { DIAGRAM_TOOL_NAME, MAX_SOURCE_CHARS, RUNTIME_PATH } from './diagram.ts'
export type { DiagramValue } from './diagram.ts'

/** The runtime asset sits beside the emitted host entry inside lib/. */
const runtimeFile = new URL('./mermaid-runtime.js', import.meta.url)

const DESCRIPTION = 'Create a Mermaid diagram and display it as a rendered diagram in the conversation. '
  + 'Use it for flowcharts, sequence diagrams, class diagrams, state diagrams, entity-relationship '
  + 'diagrams, Gantt charts, pie charts, and other Mermaid-supported diagram types. '
  + 'Pass complete diagram source; do not wrap it in a Markdown code fence.'

/**
 * Mount the tool and, when a web server is present, its runtime route.
 *
 * `webServer` is mounted through a child fiber rather than `inject` so a
 * headless profile still registers the tool; only the rendering half needs an
 * HTTP surface.
 * @param ctx - host context.
 */
export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: DIAGRAM_TOOL_NAME,
    description: DESCRIPTION,
    parameters: {
      source: {
        type: 'string',
        required: true,
        description: 'Complete Mermaid diagram source, starting with the diagram type keyword '
          + '(for example `flowchart TD` or `sequenceDiagram`). No Markdown fences.',
      },
      title: {
        type: 'string',
        description: 'Short caption shown above the diagram; omit when the diagram is self-explanatory.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          source: { type: 'string', required: true },
          title: { type: 'string' },
        },
      },
      render: (_args, value) => [{ type: 'text', text: diagramSummary(value) }],
    },
    async execute(args) {
      return prepareDiagram(args.source, args.title)
    },
  }))

  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: RUNTIME_PATH,
      async handler(req, res) {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405, { allow: 'GET, HEAD' })
          res.end()
          return
        }
        let body: Buffer
        try {
          body = await readFile(runtimeFile)
        } catch {
          res.writeHead(404)
          res.end()
          return
        }
        res.writeHead(200, {
          'content-type': 'text/javascript; charset=utf-8',
          'content-length': String(body.byteLength),
          'cache-control': 'public, max-age=31536000, immutable',
        })
        res.end(req.method === 'HEAD' ? undefined : body)
      },
    }), 'dsh-mermaid-diagram: runtime route')
  })
}
