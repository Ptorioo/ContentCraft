"""
生成品牌級別的原始 CLIP embedding，用於計算品牌相似度

這個腳本會：
1. 讀取 modal_embeddings_v2.npz 中的 embedding
2. 為每個品牌計算平均 embedding（結合 caption + OCR + image）
3. 保存為 JSON 供後端使用
"""

import numpy as np
import pandas as pd
import json
from pathlib import Path

# 設定路徑
ROOT = Path(__file__).parent.parent
EMBEDDING_FILE = ROOT / '結果' / 'modal_embeddings_v2.npz'
TEST_CSV = ROOT / '結果' / 'ati_test_per_post.csv'
TRAIN_CSV = ROOT / '結果' / 'ati_train_per_post.csv'
OUTPUT_FILE = ROOT / 'src' / 'data' / 'generated' / 'brand_embeddings.json'

# 確保輸出目錄存在
OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

print("📊 開始生成品牌級 embedding...")

# 1. 讀取 embedding
print("\n1️⃣ 讀取 embedding 檔案...")
data = np.load(EMBEDDING_FILE, allow_pickle=True)
cap_test = data['cap_test']  # (590, 512)
ocr_test = data['ocr_test']  # (590, 512)
img_test = data['img_test']  # (590, 512)

# 讀取訓練集 embedding
cap_train = data.get('cap_train', None)
ocr_train = data.get('ocr_train', None)
img_train = data.get('img_train', None)

print(f"   ✓ 測試集: {cap_test.shape[0]} 個貼文")
if cap_train is not None:
    print(f"   ✓ 訓練集: {cap_train.shape[0]} 個貼文")

# 2. 讀取品牌資料
print("\n2️⃣ 讀取品牌資料...")
df_test = pd.read_csv(TEST_CSV)
print(f"   ✓ 測試集: {len(df_test)} 篇貼文，{df_test['brand'].nunique()} 個品牌")

df_train = None
if TRAIN_CSV.exists():
    df_train = pd.read_csv(TRAIN_CSV)
    print(f"   ✓ 訓練集: {len(df_train)} 篇貼文，{df_train['brand'].nunique()} 個品牌")
    df_all = pd.concat([df_test, df_train], ignore_index=True)
    print(f"   ✓ 合併後: {len(df_all)} 篇貼文，{df_all['brand'].nunique()} 個品牌")
else:
    df_all = df_test

# 3. 組合 embedding（caption + OCR + image = 1536 維）
print("\n3️⃣ 組合 embedding...")
text_emb_test = np.hstack([cap_test, ocr_test])  # (590, 1024)
full_emb_test = np.hstack([text_emb_test, img_test])  # (590, 1536)

if cap_train is not None and ocr_train is not None and img_train is not None:
    text_emb_train = np.hstack([cap_train, ocr_train])
    full_emb_train = np.hstack([text_emb_train, img_train])
    full_emb = np.vstack([full_emb_test, full_emb_train])  # (total, 1536)
    print(f"   ✓ 合併 embedding: {full_emb.shape}")
else:
    full_emb = full_emb_test
    print(f"   ⚠️  僅使用測試集 embedding: {full_emb.shape}")

# 4. 計算每個品牌的平均 embedding
print("\n4️⃣ 計算品牌級 embedding...")
brands = df_all['brand'].unique()
brand_embeddings = {}

for brand in brands:
    # 找出該品牌在測試集和訓練集中的索引
    brand_mask_test = df_test['brand'] == brand
    brand_indices_test = np.where(brand_mask_test)[0]
    
    brand_indices_train = []
    if df_train is not None:
        brand_mask_train = df_train['brand'] == brand
        brand_indices_train = np.where(brand_mask_train)[0] + len(df_test)
    
    all_indices = list(brand_indices_test) + list(brand_indices_train)
    
    if len(all_indices) == 0:
        continue
    
    # 計算該品牌所有貼文的平均 embedding
    brand_emb = full_emb[all_indices].mean(axis=0)  # (1536,)
    
    # L2 正規化（用於 cosine similarity）
    norm = np.linalg.norm(brand_emb)
    if norm > 0:
        brand_emb = brand_emb / norm
    
    brand_embeddings[brand] = brand_emb.tolist()

print(f"   ✓ 計算完成，共 {len(brand_embeddings)} 個品牌")
print(f"   ✓ Embedding 維度: 1536 (caption 512 + OCR 512 + image 512)")

# 5. 保存為 JSON
print(f"\n5️⃣ 保存到 {OUTPUT_FILE}...")
output_data = {
    'embedding_dim': 1536,
    'n_brands': len(brand_embeddings),
    'embeddings': brand_embeddings,
}

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)

print(f"   ✓ 檔案已儲存")
print(f"\n✅ 完成！共處理 {len(brand_embeddings)} 個品牌")

