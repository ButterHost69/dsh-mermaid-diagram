/**
 * Dictionaries for the diagram card. Runtime copy is registered through
 * `ctx.locale`; keys are the typed source of truth.
 *
 * @module dsh-mermaid-diagram/client/locales
 */

/** Dictionary namespace owned by this plugin. */
export const NS = 'mermaidDiagram'

export const en = {
  'label': 'Mermaid diagram',
  'preparing': 'Creating diagram…',
  'rendering': 'Rendering diagram…',
  'diagram': 'Diagram',
  'code': 'Code',
  'viewGroup': 'Diagram view',
  'copy': 'Copy source',
  'copied': 'Copied',
  'errorTitle': 'Diagram could not be rendered',
  'tooLarge': 'This diagram is too large to render.',
  'sourceLabel': 'Diagram source',
}

export const zh: Record<keyof typeof en, string> = {
  'label': 'Mermaid 图表',
  'preparing': '正在创建图表…',
  'rendering': '正在渲染图表…',
  'diagram': '图表',
  'code': '代码',
  'viewGroup': '图表视图',
  'copy': '复制源码',
  'copied': '已复制',
  'errorTitle': '图表无法渲染',
  'tooLarge': '图表过大，无法渲染。',
  'sourceLabel': '图表源码',
}

/** Dictionaries in the shape `ctx.locale.register` expects. */
export const dictionaries = { en, zh }

/** Keys this namespace defines. */
export type MermaidDiagramKey = keyof typeof en
