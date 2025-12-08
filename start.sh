#!/bin/bash

# ContentCraft 專案啟動腳本

set -e

echo "🚀 啟動 ContentCraft 專案..."

# 檢查虛擬環境是否存在
if [ ! -d "venv" ]; then
    echo "📦 創建 Python 虛擬環境..."
    python3 -m venv venv
fi

# 啟動虛擬環境
echo "🐍 啟動 Python 虛擬環境..."
source venv/bin/activate

# 檢查並安裝 Python 依賴
if ! python -c "import joblib" 2>/dev/null; then
    echo "📥 安裝 Python 依賴..."
    pip install --upgrade pip
    pip install -r requirements.txt
fi

# 檢查並安裝 Node.js 依賴
if [ ! -d "node_modules" ]; then
    echo "📦 安裝 Node.js 依賴..."
    npm install
fi

# 設置 Python 路徑環境變數
export PYTHON_PATH="$(pwd)/venv/bin/python"

echo ""
echo "✅ 環境設置完成！"
echo ""
echo "📝 啟動說明："
echo "   1. 在一個終端視窗執行：npm run dev (啟動前端，端口 5173)"
echo "   2. 在另一個終端視窗執行：source venv/bin/activate && PYTHON_PATH=\$(pwd)/venv/bin/python npx tsx ./src/services/server.ts (啟動後端，端口 8787)"
echo ""
echo "   或者使用以下命令啟動後端："
echo "   source venv/bin/activate"
echo "   export PYTHON_PATH=\$(pwd)/venv/bin/python"
echo "   npx tsx ./src/services/server.ts"
echo ""

