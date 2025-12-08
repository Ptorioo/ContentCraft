// 市場地圖服務：提供降維視覺化數據
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const BRAND_AGG_CSV = path.resolve(ROOT, 'src/model/outputs/ati_test_brand_agg.csv');
// 優先使用結果目錄的 CSV（完整數據），如果不存在則使用 model/outputs
const RESULTS_DIR = path.resolve(ROOT, '結果');
const PER_POST_CSV_RESULTS = path.resolve(RESULTS_DIR, 'ati_test_per_post.csv');
const TRAIN_POST_CSV_RESULTS = path.resolve(RESULTS_DIR, 'ati_train_per_post.csv');
const PER_POST_CSV_OPTIMIZED = path.resolve(ROOT, 'src/model/outputs/ati_test_per_post_optimized.csv');
const PER_POST_CSV = fs.existsSync(PER_POST_CSV_RESULTS)
  ? PER_POST_CSV_RESULTS
  : (fs.existsSync(PER_POST_CSV_OPTIMIZED) 
      ? PER_POST_CSV_OPTIMIZED 
      : path.resolve(ROOT, 'src/model/outputs/ati_test_per_post.csv'));
const TRAIN_POST_CSV_OPTIMIZED = path.resolve(ROOT, 'src/model/outputs/ati_train_per_post_optimized.csv');
const TRAIN_POST_CSV = fs.existsSync(TRAIN_POST_CSV_RESULTS)
  ? TRAIN_POST_CSV_RESULTS
  : (fs.existsSync(TRAIN_POST_CSV_OPTIMIZED)
      ? TRAIN_POST_CSV_OPTIMIZED
      : path.resolve(ROOT, 'src/model/outputs/ati_train_per_post.csv'));
// Embedding-based 品牌定位圖資料
const EMBEDDING_BASED_MAP_JSON = path.resolve(ROOT, 'src/data/generated/embedding_based_map.json');
const ATI_AWARE_MAP_JSON = path.resolve(ROOT, 'src/data/generated/ati_aware_map.json');

interface BrandAggData {
  brand: string;
  n_posts: number;
  ATI_final_mean: number;
  DS_final_mean: number;
  y_mean: number;
  late_entry_brand: number;
}

interface BrandPoint {
  brand: string;
  x: number;  // 降維後的 X 座標
  y: number;  // 降維後的 Y 座標
  ati: number;
  ds: number;
  y_mean: number;
  n_posts: number;
  cluster?: number;  // 聚類編號
}

// 簡單的 PCA 降維（2D）
function pca2D(data: number[][]): number[][] {
  // data: [n, m] 矩陣，n 個樣本，m 個特徵
  const n = data.length;
  if (n === 0) return [];
  
  const m = data[0].length;
  
  // 1. 標準化（減去平均值）
  const means: number[] = [];
  for (let j = 0; j < m; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += data[i][j];
    }
    means.push(sum / n);
  }
  
  const centered = data.map(row => 
    row.map((val, j) => val - means[j])
  );
  
  // 2. 計算協方差矩陣
  const cov: number[][] = [];
  for (let i = 0; i < m; i++) {
    cov[i] = [];
    for (let j = 0; j < m; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += centered[k][i] * centered[k][j];
      }
      cov[i][j] = sum / (n - 1);
    }
  }
  
  // 3. 簡化版：使用前兩個特徵作為主成分（實際應該用特徵值分解）
  // 這裡我們用簡化方法：直接用標準化的前兩個特徵
  const result: number[][] = [];
  for (let i = 0; i < n; i++) {
    result.push([
      centered[i][0] || 0,
      centered[i][1] || 0
    ]);
  }
  
  return result;
}

// 基於 embedding 的 K-means 聚類（使用 12 維特徵）
interface PostData {
  brand: string;
  text_ATI: number;
  text_DS: number;
  text_nov: number;
  text_div: number;
  image_ATI: number;
  image_DS: number;
  image_nov: number;
  image_div: number;
  meta_ATI: number;
  meta_DS: number;
  meta_nov: number;
  meta_div: number;
}

async function loadPostDataForClustering(): Promise<PostData[]> {
  try {
    const testPosts = await parseCSV<any>(PER_POST_CSV);
    let trainPosts: any[] = [];
    if (fs.existsSync(TRAIN_POST_CSV)) {
      trainPosts = await parseCSV<any>(TRAIN_POST_CSV);
    }
    const allPosts = [...trainPosts, ...testPosts];
    
    return allPosts.map(p => ({
      brand: String(p.brand || '').trim(),
      text_ATI: parseFloat(p.text_ATI || '0') || 0,
      text_DS: parseFloat(p.text_DS || '0') || 0,
      text_nov: parseFloat(p.text_nov || '0') || 0,
      text_div: parseFloat(p.text_div || '0') || 0,
      image_ATI: parseFloat(p.image_ATI || '0') || 0,
      image_DS: parseFloat(p.image_DS || '0') || 0,
      image_nov: parseFloat(p.image_nov || '0') || 0,
      image_div: parseFloat(p.image_div || '0') || 0,
      meta_ATI: parseFloat(p.meta_ATI || '0') || 0,
      meta_DS: parseFloat(p.meta_DS || '0') || 0,
      meta_nov: parseFloat(p.meta_nov || '0') || 0,
      meta_div: parseFloat(p.meta_div || '0') || 0,
    }));
  } catch (error) {
    console.error('[MarketMap] Error loading post data for clustering:', error);
    return [];
  }
}

async function clusterBrandsByEmbedding(
  brands: BrandAggData[],
  posts: PostData[],
  k: number = 4
): Promise<number[]> {
  if (brands.length === 0 || posts.length === 0) {
    return brands.map(() => 0);
  }
  
  // 構建每個品牌的 12 維 embedding 向量
  const brandVectors: Map<string, number[]> = new Map();
  
  for (const brand of brands) {
    const brandPosts = posts.filter(p => p.brand === brand.brand);
    if (brandPosts.length === 0) {
      // 如果沒有貼文數據，使用 ATI 和 DS 構建 2 維向量
      brandVectors.set(brand.brand, [
        brand.ATI_final_mean / 100,
        brand.DS_final_mean,
      ]);
      continue;
    }
    
    // 計算品牌 embedding（與 brandAnalysisService 中的邏輯相同）
    const sum = brandPosts.reduce((acc, p) => ({
      textATI: acc.textATI + p.text_ATI,
      textDS: acc.textDS + p.text_DS,
      textNov: acc.textNov + p.text_nov,
      textDiv: acc.textDiv + p.text_div,
      imageATI: acc.imageATI + p.image_ATI,
      imageDS: acc.imageDS + p.image_DS,
      imageNov: acc.imageNov + p.image_nov,
      imageDiv: acc.imageDiv + p.image_div,
      metaATI: acc.metaATI + p.meta_ATI,
      metaDS: acc.metaDS + p.meta_DS,
      metaNov: acc.metaNov + p.meta_nov,
      metaDiv: acc.metaDiv + p.meta_div,
    }), {
      textATI: 0, textDS: 0, textNov: 0, textDiv: 0,
      imageATI: 0, imageDS: 0, imageNov: 0, imageDiv: 0,
      metaATI: 0, metaDS: 0, metaNov: 0, metaDiv: 0,
    });
    
    const n = brandPosts.length;
    const vector = [
      sum.textATI / n / 100,    // 標準化 ATI
      sum.textDS / n,
      sum.textNov / n,
      sum.textDiv / n,
      sum.imageATI / n / 100,
      sum.imageDS / n,
      sum.imageNov / n,
      sum.imageDiv / n,
      sum.metaATI / n / 100,
      sum.metaDS / n,
      sum.metaNov / n,
      sum.metaDiv / n,
    ];
    
    brandVectors.set(brand.brand, vector);
  }
  
  // 將品牌向量轉換為數組
  const vectors = brands.map(b => brandVectors.get(b.brand) || [0, 0]);
  const vectorDim = vectors[0]?.length || 12;
  
  // 對所有維度進行 Z-score 標準化，確保每個維度的權重相等
  // 這很重要，因為某些維度（如 text 模態）可能對所有品牌都相同
  const means: number[] = [];
  const stds: number[] = [];
  
  // 計算每個維度的平均值和標準差
  for (let d = 0; d < vectorDim; d++) {
    const values = vectors.map(v => v[d] || 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance) || 1; // 避免除以 0
    
    means.push(mean);
    stds.push(std);
  }
  
  // 標準化所有向量
  const normalizedVectors = vectors.map(vec => 
    vec.map((val, d) => (val - means[d]) / stds[d])
  );
  
  // K-means++ 初始化（在高維空間，使用標準化後的向量）
  const centers: number[][] = [];
  
  // 第一步：隨機選擇第一個中心
  const firstIdx = Math.floor(Math.random() * normalizedVectors.length);
  centers.push([...normalizedVectors[firstIdx]]);
  
  // 後續步驟：選擇距離已選中心最遠的點
  for (let c = 1; c < k && c < normalizedVectors.length; c++) {
    const distances: number[] = [];
    for (const vec of normalizedVectors) {
      let minDist = Infinity;
      for (const center of centers) {
        let dist = 0;
        for (let d = 0; d < vectorDim; d++) {
          const diff = vec[d] - center[d];
          dist += diff * diff;
        }
        dist = Math.sqrt(dist);
        if (dist < minDist) {
          minDist = dist;
        }
      }
      distances.push(minDist * minDist);
    }
    
    // 根據距離平方的概率分布選擇下一個中心
    const totalDist = distances.reduce((a, b) => a + b, 0);
    if (totalDist === 0) break;
    
    let random = Math.random() * totalDist;
    let selectedIdx = 0;
    for (let i = 0; i < distances.length; i++) {
      random -= distances[i];
      if (random <= 0) {
        selectedIdx = i;
        break;
      }
    }
    centers.push([...normalizedVectors[selectedIdx]]);
  }
  
  // K-means 迭代（使用標準化後的向量）
  let clusters: number[] = new Array(brands.length).fill(0);
  let prevClusters: number[] = [];
  let converged = false;
  
  for (let iter = 0; iter < 50 && !converged; iter++) {
    // 分配點到最近的中心
    for (let i = 0; i < normalizedVectors.length; i++) {
      let minDist = Infinity;
      let closest = 0;
      for (let j = 0; j < centers.length; j++) {
        let dist = 0;
        for (let d = 0; d < vectorDim; d++) {
          const diff = normalizedVectors[i][d] - centers[j][d];
          dist += diff * diff;
        }
        dist = Math.sqrt(dist);
        if (dist < minDist) {
          minDist = dist;
          closest = j;
        }
      }
      clusters[i] = closest;
    }
    
    // 檢查是否收斂
    if (iter > 0) {
      converged = true;
      for (let i = 0; i < clusters.length; i++) {
        if (clusters[i] !== prevClusters[i]) {
          converged = false;
          break;
        }
      }
    }
    prevClusters = [...clusters];
    
    // 更新中心點（使用標準化後的向量）
    for (let j = 0; j < centers.length; j++) {
      const clusterVectors = normalizedVectors.filter((_, i) => clusters[i] === j);
      if (clusterVectors.length > 0) {
        for (let d = 0; d < vectorDim; d++) {
          centers[j][d] = clusterVectors.reduce((sum, v) => sum + v[d], 0) / clusterVectors.length;
        }
      }
    }
  }
  
  return clusters;
}

// K-means++ 初始化（更穩定的初始化方法，用於 2D 空間）
function kMeansPlusPlusInit(points: BrandPoint[], k: number): Array<{ x: number; y: number }> {
  if (points.length === 0 || k === 0) return [];
  
  const centers: Array<{ x: number; y: number }> = [];
  
  // 第一步：隨機選擇第一個中心
  const firstIdx = Math.floor(Math.random() * points.length);
  centers.push({ x: points[firstIdx].x, y: points[firstIdx].y });
  
  // 後續步驟：選擇距離已選中心最遠的點
  for (let c = 1; c < k; c++) {
    const distances: number[] = [];
    for (let i = 0; i < points.length; i++) {
      // 計算到最近中心的距離
      let minDist = Infinity;
      for (const center of centers) {
        const dist = Math.sqrt(
          Math.pow(points[i].x - center.x, 2) + 
          Math.pow(points[i].y - center.y, 2)
        );
        if (dist < minDist) {
          minDist = dist;
        }
      }
      distances.push(minDist * minDist); // 使用距離平方作為權重
    }
    
    // 根據距離平方的概率分布選擇下一個中心
    const totalDist = distances.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalDist;
    let selectedIdx = 0;
    for (let i = 0; i < distances.length; i++) {
      random -= distances[i];
      if (random <= 0) {
        selectedIdx = i;
        break;
      }
    }
    centers.push({ x: points[selectedIdx].x, y: points[selectedIdx].y });
  }
  
  return centers;
}

// K-means 聚類（改進版：使用 K-means++ 初始化）
function simpleKMeans(points: BrandPoint[], k: number = 4): number[] {
  // 使用 ATI 和 DS 做 K-means 聚類
  if (points.length === 0) return [];
  if (k >= points.length) {
    // 如果 k 大於等於點數，每個點一個群組
    return points.map((_, i) => i);
  }
  
  // 使用 K-means++ 初始化（更穩定）
  let centers = kMeansPlusPlusInit(points, k);
  
  // 迭代更新（最多 50 次迭代，或直到收斂）
  let clusters: number[] = new Array(points.length).fill(0);
  let prevClusters: number[] = [];
  let converged = false;
  
  for (let iter = 0; iter < 50 && !converged; iter++) {
    // 分配點到最近的中心
    for (let i = 0; i < points.length; i++) {
      let minDist = Infinity;
      let closest = 0;
      for (let j = 0; j < centers.length; j++) {
        const dist = Math.sqrt(
          Math.pow(points[i].x - centers[j].x, 2) + 
          Math.pow(points[i].y - centers[j].y, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          closest = j;
        }
      }
      clusters[i] = closest;
    }
    
    // 檢查是否收斂
    if (iter > 0) {
      converged = true;
      for (let i = 0; i < clusters.length; i++) {
        if (clusters[i] !== prevClusters[i]) {
          converged = false;
          break;
        }
      }
    }
    prevClusters = [...clusters];
    
    // 更新中心點
    for (let j = 0; j < centers.length; j++) {
      const clusterPoints = points.filter((_, i) => clusters[i] === j);
      if (clusterPoints.length > 0) {
        centers[j].x = clusterPoints.reduce((sum, p) => sum + p.x, 0) / clusterPoints.length;
        centers[j].y = clusterPoints.reduce((sum, p) => sum + p.y, 0) / clusterPoints.length;
      }
    }
  }
  
  return clusters;
}

// 簡單的 CSV 解析（與 brandAnalysisService 相同）
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV<T extends Record<string, any>>(filePath: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`File not found: ${filePath}`));
    }
    
    try {
      // 使用更穩健的 CSV 解析方式（與 brandAnalysisService 完全相同）
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // 先找到標題行
      const firstNewline = content.indexOf('\n');
      if (firstNewline === -1) {
        return resolve([]);
      }
      
      const headerLine = content.substring(0, firstNewline);
      const headers = parseCSVLine(headerLine);
      const headerCount = headers.length;
      
      // 逐行解析，處理可能包含換行的欄位（如 caption）
      const results: T[] = [];
      let currentLine = '';
      let inQuotes = false;
      let skipCount = 0;
      
      for (let i = firstNewline + 1; i < content.length; i++) {
        const char = content[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
          currentLine += char;
        } else if (char === '\n' && !inQuotes) {
          // 這是一個完整的行
          if (currentLine.trim()) {
            const values = parseCSVLine(currentLine);
            // 允許欄位數量有 1 的誤差（處理尾隨逗號或缺失欄位）
            if (values.length >= headerCount - 1 && values.length <= headerCount + 1) {
              const obj: any = {};
              headers.forEach((header, idx) => {
                obj[header] = values[idx] || '';
              });
              // 如果欄位不足，補上空字串
              while (values.length < headerCount) {
                values.push('');
              }
              results.push(obj as T);
            } else {
              skipCount++;
              // 只在開發時顯示前幾個被跳過的行
              if (skipCount <= 5) {
                console.warn(`[parseCSV] Skipping row with ${values.length} columns (expected ${headerCount}): ${currentLine.substring(0, 100)}...`);
              }
            }
          }
          currentLine = '';
        } else {
          currentLine += char;
        }
      }
      
      // 處理最後一行
      if (currentLine.trim()) {
        const values = parseCSVLine(currentLine);
        if (values.length >= headerCount - 1 && values.length <= headerCount + 1) {
          const obj: any = {};
          headers.forEach((header, idx) => {
            obj[header] = values[idx] || '';
          });
          results.push(obj as T);
        } else {
          skipCount++;
        }
      }
      
      if (skipCount > 0) {
        console.warn(`[parseCSV] ${filePath}: Skipped ${skipCount} rows due to column count mismatch`);
      }
      
      console.log(`[parseCSV] ${filePath}: Loaded ${results.length} rows`);
      
      resolve(results);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      reject(error);
    }
  });
}

async function loadBrandData(): Promise<BrandAggData[]> {
  try {
    // 優先從 novelty_diversity_scatter.json 讀取（與總覽分析一致，包含全部品牌）
    const SCATTER_JSON = path.resolve(ROOT, 'src/data/generated/novelty_diversity_scatter.json');
    
    if (fs.existsSync(SCATTER_JSON)) {
      const scatterData = JSON.parse(fs.readFileSync(SCATTER_JSON, 'utf-8'));
      console.log(`[MarketMap] Loaded ${scatterData.length} brands from novelty_diversity_scatter.json`);
      
      // 嘗試從 CSV 獲取 y_mean（用於統計）
      let yMeanMap = new Map<string, number>();
      try {
        const testPosts = await parseCSV<any>(PER_POST_CSV);
        let trainPosts: any[] = [];
        if (fs.existsSync(TRAIN_POST_CSV)) {
          trainPosts = await parseCSV<any>(TRAIN_POST_CSV);
        }
        const allPosts = [...trainPosts, ...testPosts];
        
        // 按品牌聚合 y_mean
        const brandYMap = new Map<string, { sum: number; count: number }>();
        allPosts.forEach((post: any) => {
          const brand = String(post.brand || '').trim();
          if (!brand) return;
          const y = parseFloat(String(post.y || '0')) || 0;
          if (!brandYMap.has(brand)) {
            brandYMap.set(brand, { sum: 0, count: 0 });
          }
          const data = brandYMap.get(brand)!;
          data.sum += y;
          data.count++;
        });
        
        brandYMap.forEach((data, brand) => {
          yMeanMap.set(brand, data.count > 0 ? data.sum / data.count : 0);
        });
      } catch (error) {
        console.warn('[MarketMap] Could not load y_mean from CSV, using 0');
      }
      
      // 轉換為 BrandAggData 格式
      const brands: BrandAggData[] = scatterData.map((item: any) => {
        const brandName = item.brandName || item.brandId || '';
        return {
          brand: brandName,
          n_posts: item.postCount || 0,
          ATI_final_mean: item.ati || 0,
          DS_final_mean: item.diversity || 0, // diversity 就是 DS
          y_mean: yMeanMap.get(brandName) || 0,
          late_entry_brand: 0,
        };
      }).filter((b: BrandAggData) => b.brand !== '');
      
      console.log(`[MarketMap] Using ${brands.length} brands from scatter data`);
      return brands;
    }
    
    // 備用方案：從 per_post 數據中聚合所有品牌（包含 train 和 test）
    const testPosts = await parseCSV<any>(PER_POST_CSV);
    console.log(`[MarketMap] Loaded ${testPosts.length} test posts`);
    
    let trainPosts: any[] = [];
    try {
      if (fs.existsSync(TRAIN_POST_CSV)) {
        trainPosts = await parseCSV<any>(TRAIN_POST_CSV);
        console.log(`[MarketMap] Loaded ${trainPosts.length} train posts`);
      } else {
        console.warn(`[MarketMap] Train CSV not found: ${TRAIN_POST_CSV}`);
      }
    } catch (error) {
      console.error('無法載入 train 數據:', error);
    }
    
    // 合併所有貼文
    const allPosts = [...trainPosts, ...testPosts];
    console.log(`[MarketMap] Total posts: ${allPosts.length}`);
    
    if (allPosts.length === 0) {
      return [];
    }
    
    // 按品牌聚合
    const brandMap = new Map<string, {
      n_posts: number;
      ATI_sum: number;
      DS_sum: number;
      y_sum: number;
    }>();
    
    allPosts.forEach((post: any) => {
      const brand = String(post.brand || '').trim();
      if (!brand) return;
      
      const ati = parseFloat(String(post.ATI_final || '0')) || 0;
      const ds = parseFloat(String(post.DS_final || '0')) || 0;
      const y = parseFloat(String(post.y || '0')) || 0;
      
      if (!brandMap.has(brand)) {
        brandMap.set(brand, {
          n_posts: 0,
          ATI_sum: 0,
          DS_sum: 0,
          y_sum: 0,
        });
      }
      
      const brandData = brandMap.get(brand)!;
      brandData.n_posts++;
      brandData.ATI_sum += ati;
      brandData.DS_sum += ds;
      brandData.y_sum += y;
    });
    
    // 轉換為 BrandAggData 格式
    const brands: BrandAggData[] = Array.from(brandMap.entries()).map(([brand, data]) => ({
      brand,
      n_posts: data.n_posts,
      ATI_final_mean: data.n_posts > 0 ? data.ATI_sum / data.n_posts : 0,
      DS_final_mean: data.n_posts > 0 ? data.DS_sum / data.n_posts : 0,
      y_mean: data.n_posts > 0 ? data.y_sum / data.n_posts : 0,
      late_entry_brand: 0, // 暫時設為 0，如果需要可以從原始數據計算
    }));
    
    const filteredBrands = brands.filter(b => b.brand !== '');
    console.log(`[MarketMap] Aggregated ${filteredBrands.length} brands from ${allPosts.length} posts`);
    return filteredBrands;
  } catch (error) {
    console.error('Error loading brand data:', error);
    return [];
  }
}

// 取得市場地圖數據（使用 embedding-based 方法）
export async function getMarketMapData(method: 'positioning' = 'positioning'): Promise<{
  points: BrandPoint[];
  clusters: number;
  method: string;
  reduction_method?: string;
  explained_variance?: number;
  strategy?: string;
  ati_distance_correlation?: number;
  ati_cluster_distance_correlation?: number;
}> {
  // 優先使用 ATI-aware 的資料（如果存在）
  if (fs.existsSync(ATI_AWARE_MAP_JSON)) {
    try {
      const atiAwareData = JSON.parse(
        fs.readFileSync(ATI_AWARE_MAP_JSON, 'utf-8')
      );
      
      const points: BrandPoint[] = atiAwareData.brands.map((b: any) => ({
        brand: b.brand,
        x: b.x,
        y: b.y,
        ati: b.ATI_final_mean,
        ds: b.DS_final_mean,
        y_mean: b.y_mean,
        n_posts: b.n_posts,
        cluster: b.cluster,
      }));
      
      return {
        points,
        clusters: atiAwareData.n_clusters,
        method: 'ati_aware',
        reduction_method: atiAwareData.reduction_method || 'unknown',
        explained_variance: atiAwareData.ati_distance_correlation || 0,
        strategy: atiAwareData.strategy || 'unknown',
        ati_distance_correlation: atiAwareData.ati_distance_correlation || 0,
        ati_cluster_distance_correlation: atiAwareData.ati_cluster_distance_correlation || undefined,
      };
    } catch (error) {
      console.error('[MarketMap] Error loading ATI-aware map, falling back to embedding-based:', error);
    }
  }
  
  // 其次使用 embedding-based 的資料
  if (fs.existsSync(EMBEDDING_BASED_MAP_JSON)) {
    try {
      const embeddingData = JSON.parse(
        fs.readFileSync(EMBEDDING_BASED_MAP_JSON, 'utf-8')
      );
      
      // 轉換為 BrandPoint 格式
      const points: BrandPoint[] = embeddingData.brands.map((b: any) => ({
        brand: b.brand,
        x: b.x, // Embedding-based PCA 座標 X
        y: b.y, // Embedding-based PCA 座標 Y
        ati: b.ATI_final_mean,
        ds: b.DS_final_mean,
        y_mean: b.y_mean,
        n_posts: b.n_posts,
        cluster: b.cluster,
      }));
      
      return {
        points,
        clusters: embeddingData.n_clusters,
        method: 'embedding_based',
        reduction_method: embeddingData.reduction_method || 'PCA',
        explained_variance: embeddingData.explained_variance || 0,
      };
    } catch (error) {
      console.error('[MarketMap] Error loading embedding-based map, falling back to legacy method:', error);
      // 如果載入失敗，回退到舊方法
    }
  }
  
  // 回退方案：使用原本的 ATI/DS 方法
  const brands = await loadBrandData();
  
  if (brands.length === 0) {
    return { points: [], clusters: 0, method: 'legacy' };
  }
  
  // 品牌定位圖：直接使用 DS 和 ATI，不標準化
  const points: BrandPoint[] = brands.map((b) => ({
    brand: b.brand,
    x: b.DS_final_mean, // X = DS (內容多樣性)
    y: b.ATI_final_mean, // Y = ATI (趨同程度)
    ati: b.ATI_final_mean,
    ds: b.DS_final_mean,
    y_mean: b.y_mean,
    n_posts: b.n_posts,
  }));
  
  // 使用基於 embedding 的聚類（使用原始 12 維特徵）
  const posts = await loadPostDataForClustering();
  const clusters = await clusterBrandsByEmbedding(brands, posts, 4);
  
  const pointsWithClusters = points.map((p, idx) => ({
    ...p,
    cluster: clusters[idx] || 0,
  }));
  
  return {
    points: pointsWithClusters,
    clusters: 4,
    method: 'legacy',
  };
}

// 取得市場統計（用於顯示）
export async function getMarketMapStats() {
  // 直接使用與 brandAnalysisService 相同的邏輯來計算 ATI
  // 這樣可以確保一致性
  const brands = await loadBrandData();
  
  // 載入貼文數據（與 brandAnalysisService 使用相同的路徑）
  const testPosts = await parseCSV<any>(PER_POST_CSV);
  let trainPosts: any[] = [];
  if (fs.existsSync(TRAIN_POST_CSV)) {
    trainPosts = await parseCSV<any>(TRAIN_POST_CSV);
  }
  const allPosts = [...trainPosts, ...testPosts];
  
  // 調試：檢查數據量
  console.log(`[MarketMap] Loaded ${testPosts.length} test posts, ${trainPosts.length} train posts, total: ${allPosts.length}`);
  
  // 使用貼文層級的平均 ATI（與 getMarketStats 保持一致）
  // 過濾無效數據（ATI 應該在合理範圍內）
  const validPosts = allPosts.filter((p: any) => {
    const atiStr = String(p.ATI_final || p['ATI_final'] || '0').trim();
    const ati = parseFloat(atiStr);
    return !isNaN(ati) && ati > 0 && ati < 100;
  });
  
  console.log(`[MarketMap] Valid posts: ${validPosts.length} out of ${allPosts.length}`);
  
  const avgAtiFromPosts = validPosts.length > 0
    ? validPosts.reduce((sum: number, p: any) => {
        const atiStr = String(p.ATI_final || p['ATI_final'] || '0').trim();
        const ati = parseFloat(atiStr) || 0;
        return sum + ati;
      }, 0) / validPosts.length
    : 0;
  
  console.log(`[MarketMap] Calculated avgAtiFromPosts: ${avgAtiFromPosts.toFixed(2)}`);
  
  // 品牌層級的平均（用於其他統計）
  const avgAtiFromBrands = brands.length > 0
    ? brands.reduce((sum, b) => sum + b.ATI_final_mean, 0) / brands.length
    : 0;
  
  // 使用貼文層級的平均 ATI（與總覽一致）
  const avgAti = avgAtiFromPosts > 0 ? avgAtiFromPosts : avgAtiFromBrands;
  const avgDs = brands.length > 0
    ? brands.reduce((sum, b) => sum + b.DS_final_mean, 0) / brands.length
    : 0;
  
  // 取得趨同度指數（優先從 embedding-based 或 ATI-aware 地圖）
  let convergenceIndex = 0;
  if (fs.existsSync(ATI_AWARE_MAP_JSON)) {
    try {
      const atiAwareData = JSON.parse(
        fs.readFileSync(ATI_AWARE_MAP_JSON, 'utf-8')
      );
      convergenceIndex = atiAwareData.convergence_index || atiAwareData.convergenceIndex || 0;
    } catch (error) {
      console.error('[MarketMap] Error loading ATI-aware convergence index:', error);
    }
  } else if (fs.existsSync(EMBEDDING_BASED_MAP_JSON)) {
    try {
      const embeddingData = JSON.parse(
        fs.readFileSync(EMBEDDING_BASED_MAP_JSON, 'utf-8')
      );
      convergenceIndex = embeddingData.convergence_index || embeddingData.convergenceIndex || 0;
    } catch (error) {
      console.error('[MarketMap] Error loading embedding-based convergence index:', error);
    }
  }
  
  // 如果沒有從 JSON 取得，則計算（使用品牌層級）
  if (convergenceIndex === 0) {
    const atiStd = Math.sqrt(
      brands.reduce((sum, b) => sum + Math.pow(b.ATI_final_mean - avgAtiFromBrands, 2), 0) / brands.length
    );
    convergenceIndex = Math.max(0, Math.min(100, 100 - (atiStd / avgAtiFromBrands * 100)));
  }
  
  return {
    totalBrands: brands.length,
    avgAti,
    avgDs,
    convergenceIndex,
    atiStd: 0,
    method: 'embedding_based',
  };
}


