(() => {
  // ===== DOM =====
  const themeSelect = document.getElementById('themeSelect');
  const variantSelect = document.getElementById('variantSelect');
  const fontSelect = document.getElementById('fontSelect');
  const wordsInput = document.getElementById('words');
  const generateBtn = document.getElementById('generateBtn');
  const againBtn = document.getElementById('againBtn');
  const printBtn = document.getElementById('printBtn');
  const formCard = document.getElementById('formCard');
  const resultCard = document.getElementById('resultCard');
  const titleBar = document.getElementById('titleBar');
  const variantTag = document.getElementById('variantTag');
  const canvas = document.getElementById('mazeCanvas');
  const ctx = canvas.getContext('2d');
  const showAnswerCB = document.getElementById('showAnswer');
  const modeSeg = document.getElementById('modeSeg');
  const langSeg = document.getElementById('langSeg');
  const playHint = document.getElementById('playHint');

  // ===== State =====
  let currentLang = 'tc';
  let currentMode = 'online';
  let state = null;  // { theme, words, targetChars, decoys, pathSamples, img }
  let trace = [];    // user's drawn path (canvas coords)
  let drawing = false;

  // ===== Presets =====
  Object.values(window.THEMES).forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.key;
    opt.textContent = t.name;
    themeSelect.appendChild(opt);
  });

  function rebuildVariantSelect() {
    const keys = window.variantKeys(themeSelect.value);
    variantSelect.innerHTML = '';
    const rand = document.createElement('option');
    rand.value = '';
    rand.textContent = keys.length > 1 ? '🎲 隨機' : '自動';
    variantSelect.appendChild(rand);
    keys.forEach(k => {
      const v = window.THEMES[themeSelect.value].variants[k];
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = v.label || ('變體 ' + k.toUpperCase());
      variantSelect.appendChild(opt);
    });
  }
  themeSelect.addEventListener('change', rebuildVariantSelect);
  rebuildVariantSelect();

  document.querySelectorAll('[data-preset]').forEach(chip => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.preset;
      themeSelect.value = key;
      const presets = {
        ice: '溜冰 左腳 落地 拍手',
        beach: '沙灘 海浪 貝殼 衝浪'
      };
      wordsInput.value = presets[key] || '';
    });
  });

  // ===== Segmented controls =====
  function wireSeg(seg, onChange) {
    seg.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        seg.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onChange(btn.dataset.val);
      });
    });
  }
  wireSeg(langSeg, v => { currentLang = v; });
  wireSeg(modeSeg, v => { currentMode = v; applyMode(); });

  // ===== Char utils =====
  function extractChars(input, lang) {
    // split into words, then characters
    const words = input.split(/[\s,，、]+/).filter(Boolean);
    const chars = [];
    for (const w of words) {
      for (const c of [...w]) {
        if (/[\u4e00-\u9fff]/.test(c)) chars.push(c);
      }
    }
    // (future) TC↔SC mapping via OpenCC; skipped in v2 prototype
    return chars;
  }

  // Pool of common Chinese chars for decoys (avoid target chars at runtime)
  const DECOY_POOL_TC = '的一是不了在人有我他這中大為上個國你到年說時以們可出來就道於生那要會家能下還學自對然著後本心看如其之事得用心也向當前兩地方開好小面只因明動意見行只體氣力又日月山水火土木金風雨雲雪星海洋河湖草樹花鳥魚蟲石門窗床桌椅書筆紙刀叉碗筷杯盤冰熱冷暖輕重快慢高低東西南北春夏秋冬';
  const DECOY_POOL_SC = '的一是不了在人有我他这中大为上个国你到年说时以们可出来就道于生那要会家能下还学自对然着后本心看如其之事得用心也向当前两地方开好小面只因明动意见行只体气力又日月山水火土木金风雨云雪星海洋河湖草树花鸟鱼虫石门窗床桌椅书笔纸刀叉碗筷杯盘冰热冷暖轻重快慢高低东西南北春夏秋冬';

  function pickDecoys(exclude, count, lang) {
    const pool = [...(lang === 'sc' ? DECOY_POOL_SC : DECOY_POOL_TC)];
    const ex = new Set(exclude);
    const filtered = pool.filter(c => !ex.has(c));
    const out = [];
    for (let i = 0; i < count && filtered.length; i++) {
      const idx = Math.floor(Math.random() * filtered.length);
      out.push(filtered.splice(idx, 1)[0]);
    }
    return out;
  }

  // ===== Path math =====
  function samplePath(waypoints, count) {
    // compute cumulative lengths
    const segLen = [];
    let total = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const dx = waypoints[i][0] - waypoints[i-1][0];
      const dy = waypoints[i][1] - waypoints[i-1][1];
      const d = Math.hypot(dx, dy);
      segLen.push(d);
      total += d;
    }
    // sample `count` evenly along arc length
    const samples = [];
    if (count === 1) return [[...waypoints[0]]];
    for (let i = 0; i < count; i++) {
      const target = (i / (count - 1)) * total;
      let acc = 0, seg = 0;
      while (seg < segLen.length - 1 && acc + segLen[seg] < target) {
        acc += segLen[seg];
        seg++;
      }
      const remain = target - acc;
      const t = segLen[seg] > 0 ? remain / segLen[seg] : 0;
      const a = waypoints[seg], b = waypoints[seg + 1];
      samples.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    return samples;
  }

  function distToPath(x, y, waypoints) {
    let best = Infinity;
    for (let i = 1; i < waypoints.length; i++) {
      const [x1, y1] = waypoints[i-1], [x2, y2] = waypoints[i];
      const dx = x2 - x1, dy = y2 - y1;
      const l2 = dx * dx + dy * dy;
      let t = l2 > 0 ? ((x - x1) * dx + (y - y1) * dy) / l2 : 0;
      t = Math.max(0, Math.min(1, t));
      const px = x1 + t * dx, py = y1 + t * dy;
      const d = Math.hypot(x - px, y - py);
      if (d < best) best = d;
    }
    return best;
  }

  function scatterDecoys(theme, targetPositions, count) {
    // Place decoys on a jittered grid, avoiding path (dist < threshold)
    const { path, bounds } = theme;
    const b = bounds || { x: 40, y: 40, w: theme.width - 80, h: theme.height - 80 };
    // Scale distances proportionally to image width (baseline 800px)
    const sc = theme.width / 800;
    const gridStep = 60 * sc;
    const minPathDist = 44 * sc;
    const minDecoyDist = 50 * sc;
    const jitter = 16 * sc;
    // Avoid zones near 起點 and 終點 (image already has signs there)
    const startP = path[0], endP = path[path.length - 1];
    const endpointBuffer = 80 * sc;
    const placed = [];
    const candidates = [];
    for (let y = b.y; y <= b.y + b.h; y += gridStep) {
      for (let x = b.x; x <= b.x + b.w; x += gridStep) {
        const jx = x + (Math.random() - 0.5) * jitter;
        const jy = y + (Math.random() - 0.5) * jitter;
        if (jx < b.x || jx > b.x + b.w || jy < b.y || jy > b.y + b.h) continue;
        if (distToPath(jx, jy, path) < minPathDist) continue;
        // avoid START/FINISH artwork zones
        if (Math.hypot(jx - startP[0], jy - startP[1]) < endpointBuffer) continue;
        if (Math.hypot(jx - endP[0], jy - endP[1]) < endpointBuffer) continue;
        // also avoid target positions
        let tooClose = false;
        for (const tp of targetPositions) {
          if (Math.hypot(jx - tp[0], jy - tp[1]) < minDecoyDist) { tooClose = true; break; }
        }
        if (tooClose) continue;
        candidates.push([jx, jy]);
      }
    }
    // shuffle candidates
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    for (const c of candidates) {
      let tooClose = false;
      for (const p of placed) {
        if (Math.hypot(c[0] - p[0], c[1] - p[1]) < minDecoyDist) { tooClose = true; break; }
      }
      if (tooClose) continue;
      placed.push(c);
      if (placed.length >= count) break;
    }
    return placed;
  }

  // ===== Render =====
  function fitCanvas(theme) {
    const maxW = canvas.parentElement.clientWidth;
    const scale = Math.min(1, maxW / theme.width);
    canvas.width = theme.width * scale;
    canvas.height = theme.height * scale;
    canvas.dataset.scale = scale;
  }

  function toCanvas(p) {
    const s = parseFloat(canvas.dataset.scale);
    return [p[0] * s, p[1] * s];
  }

  function drawCharBubble(x, y, ch, opts = {}) {
    const { isTarget = false, highlight = false, size = 34, font } = opts;
    // white rounded rectangle background so characters stay readable over art
    const pad = size * 0.55;
    const bw = size + pad;
    ctx.save();
    ctx.translate(x, y);
    // shadow
    ctx.shadowColor = 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    // bubble
    const r = bw / 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = highlight ? '#fff2d5' : 'rgba(255,255,255,0.92)';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = highlight ? '#f59b2a' : (isTarget ? 'rgba(245,155,42,0.5)' : 'rgba(0,0,0,0.12)');
    ctx.stroke();
    // char
    ctx.fillStyle = '#222';
    ctx.font = 'bold ' + size + 'px ' + (font || "'Noto Sans TC', sans-serif");
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, 0, 2);
    ctx.restore();
  }

  function render() {
    if (!state) return;
    const { theme, img, targets, decoys, font } = state;
    fitCanvas(theme);
    const s = parseFloat(canvas.dataset.scale);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const showAns = showAnswerCB.checked;

    // answer line
    if (showAns) {
      ctx.save();
      ctx.strokeStyle = 'rgba(39,174,96,0.55)';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      theme.path.forEach((p, i) => {
        const [x, y] = toCanvas(p);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();
    }

    // user trace (only in online mode, over answer if shown)
    if (currentMode === 'online' && trace.length > 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(52,152,219,0.7)';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      trace.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      });
      ctx.stroke();
      ctx.restore();
    }

    // decoys
    const decoySize = Math.max(22, 32 * s);
    decoys.forEach(d => {
      const [x, y] = [d.pos[0] * s, d.pos[1] * s];
      drawCharBubble(x, y, d.ch, { isTarget: false, size: decoySize, font });
    });

    // targets
    const targetSize = Math.max(24, 36 * s);
    targets.forEach((t, i) => {
      const [x, y] = [t.pos[0] * s, t.pos[1] * s];
      drawCharBubble(x, y, t.ch, { isTarget: true, highlight: showAns, size: targetSize, font });
    });

    // Subtle start/end markers (small dots so users know which end is which)
    const drawDot = (p, color) => {
      const [x, y] = toCanvas(p);
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, 7 * s + 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };
    if (showAns) {
      drawDot(theme.path[0], '#27ae60');
      drawDot(theme.path[theme.path.length - 1], '#e74c3c');
    }
  }

  // ===== Generate =====
  function generate() {
    const raw = wordsInput.value.trim();
    if (!raw) { alert('請先輸入詞彙'); return; }
    const themeKey = themeSelect.value;
    const variant = window.loadVariant(themeKey, variantSelect.value || null);
    if (!variant) { alert('主題載入失敗'); return; }
    const chars = extractChars(raw, currentLang);
    if (chars.length < 2) { alert('至少需要 2 個中文字'); return; }
    if (chars.length > variant.path.length * 1.5) {
      if (!confirm('字太多（' + chars.length + ' 個），路徑可能太擠。繼續？')) return;
    }

    const img = new Image();
    img.onload = () => {
      const targetPositions = samplePath(variant.path, chars.length);
      const targets = chars.map((ch, i) => ({ ch, pos: targetPositions[i] }));
      const decoyCount = Math.min(28, Math.max(10, Math.round(chars.length * 2.2)));
      const decoyPositions = scatterDecoys(variant, targetPositions, decoyCount);
      const decoyChars = pickDecoys(chars, decoyPositions.length, currentLang);
      const decoys = decoyPositions.map((pos, i) => ({ ch: decoyChars[i] || '字', pos }));

      state = { theme: variant, img, targets, decoys, font: fontSelect.value };
      trace = [];
      titleBar.textContent = '找出詞彙：' + raw.split(/[\s,，、]+/).filter(Boolean).join('、');
      variantTag.textContent = variant.themeName + ' · ' + (variant.label || variant.variantKey);
      resultCard.style.display = '';
      render();
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    img.onerror = () => alert('底圖載入失敗：' + variant.image);
    img.src = variant.image;
  }

  // ===== Trace (online play) =====
  function getXY(e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return [t.clientX - rect.left, t.clientY - rect.top];
  }
  function traceStart(e) {
    if (currentMode !== 'online') return;
    e.preventDefault();
    drawing = true;
    trace = [getXY(e)];
    render();
  }
  function traceMove(e) {
    if (!drawing) return;
    e.preventDefault();
    trace.push(getXY(e));
    render();
  }
  function traceEnd() { drawing = false; }
  canvas.addEventListener('mousedown', traceStart);
  canvas.addEventListener('mousemove', traceMove);
  window.addEventListener('mouseup', traceEnd);
  canvas.addEventListener('touchstart', traceStart, { passive: false });
  canvas.addEventListener('touchmove', traceMove, { passive: false });
  canvas.addEventListener('touchend', traceEnd);

  // Double-click to clear trace
  canvas.addEventListener('dblclick', () => { trace = []; render(); });

  // ===== Mode switch =====
  function applyMode() {
    if (currentMode === 'print') {
      playHint.textContent = '列印預覽 — 實際列印時不會顯示答案線與使用者劃線';
      trace = [];
    } else {
      playHint.innerHTML = '用手指或滑鼠從 <span style="color:#27ae60;font-weight:700">起點</span> 拖曳到 <span style="color:#e74c3c;font-weight:700">終點</span>，依序經過所有字（雙擊清除）';
    }
    render();
  }

  // ===== Buttons =====
  generateBtn.addEventListener('click', generate);
  showAnswerCB.addEventListener('change', render);
  fontSelect.addEventListener('change', () => { if (state) { state.font = fontSelect.value; render(); } });
  againBtn.addEventListener('click', () => {
    resultCard.style.display = 'none';
    state = null; trace = [];
    wordsInput.focus();
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  printBtn.addEventListener('click', () => {
    // force print mode for cleaner output
    const prev = currentMode;
    currentMode = 'print';
    trace = [];
    // uncheck answer for printing
    const wasChecked = showAnswerCB.checked;
    showAnswerCB.checked = false;
    render();
    window.print();
    showAnswerCB.checked = wasChecked;
    currentMode = prev;
    render();
  });

  window.addEventListener('resize', () => { if (state) render(); });
})();
