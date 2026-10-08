// background.js — MV3 service worker
// Routes messages from bridge.js (dashboard content script) to content.js (Uber tab)

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === 'ping') {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    return false;
  }

  if (message.command === 'fetch-trips') {
    handleFetchTrips(message, sendResponse);
    return true;
  }

  if (message.command === 'get-status') {
    handleGetStatus(sendResponse);
    return true;
  }

  return false;
});

async function handleFetchTrips(message, sendResponse) {
  try {
    const tabs = await chrome.tabs.query({ url: 'https://riders.uber.com/*' });
    if (tabs.length === 0) {
      sendResponse({
        error: 'NO_UBER_TAB',
        message: 'No se encontró una pestaña con riders.uber.com. Abrí https://riders.uber.com/trips e iniciá sesión.',
      });
      return;
    }
    const response = await chrome.tabs.sendMessage(tabs[0].id, {
      command: 'extract-trips',
      from: message.from,
      to: message.to,
    });
    sendResponse(response);
  } catch (err) {
    sendResponse({
      error: 'EXTENSION_ERROR',
      message: err.message || 'Error en la extensión',
    });
  }
}

async function handleGetStatus(sendResponse) {
  try {
    const tabs = await chrome.tabs.query({ url: 'https://riders.uber.com/*' });
    sendResponse({
      ok: true,
      uberTabOpen: tabs.length > 0,
      uberTabCount: tabs.length,
    });
  } catch (err) {
    sendResponse({ ok: false, error: err.message });
  }
}
