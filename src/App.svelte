<script lang="ts">
  import { Button } from 'bits-ui'
  import CodeEditor from './lib/components/CodeEditor.svelte'
  import DiffView from './lib/components/DiffView.svelte'
  import RulePanel from './lib/components/RulePanel.svelte'
  import Report from './lib/components/Report.svelte'
  import { anonymize, assessRisk, defaultRules, type Rule, type RiskReport } from './lib/engine'

  // Shared control styles (Tailwind). Kept here so the toolbar reads cleanly.
  const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
  const toolbarBtn = `rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-700 disabled:pointer-events-none disabled:opacity-40 ${focusRing}`
  const segBase =
    'px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 disabled:pointer-events-none disabled:opacity-40'
  const segActive = 'bg-primary-600 text-white'
  const segIdle = 'bg-slate-900 text-slate-300 hover:bg-slate-800'
  const headerCopyBtn = `mr-3 rounded bg-primary-600 px-3 py-1 text-xs font-medium tracking-normal normal-case text-white transition-colors hover:bg-primary-500 disabled:pointer-events-none disabled:opacity-40 ${focusRing}`

  let input = $state('')
  let output = $state('')
  let originalPretty = $state('') // parsed original re-stringified so diff shows only value changes
  let error = $state<string | null>(null)
  let isN8n = $state(false)
  let counts = $state<Record<string, number>>({})
  let risk = $state<RiskReport | null>(null)
  let rules = $state<Rule[]>(defaultRules())
  let viewMode = $state<'split' | 'diff'>('diff')
  let dragging = $state(false)
  let copied = $state(false)

  const totalReplaced = $derived(Object.values(counts).reduce((a, b) => a + b, 0))

  const CATEGORY_LABELS: Record<string, string> = {
    apiKey: 'Credentials / keys',
    credentialName: 'Credential refs',
    email: 'Emails',
    url: 'URLs',
    uuid: 'IDs (UUID / hex)',
    chatId: 'Messaging IDs',
    dbBucket: 'Resource names',
    resourceId: 'Resource IDs',
  }

  function reset() {
    output = ''
    originalPretty = ''
    counts = {}
    risk = null
    isN8n = false
  }

  // Typing re-parses + re-anonymizes + rebuilds the MergeView on every
  // keystroke, so the editable pane debounces `run()`. Upload/drag-drop and
  // rule toggles call `run()` directly (not typing — instant is expected); each
  // clears any pending typing run so a stale keystroke can't clobber the result.
  let runTimer: ReturnType<typeof setTimeout> | undefined

  function scheduleRun() {
    clearTimeout(runTimer)
    runTimer = setTimeout(run, 150)
  }

  function run() {
    clearTimeout(runTimer)
    if (!input.trim()) {
      error = null
      reset()
      return
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(input)
    } catch {
      error = 'Not valid JSON yet — paste or upload an exported workflow.'
      reset()
      return
    }
    error = null
    const obj = parsed as Record<string, unknown>
    isN8n =
      !!obj &&
      typeof obj === 'object' &&
      Array.isArray(obj.nodes) &&
      typeof obj.connections === 'object'
    const result = anonymize(parsed, rules)
    output = JSON.stringify(result.output, null, 2)
    originalPretty = JSON.stringify(parsed, null, 2)
    counts = result.countsByCategory
    risk = assessRisk(parsed, result)
  }

  // The editable editor's onChange: typing, so debounce.
  function process(text: string) {
    input = text
    scheduleRun()
  }

  function toggleRule(id: string) {
    rules = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    run()
  }

  async function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) {
      input = await file.text()
      run()
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    dragging = false
    handleFiles(e.dataTransfer?.files ?? null)
  }

  async function copyOutput() {
    if (!output) return
    await navigator.clipboard.writeText(output)
    copied = true
    setTimeout(() => (copied = false), 1500)
  }

  function downloadOutput() {
    if (!output) return
    const blob = new Blob([output], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'workflow.anonymized.json'
    a.click()
    URL.revokeObjectURL(url)
  }
</script>

<div class="flex h-screen flex-col bg-slate-950 text-slate-100">
  <header class="flex items-center justify-between border-b border-slate-800 px-5 py-3">
    <div class="flex items-center gap-3">
      <div>
        <h1 class="text-lg font-semibold tracking-tight">
          <span class="text-slate-100">n8n</span><span class="text-primary-500">Redact</span>
        </h1>
        <p class="text-xs text-slate-400">
          Deterministic · format-preserving · runs entirely in your browser
        </p>
      </div>
    </div>
    <span
      class="rounded-full border border-emerald-700/80 bg-emerald-950/50 px-3 py-1 text-xs font-medium text-emerald-300"
      title="A Content-Security-Policy blocks all network egress. Nothing you paste can leave this page."
    >
      🔒 No network · nothing uploaded
    </span>
  </header>

  <div class="flex items-center gap-2 border-b border-slate-800 px-5 py-2">
    <label class="{toolbarBtn} cursor-pointer focus-within:ring-2 focus-within:ring-primary-500">
      Upload .json
      <input
        type="file"
        accept="application/json,.json"
        class="sr-only"
        onchange={(e) => handleFiles((e.target as HTMLInputElement).files)}
      />
    </label>
    <Button.Root type="button" class={toolbarBtn} disabled={!output} onclick={downloadOutput}>
      Download
    </Button.Root>

    <div
      class="ml-2 inline-flex overflow-hidden rounded-md border border-slate-700"
      role="group"
      aria-label="View mode"
    >
      <Button.Root
        type="button"
        aria-pressed={viewMode === 'split'}
        class="{segBase} {viewMode === 'split' ? segActive : segIdle}"
        onclick={() => (viewMode = 'split')}
      >
        Split
      </Button.Root>
      <Button.Root
        type="button"
        aria-pressed={viewMode === 'diff'}
        class="{segBase} {viewMode === 'diff' ? segActive : segIdle}"
        disabled={!output}
        onclick={() => (viewMode = 'diff')}
      >
        Diff
      </Button.Root>
    </div>

    <div class="ml-auto flex items-center gap-3 text-xs">
      {#if error}
        <span class="text-amber-400">{error}</span>
      {:else if input}
        <span class={isN8n ? 'text-emerald-400' : 'text-slate-400'}>
          {isN8n ? '✓ Looks like an n8n workflow' : 'Valid JSON (n8n shape not detected)'}
        </span>
        <span class="text-slate-300">
          {totalReplaced} replacement{totalReplaced === 1 ? '' : 's'}
        </span>
      {/if}
    </div>
  </div>

  <div class="flex min-h-0 flex-1">
    <aside class="w-72 shrink-0 space-y-5 overflow-y-auto border-r border-slate-800 p-4">
      <RulePanel {rules} onToggle={toggleRule} />
      <Report {risk} {counts} labels={CATEGORY_LABELS} />
    </aside>

    {#if viewMode === 'diff' && output}
      <main class="min-h-0 flex-1">
        <div
          class="flex items-center border-b border-slate-800 px-4 py-1.5 text-xs font-medium tracking-wide text-slate-400 uppercase"
        >
          <Button.Root type="button" onclick={copyOutput} disabled={!output} class={headerCopyBtn}>
            {copied ? 'Copied ✓' : 'Copy anonymized'}
          </Button.Root>
          <span class="mr-2 h-3 w-0.5 rounded-full bg-primary-500/70"></span>
          Diff — original (left) vs anonymized (right)
        </div>
        <div class="h-[calc(100%-2rem)]">
          <DiffView original={originalPretty} anonymized={output} />
        </div>
      </main>
    {:else}
      <main class="grid min-h-0 flex-1 grid-cols-2 divide-x divide-slate-800">
        <section
          class="relative min-h-0"
          class:ring-2={dragging}
          class:ring-primary-500={dragging}
          class:ring-inset={dragging}
          ondragover={(e) => {
            e.preventDefault()
            dragging = true
          }}
          ondragleave={() => (dragging = false)}
          ondrop={onDrop}
          aria-label="Original workflow input"
        >
          <div
            class="flex items-center border-b border-slate-800 px-4 py-1.5 text-xs font-medium tracking-wide text-slate-400 uppercase"
          >
            <span class="mr-2 h-3 w-0.5 rounded-full bg-primary-500/70"></span>
            Original
          </div>
          <div class="h-[calc(100%-2rem)]">
            <CodeEditor value={input} onChange={process} />
          </div>
          {#if !input}
            <p
              class="pointer-events-none absolute inset-x-0 top-16 text-center text-sm text-slate-500"
            >
              Paste workflow JSON here, or drop a .json file
            </p>
          {/if}
        </section>

        <section class="min-h-0">
          <div
            class="flex items-center border-b border-slate-800 px-4 py-1.5 text-xs font-medium tracking-wide text-slate-400 uppercase"
          >
            <Button.Root
              type="button"
              onclick={copyOutput}
              disabled={!output}
              class={headerCopyBtn}
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </Button.Root>
            <span class="mr-2 h-3 w-0.5 rounded-full bg-primary-500/70"></span>
            Anonymized
          </div>
          <div class="h-[calc(100%-2rem)]">
            <CodeEditor value={output} readonly />
          </div>
        </section>
      </main>
    {/if}
  </div>

  <footer class="border-t border-slate-800 px-5 py-2 text-xs text-slate-400">
    Replacements are realistic but fake (format-preserving) - the anonymized workflow still imports.
  </footer>
</div>
