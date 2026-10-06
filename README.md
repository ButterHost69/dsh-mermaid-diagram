# dsh-mermaid-diagram

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) plugin that gives the model a **Mermaid diagram tool** and renders each diagram as a card in the Web UI conversation.

The model calls `mermaid` with diagram source; the call renders as an interactive card with a **Diagram / Code** toggle, a copy action, and a fallback to the source whenever rendering fails. Diagrams are ordinary session events, so a card replays from the log.

## Features

- One model-facing tool, `mermaid`, with `source` and optional `title` parameters.
- Renders any Mermaid-supported diagram type: flowcharts, sequence diagrams, class diagrams, state diagrams, ER diagrams, Gantt charts, pie charts, and more.
- Theme-aware: the diagram follows the host light/dark theme and re-renders when the theme changes.
- Streaming-safe: a card shows progress while the call streams and renders once the arguments are complete.
- Replay-safe: the source is read from the logged call arguments, so a card survives reload and history paging.
- Failure-safe: invalid source falls back to the source view with a notice instead of a broken card.
- Localized card copy (English and Simplified Chinese), following the host language.
- Bundles Mermaid locally and serves it from the plugin's own host route; no CDN and no network dependency at render time.
- The ~3.5 MB Mermaid runtime is loaded only after the first diagram appears, so it costs nothing at boot.

## Requirements

- `dsh` `0.2.1-alpha.1` (verified) or a compatible release.
- Node.js `^22.19 || >=24`.
- A Web profile (`dsh web`) for the card. The tool itself also registers in profiles without a web server.

## Install

From this repository (a git install builds the package during installation):

```sh
dsh plugin --profile web add -w github:ButterHost69/dsh-mermaid-diagram
```

pnpm ≥10 refuses to run a git dependency's `prepare` script until it is allowed. If the first `add` fails, copy the exact package key pnpm prints into `allowBuilds` in the profile's `pnpm-workspace.yaml`:

```yaml
allowBuilds:
  dsh-mermaid-diagram: true
```

Then run the `add` again. Treat that allowance as permission to run this package's build on your machine.

From a local checkout:

```sh
dsh plugin --profile web add -w /absolute/path/to/dsh-mermaid-diagram
```

Restart `dsh web` (or reload the page) after installing.

## Usage

Ask the model for a diagram, for example:

> Draw a flowchart of our release process.

The model calls the `mermaid` tool, and the result appears as a card:

- **Diagram** shows the rendered SVG (the default).
- **Code** shows the diagram source.
- **Copy source** copies the source to the clipboard.

When the source cannot be rendered, the card opens in **Code** with the render error above the source.

## How it works

| Piece | Responsibility |
| --- | --- |
| `src/index.ts` (host) | Registers the `mermaid` tool and serves the bundled Mermaid runtime from `/dsh-mermaid-diagram/mermaid-runtime.js`. |
| `src/diagram.ts` | Argument normalization, the size bound, and the model-facing summary. Shared by both halves. |
| `src/client/index.ts` | Registers one keyed `tool.call.toolview` entry for the `mermaid` wire tool. |
| `src/client/MermaidCard.tsx` | Reads the diagram from the call, lazily loads the runtime, renders the SVG, and owns the card states. |
| `src/client/mermaid-runtime.ts` | Loads the runtime asset once per page and caches it on `globalThis.mermaid`. |

The tool's call and result are ordinary session events, so the card derives everything from the log: the recorded `call.argsRaw` supplies the source, and `result.meta` is not needed.

## Limits

- A source over 50,000 characters is rejected by the tool before it reaches the browser, because Mermaid parses and lays out synchronously.
- The card renders Mermaid's `strict` security level; labels are sanitized by Mermaid.
- Very tall diagrams scroll inside the card rather than expanding the transcript.

## Development

```sh
npm install
npm run build     # tsc declarations + tsdown bundles + the Mermaid runtime asset
npm test          # vitest: host logic, card model, and card component
npm run typecheck
```

Build output lands in `lib/`: `index.js` (host), `client.js` (browser half, wrapped for the DSH client module loader), and `mermaid-runtime.js` (the bundled Mermaid UMD asset plus its license notice).

## License

MIT. See [LICENSE](LICENSE).

The bundled Mermaid runtime is [Mermaid](https://github.com/mermaid-js/mermaid), MIT licensed; its notice ships beside the asset as `lib/mermaid-runtime.js.LEGAL.txt`.

Prior art: [MrmoLabs/dsh-mermaid](https://github.com/MrmoLabs/dsh-mermaid) renders Mermaid fenced code blocks by enhancing the transcript DOM. This plugin takes the documented tool-view seam instead, so the capability is an explicit model tool rather than a Markdown rewrite.
