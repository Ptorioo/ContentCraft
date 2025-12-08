"""
生成保留 ATI 分布的降維地圖

支援多種策略：
1. ATI_as_axis: 將 ATI 作為 Y 軸，embedding 降維作為 X 軸
2. ATI_as_radius: 將 ATI 映射到極座標的半徑（距離中心），角度由 embedding 決定
3. ATI_in_corner: 使用監督式降維，讓高 ATI 品牌位於右上角
"""

import numpy as np
import pandas as pd
import json
from pathlib import Path
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
try:
    import umap
    UMAP_AVAILABLE = True
except ImportError:
    UMAP_AVAILABLE = False
import warnings
warnings.filterwarnings('ignore')

# 設定路徑
ROOT = Path(__file__).parent.parent
EMBEDDING_FILE = ROOT / '結果' / 'modal_embeddings_v2.npz'
TEST_CSV = ROOT / '結果' / 'ati_test_per_post.csv'
TRAIN_CSV = ROOT / '結果' / 'ati_train_per_post.csv'
OUTPUT_FILE = ROOT / 'src' / 'data' / 'generated' / 'ati_aware_map.json'

# 降維策略：
# - 'axis' (ATI 作為軸)
# - 'radius' (ATI 作為半徑，高 ATI 遠離中心)
# - 'corner' (高 ATI 在角落)
# - 'distance' (高 ATI 遠離中心)
# - 'center' (高 ATI 接近中心) <- 新策略
# - 'cluster_center' (高 ATI 接近各自的聚類中心) <- 新策略
STRATEGY = 'cluster_center'  # 可以改為 'axis', 'radius', 'corner', 'distance', 'center', 或 'cluster_center'

# 確保輸出目錄存在
OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

print(f"📊 開始產生保留 ATI 分布的降維地圖（策略: {STRATEGY}）...")

# 1. 讀取 embedding
print("\n1️⃣ 讀取 embedding 檔案...")
data = np.load(EMBEDDING_FILE, allow_pickle=True)
cap_test = data['cap_test']
ocr_test = data['ocr_test']
img_test = data['img_test']

cap_train = data.get('cap_train', None)
ocr_train = data.get('ocr_train', None)
img_train = data.get('img_train', None)

# 2. 讀取品牌資料
print("\n2️⃣ 讀取品牌資料...")
df_test = pd.read_csv(TEST_CSV)
df_train = None
if TRAIN_CSV.exists():
    df_train = pd.read_csv(TRAIN_CSV)
    df_all = pd.concat([df_test, df_train], ignore_index=True)
else:
    df_all = df_test

# 3. 計算品牌級 embedding 和 ATI
print("\n3️⃣ 計算品牌級 embedding...")
text_emb_test = np.hstack([cap_test, ocr_test])
full_emb_test = np.hstack([text_emb_test, img_test])

if cap_train is not None:
    text_emb_train = np.hstack([cap_train, ocr_train])
    full_emb_train = np.hstack([text_emb_train, img_train])
    full_emb = np.vstack([full_emb_test, full_emb_train])
else:
    full_emb = full_emb_test

brands = df_all['brand'].unique()
brand_embeddings = {}
brand_atis = {}
brand_info = {}

for brand in brands:
    brand_mask_test = df_test['brand'] == brand
    brand_indices_test = np.where(brand_mask_test)[0]
    
    brand_indices_train = []
    if df_train is not None:
        brand_mask_train = df_train['brand'] == brand
        brand_indices_train = np.where(brand_mask_train)[0] + len(df_test)
    
    all_indices = list(brand_indices_test) + list(brand_indices_train)
    
    if len(all_indices) == 0:
        continue
    
    brand_emb = full_emb[all_indices].mean(axis=0)
    brand_embeddings[brand] = brand_emb
    
    brand_posts = df_all[df_all['brand'] == brand]
    brand_atis[brand] = brand_posts['ATI_final'].mean()
    brand_info[brand] = {
        'n_posts': len(brand_posts),
        'ATI_final_mean': brand_posts['ATI_final'].mean(),
        'DS_final_mean': brand_posts['DS_final'].mean(),
        'y_mean': brand_posts['y'].mean(),
    }

print(f"   ✓ 計算完成，共 {len(brand_embeddings)} 個品牌")

# 4. 準備降維資料
print("\n4️⃣ 準備降維資料...")
brand_list = list(brand_embeddings.keys())
embeddings_matrix = np.array([brand_embeddings[brand] for brand in brand_list])
atis_array = np.array([brand_atis[brand] for brand in brand_list])

# 標準化 embedding
scaler = StandardScaler()
embeddings_scaled = scaler.fit_transform(embeddings_matrix)

# 標準化 ATI
ati_scaled = (atis_array - atis_array.mean()) / (atis_array.std() + 1e-9)
ati_normalized = (atis_array - atis_array.min()) / (atis_array.max() - atis_array.min() + 1e-9)  # 0-1 範圍

print(f"   ✓ 標準化完成")
print(f"   ✓ ATI 範圍: {atis_array.min():.2f} - {atis_array.max():.2f}")

# 5. 根據策略執行降維
print(f"\n5️⃣ 執行 ATI-aware 降維（策略: {STRATEGY}）...")

if STRATEGY == 'axis':
    # 策略1：ATI 作為 Y 軸
    print("   🎯 方法：將 ATI 作為 Y 軸，對 embedding 降維作為 X 軸")
    
    if UMAP_AVAILABLE:
        reducer_1d = umap.UMAP(n_components=1, n_neighbors=15, min_dist=0.1, metric='cosine', random_state=42)
        x_coords = reducer_1d.fit_transform(embeddings_scaled).flatten()
        reduction_method = "UMAP_1D_with_ATI"
    else:
        pca_1d = PCA(n_components=1)
        x_coords = pca_1d.fit_transform(embeddings_scaled).flatten()
        reduction_method = "PCA_1D_with_ATI"
    
    y_coords = ati_scaled
    coordinates_2d = np.column_stack([x_coords, y_coords])
    
elif STRATEGY == 'radius':
    # 策略2：ATI 作為極座標的半徑（距離中心）
    print("   🎯 方法：將 ATI 映射到極座標的半徑，角度由 embedding 決定")
    
    # 對 embedding 降維到 1D 作為角度
    if UMAP_AVAILABLE:
        reducer_1d = umap.UMAP(n_components=1, n_neighbors=15, min_dist=0.1, metric='cosine', random_state=42)
        angles_1d = reducer_1d.fit_transform(embeddings_scaled).flatten()
        reduction_method = "UMAP_polar_with_ATI"
    else:
        pca_1d = PCA(n_components=1)
        angles_1d = pca_1d.fit_transform(embeddings_scaled).flatten()
        reduction_method = "PCA_polar_with_ATI"
    
    # 將角度標準化到 [0, 2π]
    angles_normalized = (angles_1d - angles_1d.min()) / (angles_1d.max() - angles_1d.min() + 1e-9) * 2 * np.pi
    
    # 將 ATI 映射到半徑（高 ATI = 遠離中心）
    # 使用平方根讓分布更均勻
    radius = np.sqrt(ati_normalized) * 2  # 半徑範圍 0-2
    
    # 轉換為直角座標
    x_coords = radius * np.cos(angles_normalized)
    y_coords = radius * np.sin(angles_normalized)
    coordinates_2d = np.column_stack([x_coords, y_coords])
    
elif STRATEGY == 'corner':
    # 策略3：監督式降維，讓高 ATI 在右上角
    print("   🎯 方法：使用監督式降維，讓高 ATI 品牌位於右上角")
    
    # 先對 embedding 降維到 2D
    if UMAP_AVAILABLE:
        reducer_2d = umap.UMAP(n_components=2, n_neighbors=15, min_dist=0.1, metric='cosine', random_state=42)
        coords_2d = reducer_2d.fit_transform(embeddings_scaled)
        reduction_method = "UMAP_supervised_with_ATI"
    else:
        pca_2d = PCA(n_components=2)
        coords_2d = pca_2d.fit_transform(embeddings_scaled)
        reduction_method = "PCA_supervised_with_ATI"
    
    # 標準化座標到 [-1, 1] 範圍
    coords_2d[:, 0] = (coords_2d[:, 0] - coords_2d[:, 0].min()) / (coords_2d[:, 0].max() - coords_2d[:, 0].min() + 1e-9) * 2 - 1
    coords_2d[:, 1] = (coords_2d[:, 1] - coords_2d[:, 1].min()) / (coords_2d[:, 1].max() - coords_2d[:, 1].min() + 1e-9) * 2 - 1
    
    # 計算 ATI 與兩個維度的相關性
    corr_x = np.corrcoef(atis_array, coords_2d[:, 0])[0, 1]
    corr_y = np.corrcoef(atis_array, coords_2d[:, 1])[0, 1]
    
    # 調整方向，讓高 ATI 在右上角
    if corr_x < 0:
        coords_2d[:, 0] = -coords_2d[:, 0]
    if corr_y < 0:
        coords_2d[:, 1] = -coords_2d[:, 1]
    
    # 強制調整：將 ATI 直接映射到右上角方向
    # 計算每個品牌到右上角 (1, 1) 的距離，高 ATI 應該更接近右上角
    # 但我們要讓高 ATI 在右上角，所以應該讓高 ATI 的座標更接近 (1, 1)
    
    # 方法：將 ATI 作為權重，調整座標讓高 ATI 品牌更接近右上角
    # 計算當前座標到右上角的距離
    target_x, target_y = 1.0, 1.0
    
    # 對每個品牌，根據 ATI 調整座標
    for i in range(len(brand_list)):
        # 當前座標
        curr_x, curr_y = coords_2d[i, 0], coords_2d[i, 1]
        
        # ATI 權重（0-1，高 ATI 接近 1）
        ati_weight = ati_normalized[i]
        
        # 將座標向目標方向（右上角）移動，移動距離與 ATI 成正比
        # 但保留原有的語意結構（不完全移動到右上角）
        new_x = curr_x + (target_x - curr_x) * ati_weight * 0.6  # 60% 的移動
        new_y = curr_y + (target_y - curr_y) * ati_weight * 0.6
        
        coords_2d[i, 0] = new_x
        coords_2d[i, 1] = new_y
    
    # 重新標準化到合理範圍
    coords_2d[:, 0] = (coords_2d[:, 0] - coords_2d[:, 0].mean()) / (coords_2d[:, 0].std() + 1e-9)
    coords_2d[:, 1] = (coords_2d[:, 1] - coords_2d[:, 1].mean()) / (coords_2d[:, 1].std() + 1e-9)
    
    x_coords = coords_2d[:, 0]
    y_coords = coords_2d[:, 1]
    coordinates_2d = coords_2d

elif STRATEGY == 'distance':
    # 策略4：高 ATI 品牌遠離中心
    print("   🎯 方法：使用極座標系統，ATI 映射到半徑（距離中心），角度由 embedding 決定")
    
    # 對 embedding 降維到 1D 作為角度
    if UMAP_AVAILABLE:
        reducer_1d = umap.UMAP(n_components=1, n_neighbors=15, min_dist=0.1, metric='cosine', random_state=42)
        angles_1d = reducer_1d.fit_transform(embeddings_scaled).flatten()
        reduction_method = "UMAP_polar_with_ATI_radius"
    else:
        pca_1d = PCA(n_components=1)
        angles_1d = pca_1d.fit_transform(embeddings_scaled).flatten()
        reduction_method = "PCA_polar_with_ATI_radius"
    
    # 將角度標準化到 [0, 2π]
    angles_normalized = (angles_1d - angles_1d.min()) / (angles_1d.max() - angles_1d.min() + 1e-9) * 2 * np.pi
    
    # 將 ATI 映射到半徑（高 ATI = 遠離中心）
    # 使用平方根讓分布更均勻，並設置最小半徑避免所有點都在中心
    min_radius = 0.5  # 最小半徑
    max_radius = 3.0  # 最大半徑
    radius = min_radius + (max_radius - min_radius) * np.sqrt(ati_normalized)
    
    # 轉換為直角座標
    x_coords = radius * np.cos(angles_normalized)
    y_coords = radius * np.sin(angles_normalized)
    coordinates_2d = np.column_stack([x_coords, y_coords])

elif STRATEGY == 'center':
    # 策略5：高 ATI 品牌接近中心
    print("   🎯 方法：使用極座標系統，ATI 反向映射到半徑（高 ATI = 接近中心），角度由 embedding 決定")
    
    # 對 embedding 降維到 1D 作為角度
    if UMAP_AVAILABLE:
        reducer_1d = umap.UMAP(n_components=1, n_neighbors=15, min_dist=0.1, metric='cosine', random_state=42)
        angles_1d = reducer_1d.fit_transform(embeddings_scaled).flatten()
        reduction_method = "UMAP_polar_with_ATI_inverse_radius"
    else:
        pca_1d = PCA(n_components=1)
        angles_1d = pca_1d.fit_transform(embeddings_scaled).flatten()
        reduction_method = "PCA_polar_with_ATI_inverse_radius"
    
    # 將角度標準化到 [0, 2π]
    angles_normalized = (angles_1d - angles_1d.min()) / (angles_1d.max() - angles_1d.min() + 1e-9) * 2 * np.pi
    
    # 將 ATI 反向映射到半徑（高 ATI = 接近中心）
    # 使用 1 - ati_normalized 讓高 ATI 對應小半徑
    min_radius = 0.3  # 最小半徑（高 ATI 品牌）
    max_radius = 3.0  # 最大半徑（低 ATI 品牌）
    radius = min_radius + (max_radius - min_radius) * (1 - np.sqrt(ati_normalized))
    
    # 轉換為直角座標
    x_coords = radius * np.cos(angles_normalized)
    y_coords = radius * np.sin(angles_normalized)
    coordinates_2d = np.column_stack([x_coords, y_coords])

elif STRATEGY == 'cluster_center':
    # 策略6：高 ATI 品牌接近各自的聚類中心
    print("   🎯 方法：先進行聚類，然後讓高 ATI 品牌接近各自的聚類中心")
    
    # 先進行聚類
    n_clusters = 6
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    clusters_pre = kmeans.fit_predict(embeddings_scaled)
    cluster_centers = kmeans.cluster_centers_
    
    # 對 embedding 降維到 2D（保留語意結構）
    if UMAP_AVAILABLE:
        reducer_2d = umap.UMAP(n_components=2, n_neighbors=15, min_dist=0.1, metric='cosine', random_state=42)
        coords_2d = reducer_2d.fit_transform(embeddings_scaled)
        reduction_method = "UMAP_cluster_center_with_ATI"
    else:
        pca_2d = PCA(n_components=2)
        coords_2d = pca_2d.fit_transform(embeddings_scaled)
        reduction_method = "PCA_cluster_center_with_ATI"
    
    # 計算每個聚類的中心（在降維後的 2D 空間中）
    cluster_centers_2d = []
    for i in range(n_clusters):
        cluster_points = coords_2d[clusters_pre == i]
        if len(cluster_points) > 0:
            cluster_centers_2d.append(cluster_points.mean(axis=0))
        else:
            cluster_centers_2d.append(coords_2d.mean(axis=0))
    cluster_centers_2d = np.array(cluster_centers_2d)
    
    # 調整每個品牌的位置：高 ATI 品牌更接近其聚類中心
    adjusted_coords = coords_2d.copy()
    for i in range(len(brand_list)):
        cluster_id = clusters_pre[i]
        cluster_center = cluster_centers_2d[cluster_id]
        current_pos = coords_2d[i]
        
        # 計算到聚類中心的距離
        dist_to_center = np.linalg.norm(current_pos - cluster_center)
        
        # ATI 權重：高 ATI (接近 1) 時，位置更接近聚類中心
        # 使用 ati_normalized，高 ATI = 接近 1，所以移動更多
        ati_weight = ati_normalized[i]
        
        # 計算從當前位置到聚類中心的方向
        direction = cluster_center - current_pos
        if np.linalg.norm(direction) > 1e-9:
            direction = direction / np.linalg.norm(direction)
        
        # 根據 ATI 調整位置：高 ATI 品牌更接近中心（移動更多）
        # 移動距離 = 原始距離 * ati_weight * 0.95，高 ATI 時移動 95% 的距離
        # 這樣高 ATI 品牌會非常接近聚類中心
        move_distance = dist_to_center * ati_weight * 0.95
        adjusted_coords[i] = current_pos + direction * move_distance
    
    x_coords = adjusted_coords[:, 0]
    y_coords = adjusted_coords[:, 1]
    coordinates_2d = adjusted_coords
    
    # 更新 clusters（使用預先計算的）
    clusters = clusters_pre

# 計算相關性
ati_x_corr = np.corrcoef(atis_array, x_coords)[0, 1]
ati_y_corr = np.corrcoef(atis_array, y_coords)[0, 1]
center_x, center_y = np.mean(x_coords), np.mean(y_coords)
distances = np.sqrt((x_coords - center_x)**2 + (y_coords - center_y)**2)
ati_dist_corr = np.corrcoef(atis_array, distances)[0, 1]

# 如果是 cluster_center 策略，計算到聚類中心的距離相關性
ati_cluster_dist_corr = None
if STRATEGY == 'cluster_center':
    # 計算每個品牌到其聚類中心的距離
    distances_to_cluster_center = []
    for i in range(len(brand_list)):
        cluster_id = clusters[i]
        cluster_center = cluster_centers_2d[cluster_id]
        dist = np.linalg.norm(coordinates_2d[i] - cluster_center)
        distances_to_cluster_center.append(dist)
    ati_cluster_dist_corr = np.corrcoef(atis_array, distances_to_cluster_center)[0, 1]

print(f"   ✓ 降維完成")
print(f"   ✓ ATI 與 X 座標相關性: {ati_x_corr:.3f}")
print(f"   ✓ ATI 與 Y 座標相關性: {ati_y_corr:.3f}")
print(f"   ✓ ATI 與到中心距離相關性: {ati_dist_corr:.3f}")
if ati_cluster_dist_corr is not None:
    print(f"   ✓ ATI 與到聚類中心距離相關性: {ati_cluster_dist_corr:.3f} (負值表示高 ATI 更接近聚類中心)")

# 6. K-means 聚類（如果策略不是 cluster_center，則在這裡進行）
if STRATEGY != 'cluster_center':
    print("\n6️⃣ 執行 K-means 聚類...")
    n_clusters = 6
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    clusters = kmeans.fit_predict(embeddings_scaled)
    
    print(f"   ✓ 聚類完成，分成 {n_clusters} 個群組")
    for i in range(n_clusters):
        count = np.sum(clusters == i)
        print(f"     - 群組 {i+1}: {count} 個品牌")
else:
    # cluster_center 策略已經在降維步驟中進行了聚類
    n_clusters = len(np.unique(clusters))
    print(f"\n6️⃣ 聚類已在降維步驟中完成，分成 {n_clusters} 個群組")
    for i in range(n_clusters):
        count = np.sum(clusters == i)
        print(f"     - 群組 {i+1}: {count} 個品牌")

# 7. 計算趨同度
print("\n7️⃣ 計算趨同度...")
from sklearn.preprocessing import normalize
from sklearn.metrics.pairwise import cosine_similarity

embeddings_normalized = normalize(embeddings_matrix, norm='l2')
similarity_matrix = cosine_similarity(embeddings_normalized)

n_brands = len(brand_list)
avg_similarity = 0
count = 0
for i in range(n_brands):
    for j in range(i+1, n_brands):
        avg_similarity += similarity_matrix[i, j]
        count += 1
avg_similarity = avg_similarity / count if count > 0 else 0

# 趨同度指數：直接使用平均相似度（範圍 [0, 1] 映射到 [0, 100]）
convergence_index = avg_similarity * 100

print(f"   ✓ 平均相似度: {avg_similarity:.4f}")
print(f"   ✓ 趨同度指數: {convergence_index:.2f}%")

# 8. 準備輸出資料
print("\n8️⃣ 準備輸出資料...")
output_data = {
    'method': 'ati_aware',
    'strategy': STRATEGY,
    'embedding_dim': embeddings_matrix.shape[1],
    'reduction_method': reduction_method,
    'n_clusters': n_clusters,
    'ati_x_correlation': float(ati_x_corr),
    'ati_y_correlation': float(ati_y_corr),
    'ati_distance_correlation': float(ati_dist_corr),
    'ati_cluster_distance_correlation': float(ati_cluster_dist_corr) if ati_cluster_dist_corr is not None else None,
    'convergence_index': float(convergence_index),
    'avg_similarity': float(avg_similarity),
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
    })

# 9. 儲存檔案
print(f"\n9️⃣ 儲存結果到 {OUTPUT_FILE}...")
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)

print(f"   ✓ 檔案已儲存")
print(f"\n✅ 完成！共處理 {len(brand_list)} 個品牌")
print(f"   - 降維方法: {reduction_method}")
print(f"   - 策略: {STRATEGY}")
print(f"   - ATI 與到中心距離相關性: {ati_dist_corr:.3f}")
