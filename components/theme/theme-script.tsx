export const THEME_STORAGE_KEY = "pensioniq-theme";

/**
 * Applies the stored theme before first paint, so a dark-mode visitor never
 * sees a white flash. Inlined in <head> deliberately: anything deferred to a
 * React effect runs after the first paint. The site's CSP allows
 * `script-src 'unsafe-inline'`, so no nonce plumbing is needed.
 */
const script = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k)||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
