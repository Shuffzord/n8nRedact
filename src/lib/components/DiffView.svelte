<script lang="ts">
  import { onMount } from 'svelte'
  import { MergeView } from '@codemirror/merge'
  import { EditorView } from '@codemirror/view'
  import { EditorState } from '@codemirror/state'
  import { basicSetup } from 'codemirror'
  import { json } from '@codemirror/lang-json'
  import { editorTheme } from '../editor-theme'

  let { original = '', anonymized = '' }: { original?: string; anonymized?: string } = $props()

  let el: HTMLDivElement
  let view: MergeView | undefined

  const sideExtensions = () => [
    basicSetup,
    json(),
    EditorView.lineWrapping,
    ...editorTheme,
    EditorState.readOnly.of(true),
    EditorView.editable.of(false),
  ]

  function render() {
    view?.destroy()
    view = new MergeView({
      parent: el,
      a: { doc: original, extensions: sideExtensions() },
      b: { doc: anonymized, extensions: sideExtensions() },
      highlightChanges: true,
      gutter: true,
    })
  }

  onMount(() => {
    render()
    return () => view?.destroy()
  })

  // Rebuild when either side changes (diffs here are small, so a rebuild is fine).
  $effect(() => {
    void original
    void anonymized
    if (view) render()
  })
</script>

<div bind:this={el} class="h-full w-full overflow-auto text-sm"></div>
