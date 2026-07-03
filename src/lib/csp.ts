/**
 * Content-Security-Policy for the built app. The keystone privacy guarantee:
 * `connect-src 'none'` blocks all fetch/XHR/WebSocket egress, so a pasted
 * workflow can never leave the browser. Injected into the built HTML only — the
 * dev server needs inline scripts + a websocket for HMR.
 */
export const CSP_DIRECTIVES: readonly string[] = [
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
]

export const CSP = CSP_DIRECTIVES.join('; ')
