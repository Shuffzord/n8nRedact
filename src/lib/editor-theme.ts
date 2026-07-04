import { EditorView } from '@codemirror/view'
import { oneDark } from '@codemirror/theme-one-dark'

/**
 * Cohesive dark theme for the CodeMirror editors and the merge/diff view.
 *
 * Layered on top of `oneDark` (which supplies well-tuned JSON syntax colors and
 * declares itself a *dark* theme). Declaring the override theme dark as well is
 * what makes @codemirror/merge switch to its `&dark` diff palette — semantic
 * red = removed (left / a-side), green = added (right / b-side) — instead of the
 * light defaults that would otherwise render on our dark background. The extra
 * rules below re-tint those diff colors to sit calmly on the slate chrome and
 * point the caret / selection / brackets at the brand accent.
 */

const bg = '#020617' // slate-950 — matches the app shell
const gutterFg = '#475569' // slate-600
const activeLine = 'rgba(148, 163, 184, 0.06)' // slate-400 @ 6%
const brand = '#e14970'
const brandSelection = 'rgba(225, 73, 112, 0.28)'

const removedLine = 'rgba(244, 63, 94, 0.10)'
const removedText = 'rgba(244, 63, 94, 0.30)'
const addedLine = 'rgba(52, 211, 153, 0.12)'
const addedText = 'rgba(52, 211, 153, 0.32)'

const chrome = EditorView.theme(
  {
    '&': { backgroundColor: bg, height: '100%' },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'var(--font-mono, ui-monospace, Menlo, Consolas, monospace)',
    },
    '.cm-gutters': { backgroundColor: bg, color: gutterFg, border: 'none' },
    '.cm-activeLine': { backgroundColor: activeLine },
    '.cm-activeLineGutter': { backgroundColor: activeLine, color: '#94a3b8' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: brand },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: brandSelection,
    },
    '.cm-selectionMatch': { backgroundColor: 'rgba(225, 73, 112, 0.16)' },
    '&.cm-focused .cm-matchingBracket, .cm-matchingBracket': {
      backgroundColor: 'rgba(225, 73, 112, 0.22)',
      color: 'inherit',
    },

    // Merge / diff view — dark-tuned add (right) and remove (left) tints.
    '&.cm-merge-a .cm-changedLine, .cm-deletedChunk': { backgroundColor: removedLine },
    '&.cm-merge-b .cm-changedLine': { backgroundColor: addedLine },
    '&.cm-merge-a .cm-changedText, .cm-deletedChunk .cm-deletedText': {
      backgroundColor: removedText,
    },
    '&.cm-merge-b .cm-changedText': { backgroundColor: addedText },
    '.cm-changeGutter': { width: '3px' },
    '&.cm-merge-a .cm-changedLineGutter, .cm-deletedLineGutter': { backgroundColor: '#f43f5e' },
    '&.cm-merge-b .cm-changedLineGutter': { backgroundColor: '#34d399' },
  },
  { dark: true },
)

export const editorTheme = [oneDark, chrome]
