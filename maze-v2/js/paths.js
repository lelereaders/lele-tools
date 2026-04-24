// Theme & variant data.
// Each theme can have multiple variants (different path layouts on same/similar art).
// "隨機變體" lets users cycle through different paths so kids can't memorize.

window.THEMES = {
  ice: {
    key: 'ice',
    name: '冰上溜冰',
    // All three variants share the same image — only the path differs.
    // This means kids can't memorize the route: each play randomly picks a/b/c.
    variants: {
      a: {
        key: 'a',
        label: '變體 A',
        image: 'images/ice_a.jpg',
        width: 2752,
        height: 1536,
        bounds: { x: 420, y: 260, w: 2060, h: 1000 },
        path: [
          [900, 1180], [573, 1081], [237, 881], [439, 625],
          [791, 491], [925, 598], [764, 807], [1354, 1117],
          [1449, 1197], [1794, 1033], [1789, 1277], [1973, 1266],
          [2205, 947], [2200, 703], [1887, 488], [2310, 292]
        ]
      },
      b: {
        key: 'b',
        label: '變體 B',
        image: 'images/ice_a.jpg',
        width: 2752,
        height: 1536,
        bounds: { x: 420, y: 260, w: 2060, h: 1000 },
        path: [
          [900, 1180], [573, 1081], [237, 881], [439, 625],
          [791, 491], [925, 598], [1217, 321], [1512, 280],
          [1717, 381], [1428, 613], [1708, 869], [1988, 804],
          [2205, 947], [2200, 703], [1887, 488], [2310, 292]
        ]
      },
      c: {
        key: 'c',
        label: '變體 C',
        image: 'images/ice_a.jpg',
        width: 2752,
        height: 1536,
        bounds: { x: 420, y: 260, w: 2060, h: 1000 },
        path: [
          [900, 1180], [573, 1081], [237, 881], [439, 625],
          [791, 491], [764, 786], [955, 884], [1235, 1042],
          [1470, 1185], [1827, 1039], [1833, 1286], [2027, 1295],
          [2423, 1283], [2533, 899], [2578, 694], [2223, 515],
          [2313, 324]
        ]
      }
    }
  },
  beach: {
    key: 'beach',
    name: '沙灘尋寶',
    variants: {
      a: {
        key: 'a',
        label: '舊版',
        image: 'images/beach.jpg',
        width: 800,
        height: 537,
        bounds: { x: 165, y: 80, w: 530, h: 380 },
        path: [
          [120, 420],
          [180, 410],
          [235, 390],
          [275, 355],
          [250, 305],
          [205, 275],
          [215, 220],
          [280, 195],
          [345, 215],
          [390, 260],
          [440, 295],
          [500, 295],
          [540, 255],
          [545, 200],
          [585, 170],
          [640, 155],
          [680, 120],
          [660, 90]
        ]
      }
    }
  }
};

// Utility: list variant keys for a theme
window.variantKeys = function(themeKey) {
  const t = window.THEMES[themeKey];
  return t ? Object.keys(t.variants) : [];
};

// Loader: returns a variant object. variantKey='' or null → random.
window.loadVariant = function(themeKey, variantKey) {
  const theme = window.THEMES[themeKey];
  if (!theme) return null;
  const keys = Object.keys(theme.variants);
  if (!keys.length) return null;
  if (!variantKey) variantKey = keys[Math.floor(Math.random() * keys.length)];
  if (!theme.variants[variantKey]) variantKey = keys[0];
  const base = JSON.parse(JSON.stringify(theme.variants[variantKey]));
  try {
    const stored = localStorage.getItem('maze.path.' + themeKey + '.' + variantKey);
    if (stored) {
      const override = JSON.parse(stored);
      if (Array.isArray(override) && override.length >= 2) base.path = override;
    }
  } catch (e) { /* ignore */ }
  return {
    ...base,
    themeKey,
    variantKey,
    themeName: theme.name
  };
};
