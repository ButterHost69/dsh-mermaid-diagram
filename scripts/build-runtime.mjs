/**
 * Copy the pinned Mermaid browser runtime into lib/ as the plugin's own asset.
 *
 * The runtime ships as one self-contained UMD file that publishes
 * `globalThis.mermaid`; the host half serves it from a same-origin route and the
 * browser half loads it only after the first diagram appears. Keeping it out of
 * `lib/client.js` keeps the boot bundle small.
 */
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const manifestPath = require.resolve('mermaid/package.json')
const mermaidRoot = dirname(manifestPath)
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))

const runtimeSource = resolve(mermaidRoot, 'dist/mermaid.min.js')
const licenseSource = resolve(mermaidRoot, 'LICENSE')
const outDir = resolve(import.meta.dirname, '..', 'lib')

await mkdir(outDir, { recursive: true })
await copyFile(runtimeSource, resolve(outDir, 'mermaid-runtime.js'))
await writeFile(
  resolve(outDir, 'mermaid-runtime.js.LEGAL.txt'),
  `mermaid@${manifest.version} — MIT License\n\n${await readFile(licenseSource, 'utf8')}`,
)
console.log(`[dsh-mermaid-diagram] bundled mermaid@${manifest.version} runtime into lib/`)
