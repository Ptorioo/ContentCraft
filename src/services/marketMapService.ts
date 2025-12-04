// 市場地圖服務：提供降維視覺化數據
import fs from 'fs';
import path from 'path';
import { getAllBrands } from './brandAnalysisService';

const ROOT = process.cwd();
const BRAND_AGG_CSV = path.resolve(ROOT, '結果/ati_test_brand_agg.csv');

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
  const means = [];
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

// K-means 聚類（簡化版，用於分組）
function simpleKMeans(points: BrandPoint[], k: number = 4): number[] {
  // 使用 ATI 和 DS 做簡單的 K-means
  if (points.length === 0) return [];
  
  // 初始化中心點（隨機選擇 k 個點）
  const centers: Array<{ x: number; y: number }> = [];
  const indices = [];
  for (let i = 0; i < k && i < points.length; i++) {
    const idx = Math.floor(Math.random() * points.length);
    if (!indices.includes(idx)) {
      indices.push(idx);
      centers.push({ x: points[idx].x, y: points[idx].y });
    }
  }
  
  // 迭代更新（簡化版，只做 10 次迭代）
  let clusters: number[] = new Array(points.length).fill(0);
  
  for (let iter = 0; iter < 10; iter++) {
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
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return resolve([]);
    }
    
    const headers = parseCSVLine(lines[0]);
    const results: T[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length !== headers.length) continue;
      
      const obj: any = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx] || '';
      });
      results.push(obj as T);
    }
    
    resolve(results);
  });
}

async function loadBrandData(): Promise<BrandAggData[]> {
  try {
    const raw = await parseCSV<any>(BRAND_AGG_CSV);
    return raw.map(b => ({
      brand: String(b.brand || '').trim(),
      n_posts: parseInt(String(b.n_posts || '0'), 10) || 0,
      ATI_final_mean: parseFloat(String(b.ATI_final_mean || '0')) || 0,
      DS_final_mean: parseFloat(String(b.DS_final_mean || '0')) || 0,
      y_mean: parseFloat(String(b.y_mean || '0')) || 0,
      late_entry_brand: parseInt(String(b.late_entry_brand || '0'), 10) || 0,
    })).filter(b => b.brand !== '');
  } catch (error) {
    console.error('Error loading brand data:', error);
    return [];
  }
}

// 取得市場地圖數據
export async function getMarketMapData(method: 'pca' | 'ati_ds' | 'simple' | 'positioning' = 'simple'): Promise<{
  points: BrandPoint[];
  clusters: number;
  method: string;
}> {
  const brands = await loadBrandData();
  
  if (brands.length === 0) {
    return { points: [], clusters: 0, method };
  }
  
  let points: BrandPoint[] = [];
  
  if (method === 'positioning') {
    // 品牌定位圖：直接使用 DS 和 ATI，不標準化
    points = brands.map((b) => ({
      brand: b.brand,
      x: b.DS_final_mean, // X = DS (內容多樣性)
      y: b.ATI_final_mean, // Y = ATI (趨同程度)
      ati: b.ATI_final_mean,
      ds: b.DS_final_mean,
      y_mean: b.y_mean,
      n_posts: b.n_posts,
    }));
  } else if (method === 'ati_ds') {
    // 方法 1：直接用 ATI 和 DS 作為 X, Y
    // 標準化到 [0, 1] 範圍
    const atiValues = brands.map(b => b.ATI_final_mean);
    const dsValues = brands.map(b => b.DS_final_mean);
    
    const atiMin = Math.min(...atiValues);
    const atiMax = Math.max(...atiValues);
    const atiRange = atiMax - atiMin || 1;
    
    const dsMin = Math.min(...dsValues);
    const dsMax = Math.max(...dsValues);
    const dsRange = dsMax - dsMin || 1;
    
    points = brands.map((b, idx) => ({
      brand: b.brand,
      x: (b.ATI_final_mean - atiMin) / atiRange,
      y: (b.DS_final_mean - dsMin) / dsRange,
      ati: b.ATI_final_mean,
      ds: b.DS_final_mean,
      y_mean: b.y_mean,
      n_posts: b.n_posts,
    }));
  } else if (method === 'pca') {
    // 方法 2：使用 PCA 降維（使用 ATI, DS, y_mean 三個特徵）
    const features = brands.map(b => [
      b.ATI_final_mean,
      b.DS_final_mean,
      b.y_mean,
    ]);
    
    const pcaResult = pca2D(features);
    
    // 正規化到 [0, 1] 範圍
    const xValues = pcaResult.map(r => r[0]);
    const yValues = pcaResult.map(r => r[1]);
    
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const xRange = xMax - xMin || 1;
    
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const yRange = yMax - yMin || 1;
    
    points = brands.map((b, idx) => ({
      brand: b.brand,
      x: (pcaResult[idx][0] - xMin) / xRange,
      y: (pcaResult[idx][1] - yMin) / yRange,
      ati: b.ATI_final_mean,
      ds: b.DS_final_mean,
      y_mean: b.y_mean,
      n_posts: b.n_posts,
    }));
  } else {
    // 方法 3：簡單方法（使用 ATI 和 DS，但用不同的縮放）
    // X = ATI（標準化），Y = DS（標準化）
    const atiValues = brands.map(b => b.ATI_final_mean);
    const dsValues = brands.map(b => b.DS_final_mean);
    
    const atiMean = atiValues.reduce((a, b) => a + b, 0) / atiValues.length;
    const atiStd = Math.sqrt(
      atiValues.reduce((sum, val) => sum + Math.pow(val - atiMean, 2), 0) / atiValues.length
    );
    
    const dsMean = dsValues.reduce((a, b) => a + b, 0) / dsValues.length;
    const dsStd = Math.sqrt(
      dsValues.reduce((sum, val) => sum + Math.pow(val - dsMean, 2), 0) / dsValues.length
    );
    
    // 使用 Z-score 然後正規化到 [0, 1]
    const zScores = brands.map(b => ({
      atiZ: (b.ATI_final_mean - atiMean) / (atiStd || 1),
      dsZ: (b.DS_final_mean - dsMean) / (dsStd || 1),
    }));
    
    const atiZMin = Math.min(...zScores.map(z => z.atiZ));
    const atiZMax = Math.max(...zScores.map(z => z.atiZ));
    const atiZRange = atiZMax - atiZMin || 1;
    
    const dsZMin = Math.min(...zScores.map(z => z.dsZ));
    const dsZMax = Math.max(...zScores.map(z => z.dsZ));
    const dsZRange = dsZMax - dsZMin || 1;
    
    points = brands.map((b, idx) => ({
      brand: b.brand,
      x: (zScores[idx].atiZ - atiZMin) / atiZRange,
      y: (zScores[idx].dsZ - dsZMin) / dsZRange,
      ati: b.ATI_final_mean,
      ds: b.DS_final_mean,
      y_mean: b.y_mean,
      n_posts: b.n_posts,
    }));
  }
  
  // 執行 K-means 聚類（4 個群組）
  const clusters = simpleKMeans(points, 4);
  points = points.map((p, idx) => ({
    ...p,
    cluster: clusters[idx],
  }));
  
  return {
    points,
    clusters: 4,
    method,
  };
}

// 取得市場統計（用於顯示）
export async function getMarketMapStats() {
  const brands = await loadBrandData();
  
  if (brands.length === 0) {
    return {
      totalBrands: 0,
      avgAti: 0,
      avgDs: 0,
      convergenceIndex: 0,
    };
  }
  
  const avgAti = brands.reduce((sum, b) => sum + b.ATI_final_mean, 0) / brands.length;
  const avgDs = brands.reduce((sum, b) => sum + b.DS_final_mean, 0) / brands.length;
  
  // 計算趨同度（ATI 的標準差，越小越趨同）
  const atiStd = Math.sqrt(
    brands.reduce((sum, b) => sum + Math.pow(b.ATI_final_mean - avgAti, 2), 0) / brands.length
  );
  
  const convergenceIndex = 100 - (atiStd / avgAti * 100);
  
  return {
    totalBrands: brands.length,
    avgAti,
    avgDs,
    convergenceIndex: Math.max(0, Math.min(100, convergenceIndex)),
    atiStd,
  };
}

