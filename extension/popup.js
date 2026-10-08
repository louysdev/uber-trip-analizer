// popup.js — Extension popup logic

document.getElementById('version').textContent = 'v' + chrome.runtime.getManifest().version;

async function checkStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ command: 'get-status' });

    const dot = document.getElementById('uberDot');
    const value = document.getElementById('uberValue');
    const help = document.getElementById('helpText');

    if (response.uberTabOpen) {
      dot.className = 'dot green';
      value.textContent = 'Conectada ✓';
      help.innerHTML = '✅ Todo listo. Abrí el <a href="https://louysdev.github.io/uber-trip-analizer/" target="_blank">dashboard</a> y buscá tus viajes.';
    } else {
      dot.className = 'dot red';
      value.textContent = 'No encontrada';
      help.innerHTML = '⚠️ Abrí <a href="https://riders.uber.com/trips" target="_blank">riders.uber.com</a> e iniciá sesión para poder extraer viajes.';
    }
  } catch (err) {
    document.getElementById('uberDot').className = 'dot red';
    document.getElementById('uberValue').textContent = 'Error';
    document.getElementById('helpText').textContent = 'Error al verificar: ' + err.message;
  }
}

checkStatus();
