(function initTheme() {
  const modes = ['auto', 'light', 'dark'];
  let mode = localStorage.getItem('bpmnjs-theme') || 'auto';

  function applyTheme() {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = mode === 'dark' || (mode === 'auto' && systemDark);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }

  function themeLabel() {
    return { auto: '🌓', light: '☀️', dark: '🌙' }[mode];
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-theme');
    btn.addEventListener('click', () => {
      mode = modes[(modes.indexOf(mode) + 1) % modes.length];
      localStorage.setItem('bpmnjs-theme', mode);
      applyTheme();
      btn.textContent = themeLabel();
    });
    btn.textContent = themeLabel();
  });

  applyTheme();
})();

const modeler = new BpmnJS({
  container: '#canvas',
  bpmnRenderer: {
    defaultFillColor: 'transparent',
    defaultStrokeColor: 'currentColor'
  }
});

const canvas = modeler.get('canvas');

function fitViewport() {
  canvas.zoom('fit-viewport', 'auto');
}

fetch('initial.bpmn')
  .then(r => r.ok ? r.text() : modeler.createDiagram())
  .then(xml => modeler.importXML(xml))
  .then(() => {
    console.log('Diagramm gerendert');
    fitViewport();
  })
  .catch(err => console.error('Fehler beim Rendern', err));

document.getElementById('btn-zoom-in').addEventListener('click', () => canvas.zoom(0.2));
document.getElementById('btn-zoom-out').addEventListener('click', () => canvas.zoom(-0.2));
document.getElementById('btn-zoom-fit').addEventListener('click', fitViewport);

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey) {
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      canvas.zoom(0.2);
    } else if (event.key === '-') {
      event.preventDefault();
      canvas.zoom(-0.2);
    } else if (event.key === '0') {
      event.preventDefault();
      fitViewport();
    }
  }
});

document.getElementById('btn-print').addEventListener('click', () => {
  const oldZoom = canvas.zoom();
  fitViewport();
  window.print();
  canvas.zoom(oldZoom);
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(fitViewport, 150);
});

let currentFileName = null;

const fileInput = document.getElementById('file-input');

document.getElementById('btn-open').addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  file.text().then(xml => modeler.importXML(xml))
    .then(() => {
      currentFileName = file.name;
      fitViewport();
      console.log('Diagramm geladen:', file.name);
    })
    .catch(err => console.error('Fehler beim Laden', err));
  fileInput.value = '';
});

function nextFileName() {
  const today = new Date();
  const yyyymmdd = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
  ].join('');
  const key = 'bpmnjs-seq-' + yyyymmdd;
  const next = String((parseInt(localStorage.getItem(key) || '0', 10) + 1)).padStart(2, '0');
  localStorage.setItem(key, String(parseInt(next, 10)));
  return yyyymmdd + '-bpmnjs-' + next + '.bpmn';
}

async function saveViaFilePicker(suggestedName) {
  if (!window.showSaveFilePicker) return null;
  let handle;
  try {
    handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{ description: 'BPMN-Diagramm', accept: { 'application/xml': ['.bpmn'] } }]
    });
  } catch (err) {
    if (err.name === 'AbortError') return false;
    throw err;
  }
  const { xml } = await modeler.saveXML({ format: true });
  const writable = await handle.createWritable();
  await writable.write(new Blob([xml], { type: 'application/xml' }));
  await writable.close();
  currentFileName = handle.name;
  return true;
}

async function saveViaDownload(suggestedName) {
  const fileName = prompt('Dateiname:', suggestedName);
  if (!fileName) return false;
  const { xml } = await modeler.saveXML({ format: true });
  const blob = new Blob([xml], { type: 'application/xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName.endsWith('.bpmn') ? fileName : fileName + '.bpmn';
  currentFileName = a.download;
  a.click();
  URL.revokeObjectURL(a.href);
  return true;
}

document.getElementById('btn-save').addEventListener('click', async () => {
  const suggested = currentFileName || nextFileName();
  try {
    const saved = await saveViaFilePicker(suggested);
    if (saved !== true) await saveViaDownload(suggested);
  } catch (err) {
    console.error('Fehler beim Speichern', err);
  }
});
