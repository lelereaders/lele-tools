(() => {
  const themeSelect = document.getElementById('themeSelect');
  const variantSelect = document.getElementById('variantSelect');
  const canvas = document.getElementById('authorCanvas');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('status');

  const POINT_RADIUS = 10;
  const HIT_RADIUS = 16;

  let themeKey = null;
  let variantKey = null;
  let variant = null;
  let img = null;
  let points = [];
  let dragIndex = -1;
  let undoStack = [];

  // Populate theme dropdown
  Object.values(window.THEMES).forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.key;
    opt.textContent = t.name;
    themeSelect.appendChild(opt);
  });

  function rebuildVariantSelect() {
    const keys = window.variantKeys(themeSelect.value);
    variantSelect.innerHTML = '';
    keys.forEach(k => {
      const v = window.THEMES[themeSelect.value].variants[k];
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = v.label || ('變體 ' + k.toUpperCase());
      variantSelect.appendChild(opt);
    });
  }

  function pushUndo() {
    undoStack.push(JSON.stringify(points));
    if (undoStack.length > 50) undoStack.shift();
  }

  function loadCurrent() {
    themeKey = themeSelect.value;
    variantKey = variantSelect.value;
    variant = window.loadVariant(themeKey, variantKey);
    if (!variant) return;
    points = variant.path.map(p => [...p]);
    undoStack = [];
    img = new Image();
    img.onload = () => { resizeCanvas(); draw(); };
    img.src = variant.image;
  }

  function resizeCanvas() {
    const wrap = canvas.parentElement;
    const maxW = wrap.clientWidth;
    const scale = Math.min(1, maxW / variant.width);
    canvas.width = variant.width * scale;
    canvas.height = variant.height * scale;
    canvas.dataset.scale = scale;
  }

  const toCanvas = p => {
    const s = parseFloat(canvas.dataset.scale);
    return [p[0] * s, p[1] * s];
  };
  const toNatural = (cx, cy) => {
    const s = parseFloat(canvas.dataset.scale);
    return [cx / s, cy / s];
  };

  function draw() {
    if (!img) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (points.length < 1) return;

    ctx.strokeStyle = 'rgba(245,155,42,0.85)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const first = toCanvas(points[0]);
    ctx.moveTo(first[0], first[1]);
    for (let i = 1; i < points.length; i++) {
      const [x, y] = toCanvas(points[i]);
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    points.forEach((p, i) => {
      const [x, y] = toCanvas(p);
      const isStart = i === 0;
      const isEnd = i === points.length - 1 && points.length > 1;
      ctx.beginPath();
      ctx.arc(x, y, POINT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = isStart ? '#27ae60' : (isEnd ? '#e74c3c' : '#f59b2a');
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = isStart ? 'S' : (isEnd ? 'F' : String(i));
      ctx.fillText(label, x, y);
    });
  }

  function hitPoint(cx, cy) {
    for (let i = points.length - 1; i >= 0; i--) {
      const [px, py] = toCanvas(points[i]);
      if ((cx - px) ** 2 + (cy - py) ** 2 <= HIT_RADIUS ** 2) return i;
    }
    return -1;
  }

  function getCanvasXY(e) {
    const rect = canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  canvas.addEventListener('mousedown', (e) => {
    const [cx, cy] = getCanvasXY(e);
    const idx = hitPoint(cx, cy);

    if (e.button === 2 || e.shiftKey) {
      if (idx >= 0) { pushUndo(); points.splice(idx, 1); draw(); }
      return;
    }

    if (idx >= 0) {
      dragIndex = idx;
    } else {
      pushUndo();
      points.push(toNatural(cx, cy));
      draw();
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (dragIndex < 0) return;
    const [cx, cy] = getCanvasXY(e);
    points[dragIndex] = toNatural(cx, cy);
    draw();
  });

  window.addEventListener('mouseup', () => { dragIndex = -1; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  document.getElementById('undoBtn').addEventListener('click', () => {
    if (!undoStack.length) return;
    points = JSON.parse(undoStack.pop());
    draw();
  });

  document.getElementById('clearBtn').addEventListener('click', () => {
    if (!confirm('確定清除所有路徑點？')) return;
    pushUndo();
    points = [];
    draw();
  });

  document.getElementById('saveBtn').addEventListener('click', () => {
    if (points.length < 2) { flash('至少需要 2 個點（起點 + 終點）', true); return; }
    const key = 'maze.path.' + themeKey + '.' + variantKey;
    localStorage.setItem(key, JSON.stringify(points.map(p => [Math.round(p[0]), Math.round(p[1])])));
    flash('✓ 已儲存（' + points.length + ' 個點）· ' + key);
  });

  document.getElementById('exportBtn').addEventListener('click', () => {
    const rounded = points.map(p => [Math.round(p[0]), Math.round(p[1])]);
    const payload = {
      theme: themeKey,
      variant: variantKey,
      path: rounded
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'path-' + themeKey + '-' + variantKey + '.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  themeSelect.addEventListener('change', () => {
    rebuildVariantSelect();
    loadCurrent();
  });
  variantSelect.addEventListener('change', loadCurrent);
  window.addEventListener('resize', () => { if (img) { resizeCanvas(); draw(); } });

  let flashTimer = null;
  function flash(msg, isError) {
    statusEl.textContent = msg;
    statusEl.style.color = isError ? 'var(--danger)' : 'var(--success)';
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { statusEl.textContent = ''; }, 3500);
  }

  // Boot
  rebuildVariantSelect();
  loadCurrent();
})();
