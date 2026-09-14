# WD 設計師叫貨系統

從原 ChatGPT 對話中的最終 v9 版本整合而成。

## 檔案

- `index.html`：設計師叫貨介面
- `admin.html`：W.D 物料管理後台
- `Code.gs`：Google Apps Script 後端（管理密碼只從指令碼屬性讀取）

## 部署

1. 建立或開啟 Google 試算表，進入「擴充功能 → Apps Script」。
2. 以 `Code.gs` 完整取代 Apps Script 內容。
3. 在 Apps Script「專案設定 → 指令碼屬性」新增 `ADMIN_KEY`，值為店長密碼。
4. 若 Apps Script 不是從目標試算表開啟，再新增 `SPREADSHEET_ID`。
5. 部署為網頁應用程式，執行身分選擇自己，存取權依公司需求設定。
6. 若新部署網址和現有網址不同，同時修改 `index.html`、`admin.html` 中的 `API_URL`。
7. 將 `index.html` 與 `admin.html` 放到同一個靜態網站空間。

預設每月 15 日後自動截止；店長可在後台強制開放、立即截止或恢復自動截止。
