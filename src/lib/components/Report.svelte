<script lang="ts">
  import type { RiskReport } from '../engine'

  let {
    risk,
    counts,
    labels,
  }: {
    risk: RiskReport | null
    counts: Record<string, number>
    labels: Record<string, string>
  } = $props()

  const BADGE: Record<string, string> = {
    low: 'border-emerald-700 bg-emerald-950/50 text-emerald-300',
    medium: 'border-amber-700 bg-amber-950/50 text-amber-300',
    high: 'border-red-700 bg-red-950/50 text-red-300',
  }
</script>

{#if risk}
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <h2 class="flex items-center text-xs font-semibold tracking-wide text-slate-400 uppercase">
        <span class="mr-2 h-3.5 w-0.5 rounded-full bg-primary-500"></span>
        Risk
      </h2>
      <span
        class="rounded-full border px-2 py-0.5 text-xs font-medium uppercase {BADGE[risk.level]}"
      >
        {risk.level}
      </span>
    </div>

    {#each risk.warnings as warning (warning)}
      <p
        class="rounded border border-red-800 bg-red-950/40 p-2.5 text-xs leading-relaxed text-red-200"
      >
        ⚠ {warning}
      </p>
    {/each}

    {#if Object.keys(counts).length > 0}
      <ul class="space-y-0.5 text-xs text-slate-300">
        {#each Object.entries(counts) as [cat, n] (cat)}
          <li class="flex justify-between">
            <span>{labels[cat] ?? cat}</span>
            <span class="text-slate-100">{n}</span>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-xs text-slate-500">No sensitive data detected.</p>
    {/if}
  </div>
{/if}
