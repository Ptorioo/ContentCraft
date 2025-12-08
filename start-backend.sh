#!/bin/bash

# 啟動後端服務腳本

cd "$(dirname "$0")"

# 檢查虛擬環境
if [ ! -d "venv" ]; then
    echo "❌ 虛擬環境不存在，請先運行 ./start.sh 設置環境"
    exit 1
fi

# 啟動虛擬環境
source venv/bin/activate

# 設置 Python 路徑
export PYTHON_PATH="$(pwd)/venv/bin/python"

echo "🚀 啟動後端服務 (端口 8787)..."
echo "📝 Python 路徑: $PYTHON_PATH"
echo ""

# 啟動後端服務
npx tsx ./src/services/server.ts

