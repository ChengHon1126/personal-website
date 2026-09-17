# 洪梓誠的個人網站

一頁式個人介紹網站，前端用 Vite + TypeScript 開發，全站部署在 AWS 上。這個專案本身也是我學習 Node.js / TypeScript 與 AWS 雲端服務的實作練習。

**網站連結：** https://achentw.com

## 技術棧

**前端**

- Vite + TypeScript（純 vanilla TS，無框架）
- 打包後為單一自包含 HTML 檔案（`vite-plugin-singlefile`），方便部署到 S3

**後端（聯絡表單）**

- AWS Lambda（Node.js 24.x，TypeScript 撰寫、esbuild 打包為 CJS）
- Amazon SES 負責寄送通知信
- API Gateway（HTTP API）作為前端與 Lambda 之間的介面

**部署與基礎設施**

- S3：靜態網站檔案儲存（bucket 設為私有，不對外公開）
- CloudFront：CDN + HTTPS，透過 Origin Access Control（OAC）讀取私有 S3 bucket
- ACM：SSL 憑證（us-east-1）
- Route 53：網域註冊與 DNS 管理
- GitHub Actions：push 到 `main` 分支後自動 build 並部署到 S3、清除 CloudFront 快取

## 架構圖

```
訪客瀏覽器
   │
   ├── 靜態內容 ── CloudFront (HTTPS, OAC) ── S3 (私有 bucket)
   │
   └── 聯絡表單 ── API Gateway (CORS + Throttling) ── Lambda ── SES ── 寄信通知
```

## 專案結構

```
.
├── index.html              # 網站主頁面
├── src/
│   ├── main.ts              # 導覽列、Hero 動畫、聯絡表單邏輯
│   └── style.css            # 樣式
├── lambda/                  # 聯絡表單後端（獨立的 Node.js 專案）
│   ├── src/handler.ts        # Lambda handler：驗證輸入、蜜罐欄位檢查、寄信
│   └── package.json
├── .github/workflows/
│   └── deploy.yml            # CI/CD：build → 上傳 S3 → 清 CloudFront 快取
└── vite.config.ts
```

## 本機開發

```bash
npm install
npm run dev        # 啟動開發伺服器
npm run build      # tsc 型別檢查 + 打包成 dist/index.html
npm run preview    # 預覽打包結果
```

## 部署方式

**網站前端**：`git push` 到 `main` 分支後，GitHub Actions 會自動：

1. `npm run build` 產生 `dist/index.html`
2. 上傳到 S3 bucket 根目錄
3. 建立 CloudFront invalidation 清除快取

**聯絡表單後端（Lambda）**：目前為手動部署

```bash
cd lambda
npm install
npm run package     # 打包成 function.zip
# 上傳 function.zip 到 Lambda console
```

## 安全性設計

- S3 bucket 全私有，僅 CloudFront（透過 OAC）可讀取
- 聯絡表單以蜜罐欄位（honeypot）過濾機器人送出的請求
- API Gateway 設有 CORS（僅允許 `achentw.com` 來源）與節流（Rate limiting）
- 部署用的 IAM 使用者採最小權限原則，僅能寫入指定 S3 路徑與觸發指定 CloudFront distribution 的快取清除
- Lambda 執行角色僅有 `ses:SendEmail` 權限，且限定單一 SES identity

## 這個專案練習到的 AWS 服務

S3、CloudFront、ACM、Route 53、Lambda、API Gateway、SES、IAM（含最小權限原則設計）—— 對應 AWS Certified Solutions Architect Associate 課程中的核心概念。
