import { defineConfig, type Plugin } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

// The keystone privacy guarantee: block all cross-origin network egress so a
// pasted workflow can never leave the browser. Injected only into the built
// HTML — the dev server needs inline scripts + a websocket for HMR.
const CSP = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // CodeMirror/Svelte inject scoped <style> tags
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'", // no fetch/XHR/WebSocket — nothing can be exfiltrated
  "worker-src 'self'", // allow the offline service worker to register
  "form-action 'none'",
  // Note: frame-ancestors only works as an HTTP header, not in a <meta> CSP.
  // GitHub Pages can't set headers; clickjacking risk is negligible for a
  // stateless, no-auth tool.
].join('; ')

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
      return html.replace(
        '</title>',
        `</title>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
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
