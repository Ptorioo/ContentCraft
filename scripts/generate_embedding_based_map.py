"""
使用原始 CLIP embedding 產生品牌定位圖和聚類

這個腳本會：
1. 讀取 modal_embeddings_v2.npz 中的 embedding
2. 為每個品牌計算平均 embedding（結合 text 和 image）
3. 使用 PCA/t-SNE 降維到 2D
4. 使用 K-means 進行聚類
5. 輸出 CSV 檔案供前端使用
"""

import numpy as np
import pandas as pd
import json
from pathlib import Path
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
try:
    import umap
    UMAP_AVAILABLE = True
except ImportError:
    UMAP_AVAILABLE = False
    print("⚠️  UMAP 未安裝，將使用 PCA。安裝方式: pip install umap-learn")
import warnings
warnings.filterwarnings('ignore')

# 設定路徑
ROOT = Path(__file__).parent.parent
EMBEDDING_FILE = ROOT / 'src' / 'model' / 'outputs' / 'modal_embeddings_v2.npz'
TEST_CSV = ROOT / 'data' / 'test' / 'ati_test_per_post_results.csv'
TRAIN_CSV = ROOT / 'data' / 'train' / 'ati_train_per_post_results.csv'
OUTPUT_FILE = ROOT / 'src' / 'data' / 'generated' / 'embedding_based_map.json'

# 確保輸出目錄存在
OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

print("📊 開始產生基於 embedding 的品牌定位圖...")

# 1. 讀取 embedding
print("\n1️⃣ 讀取 embedding 檔案...")
data = np.load(EMBEDDING_FILE, allow_pickle=True)
cap_test = data['cap_test']  # (590, 512)
ocr_test = data['ocr_test']  # (590, 512)
img_test = data['img_test']  # (590, 512)

# 讀取訓練集 embedding（如果存在）
cap_train = data.get('cap_train', None)
ocr_train = data.get('ocr_train', None)
img_train = data.get('img_train', None)

print(f"   ✓ 測試集 embedding 形狀:")
print(f"     - Caption: {cap_test.shape}")
print(f"     - OCR: {ocr_test.shape}")
print(f"     - Image: {img_test.shape}")

if cap_train is not None:
    print(f"   ✓ 訓練集 embedding 形狀:")
    print(f"     - Caption: {cap_train.shape}")
    print(f"     - OCR: {ocr_train.shape}")
    print(f"     - Image: {img_train.shape}")

# 2. 讀取品牌資料
print("\n2️⃣ 讀取品牌資料...")
df_test = pd.read_csv(TEST_CSV)
print(f"   ✓ 測試集: {len(df_test)} 篇貼文，{df_test['brand'].nunique()} 個品牌")

# 讀取訓練集資料（如果存在）
df_train = None
if TRAIN_CSV.exists():
    df_train = pd.read_csv(TRAIN_CSV)
    print(f"   ✓ 訓練集: {len(df_train)} 篇貼文，{df_train['brand'].nunique()} 個品牌")
    
    # 合併測試集和訓練集
    df_all = pd.concat([df_test, df_train], ignore_index=True)
    print(f"   ✓ 合併後: {len(df_all)} 篇貼文，{df_all['brand'].nunique()} 個品牌")
else:
    df_all = df_test
    print(f"   ⚠️  訓練集檔案不存在，僅使用測試集")

# 3. 計算每個品牌的平均 embedding
print("\n3️⃣ 計算品牌級 embedding...")

# 組合測試集的 text embedding（caption + OCR）
text_emb_test = np.hstack([cap_test, ocr_test])  # (590, 1024)
full_emb_test = np.hstack([text_emb_test, img_test])  # (590, 1536)

# 組合訓練集的 text embedding（如果存在）
full_emb_train = None
if cap_train is not None and ocr_train is not None and img_train is not None:
    text_emb_train = np.hstack([cap_train, ocr_train])
    full_emb_train = np.hstack([text_emb_train, img_train])
    # 合併測試集和訓練集的 embedding
    full_emb = np.vstack([full_emb_test, full_emb_train])  # (total, 1536)
    print(f"   ✓ 合併 embedding: {full_emb.shape}")
else:
    full_emb = full_emb_test
    print(f"   ⚠️  僅使用測試集 embedding: {full_emb.shape}")

brands = df_all['brand'].unique()
brand_embeddings = {}
brand_info = {}

for brand in brands:
    # 找出該品牌在測試集和訓練集中的索引
    brand_mask_test = df_test['brand'] == brand
    brand_indices_test = np.where(brand_mask_test)[0]
    
    brand_indices_train = []
    if df_train is not None:
        brand_mask_train = df_train['brand'] == brand
        brand_indices_train = np.where(brand_mask_train)[0] + len(df_test)  # 加上測試集的偏移量
    
    all_indices = list(brand_indices_test) + list(brand_indices_train)
    
    if len(all_indices) == 0:
        continue
    
    # 計算該品牌所有貼文的平均 embedding（包含測試集和訓練集）
    brand_emb = full_emb[all_indices].mean(axis=0)  # (1536,)
    brand_embeddings[brand] = brand_emb
    
    # 儲存品牌的其他資訊（從合併後的資料計算）
    brand_posts = df_all[df_all['brand'] == brand]
    brand_info[brand] = {
        'n_posts': len(brand_posts),
        'ATI_final_mean': brand_posts['ATI_final'].mean(),
        'DS_final_mean': brand_posts['DS_final'].mean(),
        'y_mean': brand_posts['y'].mean(),
        'text_ATI_mean': brand_posts['text_ATI'].mean(),
        'image_ATI_mean': brand_posts['image_ATI'].mean(),
    }

print(f"   ✓ 計算完成，共 {len(brand_embeddings)} 個品牌")
print(f"   ✓ Embedding 維度: {full_emb.shape[1]}")

# 4. 準備降維資料
print("\n4️⃣ 準備降維...")
brand_list = list(brand_embeddings.keys())
embeddings_matrix = np.array([brand_embeddings[brand] for brand in brand_list])

# 標準化（重要！）
scaler = StandardScaler()
embeddings_scaled = scaler.fit_transform(embeddings_matrix)

print(f"   ✓ 標準化完成，形狀: {embeddings_scaled.shape}")

# 5. 降維到 2D（優先使用 UMAP，更直觀且保留更多結構信息）
print("\n5️⃣ 執行降維...")
reduction_method = "PCA"  # 預設值

# 優先使用 UMAP（如果可用），因為它能更好地保留局部和全局結構
if UMAP_AVAILABLE:
    print("   🎯 使用 UMAP 降維（推薦：能更好地保留數據結構）...")
    try:
        # UMAP 參數：
        # n_neighbors: 控制局部結構的保留（較小值更關注局部，較大值更關注全局）
        # min_dist: 控制點之間的緊密度（0.0-1.0，較小值更緊密）
        # metric: 距離度量方式
        reducer = umap.UMAP(
            n_components=2,
            n_neighbors=15,  # 對於 63 個品牌，15 是個合理的值
            min_dist=0.1,     # 允許點之間有適度的距離，不會太緊密
            metric='cosine',   # 使用餘弦距離，適合 embedding
            random_state=42,
            verbose=False
        )
        coordinates_2d = reducer.fit_transform(embeddings_scaled)
        reduction_method = "UMAP"
        print(f"   ✓ UMAP 完成")
        print(f"   ✓ 使用餘弦距離度量，保留局部和全局結構")
        
        # 計算解釋變異（UMAP 不直接提供，但可以計算保留的距離信息）
        # 這裡我們計算原始距離和降維後距離的相關性
        from scipy.spatial.distance import pdist, squareform
        original_distances = pdist(embeddings_scaled, metric='cosine')
        reduced_distances = pdist(coordinates_2d, metric='euclidean')
        from scipy.stats import spearmanr
        correlation, _ = spearmanr(original_distances, reduced_distances)
        print(f"   ✓ 距離保留相關性: {correlation:.2%}")
    except Exception as e:
        print(f"   ⚠️  UMAP 失敗: {e}，回退到 PCA")
        reduction_method = "PCA"
        # 回退到 PCA
        n_components = min(50, len(brand_list) - 1, embeddings_scaled.shape[1])
        pca = PCA(n_components=n_components)
        embeddings_pca = pca.fit_transform(embeddings_scaled)
        pca_2d = PCA(n_components=2)
        coordinates_2d = pca_2d.fit_transform(embeddings_pca)
        explained_variance = pca_2d.explained_variance_ratio_.sum() * pca.explained_variance_ratio_[:n_components].sum()
        print(f"   ✓ PCA 完成")
        print(f"   ✓ 前兩個主成分解釋變異: {explained_variance:.2%}")
else:
    # 使用 PCA（備用方案）
    print("   📊 使用 PCA 降維...")
    n_components = min(50, len(brand_list) - 1, embeddings_scaled.shape[1])
    pca = PCA(n_components=n_components)
    embeddings_pca = pca.fit_transform(embeddings_scaled)
    pca_2d = PCA(n_components=2)
    coordinates_2d = pca_2d.fit_transform(embeddings_pca)
    explained_variance = pca_2d.explained_variance_ratio_.sum() * pca.explained_variance_ratio_[:n_components].sum()
    print(f"   ✓ PCA 完成")
    print(f"   ✓ 前兩個主成分解釋變異: {explained_variance:.2%}")

# 計算解釋變異（用於輸出，UMAP 時使用相關性）
if reduction_method == "PCA":
    explained_variance_value = explained_variance
else:
    explained_variance_value = correlation if 'correlation' in locals() else 0.0

# 6. K-means 聚類
print("\n6️⃣ 執行 K-means 聚類...")
n_clusters = 6  # 使用 6 個群組
kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
clusters = kmeans.fit_predict(embeddings_scaled)

print(f"   ✓ 聚類完成，分成 {n_clusters} 個群組")
for i in range(n_clusters):
    count = np.sum(clusters == i)
    print(f"     - 群組 {i+1}: {count} 個品牌")

# 7. 計算基於 embedding 的趨同度
print("\n7️⃣ 計算趨同度...")

# 使用原始 embedding（未標準化）進行 L2 正規化
# 這樣可以更準確地反映品牌在語意空間中的相似度
from sklearn.preprocessing import normalize
embeddings_normalized = normalize(embeddings_matrix, norm='l2')

# 方法1: 計算所有品牌 embedding 的平均中心點
center_embedding = embeddings_normalized.mean(axis=0)
# 正規化中心點
center_embedding = center_embedding / (np.linalg.norm(center_embedding) + 1e-9)

# 計算每個品牌到中心的距離（在正規化空間中）
distances_to_center = []
for i, brand in enumerate(brand_list):
    # 使用 cosine distance = 1 - cosine similarity
    cosine_sim = np.dot(embeddings_normalized[i], center_embedding)
    cosine_dist = 1 - cosine_sim
    distances_to_center.append(cosine_dist)

avg_distance = np.mean(distances_to_center)
std_distance = np.std(distances_to_center)

# 方法2: 計算品牌之間的相似度矩陣（cosine similarity）
from sklearn.metrics.pairwise import cosine_similarity
similarity_matrix = cosine_similarity(embeddings_normalized)
# 取上三角（不包括對角線），計算平均相似度
n_brands = len(brand_list)
avg_similarity = 0
count = 0
for i in range(n_brands):
    for j in range(i+1, n_brands):
        avg_similarity += similarity_matrix[i, j]
        count += 1
avg_similarity = avg_similarity / count if count > 0 else 0

# 趨同度指數：直接使用平均相似度（範圍 [0, 1] 映射到 [0, 100]）
# 相似度範圍在 0 到 1 之間（L2 正規化後的 CLIP embedding）
# 如果相似度很低（接近 0），表示品牌差異很大（多元）
# 如果相似度很高（接近 1），表示品牌很相似（趨同）
convergence_index = avg_similarity * 100

print(f"   ✓ 平均相似度: {avg_similarity:.4f}")
print(f"   ✓ 趨同度指數: {convergence_index:.2f}%")
print(f"   ✓ 平均距離: {avg_distance:.4f}")
print(f"   ✓ 距離標準差: {std_distance:.4f}")

# 8. 準備輸出資料
print("\n8️⃣ 準備輸出資料...")
output_data = {
    'method': 'embedding_based',
    'embedding_dim': full_emb.shape[1],
    'reduction_method': reduction_method,
    'n_clusters': n_clusters,
    'explained_variance': float(explained_variance_value) if reduction_method == "PCA" else float(explained_variance_value),
    'convergence_index': float(convergence_index),
    'avg_similarity': float(avg_similarity),
    'avg_distance': float(avg_distance),
    'std_distance': float(std_distance),
    'brands': []
}

for i, brand in enumerate(brand_list):
    output_data['brands'].append({
        'brand': brand,
        'x': float(coordinates_2d[i, 0]),
        'y': float(coordinates_2d[i, 1]),
        'cluster': int(clusters[i]),
        'n_posts': int(brand_info[brand]['n_posts']),
        'ATI_final_mean': float(brand_info[brand]['ATI_final_mean']),
        'DS_final_mean': float(brand_info[brand]['DS_final_mean']),
        'y_mean': float(brand_info[brand]['y_mean']),
        'text_ATI_mean': float(brand_info[brand]['text_ATI_mean']),
        'image_ATI_mean': float(brand_info[brand]['image_ATI_mean']),
    })

# 9. 儲存檔案
print(f"\n9️⃣ 儲存結果到 {OUTPUT_FILE}...")
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)

print(f"   ✓ 檔案已儲存")
print(f"\n✅ 完成！共處理 {len(brand_list)} 個品牌")
print(f"   - 降維方法: {reduction_method}")
print(f"   - 聚類數: {n_clusters}")
if reduction_method == "PCA":
    print(f"   - 解釋變異: {explained_variance_value:.2%}")
else:
    print(f"   - 距離保留相關性: {explained_variance_value:.2%}")

