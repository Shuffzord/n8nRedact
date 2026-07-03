<script lang="ts">
  import type { Rule } from '../engine'

  let { rules, onToggle }: { rules: Rule[]; onToggle: (id: string) => void } = $props()
</script>

<div class="space-y-3">
  <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-400">Rules</h2>

  <p
    class="rounded border border-slate-700 bg-slate-900/60 p-2.5 text-xs leading-relaxed text-slate-300"
  >
    <span class="font-medium text-slate-100">Format-preserving replacements.</span>
    Values are swapped for realistic but fake data — e.g.
    <code class="text-emerald-300">john@acme.com</code> →
    <code class="text-emerald-300">user1@example.com</code>. The output stays a valid, importable
    workflow; it just contains no real data. The same value always maps to the same replacement.
  </p>

  <ul class="space-y-1">
    {#each rules as rule (rule.id)}
      <li>
        <label class="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 hover:bg-slate-800">
          <input
            type="checkbox"
            class="mt-0.5 accent-emerald-500"
            checked={rule.enabled}
            onchange={() => onToggle(rule.id)}
          />
          <span class="text-sm text-slate-200">{rule.label}</span>
        </label>
      </li>
    {/each}
  </ul>
</div>
