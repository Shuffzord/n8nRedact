<script lang="ts">
  import { Checkbox } from 'bits-ui'
  import type { Rule } from '../engine'

  let { rules, onToggle }: { rules: Rule[]; onToggle: (id: string) => void } = $props()
</script>

<div class="space-y-3">
  <h2 class="flex items-center text-xs font-semibold tracking-wide text-slate-400 uppercase">
    <span class="mr-2 h-3.5 w-0.5 rounded-full bg-primary-500"></span>
    Rules
  </h2>

  <p
    class="rounded-md border border-slate-800 bg-slate-900/60 p-2.5 text-xs leading-relaxed text-slate-300"
  >
    <span class="font-medium text-slate-100">Format-preserving replacements.</span>
    Values are swapped for realistic but fake data — e.g.
    <code class="text-primary-300">john@acme.com</code> →
    <code class="text-primary-300">user1@example.com</code>. The output stays a valid, importable
    workflow; it just contains no real data. The same value always maps to the same replacement.
  </p>

  <ul class="space-y-0.5">
    {#each rules as rule (rule.id)}
      <li>
        <label
          class="flex cursor-pointer items-start gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-slate-800/70"
        >
          <Checkbox.Root
            checked={rule.enabled}
            onCheckedChange={() => onToggle(rule.id)}
            class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border border-slate-600 bg-slate-900 text-white transition-colors data-[state=checked]:border-primary-500 data-[state=checked]:bg-primary-600 hover:border-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            {#snippet children({ checked }: { checked: boolean })}
              {#if checked}
                <svg
                  viewBox="0 0 12 12"
                  fill="none"
                  class="size-3"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2.5 6.2 5 8.5l4.5-5"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              {/if}
            {/snippet}
          </Checkbox.Root>
          <span class="text-sm text-slate-200 select-none">{rule.label}</span>
        </label>
      </li>
    {/each}
  </ul>
</div>
