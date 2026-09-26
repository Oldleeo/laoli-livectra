/* LIVECTRA — local-first SVG tracing studio. No file leaves the browser. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const ui = {
    file: $('fileInput'), dropzone: $('dropzone'), sample: $('sampleBtn'), chip: $('fileChip'), fileName: $('fileName'), clear: $('clearFile'),
    colors: $('colors'), colorsValue: $('colorsValue'), smooth: $('smoothness'), smoothValue: $('smoothnessValue'),
    convert: $('convertBtn'), convertLabel: $('convertLabel'), original: $('originalPreview'), vector: $('vectorPreview'),
    empty: $('emptyState'), busy: $('busyOverlay'), status: $('statusText'), stats: $('resultStats'),
    dimensions: $('canvasDimensions'), download: $('downloadBtn'), undo: $('undoBtn'), refine: $('refineBar'),
    pathColor: $('pathColor'), deletePath: $('deletePath')
  };
  const state = { file: null, url: null, svg: null, selected: null, history: [], preset: 'studio', view: 'vector', busy: false, originalSize: null };
  const svgNS = 'http://www.w3.org/2000/svg';

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const setStatus = (message, error = false) => {
    ui.status.textContent = message;
    ui.status.style.color = error ? '#e9a9aa' : '';
  };
  function updateButtons() {
    ui.convert.disabled = !state.file || state.busy;
    ui.download.disabled = !state.svg || state.busy;
    ui.undo.disabled = state.history.length === 0 || state.busy;
    ui.pathColor.disabled = !state.selected || state.busy;
    ui.deletePath.disabled = !state.selected || state.busy;
  }
  function showView(view) {
    state.view = view;
    document.querySelectorAll('.view-tab').forEach(button => {
      const active = button.dataset.view === view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const hasFile = Boolean(state.file);
    ui.empty.hidden = hasFile;
    ui.original.hidden = !hasFile || view !== 'original';
    ui.vector.hidden = !state.svg || view !== 'vector';
    if (hasFile && view === 'vector' && !state.svg) {
      ui.original.hidden = false;
    }
  }
  function setPreset(name) {
    state.preset = name;
    document.querySelectorAll('.preset').forEach(button => {
      const active = button.dataset.preset === name;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const values = { studio: [16, 3], detail: [30, 5], minimal: [8, 2] }[name];
    ui.colors.value = values[0];
    ui.smooth.value = values[1];
    updateRangeLabels();
  }
  function updateRangeLabels() {
    ui.colorsValue.value = ui.colors.value;
    ui.smoothValue.value = `${ui.smooth.value} / 5`;
  }
  function clearSelection() {
    if (state.selected) state.selected.classList.remove('is-selected');
    state.selected = null;
    updateButtons();
  }
  function clearCurrentFile() {
    if (state.url) URL.revokeObjectURL(state.url);
    state.file = null; state.url = null; state.svg = null; state.history = []; state.originalSize = null;
    clearSelection();
    ui.file.value = '';
    ui.original.removeAttribute('src');
    ui.vector.replaceChildren();
    ui.chip.hidden = true; ui.refine.hidden = true;
    ui.stats.textContent = ''; ui.dimensions.textContent = '暂无图片';
    setStatus('等待导入图片');
    showView('vector'); updateButtons();
  }
  function handleFile(file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif|bmp)$/.test(file.type)) {
      setStatus('请选择 PNG、JPG、WEBP、GIF 或 BMP 图片', true); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatus('图片超过 10 MB，请选用较小的文件', true); return;
    }
    clearCurrentFile();
    state.file = file;
    state.url = URL.createObjectURL(file);
    ui.fileName.textContent = file.name;
    ui.chip.hidden = false;
    ui.original.src = state.url;
    ui.original.onload = () => {
      state.originalSize = [ui.original.naturalWidth, ui.original.naturalHeight];
      ui.dimensions.textContent = `${state.originalSize[0]} × ${state.originalSize[1]}`;
      setStatus('图片已就绪，选择风格后生成');
    };
    ui.original.onerror = () => { setStatus('图片无法读取，请换一个文件', true); clearCurrentFile(); };
    showView('original'); updateButtons();
  }
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('图片无法解码'));
      image.src = url;
    });
  }
  async function useSample() {
    const canvas = document.createElement('canvas');
    canvas.width = 600; canvas.height = 420;
    const c = canvas.getContext('2d');
    c.fillStyle = '#faf8f6'; c.fillRect(0, 0, 600, 420);
    c.beginPath(); c.arc(195, 174, 128, 0, Math.PI * 2);
    c.fillStyle = '#b47a52'; c.fill(); c.strokeStyle = '#261b19'; c.lineWidth = 9; c.stroke();
    c.beginPath(); c.arc(195, 174, 83, 0, Math.PI * 2);
    c.fillStyle = '#faf8f6'; c.fill(); c.stroke();
    c.beginPath(); c.roundRect(151, 201, 88, 181, 13);
    c.fillStyle = '#8c6ab7'; c.fill(); c.stroke();
    c.strokeStyle = '#d5bfe9'; c.lineWidth = 3; c.setLineDash([7, 6]);
    c.beginPath(); c.moveTo(164, 210); c.lineTo(164, 368); c.moveTo(226, 210); c.lineTo(226, 368); c.stroke();
    c.setLineDash([]);
    c.beginPath(); c.roundRect(365, 90, 155, 155, 33);
    c.fillStyle = '#bba5df'; c.fill(); c.strokeStyle = '#261b19'; c.lineWidth = 8; c.stroke();
    c.beginPath(); c.arc(443, 167, 31, 0, Math.PI * 2);
    c.fillStyle = '#faf8f6'; c.fill(); c.stroke();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) { setStatus('示例图生成失败', true); return; }
    handleFile(new File([blob], 'livectra-sample.png', { type: 'image/png' }));
    convert();
  }
  function makeOptions() {
    const level = Number(ui.smooth.value);
    const detail = [0, 2.7, 1.7, 1, .6, .36][level];
    const base = {
      ltres: detail, qtres: detail,
      pathomit: [0, 18, 13, 8, 4, 2][level],
      colorsampling: 2, numberofcolors: Number(ui.colors.value), colorquantcycles: 3,
      rightangleenhance: state.preset !== 'studio',
      viewbox: true, roundcoords: 2, strokewidth: .5,
      blurradius: state.preset === 'detail' ? 0 : state.preset === 'minimal' ? 3 : 1,
      blurdelta: 24
    };
    if (state.preset === 'minimal') base.pathomit = Math.max(15, base.pathomit);
    return base;
  }
  function cleanSVG(svgText, width, height) {
    const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    if (parsed.querySelector('parsererror')) throw new Error('矢量结果无法解析');
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('xmlns', svgNS);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', '可编辑的 SVG 矢量结果');
    for (const sourcePath of parsed.querySelectorAll('path')) {
      const d = sourcePath.getAttribute('d');
      if (!d) continue;
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', d);
      for (const attr of ['style', 'fill', 'stroke', 'stroke-width', 'fill-rule', 'transform']) {
        const value = sourcePath.getAttribute(attr);
        if (value !== null) path.setAttribute(attr, value);
      }
      svg.appendChild(path);
    }
    if (!svg.querySelector('path')) throw new Error('未找到有效矢量路径');
    return svg;
  }
  function mountSVG(svg) {
    clearSelection();
    state.svg = svg;
    ui.vector.replaceChildren(svg);
    ui.refine.hidden = false;
    const count = svg.querySelectorAll('path').length;
    ui.stats.textContent = `· ${count.toLocaleString('zh-CN')} 条路径`;
    updateButtons();
  }
  async function convert() {
    if (!state.file || state.busy) return;
    state.busy = true;
    ui.busy.hidden = false;
    ui.convertLabel.textContent = '正在生成…';
    setStatus('正在生成矢量路径');
    updateButtons();
    await new Promise(resolve => setTimeout(resolve, 60));
    try {
      if (!window.ImageTracer || !window.ImageTracer.imagedataToSVG) throw new Error('矢量引擎没有正确加载');
      const image = await loadImage(state.url);
      const maximum = 1400;
      const ratio = Math.min(1, maximum / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * ratio));
      const height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      const imageData = context.getImageData(0, 0, width, height);
      const text = window.ImageTracer.imagedataToSVG(imageData, makeOptions());
      mountSVG(cleanSVG(text, width, height));
      state.history = [];
      showView('vector');
      setStatus(ratio < 1 ? `生成完成 · 已缩放至 ${width} × ${height}` : '生成完成 · 可点击路径精修');
    } catch (error) {
      console.error(error);
      setStatus(error.message || '转换失败，请更换图片后重试', true);
    } finally {
      state.busy = false; ui.busy.hidden = true; ui.convertLabel.textContent = '重新生成矢量图'; updateButtons();
    }
  }
  function serializeSVG() {
    if (!state.svg) return '';
    const clone = state.svg.cloneNode(true);
    clone.querySelectorAll('.is-selected').forEach(el => el.classList.remove('is-selected'));
    clone.removeAttribute('role'); clone.removeAttribute('aria-label');
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
  }
  function pushHistory() {
    state.history.push(serializeSVG());
    if (state.history.length > 20) state.history.shift();
    updateButtons();
  }
  function undo() {
    const previous = state.history.pop();
    if (!previous) return;
    const parsed = new DOMParser().parseFromString(previous, 'image/svg+xml');
    const next = document.importNode(parsed.documentElement, true);
    mountSVG(next);
    setStatus('已撤销上一步精修'); updateButtons();
  }
  function rgbToHex(rgb) {
    const match = rgb.match(/\d+(?:\.\d+)?/g);
    if (!match || match.length < 3) return '#8062a8';
    return '#' + match.slice(0, 3).map(n => clamp(Math.round(Number(n)), 0, 255).toString(16).padStart(2, '0')).join('');
  }
  function selectPath(path) {
    clearSelection();
    state.selected = path;
    path.classList.add('is-selected');
    ui.pathColor.value = rgbToHex(getComputedStyle(path).fill);
    updateButtons();
  }
  function download() {
    if (!state.svg) return;
    const blob = new Blob([serializeSVG()], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = (state.file?.name || 'livectra').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_') + '-livectra.svg';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('SVG 已下载，可用 Illustrator 打开');
  }

  ui.file.addEventListener('change', event => handleFile(event.target.files?.[0]));
  ui.clear.addEventListener('click', clearCurrentFile);
  ui.sample.addEventListener('click', useSample);
  ui.dropzone.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); ui.file.click(); }
  });
  for (const name of ['dragenter', 'dragover']) ui.dropzone.addEventListener(name, event => {
    event.preventDefault(); ui.dropzone.classList.add('is-dragging');
  });
  for (const name of ['dragleave', 'drop']) ui.dropzone.addEventListener(name, event => {
    event.preventDefault(); ui.dropzone.classList.remove('is-dragging');
  });
  ui.dropzone.addEventListener('drop', event => handleFile(event.dataTransfer?.files?.[0]));
  document.querySelectorAll('.preset').forEach(button => button.addEventListener('click', () => setPreset(button.dataset.preset)));
  document.querySelectorAll('.view-tab').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
  ui.colors.addEventListener('input', updateRangeLabels);
  ui.smooth.addEventListener('input', updateRangeLabels);
  ui.convert.addEventListener('click', convert);
  ui.download.addEventListener('click', download);
  ui.undo.addEventListener('click', undo);
  ui.vector.addEventListener('click', event => {
    if (event.target.tagName.toLowerCase() === 'path') selectPath(event.target);
    else clearSelection();
  });
  ui.pathColor.addEventListener('change', () => {
    if (!state.selected) return;
    pushHistory();
    state.selected.style.fill = ui.pathColor.value;
    setStatus('路径颜色已更新');
  });
  ui.deletePath.addEventListener('click', () => {
    if (!state.selected) return;
    pushHistory();
    state.selected.remove(); clearSelection();
    ui.stats.textContent = `· ${state.svg.querySelectorAll('path').length.toLocaleString('zh-CN')} 条路径`;
    setStatus('路径已移除，可撤销');
  });
  updateRangeLabels(); updateButtons(); showView('vector');
})();

