<script lang="ts">
  import { onMount } from 'svelte'
  import { EditorView } from '@codemirror/view'
  import { EditorState } from '@codemirror/state'
  import { basicSetup } from 'codemirror'
  import { json } from '@codemirror/lang-json'
  import { editorTheme } from '../editor-theme'

  let {
    value = '',
    readonly = false,
    placeholder = '',
    onChange,
  }: {
    value?: string
    readonly?: boolean
    placeholder?: string
    onChange?: (v: string) => void
  } = $props()

  let el: HTMLDivElement
  let view: EditorView | undefined

  onMount(() => {
    view = new EditorView({
      parent: el,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          json(),
          EditorView.lineWrapping,
          ...editorTheme,
          ...(readonly ? [EditorState.readOnly.of(true), EditorView.editable.of(false)] : []),
          EditorView.updateListener.of((u) => {
            if (u.docChanged && onChange) onChange(u.state.doc.toString())
          }),
        ],
      }),
    })
    return () => view?.destroy()
  })

  // Keep a read-only pane in sync when its value is set programmatically.
  $effect(() => {
    if (view && readonly && value !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
    }
  })
</script>

<div bind:this={el} class="h-full w-full text-sm" data-placeholder={placeholder}></div>
