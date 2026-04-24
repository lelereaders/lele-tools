# 認字迷宮 v2 · 主題版

> 樂樂文化 Le Le Culture — 用手繪主題迷宮 × 中文識字學習工具
> 舊版：https://tools.lelechinese.com/maze/（方格風格）
> 新版特色：手繪插畫背景 + 同圖多路線「防記憶」機制

---

## 🗂️ 專案結構

```
new maze/
├── index.html              # 主頁：老師生成迷宮
├── author.html             # 路徑標記工具：管理員用
├── README.md               # 這份文件
├── css/
│   └── style.css           # 全站樣式
├── js/
│   ├── app.js              # 主頁邏輯（字元排列、劃線、列印）
│   ├── author.js           # 標記工具邏輯
│   ├── paths.js            # ★ 主題 & 路徑資料（最常編輯）
│   └── path-ice-*.json     # 匯出備份（可忽略，僅供還原）
└── images/
    ├── ice_a.jpg           # 主題底圖
    └── beach.jpg           # 舊版沙灘（待升級）
```

## 🎯 核心概念

### 主題（Theme）
一個手繪風格的迷宮底圖場景，例如「冰上溜冰」、「沙灘尋寶」。

### 變體（Variant）
**同一張主題底圖上的不同路徑走法**。這是 v2 最重要的設計。

**為什麼要變體？**
小朋友玩 2–3 次就會記住路徑，失去認字意義。
有了 A/B/C 三條路徑，每次按「生成迷宮」系統隨機抽一條，
**小朋友永遠無法靠死記解題，必須真的讀字才找得到路**。

目前「冰上溜冰」有 3 個變體，每次隨機抽一條。

---

## 🚀 老師怎麼用

1. 打開 `index.html`
2. 選主題：「冰上溜冰」
3. 變體選「🎲 隨機」（預設）
4. 輸入詞彙（空白/逗號分隔）
5. 點「✨ 生成迷宮」
6. 右上角切換「✏️ 線上玩」或「🖨️ 列印版」
7. 想換路線？按「🔄 再玩一次」+「✨ 生成迷宮」→ 隨機抽新變體

### 快捷操作
- **顯示答案**：勾選右上「顯示答案」→ 綠色路徑線
- **雙擊畫布**：清除學生劃出的線
- **列印**：按「🖨️ 列印」自動切到列印模式（A4 橫向）

---

## 🛠️ 管理員：新增或調整路徑

### 情境 A：微調某個變體的路徑（字跟牆對不齊時）
1. 打開 `author.html`
2. 主題選「冰上溜冰」，變體選「變體 A」
3. **拖曳**橘色圓點到正確位置；**Shift+點擊** 刪除多餘點；點空白處**新增點**
4. 按「💾 儲存」→ 存在瀏覽器 localStorage（僅這台電腦生效）
5. 回 `index.html` 重新生成即可看到改動

> localStorage 儲存**只在你這個瀏覽器**有效。若要讓所有人看到：
> 按「⬇️ 匯出 JSON」→ 把檔案傳給工程 → 編輯 `js/paths.js` 覆蓋 path

### 情境 B：新增一個變體
假設要在冰上溜冰加「變體 D」：

1. **編輯 `js/paths.js`**：在 `ice.variants` 加一筆：
   ```js
   d: {
     key: 'd',
     label: '變體 D',
     image: 'images/ice_a.jpg',  // 通常共用同一張底圖
     width: 2752,
     height: 1536,
     bounds: { x: 420, y: 260, w: 2060, h: 1000 },
     path: [[900, 1180], /* ... */ [2310, 292]]  // 至少起點+終點
   }
   ```
2. 打開 `author.html`，變體選「變體 D」，拖點畫出新路徑
3. 儲存 → 匯出 JSON → 把 `path` 陣列貼回 `paths.js`

### 情境 C：新增一個主題（例如「太空冒險」）

**步驟一：用 AI 生圖**
參考 `README` 底下的 Prompt 模板，用 Nano Banana / Gemini 2.5 / Midjourney 生 1–3 張 800–3000px 寬的底圖。
**記得圖內的「起點／終點」要是中文字，不要英文 START/FINISH。**

**步驟二：放進 `images/`**
建議命名：`space_a.jpg`、`space_b.jpg`、`space_c.jpg`

**步驟三：在 `paths.js` 加新 theme**
```js
space: {
  key: 'space',
  name: '太空冒險',
  variants: {
    a: {
      key: 'a', label: '變體 A',
      image: 'images/space_a.jpg',
      width: 2048, height: 1152,              // 換成你圖的實際尺寸
      bounds: { x: 200, y: 120, w: 1650, h: 920 },  // 先估一個，後面調
      path: [[100,500], [800,500]]             // 佔位 2 點，後面在 author.html 畫
    }
  }
}
```

**步驟四：用 `author.html` 畫路徑**
選新主題、畫路徑、儲存、匯出 JSON、貼回 `paths.js` 的 `path`。

**步驟五：測試**
打開 `index.html`，新主題會自動出現在下拉選單。

---

## 🎨 AI 生圖 Prompt 模板（新主題用）

### 共通前綴
```
Kawaii children's book illustration style, top-down view cartoon maze,
hand-drawn watercolor with soft pastel palette, thick 3D walls forming
corridors. Cute character standing at the bottom-left corner next to a
wooden signpost showing Chinese characters "起點" in bold rounded
kid-friendly font, warm color with a small banner ribbon. At top-right
corner, colorful triangular flag bunting above another wooden signpost
showing "終點" in the same style.

STRICT RULE: NO English text anywhere. NO "START" or "FINISH" words.
Only the Chinese characters 起點 and 終點 as labels.

Aspect ratio: ~16:9 landscape. Clean central maze area reserved for
character overlay — do not fill the middle with too many props.
```

### 主題變化範例
替換「bottom-left 的角色」、「top-left 的場景元素」、「裝飾物」來做不同主題：

| 主題 | 角色 | 頂角場景 | 裝飾 |
|---|---|---|---|
| 冰上溜冰 | 兩個穿冬裝溜冰的小孩 | 雪屋 + 松樹 | 旗子、冰錐、長椅 |
| 沙灘尋寶 | 戴草帽的小孩 | 椰子樹 + 沙灘酒吧 | 椰子、貝殼、衝浪板 |
| 太空冒險 | 太空人小孩 | 小火箭 + 星球 | 隕石、太空垃圾 |
| 森林探險 | 戴鴨舌帽的小孩 | 蘑菇屋 + 大樹 | 野莓、昆蟲、石頭 |
| 海底世界 | 小美人魚 | 珊瑚礁 | 貝殼、海星、水母 |

---

## 🔧 技術細節

### 字元擺放演算法
1. 把路徑 waypoints 連成折線
2. 計算累積弧長
3. 把 N 個目標字等距分布在弧長上
4. 干擾字用「jittered grid + path distance filter」散佈

### 尺寸自動縮放
- 所有距離（grid step、min decoy distance、endpoint buffer）都以 `theme.width / 800` 縮放
- 不論底圖是 800x537 或 2752x1536 都能正確處理

### 路徑儲存優先順序
```
localStorage (author.html 儲存)
   ↓ 若無
paths.js 的 path（預設）
```

---

## 🌐 部署

此專案是**純靜態檔案**（HTML + CSS + JS + 圖片），無後端、無 build step。

**可部署平台：**
- Cloudflare Pages（推薦）
- Netlify / Netlify Drop
- GitHub Pages
- Vercel
- 一般 FTP / 虛擬主機

**部署步驟（Netlify Drop 最快）：**
1. 打開 https://app.netlify.com/drop
2. 拖曳整個 `new maze/` 資料夾進去
3. 立即得到一個 `.netlify.app` 網址
4. （選配）到 Netlify dashboard 綁定 `tools.lelechinese.com/maze-v2/`

---

## 📝 Changelog

- **v2.0** (2026-04) — 重構為主題+變體結構，支援同圖多路線防記憶、2K 手繪底圖
- **v1.0** — 方格字庫迷宮（舊版，仍在 tools.lelechinese.com/maze/）

---

## 📮 問題回報

Irene Yang <info@lelereaders.com>
