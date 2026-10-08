chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') {
    sendResponse({ error: 'EXTENSION_ERROR', message: 'Mensaje inválido' });
    return false;
  }

  if (message.command === 'ping') {
    sendResponse({ ok: true, version: '1.0.0' });
    return false;
  }

  if (message.command === 'fetch-trips') {
    try {
      chrome.tabs.query({ url: 'https://riders.uber.com/*' }, (tabs) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: 'EXTENSION_ERROR', message: chrome.runtime.lastError.message });
          return;
        }

        if (!tabs || tabs.length === 0) {
          sendResponse({
            error: 'NO_UBER_TAB',
            message: 'No se encontró una pestaña con riders.uber.com. Abrí https://riders.uber.com/trips e iniciá sesión.',
          });
          return;
        }

        const targetTab = tabs.find((t) => t.active) || tabs[0];
        chrome.tabs.sendMessage(
          targetTab.id,
          { command: 'extract-trips', from: message.from, to: message.to },
          (response) => {
            if (chrome.runtime.lastError) {
              sendResponse({ error: 'EXTENSION_ERROR', message: chrome.runtime.lastError.message });
              return;
            }
            sendResponse(response);
          }
        );
      });
    } catch (err) {
      sendResponse({ error: 'EXTENSION_ERROR', message: err.message });
    }
    return true;
  }

  sendResponse({ error: 'EXTENSION_ERROR', message: `Comando desconocido: ${message.command}` });
  return false;
});
