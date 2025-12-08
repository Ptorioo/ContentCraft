# ContentCraft - IG 內容同質化分析平台

量化你的貼文與市場的相似度，找出最像你的競品

## 環境要求

- Node.js 18+ 
- Python 3.8+
- npm 或 yarn

## 快速開始

### 1. 設置環境

```bash
# 創建 Python 虛擬環境
python3 -m venv venv

# 啟動虛擬環境
source venv/bin/activate

# 安裝 Python 依賴
pip install --upgrade pip
pip install -r requirements.txt

# 安裝 Node.js 依賴
npm install
```

### 2. 啟動專案

**方式一：使用啟動腳本（推薦）**

```bash
# 首次設置（只需執行一次）
./start.sh

# 然後在兩個終端視窗分別執行：
# 終端 1 - 前端
./start-frontend.sh
# 或
npm run dev

# 終端 2 - 後端
./start-backend.sh
```

**方式二：手動啟動**

```bash
# 終端 1 - 啟動前端（端口 5173）
npm run dev

# 終端 2 - 啟動後端（端口 8787）
source venv/bin/activate
export PYTHON_PATH=$(pwd)/venv/bin/python
npx tsx ./src/services/server.ts
```

### 3. 訪問應用

- 前端：http://localhost:5173
- 後端 API：http://localhost:8787

## 專案結構

- `src/components/` - React 組件
- `src/services/` - 後端服務和 API
- `src/model/` - Python 模型腳本
- `結果/` - 數據文件（CSV）

## 注意事項

- 確保後端服務使用虛擬環境中的 Python（設置 `PYTHON_PATH` 環境變數）
- 對話介面需要後端服務運行才能正常使用
- 分析儀表板使用靜態 JSON 數據，不需要後端服務
