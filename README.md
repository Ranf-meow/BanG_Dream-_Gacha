# BanG Dream! WikiGacha — 邦邦維基抽卡（v1.0.0 第一版）

靈感致敬 [WikiGacha](https://wikigacha.com/?lang=ZH_HANT) 的 **BanG Dream! 專屬純前端抽卡收集與對戰網頁**，採用 React + Vite + TypeScript + IndexedDB 打造。

## v1.0.0 第一版收錄內容

- **12 支 BanG Dream! 樂團完整收錄（共 178 張全配圖卡牌）**
  - Poppin'Party、Afterglow、Pastel\*Palettes、Roselia、Hello, Happy World!、Morfonica、RAISE A SUILEN、MyGO!!!!!、Ave Mujica、夢限大MewType（ゆめみた）、millsage、一家Dumb Rock!
  - 包含 61 張 `R` 角色立繪卡、40 張 `SSR（★5）` 覺醒滿版角色卡、23 張 `SR` 單曲專輯封面卡、12 張 `UC` 樂團合照卡，以及 42 張場所／學園／動畫名場面與邦學梗卡，並於卡面左下角加上半透明樂團 Icon。
- **核心抽卡與動畫演出**
  - 每包 5 張、每分鐘回復 1 包（上限 10 包）、Live House 應援補給（+3 包）、每 10 抽金卡包（SR+）、每 50 抽彩虹卡包（SSR+）。
  - 星辰開包演出、逐張 3D 旋轉翻牌、滑鼠懸停放大與 3D 反光傾角、Web Audio 合成音效（可靜音）。
- **圖鑑與自訂卡池管理**
  - 12 組主題圖鑑套組、樂團／分類／稀有度／最愛篩選、收藏展示牆、IndexedDB 本地存檔與 JSON 匯出／匯入備份，以及網頁內自訂卡池新增／批次匯入功能。
- **延伸玩法系統**
  - **Live 對邦對戰**：5v5 樂團羈絆戰 ＋ 每日傳說首領戰。
  - **星光交換所**：重複卡分解換星之碎片、指定兌換未擁有卡牌、卡牌限界突破（`+1`～`+5`）。
  - **每日任務＆邦邦獎盃**：每日 5 項任務 ＋ 24 項獎盃成就（含 7 個隱藏彩蛋）。
  - **邦學隨堂考**：剪影／名台詞／樂團歸屬／人氣對決 4 種動態題型，答題賺卡包與碎片。

## 本地啟動與建置

```bash
npm install
npm run dev
```

正式建置（輸出至 `dist/`，可直接部署至 GitHub Pages / Vercel / Netlify）：

```bash
npm run build
```
