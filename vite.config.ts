import { createHash } from 'node:crypto'
import { defineConfig, type Plugin } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { CSP } from './src/lib/csp'

// Generate a service worker that precaches the built shell (index.html + all
// hashed assets) at install, so the app works fully offline after one visit.
// The precache fetch runs in the SW context, which is not bound by the page's
// `connect-src 'none'` — so offline works without weakening the CSP.
function swPlugin(): Plugin {
  return {
    name: 'generate-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      const urls = ['./', './index.html', ...Object.keys(bundle).map((f) => './' + f)]
      const source = `const CACHE='n8n-anon-v1';const PRECACHE=${JSON.stringify(urls)};
self.addEventListener('install',(e)=>{e.waitUntil(caches.open(CACHE).then((c)=>c.addAll(PRECACHE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',(e)=>{e.waitUntil(caches.keys().then((ks)=>Promise.all(ks.filter((k)=>k!==CACHE).map((k)=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',(e)=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==self.location.origin)return;e.respondWith(caches.match(r,{ignoreVary:true}).then((hit)=>hit||fetch(r).then((res)=>{if(res.ok){const cl=res.clone();caches.open(CACHE).then((c)=>c.put(r,cl))}return res})))});
`
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

function cspPlugin(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      // The JSON-LD block is static SEO metadata, not executable script, but
      // CSP's script-src still governs <script> elements regardless of type —
      // so it needs an explicit hash to run under 'self' without 'unsafe-inline'.
      const ldJson = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
      const csp = ldJson
        ? CSP.replace(
            "script-src 'self'",
            `script-src 'self' 'sha256-${createHash('sha256').update(ldJson[1]).digest('base64')}'`,
          )
        : CSP
      return html.replace(
        '</title>',
        `</title>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
      )
    },
  }
}

// Relative base so the static build works on any GitHub Pages path.
export default defineConfig({
  base: './',
  plugins: [svelte(), tailwindcss(), swPlugin(), cspPlugin()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
