// bridge.js — Injected into the dashboard page by the extension.
// Bridges CustomEvents from the page to chrome.runtime internal messaging.

// Tell the page the extension is present
window.dispatchEvent(new CustomEvent('uber-extractor-ready', { detail: { version: chrome.runtime.getManifest().version } }));

// Listen for requests from the page
window.addEventListener('uber-extractor-request', async (event) => {
  const { id, command, from, to } = event.detail;

  try {
    const response = await chrome.runtime.sendMessage({ command, from, to });
    window.dispatchEvent(new CustomEvent('uber-extractor-response', {
      detail: { id, ...response }
    }));
  } catch (err) {
    window.dispatchEvent(new CustomEvent('uber-extractor-response', {
      detail: { id, error: 'BRIDGE_ERROR', message: err.message || 'Error en la extensión' }
    }));
  }
});
