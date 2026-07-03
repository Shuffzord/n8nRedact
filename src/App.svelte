<script lang="ts">
  import CodeEditor from './lib/components/CodeEditor.svelte'
  import DiffView from './lib/components/DiffView.svelte'
  import RulePanel from './lib/components/RulePanel.svelte'
  import Report from './lib/components/Report.svelte'
  import { anonymize, assessRisk, defaultRules, type Rule, type RiskReport } from './lib/engine'

  let input = $state('')
  let output = $state('')
  let error = $state<string | null>(null)
  let isN8n = $state(false)
  let counts = $state<Record<string, number>>({})
  let risk = $state<RiskReport | null>(null)
  let rules = $state<Rule[]>(defaultRules())
  let viewMode = $state<'split' | 'diff'>('split')
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
  }

  function reset() {
    output = ''
    counts = {}
    risk = null
    isN8n = false
  }

  function run() {
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
    counts = result.countsByCategory
    risk = assessRisk(parsed, result)
  }

  function process(text: string) {
    input = text
    run()
  }

  function toggleRule(id: string) {
    rules = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    run()
  }

  async function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) process(await file.text())
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
    <div>
      <h1 class="text-lg font-semibold">n8n Workflow Anonymizer</h1>
      <p class="text-xs text-slate-400">
        Deterministic · format-preserving · runs entirely in your browser
      </p>
    </div>
    <span
      class="rounded-full border border-emerald-700 bg-emerald-950/50 px-3 py-1 text-xs text-emerald-300"
      title="A Content-Security-Policy blocks all network egress. Nothing you paste can leave this page."
    >
      🔒 No network · nothing uploaded
    </span>
  </header>

  <div class="flex items-center gap-2 border-b border-slate-800 px-5 py-2">
    <label class="cursor-pointer rounded bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700">
      Upload .json
      <input
        type="file"
        accept="application/json,.json"
        class="hidden"
        onchange={(e) => handleFiles((e.target as HTMLInputElement).files)}
      />
    </label>
    <button
      class="rounded bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700 disabled:opacity-40"
      disabled={!output}
      onclick={copyOutput}
    >
      {copied ? 'Copied ✓' : 'Copy result'}
    </button>
    <button
      class="rounded bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700 disabled:opacity-40"
      disabled={!output}
      onclick={downloadOutput}
    >
      Download
    </button>

    <div class="ml-2 inline-flex overflow-hidden rounded border border-slate-700 text-sm">
      <button
        class="px-3 py-1.5 {viewMode === 'split'
          ? 'bg-slate-700'
          : 'bg-slate-900 hover:bg-slate-800'}"
        onclick={() => (viewMode = 'split')}
      >
        Split
      </button>
      <button
        class="px-3 py-1.5 disabled:opacity-40 {viewMode === 'diff'
          ? 'bg-slate-700'
          : 'bg-slate-900 hover:bg-slate-800'}"
        disabled={!output}
        onclick={() => (viewMode = 'diff')}
      >
        Diff
      </button>
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
        <div class="border-b border-slate-800 px-4 py-1.5 text-xs font-medium text-slate-400">
          Diff — original (left) vs anonymized (right)
        </div>
        <div class="h-[calc(100%-2rem)]">
          <DiffView original={input} anonymized={output} />
        </div>
      </main>
    {:else}
      <main class="grid min-h-0 flex-1 grid-cols-2 divide-x divide-slate-800">
        <section
          class="relative min-h-0"
          class:ring-2={dragging}
          class:ring-emerald-500={dragging}
          ondragover={(e) => {
            e.preventDefault()
            dragging = true
          }}
          ondragleave={() => (dragging = false)}
          ondrop={onDrop}
          aria-label="Original workflow input"
        >
          <div class="border-b border-slate-800 px-4 py-1.5 text-xs font-medium text-slate-400">
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
          <div class="border-b border-slate-800 px-4 py-1.5 text-xs font-medium text-slate-400">
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
    Replacements are realistic but fake (format-preserving) — the anonymized workflow still imports.
  </footer>
</div>
