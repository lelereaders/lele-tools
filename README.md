# 樂樂文化工具箱 · Le Le Tools

> 🌐 Live: https://tools.lelechinese.com
> 📚 For parents, teachers, and children learning Chinese — 300 books, 1160 characters, endless activities.

This repository hosts the static toolbox deployed at `tools.lelechinese.com`. Each subfolder is an independent web tool; the root `index.html` is the landing page.

---

## 🧰 工具清單

| 工具 | 路徑 | 說明 | 技術 |
|---|---|---|---|
| 樂樂閱讀程度測試器 | `/reading-level` | 依認識字數計算能讀懂哪些書 | 純 HTML |
| 樂樂共讀日記 | `/reading` | 親子共讀紀錄 | 純 HTML |
| 樂樂主題找書 | `/theme` | 依主題挑書 | 純 HTML |
| 樂樂搜字遊戲 | `/puzzle` | 找字 Word Search | React |
| 認字迷宮 v2 · 主題版 | `/maze-v2` | 手繪主題迷宮 + 隨機路線 | 純 HTML/Canvas |
| 樂樂認字迷宮 | `/maze` | 方格迷宮（v1） | React |
| 樂樂找書系統 | `/library` | 300 本書完整目錄 | 純 HTML |
| 樂樂翻譯查找器 | `/translate` | 中英翻譯查找 | 純 HTML |
| 樂樂找字系統 | `/characters` | 1160 字出現頻率查詢 | 純 HTML |
| 中文學習問答 | `/chinese-learning-quiz` | 互動測驗 | React |
| 復活節閱讀賓果 | `/bingo-project` | 雙語賓果卡 | React |
| 復活節活動 | `/easter-activity-project` | 節慶活動工具 | React |
| 樂樂 365 閱讀計劃 | `/lele-365-reading-plan` | 一年閱讀計劃 | React |
| 字格製作器 | `/word-grid-maker` | 中文字練習格 | React |

---

## 🗂️ 資料夾結構

```
lele-tools/
├── index.html              ← 首頁（密碼 AMAZING）
├── _redirects              ← Netlify/Cloudflare SPA fallback
├── covers/                 ← 工具封面 + 300 本書封面
├── README.md
├── .gitignore
└── {tool-name}/            ← 每個工具一個資料夾，內含 index.html + assets
```

**開發原始碼：** 放在 repo 外的 `lele-tools-source/`（本地獨立備份）或 Lovable 雲端。本 repo 只放 **已 build 的靜態檔**。

---

## 🚀 部署

此 repo 設計給 Cloudflare Pages 或 Netlify。

**Cloudflare Pages 設定：**
- Build command：（留空，無需 build）
- Build output directory：`/`
- Environment variables：無

**`_redirects` 規則：**
所有 React SPA 工具都設了 catch-all → index.html（讓內部路由 / 直接連深層路徑都可用）

---

## 🛠️ 怎麼加新工具

### 情境 A：純 HTML 工具（像 reading-level）
1. 把工具資料夾丟進 root，例如 `new-tool/`
2. 確保內有 `index.html`
3. 編輯首頁 `index.html` 加一張卡
4. 編輯 `_redirects` 加 `/new-tool/*  /new-tool/index.html  200`
5. git commit & push → 自動部署

### 情境 B：React (Lovable / Vite) 工具
1. 在 Lovable 完成開發後，取得 live 網址
2. 下載靜態檔（index.html + /assets/）到本地
3. **關鍵：** 把所有絕對路徑 `/assets/` 改成 `/tool-name/assets/`
   ```bash
   sed -i 's|"/assets/|"/tool-name/assets/|g' index.html assets/*.js assets/*.css
   ```
4. 同 A 的步驟 3–5

### 情境 C：重新建構 Lovable 原始碼（不想依賴 live）
```bash
cd tool-folder/
npm install
npm run build -- --base=/tool-name/
# 產出在 dist/，複製到 lele-tools/tool-name/
```

---

## 🔒 首頁密碼保護

首頁用 sessionStorage 簡易密碼保護（客戶端，非真正安全）。
密碼：`AMAZING`（大小寫不拘）

要改密碼：編輯 `index.html` 中的 `'AMAZING'` 字串。

---

## 📮 維護

Irene Yang <info@lelereaders.com> · 樂樂文化 Le Le Culture
