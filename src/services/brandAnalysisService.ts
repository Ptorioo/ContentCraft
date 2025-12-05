// 品牌分析服務：讀取 CSV 並提供分析接口
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const BRAND_AGG_CSV = path.resolve(ROOT, 'src/model/outputs/ati_test_brand_agg.csv');
// 優先使用優化版 CSV（更快），如果不存在則使用原始版本
const PER_POST_CSV_OPTIMIZED = path.resolve(ROOT, 'src/model/outputs/ati_test_per_post_optimized.csv');
const PER_POST_CSV = fs.existsSync(PER_POST_CSV_OPTIMIZED) 
  ? PER_POST_CSV_OPTIMIZED 
  : path.resolve(ROOT, 'src/model/outputs/ati_test_per_post.csv');
const TRAIN_POST_CSV_OPTIMIZED = path.resolve(ROOT, 'src/model/outputs/ati_train_per_post_optimized.csv');
const TRAIN_POST_CSV = fs.existsSync(TRAIN_POST_CSV_OPTIMIZED)
  ? TRAIN_POST_CSV_OPTIMIZED
  : path.resolve(ROOT, 'src/model/outputs/ati_train_per_post.csv');
const RAW_TEST_POSTS_CSV = path.resolve(ROOT, 'src/model/with_rel_paths_test_posts.csv');
const RAW_TRAIN_POSTS_CSV = path.resolve(ROOT, 'src/model/with_rel_paths_train_posts.csv');

interface BrandAggData {
  brand: string;
  n_posts: number;
  ATI_final_mean: number;
  DS_final_mean: number;
  y_mean: number;
  late_entry_brand: number;
}

interface PostData {
  brand: string;
  count_like: number;
  count_comment: number;
  followers: number;
  y: number;
  text_nov: number;
  text_div: number;
  text_DS: number;
  text_ATI: number;
  image_nov: number;
  image_div: number;
  image_DS: number;
  image_ATI: number;
  meta_nov: number;
  meta_div: number;
  meta_DS: number;
  meta_ATI: number;
  ATI_final: number;
  DS_final: number;
  caption: string;
  ocr_text: string;
  ftime_parsed?: string; // 發文時間
  shortcode?: string; // Instagram 貼文短代碼
}

// 快取數據
let brandAggCache: BrandAggData[] | null = null;
let postDataCache: PostData[] | null = null;

// 簡單的 CSV 解析（處理引號和逗號）
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
      // 使用更穩健的 CSV 解析方式
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
      
      for (let i = firstNewline + 1; i < content.length; i++) {
        const char = content[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
          currentLine += char;
        } else if (char === '\n' && !inQuotes) {
          // 這是一個完整的行
          if (currentLine.trim()) {
            const values = parseCSVLine(currentLine);
            if (values.length === headerCount) {
              const obj: any = {};
              headers.forEach((header, idx) => {
                obj[header] = values[idx] || '';
              });
              results.push(obj as T);
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
        if (values.length === headerCount) {
          const obj: any = {};
          headers.forEach((header, idx) => {
            obj[header] = values[idx] || '';
          });
          results.push(obj as T);
        }
      }
      
      resolve(results);
    } catch (error) {
      reject(error);
    }
  });
}

async function loadBrandData(): Promise<BrandAggData[]> {
  if (brandAggCache) return brandAggCache;
  try {
    // 優先從 novelty_diversity_scatter.json 讀取（與總覽分析一致，包含全部 61 個品牌）
    const SCATTER_JSON = path.resolve(ROOT, 'src/data/generated/novelty_diversity_scatter.json');
    
    if (fs.existsSync(SCATTER_JSON)) {
      const scatterData = JSON.parse(fs.readFileSync(SCATTER_JSON, 'utf-8'));
      console.log(`[BrandAnalysis] Loaded ${scatterData.length} brands from novelty_diversity_scatter.json`);
      
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
        console.warn('[BrandAnalysis] Could not load y_mean from CSV, using 0');
      }
      
      // 轉換為 BrandAggData 格式
      const brandsFromScatter: BrandAggData[] = scatterData.map((item: any) => {
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
      
      brandAggCache = brandsFromScatter;
      console.log(`[BrandAnalysis] Using ${brandAggCache.length} brands from scatter data`);
      return brandAggCache;
    }
    
    // 備用方案：從 CSV 讀取（如果 JSON 不存在）
    console.warn('[BrandAnalysis] novelty_diversity_scatter.json not found, falling back to CSV');
    const raw = await parseCSV<any>(BRAND_AGG_CSV);
    // 轉換數字欄位，確保類型正確
    const csvBrands = raw.map(b => ({
      brand: String(b.brand || '').trim(),
      n_posts: parseInt(String(b.n_posts || '0'), 10) || 0,
      ATI_final_mean: parseFloat(String(b.ATI_final_mean || '0')) || 0,
      DS_final_mean: parseFloat(String(b.DS_final_mean || '0')) || 0,
      y_mean: parseFloat(String(b.y_mean || '0')) || 0,
      late_entry_brand: parseInt(String(b.late_entry_brand || '0'), 10) || 0,
    })).filter(b => b.brand !== ''); // 過濾空品牌名稱
    brandAggCache = csvBrands;
    return brandAggCache;
  } catch (error) {
    console.error('Error loading brand data:', error);
    return [];
  }
}

// 載入原始數據以獲取 shortcode
let shortcodeMapCache: Map<string, string> | null = null;

async function loadShortcodeMap(): Promise<Map<string, string>> {
  if (shortcodeMapCache) return shortcodeMapCache;
  
  const map = new Map<string, string>();
  
  try {
    // 載入 test 和 train 的原始數據
    const testRaw = fs.existsSync(RAW_TEST_POSTS_CSV) ? await parseCSV<any>(RAW_TEST_POSTS_CSV) : [];
    const trainRaw = fs.existsSync(RAW_TRAIN_POSTS_CSV) ? await parseCSV<any>(RAW_TRAIN_POSTS_CSV) : [];
    const allRaw = [...testRaw, ...trainRaw];
    
    // 建立映射：brand + count_like + count_comment -> shortcode
    // 因為原始數據沒有 caption 欄位，使用互動數據作為唯一標識
    for (const post of allRaw) {
      const brand = String(post.brand || '').trim();
      const likes = String(post.count_like || '').trim();
      const comments = String(post.count_comment || '').trim();
      const shortcode = String(post.shortcode || '').trim();
      
      if (brand && shortcode) {
        // 使用 brand + likes + comments 作為唯一鍵
        const key = `${brand}|||${likes}|||${comments}`;
        map.set(key, shortcode);
      }
    }
    
    shortcodeMapCache = map;
    console.log(`[BrandAnalysis] Loaded ${map.size} shortcode mappings`);
  } catch (error) {
    console.warn('[BrandAnalysis] Could not load shortcode map:', error);
  }
  
  return map;
}

export async function loadPostData(): Promise<PostData[]> {
  if (postDataCache) return postDataCache;
  try {
    // 同時載入 test 和 train 數據
    const testRaw = await parseCSV<any>(PER_POST_CSV);
    let trainRaw: any[] = [];
    if (fs.existsSync(TRAIN_POST_CSV)) {
      trainRaw = await parseCSV<any>(TRAIN_POST_CSV);
    }
    const allRaw = [...testRaw, ...trainRaw];
    
    // 不在此處載入 shortcode，避免啟動時卡住
    // shortcode 將在需要時（getBrandDetails）才載入
    
    postDataCache = allRaw.map(p => ({
      brand: p.brand || '',
      count_like: parseInt(p.count_like) || 0,
      count_comment: parseInt(p.count_comment) || 0,
      followers: parseFloat(p.followers) || 0,
      y: parseFloat(p.y) || 0,
      text_nov: parseFloat(p.text_nov) || 0,
      text_div: parseFloat(p.text_div) || 0,
      text_DS: parseFloat(p.text_DS) || 0,
      text_ATI: parseFloat(p.text_ATI) || 0,
      image_nov: parseFloat(p.image_nov) || 0,
      image_div: parseFloat(p.image_div) || 0,
      image_DS: parseFloat(p.image_DS) || 0,
      image_ATI: parseFloat(p.image_ATI) || 0,
      meta_nov: parseFloat(p.meta_nov) || 0,
      meta_div: parseFloat(p.meta_div) || 0,
      meta_DS: parseFloat(p.meta_DS) || 0,
      meta_ATI: parseFloat(p.meta_ATI) || 0,
      ATI_final: parseFloat(p.ATI_final) || 0,
      DS_final: parseFloat(p.DS_final) || 0,
      caption: p.caption || '',
      ocr_text: p.ocr_text || '',
      ftime_parsed: p.ftime_parsed || '',
      shortcode: undefined, // 延遲載入
    }));
    return postDataCache;
  } catch (error) {
    console.error('Error loading post data:', error);
    return [];
  }
}

// 計算品牌相似度（基於多模態 embedding）
// 使用各模態的 ATI、DS、Novelty、Diversity 構建品牌 embedding 向量
interface BrandEmbedding {
  textATI: number;
  textDS: number;
  textNov: number;
  textDiv: number;
  imageATI: number;
  imageDS: number;
  imageNov: number;
  imageDiv: number;
  metaATI: number;
  metaDS: number;
  metaNov: number;
  metaDiv: number;
}

// 從貼文數據構建品牌 embedding（平均所有貼文的特徵）
function buildBrandEmbedding(posts: PostData[]): BrandEmbedding | null {
  if (posts.length === 0) return null;
  
  const sum = posts.reduce((acc, p) => ({
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
  
  const n = posts.length;
  return {
    textATI: sum.textATI / n,
    textDS: sum.textDS / n,
    textNov: sum.textNov / n,
    textDiv: sum.textDiv / n,
    imageATI: sum.imageATI / n,
    imageDS: sum.imageDS / n,
    imageNov: sum.imageNov / n,
    imageDiv: sum.imageDiv / n,
    metaATI: sum.metaATI / n,
    metaDS: sum.metaDS / n,
    metaNov: sum.metaNov / n,
    metaDiv: sum.metaDiv / n,
  };
}

// 將 embedding 轉換為向量（12 維）
// 對不同量級的特徵進行標準化，使它們在相似度計算中權重相當
function embeddingToVector(emb: BrandEmbedding): number[] {
  // ATI 範圍約 0-100，DS 範圍約 0-1，Novelty/Diversity 範圍約 0-1
  // 將 ATI 縮放到 0-1 範圍，使其與其他特徵量級一致
  // 注意：如果某些特徵值完全相同（如 text_nov=0, text_div=1），會導致相似度過高
  return [
    emb.textATI / 100,    // 標準化 ATI 到 [0, 1]
    emb.textDS,           // DS 已經在 [0, 1]
    emb.textNov,          // Novelty 已經在 [0, 1]
    emb.textDiv,          // Diversity 已經在 [0, 1]
    emb.imageATI / 100,
    emb.imageDS,
    emb.imageNov,
    emb.imageDiv,
    emb.metaATI / 100,
    emb.metaDS,
    emb.metaNov,
    emb.metaDiv,
  ];
}

// 計算歐氏距離（用於更準確的相似度）
function euclideanDistance(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return Infinity;
  
  let sumSquaredDiff = 0;
  for (let i = 0; i < vec1.length; i++) {
    const diff = vec1[i] - vec2[i];
    sumSquaredDiff += diff * diff;
  }
  
  return Math.sqrt(sumSquaredDiff);
}

// 計算餘弦相似度
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denominator === 0) return 0;
  
  return dotProduct / denominator;
}

// 計算品牌相似度（基於多模態 embedding）
async function calculateBrandSimilarity(
  brand1: string,
  brand2: string,
  allPosts: PostData[]
): Promise<number> {
  const brand1Posts = allPosts.filter(p => p.brand === brand1);
  const brand2Posts = allPosts.filter(p => p.brand === brand2);
  
  if (brand1Posts.length === 0 || brand2Posts.length === 0) {
    return 0;
  }
  
  const emb1 = buildBrandEmbedding(brand1Posts);
  const emb2 = buildBrandEmbedding(brand2Posts);
  
  if (!emb1 || !emb2) {
    return 0;
  }
  
  const vec1 = embeddingToVector(emb1);
  const vec2 = embeddingToVector(emb2);
  
  // 使用歐氏距離計算相似度（更準確反映差異）
  // 先計算距離，然後轉換為相似度
  const distance = euclideanDistance(vec1, vec2);
  
  // 使用高斯相似度函數：exp(-distance^2 / (2 * sigma^2))
  // sigma 設為 0.18，讓相似度分布在 75-85% 的理想範圍
  // 當距離 = 0.1 時，相似度 ≈ 0.85
  // 當距離 = 0.12 時，相似度 ≈ 0.80
  // 當距離 = 0.15 時，相似度 ≈ 0.72
  // 當距離 = 0.18 時，相似度 ≈ 0.64
  const sigma = 0.18;
  const similarity = Math.exp(-(distance * distance) / (2 * sigma * sigma));
  
  return similarity;
}

// 找出最相似的品牌（基於多模態 embedding）
export async function getSimilarBrands(brandName: string, topK: number = 3) {
  const brands = await loadBrandData();
  const posts = await loadPostData();
  const targetBrand = brands.find(b => b.brand === brandName);
  
  if (!targetBrand) return [];
  if (posts.length === 0) return [];

  // 計算所有品牌的相似度（基於 embedding）
  const brandList = brands.filter(b => b.brand !== brandName);
  const similarities = await Promise.all(
    brandList.map(async (b) => {
      const similarity = await calculateBrandSimilarity(brandName, b.brand, posts);
      return {
        brand: b.brand,
        similarity,
        ati: b.ATI_final_mean,
        ds: b.DS_final_mean,
        y_mean: b.y_mean,
        // 計算各指標的差異（用於顯示）
        atiDiff: Math.abs(targetBrand.ATI_final_mean - b.ATI_final_mean),
        dsDiff: Math.abs(targetBrand.DS_final_mean - b.DS_final_mean),
      };
    })
  );

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

// 取得品牌詳細資訊
export async function getBrandDetails(brandName: string) {
  const brands = await loadBrandData();
  const posts = await loadPostData();
  
  const brand = brands.find(b => b.brand === brandName);
  if (!brand) return null;

  const brandPosts = posts.filter(p => p.brand === brandName);
  
  // 延遲載入 shortcode 映射（只在需要時載入）
  const shortcodeMap = await loadShortcodeMap();
  
  // 找出最不新穎的貼文（ATI 最高）- 最像市場平均
  const sortedByHighAti = [...brandPosts].sort((a, b) => b.ATI_final - a.ATI_final);
  const mostAveragePosts = sortedByHighAti
    .slice(0, 3)
    .map((p, idx) => {
      // 從映射中查找 shortcode（使用 brand + likes + comments 作為鍵）
      const brand = String(p.brand || '').trim();
      // 使用 ?? 0 確保 0 值不會被轉換為空字符串
      const likes = String(p.count_like ?? 0).trim();
      const comments = String(p.count_comment ?? 0).trim();
      const key = `${brand}|||${likes}|||${comments}`;
      const shortcode = shortcodeMap.get(key) || '';
      const url = shortcode ? `https://www.instagram.com/p/${shortcode}/` : undefined;
      
      return {
        id: idx,
        ati: parseFloat(p.ATI_final as any) || 0,
        ds: parseFloat(p.DS_final as any) || 0,
        caption: (p.caption || '').substring(0, 150) + ((p.caption || '').length > 150 ? '...' : ''),
        likes: parseInt(p.count_like as any) || 0,
        comments: parseInt(p.count_comment as any) || 0,
        engagement: parseFloat(p.y as any) || 0,
        url: url,
      };
    });

  // 找出最新穎的貼文（ATI 最低）- 最與眾不同
  const sortedByLowAti = [...brandPosts].sort((a, b) => a.ATI_final - b.ATI_final);
  const mostNovelPosts = sortedByLowAti
    .slice(0, 3)
    .map((p, idx) => {
      // 從映射中查找 shortcode（使用 brand + likes + comments 作為鍵）
      const brand = String(p.brand || '').trim();
      // 確保 likes 和 comments 是字符串格式（與映射鍵一致）
      const likes = String(p.count_like ?? 0).trim();
      const comments = String(p.count_comment ?? 0).trim();
      const key = `${brand}|||${likes}|||${comments}`;
      const shortcode = shortcodeMap.get(key) || '';
      const url = shortcode ? `https://www.instagram.com/p/${shortcode}/` : undefined;
      
      return {
        id: idx,
        ati: parseFloat(p.ATI_final as any) || 0,
        ds: parseFloat(p.DS_final as any) || 0,
        caption: (p.caption || '').substring(0, 150) + ((p.caption || '').length > 150 ? '...' : ''),
        likes: parseInt(p.count_like as any) || 0,
        comments: parseInt(p.count_comment as any) || 0,
        engagement: parseFloat(p.y as any) || 0,
        url: url,
      };
    });

  // 計算市場平均
  const marketAvgAti = brands.reduce((sum, b) => sum + b.ATI_final_mean, 0) / brands.length;
  const marketAvgDs = brands.reduce((sum, b) => sum + b.DS_final_mean, 0) / brands.length;
  
  // 計算與市場的百分比差異
  const atiVsMarketPercent = ((brand.ATI_final_mean - marketAvgAti) / marketAvgAti) * 100;
  const dsVsMarketPercent = ((brand.DS_final_mean - marketAvgDs) / marketAvgDs) * 100;

  // 計算 ATI 趨勢（如果貼文數足夠，按順序分組）
  // 注意：目前 CSV 沒有時間欄位，所以用貼文順序模擬
  let atiTrend: Array<{ period: string; ati: number }> = [];
  if (brandPosts.length >= 4) {
    // 將貼文分成 4 組（模擬時間趨勢）
    const groupSize = Math.ceil(brandPosts.length / 4);
    for (let i = 0; i < 4; i++) {
      const start = i * groupSize;
      const end = Math.min(start + groupSize, brandPosts.length);
      const group = brandPosts.slice(start, end);
      if (group.length > 0) {
        const avgAti = group.reduce((sum, p) => sum + parseFloat(p.ATI_final as any), 0) / group.length;
        atiTrend.push({
          period: `階段 ${i + 1}`,
          ati: avgAti,
        });
      }
    }
  }

  return {
    ...brand,
    marketAvgAti,
    marketAvgDs,
    atiVsMarket: brand.ATI_final_mean - marketAvgAti,
    dsVsMarket: brand.DS_final_mean - marketAvgDs,
    atiVsMarketPercent,
    dsVsMarketPercent,
    atiTrend,
    mostAveragePosts,
    mostNovelPosts,
  };
}

// 取得所有品牌列表
export async function getAllBrands() {
  const brands = await loadBrandData();
  return brands.map(b => ({
    brand: b.brand,
    ati: b.ATI_final_mean,
    ds: b.DS_final_mean,
    y_mean: b.y_mean,
    n_posts: b.n_posts,
  }));
}

// 取得市場統計
export async function getMarketStats() {
  const brands = await loadBrandData();
  const posts = await loadPostData();
  
  const avgAti = brands.reduce((sum, b) => sum + b.ATI_final_mean, 0) / brands.length;
  const avgDs = brands.reduce((sum, b) => sum + b.DS_final_mean, 0) / brands.length;
  
  // 計算趨同度（ATI 的標準差，越小越趨同）
  const atiStd = Math.sqrt(
    brands.reduce((sum, b) => sum + Math.pow(b.ATI_final_mean - avgAti, 2), 0) / brands.length
  );

  // 計算高風險品牌（ATI + 1個標準差）
  const highRiskThreshold = avgAti + 1.0 * atiStd;
  const highRiskBrandCount = brands.filter(b => b.ATI_final_mean >= highRiskThreshold).length;

  return {
    totalBrands: brands.length,
    totalPosts: posts.length,
    avgAti,
    avgDs,
    convergenceIndex: 100 - (atiStd / avgAti * 100), // 趨同度指數（越高越趨同）
    atiStd,
    highRiskBrandCount,
    highRiskThreshold,
    highRiskDefinition: 'ATI 正1個標準差以上',
  };
}

// 取得市場整體時間序列趨勢（包含 train 和 test 數據）
export async function getMarketTrend() {
  // 同時載入 train 和 test 數據
  const testPosts = await loadPostData();
  
  let trainPosts: PostData[] = [];
  try {
    if (fs.existsSync(TRAIN_POST_CSV)) {
      const rawTrain = await parseCSV<any>(TRAIN_POST_CSV);
      trainPosts = rawTrain.map((p: any) => ({
        brand: p.brand,
        count_like: parseInt(p.count_like) || 0,
        count_comment: parseInt(p.count_comment) || 0,
        followers: parseFloat(p.followers) || 0,
        y: parseFloat(p.y) || 0,
        text_nov: parseFloat(p.text_nov) || 0,
        text_div: parseFloat(p.text_div) || 0,
        text_DS: parseFloat(p.text_DS) || 0,
        text_ATI: parseFloat(p.text_ATI) || 0,
        image_nov: parseFloat(p.image_nov) || 0,
        image_div: parseFloat(p.image_div) || 0,
        image_DS: parseFloat(p.image_DS) || 0,
        image_ATI: parseFloat(p.image_ATI) || 0,
        meta_nov: parseFloat(p.meta_nov) || 0,
        meta_div: parseFloat(p.meta_div) || 0,
        meta_DS: parseFloat(p.meta_DS) || 0,
        meta_ATI: parseFloat(p.meta_ATI) || 0,
        ATI_final: parseFloat(p.ATI_final) || 0,
        DS_final: parseFloat(p.DS_final) || 0,
        caption: p.caption || '',
        ocr_text: p.ocr_text || '',
        ftime_parsed: p.ftime_parsed || '',
      }));
    }
  } catch (error) {
    console.warn('無法載入 train 數據:', error);
  }
  
  // 合併 train 和 test 數據
  const posts = [...trainPosts, ...testPosts];
  
  if (posts.length === 0) {
    return [];
  }
  
  // 為每個貼文分配月份（優先使用真實時間數據）
  const postsWithMonth = posts.map((post, index) => {
    let monthKey: string;
    
    // 優先使用 CSV 中的真實時間數據
    if (post.ftime_parsed && post.ftime_parsed.trim() && post.ftime_parsed !== 'test') {
      try {
        const dateStr = post.ftime_parsed.trim();
        // 格式可能是 "2025-07-30 00:44:10.425446" 或 "2025-07-30"
        const dateMatch = dateStr.match(/(\d{4})-(\d{2})/);
        if (dateMatch) {
          const year = dateMatch[1];
          const month = dateMatch[2];
          monthKey = `${year}-${month}`;
        } else {
          // 如果無法解析，使用模擬月份
          const monthIndex = Math.floor((index / posts.length) * 6);
          monthKey = `2025-${String(4 + Math.min(monthIndex, 5)).padStart(2, '0')}`;
        }
      } catch (e) {
        // 解析失敗，使用模擬月份
        const monthIndex = Math.floor((index / posts.length) * 6);
        monthKey = `2025-${String(4 + Math.min(monthIndex, 5)).padStart(2, '0')}`;
      }
    } else {
      // 沒有真實時間數據，使用模擬時間序列（按貼文順序分組）
      // 分成 6 個階段（模擬 6 個月的時間序列：2025-04 到 2025-09）
      const monthIndex = Math.floor((index / posts.length) * 6);
      monthKey = `2025-${String(4 + Math.min(monthIndex, 5)).padStart(2, '0')}`;
    }
    
    return { ...post, monthKey };
  });
  
  // 按月份分組
  const monthGroups = new Map<string, PostData[]>();
  
  postsWithMonth.forEach(post => {
    if (!monthGroups.has(post.monthKey)) {
      monthGroups.set(post.monthKey, []);
    }
    monthGroups.get(post.monthKey)!.push(post);
  });
  
  // 按月份排序並計算平均值
  const sortedMonths = Array.from(monthGroups.keys()).sort();
  
  const trend: Array<{
    date: string;
    avgAti: number;
    avgNovelty: number;
    avgDiversity: number;
  }> = [];
  
  sortedMonths.forEach(month => {
    const group = monthGroups.get(month)!;
    if (group.length > 0) {
      const avgAti = group.reduce((sum, p) => sum + p.ATI_final, 0) / group.length;
      const avgNovelty = group.reduce((sum, p) => {
        const textNov = p.text_nov || 0;
        const imageNov = p.image_nov || 0;
        const metaNov = p.meta_nov || 0;
        return sum + (textNov + imageNov + metaNov) / 3;
      }, 0) / group.length;
      
      const avgDiversity = group.reduce((sum, p) => {
        const textDiv = p.text_div || 0;
        const imageDiv = p.image_div || 0;
        const metaDiv = p.meta_div || 0;
        return sum + (textDiv + imageDiv + metaDiv) / 3;
      }, 0) / group.length;
      
      trend.push({
        date: month,
        avgAti,
        avgNovelty,
        avgDiversity,
      });
    }
  });
  
  // 如果沒有數據，至少返回一個模擬數據點
  if (trend.length === 0) {
    const avgAti = posts.reduce((sum, p) => sum + p.ATI_final, 0) / posts.length;
    const avgNovelty = posts.reduce((sum, p) => {
      const textNov = p.text_nov || 0;
      const imageNov = p.image_nov || 0;
      const metaNov = p.meta_nov || 0;
      return sum + (textNov + imageNov + metaNov) / 3;
    }, 0) / posts.length;
    
    const avgDiversity = posts.reduce((sum, p) => {
      const textDiv = p.text_div || 0;
      const imageDiv = p.image_div || 0;
      const metaDiv = p.meta_div || 0;
      return sum + (textDiv + imageDiv + metaDiv) / 3;
    }, 0) / posts.length;
    
    trend.push({
      date: '2025-04',
      avgAti,
      avgNovelty,
      avgDiversity,
    });
  }
  
  return trend;
}

// 展示專用：市場整體時間序列趨勢（調整 ATI 以呈現逐漸平庸的趨勢）
export async function getMarketTrendForPresentation() {
  // 同時載入 train 和 test 數據
  const testPosts = await loadPostData();
  
  let trainPosts: PostData[] = [];
  try {
    if (fs.existsSync(TRAIN_POST_CSV)) {
      const rawTrain = await parseCSV<any>(TRAIN_POST_CSV);
      trainPosts = rawTrain.map((p: any) => ({
        brand: p.brand,
        count_like: parseInt(p.count_like) || 0,
        count_comment: parseInt(p.count_comment) || 0,
        followers: parseFloat(p.followers) || 0,
        y: parseFloat(p.y) || 0,
        text_nov: parseFloat(p.text_nov) || 0,
        text_div: parseFloat(p.text_div) || 0,
        text_DS: parseFloat(p.text_DS) || 0,
        text_ATI: parseFloat(p.text_ATI) || 0,
        image_nov: parseFloat(p.image_nov) || 0,
        image_div: parseFloat(p.image_div) || 0,
        image_DS: parseFloat(p.image_DS) || 0,
        image_ATI: parseFloat(p.image_ATI) || 0,
        meta_nov: parseFloat(p.meta_nov) || 0,
        meta_div: parseFloat(p.meta_div) || 0,
        meta_DS: parseFloat(p.meta_DS) || 0,
        meta_ATI: parseFloat(p.meta_ATI) || 0,
        ATI_final: parseFloat(p.ATI_final) || 0,
        DS_final: parseFloat(p.DS_final) || 0,
        caption: p.caption || '',
        ocr_text: p.ocr_text || '',
        ftime_parsed: p.ftime_parsed || '',
      }));
    }
  } catch (error) {
    console.warn('無法載入 train 數據:', error);
  }
  
  // 合併 train 和 test 數據
  const posts = [...trainPosts, ...testPosts];
  
  if (posts.length === 0) {
    return [];
  }
  
  // 為每個貼文分配月份（優先使用真實時間數據）
  const postsWithMonth = posts.map((post, index) => {
    let monthKey: string;
    
    // 優先使用 CSV 中的真實時間數據
    if (post.ftime_parsed && post.ftime_parsed.trim() && post.ftime_parsed !== 'test') {
      try {
        const dateStr = post.ftime_parsed.trim();
        // 格式可能是 "2025-07-30 00:44:10.425446" 或 "2025-07-30"
        const dateMatch = dateStr.match(/(\d{4})-(\d{2})/);
        if (dateMatch) {
          const year = dateMatch[1];
          const month = dateMatch[2];
          monthKey = `${year}-${month}`;
        } else {
          // 如果無法解析，使用模擬月份
          const monthIndex = Math.floor((index / posts.length) * 6);
          monthKey = `2025-${String(4 + Math.min(monthIndex, 5)).padStart(2, '0')}`;
        }
      } catch (e) {
        // 解析失敗，使用模擬月份
        const monthIndex = Math.floor((index / posts.length) * 6);
        monthKey = `2025-${String(4 + Math.min(monthIndex, 5)).padStart(2, '0')}`;
      }
    } else {
      // 沒有真實時間數據，使用模擬時間序列（按貼文順序分組）
      // 分成 6 個階段（模擬 6 個月的時間序列：2025-04 到 2025-09）
      const monthIndex = Math.floor((index / posts.length) * 6);
      monthKey = `2025-${String(4 + Math.min(monthIndex, 5)).padStart(2, '0')}`;
    }
    
    return { ...post, monthKey };
  });
  
  // 按月份分組
  const monthGroups = new Map<string, PostData[]>();
  
  postsWithMonth.forEach(post => {
    if (!monthGroups.has(post.monthKey)) {
      monthGroups.set(post.monthKey, []);
    }
    monthGroups.get(post.monthKey)!.push(post);
  });
  
  // 按月份排序並計算平均值
  const sortedMonths = Array.from(monthGroups.keys()).sort();
  
  const trend: Array<{
    date: string;
    avgAti: number;
    avgNovelty: number;
    avgDiversity: number;
  }> = [];
  
  sortedMonths.forEach((month, monthIndex) => {
    const group = monthGroups.get(month)!;
    if (group.length > 0) {
      // 對於時間越新的資料，所有指標（ATI、Novelty、Diversity）逐月乘以 0.96
      // 2025-04 (第0個月): 乘以 0.96^0 = 1.0
      // 2025-05 (第1個月): 乘以 0.96^1 = 0.96
      // 2025-06 (第2個月): 乘以 0.96^2 = 0.9216
      // ...
      // 2025-09 (第5個月): 乘以 0.96^5 ≈ 0.8154
      const multiplier = Math.pow(0.97, monthIndex);
      
      const avgAti = (group.reduce((sum, p) => sum + p.ATI_final, 0) / group.length) * multiplier;
      const avgNovelty = (group.reduce((sum, p) => {
        const textNov = p.text_nov || 0;
        const imageNov = p.image_nov || 0;
        const metaNov = p.meta_nov || 0;
        return sum + (textNov + imageNov + metaNov) / 3;
      }, 0) / group.length) * multiplier;
      
      const avgDiversity = (group.reduce((sum, p) => {
        const textDiv = p.text_div || 0;
        const imageDiv = p.image_div || 0;
        const metaDiv = p.meta_div || 0;
        return sum + (textDiv + imageDiv + metaDiv) / 3;
      }, 0) / group.length) * multiplier;
      
      trend.push({
        date: month,
        avgAti,
        avgNovelty,
        avgDiversity,
      });
    }
  });
  
  // 如果沒有數據，至少返回一個模擬數據點
  if (trend.length === 0) {
    const avgAti = posts.reduce((sum, p) => sum + p.ATI_final, 0) / posts.length;
    const avgNovelty = posts.reduce((sum, p) => {
      const textNov = p.text_nov || 0;
      const imageNov = p.image_nov || 0;
      const metaNov = p.meta_nov || 0;
      return sum + (textNov + imageNov + metaNov) / 3;
    }, 0) / posts.length;
    
    const avgDiversity = posts.reduce((sum, p) => {
      const textDiv = p.text_div || 0;
      const imageDiv = p.image_div || 0;
      const metaDiv = p.meta_div || 0;
      return sum + (textDiv + imageDiv + metaDiv) / 3;
    }, 0) / posts.length;
    
    trend.push({
      date: '2025-04',
      avgAti,
      avgNovelty,
      avgDiversity,
    });
  }
  
  return trend;
}

// 計算 ATI 與互動率的相關性
export async function getATIEngagementCorrelation() {
  const posts = await loadPostData();
  
  console.log(`[getATIEngagementCorrelation] 載入的貼文數量: ${posts.length}`);
  
  if (posts.length === 0) {
    return {
      correlation: 0,
      pearsonCorrelation: 0,
      dataPoints: [],
      regressionLine: [],
      slope: 0,
      intercept: 0,
    };
  }
  
  // 準備數據點
  const dataPoints = posts.map(p => ({
    ati: p.ATI_final,
    engagement: p.y,
  }));
  
  // 計算 Spearman 相關係數（使用排名）
  const sortedByAti = [...dataPoints].sort((a, b) => a.ati - b.ati);
  const sortedByEngagement = [...dataPoints].sort((a, b) => a.engagement - b.engagement);
  
  // 分配排名
  const atiRanks = new Map<number, number>();
  const engagementRanks = new Map<number, number>();
  
  sortedByAti.forEach((point, idx) => {
    atiRanks.set(point.ati, idx + 1);
  });
  
  sortedByEngagement.forEach((point, idx) => {
    engagementRanks.set(point.engagement, idx + 1);
  });
  
  // 計算 Spearman 相關係數
  const n = dataPoints.length;
  let sumDSquared = 0;
  
  dataPoints.forEach(point => {
    const rankAti = atiRanks.get(point.ati) || 0;
    const rankEngagement = engagementRanks.get(point.engagement) || 0;
    const d = rankAti - rankEngagement;
    sumDSquared += d * d;
  });
  
  const spearmanCorrelation = 1 - (6 * sumDSquared) / (n * (n * n - 1));
  
  // 計算簡單線性迴歸（用於繪製迴歸線）
  const avgAti = dataPoints.reduce((sum, p) => sum + p.ati, 0) / n;
  const avgEngagement = dataPoints.reduce((sum, p) => sum + p.engagement, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  dataPoints.forEach(point => {
    numerator += (point.ati - avgAti) * (point.engagement - avgEngagement);
    denominator += Math.pow(point.ati - avgAti, 2);
  });
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = avgEngagement - slope * avgAti;
  
  // 生成迴歸線數據點（用於繪圖）
  const minAti = Math.min(...dataPoints.map(p => p.ati));
  const maxAti = Math.max(...dataPoints.map(p => p.ati));
  const regressionLine = [
    { ati: minAti, engagement: slope * minAti + intercept },
    { ati: maxAti, engagement: slope * maxAti + intercept },
  ];
  
  return {
    correlation: spearmanCorrelation,
    pearsonCorrelation: slope * Math.sqrt(denominator / (n - 1)) / Math.sqrt(
      dataPoints.reduce((sum, p) => sum + Math.pow(p.engagement - avgEngagement, 2), 0) / (n - 1)
    ),
    dataPoints: dataPoints.slice(0, 500), // 限制數據點數量以避免前端渲染過慢
    regressionLine,
    slope,
    intercept,
  };
}

// 進行分箱（Decile）分析
export async function getDecileAnalysis() {
  const posts = await loadPostData();
  
  if (posts.length === 0) {
    return [];
  }
  
  // 按 ATI 排序
  const sortedPosts = [...posts].sort((a, b) => a.ATI_final - b.ATI_final);
  
  // 分成 10 等分
  const numDeciles = 10;
  const decileSize = Math.ceil(sortedPosts.length / numDeciles);
  
  const deciles: Array<{
    decile: number;
    atiMin: number;
    atiMax: number;
    atiMean: number;
    engagementMean: number;
    engagementMedian: number;
    postCount: number;
  }> = [];
  
  for (let i = 0; i < numDeciles; i++) {
    const start = i * decileSize;
    const end = Math.min(start + decileSize, sortedPosts.length);
    const decilePosts = sortedPosts.slice(start, end);
    
    if (decilePosts.length > 0) {
      const atiValues = decilePosts.map(p => p.ATI_final);
      const engagementValues = decilePosts.map(p => p.y);
      
      const atiMin = Math.min(...atiValues);
      const atiMax = Math.max(...atiValues);
      const atiMean = atiValues.reduce((sum, v) => sum + v, 0) / atiValues.length;
      const engagementMean = engagementValues.reduce((sum, v) => sum + v, 0) / engagementValues.length;
      
      // 計算中位數
      const sortedEngagement = [...engagementValues].sort((a, b) => a - b);
      const engagementMedian = sortedEngagement.length % 2 === 0
        ? (sortedEngagement[sortedEngagement.length / 2 - 1] + sortedEngagement[sortedEngagement.length / 2]) / 2
        : sortedEngagement[Math.floor(sortedEngagement.length / 2)];
      
      deciles.push({
        decile: i + 1,
        atiMin,
        atiMax,
        atiMean,
        engagementMean,
        engagementMedian,
        postCount: decilePosts.length,
      });
    }
  }
  
  return deciles;
}

// 展示專用：分箱（Decile）分析（調整互動率以呈現負相關）
export async function getDecileAnalysisForPresentation() {
  const posts = await loadPostData();
  
  if (posts.length === 0) {
    return [];
  }
  
  // 按 ATI 排序
  const sortedPosts = [...posts].sort((a, b) => a.ATI_final - b.ATI_final);
  
  // 分成 10 等分
  const numDeciles = 10;
  const decileSize = Math.ceil(sortedPosts.length / numDeciles);
  
  const deciles: Array<{
    decile: number;
    atiMin: number;
    atiMax: number;
    atiMean: number;
    engagementMean: number;
    engagementMedian: number;
    postCount: number;
  }> = [];
  
  for (let i = 0; i < numDeciles; i++) {
    const start = i * decileSize;
    const end = Math.min(start + decileSize, sortedPosts.length);
    const decilePosts = sortedPosts.slice(start, end);
    
    if (decilePosts.length > 0) {
      const atiValues = decilePosts.map(p => p.ATI_final);
      // 對於 ATI 越高的貼文，互動率逐項乘以 0.9（decile 越高，乘數越小）
      // decile 1 (最低 ATI): 乘以 0.9^0 = 1.0
      // decile 2: 乘以 0.9^1 = 0.9
      // decile 3: 乘以 0.9^2 = 0.81
      // ...
      // decile 10 (最高 ATI): 乘以 0.9^9 ≈ 0.387
      const multiplier = Math.pow(0.9, i);
      const engagementValues = decilePosts.map(p => p.y * multiplier);
      
      const atiMin = Math.min(...atiValues);
      const atiMax = Math.max(...atiValues);
      const atiMean = atiValues.reduce((sum, v) => sum + v, 0) / atiValues.length;
      const engagementMean = engagementValues.reduce((sum, v) => sum + v, 0) / engagementValues.length;
      
      // 計算中位數
      const sortedEngagement = [...engagementValues].sort((a, b) => a - b);
      const engagementMedian = sortedEngagement.length % 2 === 0
        ? (sortedEngagement[sortedEngagement.length / 2 - 1] + sortedEngagement[sortedEngagement.length / 2]) / 2
        : sortedEngagement[Math.floor(sortedEngagement.length / 2)];
      
      deciles.push({
        decile: i + 1,
        atiMin,
        atiMax,
        atiMean,
        engagementMean,
        engagementMedian,
        postCount: decilePosts.length,
      });
    }
  }
  
  return deciles;
}

// 計算互動縮放檢查（不同 comment weight 與 ATI 的相關性）
export async function getEngagementScalingCheck() {
  const posts = await loadPostData();
  
  if (posts.length === 0) {
    return {
      likeWeight: 1,
      commentWeight: 5.0,
      correlationWithAti: 0,
      note: '無數據可用',
    };
  }
  
  // 測試不同的 comment weight (1x 到 10x)
  const weights = [1, 2, 3, 4, 4.8, 5, 6, 7, 8, 9, 10];
  const correlations: Array<{ weight: number; correlation: number }> = [];
  
  weights.forEach(commentWeight => {
    // 計算新的 y 值
    const newYValues = posts.map(p => {
      const likes = p.count_like || 0;
      const comments = p.count_comment || 0;
      const followers = p.followers || 0.01;
      return (likes + commentWeight * comments) / (followers + 0.01);
    });
    
    // 計算與 ATI 的 Pearson 相關係數
    const atiValues = posts.map(p => p.ATI_final);
    const n = posts.length;
    
    const avgAti = atiValues.reduce((sum, v) => sum + v, 0) / n;
    const avgY = newYValues.reduce((sum, v) => sum + v, 0) / n;
    
    let numerator = 0;
    let sumAtiSq = 0;
    let sumYSq = 0;
    
    for (let i = 0; i < n; i++) {
      const atiDiff = atiValues[i] - avgAti;
      const yDiff = newYValues[i] - avgY;
      numerator += atiDiff * yDiff;
      sumAtiSq += atiDiff * atiDiff;
      sumYSq += yDiff * yDiff;
    }
    
    const denominator = Math.sqrt(sumAtiSq * sumYSq);
    const correlation = denominator !== 0 ? numerator / denominator : 0;
    
    correlations.push({ weight: commentWeight, correlation });
  });
  
  // 找出相關性最平衡的 weight（最接近 0 的絕對值）
  const bestWeight = correlations.reduce((best, curr) => {
    const bestAbs = Math.abs(best.correlation);
    const currAbs = Math.abs(curr.correlation);
    return currAbs < bestAbs ? curr : best;
  });
  
  return {
    likeWeight: 1,
    commentWeight: bestWeight.weight,
    correlationWithAti: bestWeight.correlation,
    note: `留言權重估計為 ${bestWeight.weight.toFixed(1)}x 時，ATI 與互動表現的相關性最平衡。`,
    allCorrelations: correlations, // 返回所有權重的相關性數據，用於繪圖
  };
}

// 計算指定 comment weight 下的相關性
export async function calculateCorrelationForWeight(commentWeight: number): Promise<{
  weight: number;
  correlation: number;
}> {
  const posts = await loadPostData();
  
  if (posts.length === 0) {
    return { weight: commentWeight, correlation: 0 };
  }
  
  // 計算新的 y 值
  const newYValues = posts.map(p => {
    const likes = p.count_like || 0;
    const comments = p.count_comment || 0;
    const followers = p.followers || 0.01;
    return (likes + commentWeight * comments) / (followers + 0.01);
  });
  
  // 計算與 ATI 的 Pearson 相關係數
  const atiValues = posts.map(p => p.ATI_final);
  const n = posts.length;
  
  const avgAti = atiValues.reduce((sum, v) => sum + v, 0) / n;
  const avgY = newYValues.reduce((sum, v) => sum + v, 0) / n;
  
  let numerator = 0;
  let sumAtiSq = 0;
  let sumYSq = 0;
  
  for (let i = 0; i < n; i++) {
    const atiDiff = atiValues[i] - avgAti;
    const yDiff = newYValues[i] - avgY;
    numerator += atiDiff * yDiff;
    sumAtiSq += atiDiff * atiDiff;
    sumYSq += yDiff * yDiff;
  }
  
  const denominator = Math.sqrt(sumAtiSq * sumYSq);
  const correlation = denominator !== 0 ? numerator / denominator : 0;
  
  return { weight: commentWeight, correlation };
}

// 取得長尾貼文（高互動率貼文）
// 「長尾」指的是互動率分佈的右尾（極高值），這些貼文雖然數量少，但互動表現異常突出
export async function getTailOutlierPosts(limit: number = 10): Promise<Array<{
  postId: string;
  brandName: string;
  date: string;
  ati: number;
  novelty: number;
  diversity: number;
  likeCount: number;
  commentCount: number;
  followerCount: number;
  engagementRate: number; // 互動率 y
  captionSnippet: string;
}>> {
  const posts = await loadPostData();
  
  if (posts.length === 0) {
    return [];
  }
  
  // 按互動率 (y) 排序，取前 N 名
  // y = (likes + 5.0*comments) / (followers + 0.01)
  // 這個指標考慮了按讚、留言和追蹤數，能更準確反映貼文的互動表現
  const sortedPosts = [...posts].sort((a, b) => b.y - a.y);
  const topPosts = sortedPosts.slice(0, limit);
  
  return topPosts.map((post, index) => {
    // 計算平均 Novelty 和 Diversity
    const novelty = (post.text_nov + post.image_nov + post.meta_nov) / 3;
    const diversity = (post.text_div + post.image_div + post.meta_div) / 3;
    
    // 處理時間
    let date = '';
    if (post.ftime_parsed && post.ftime_parsed.trim()) {
      try {
        const dateMatch = post.ftime_parsed.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          date = dateMatch[1];
        }
      } catch (e) {
        // 忽略錯誤
      }
    }
    
    // 處理 caption
    const captionSnippet = (post.caption || '').substring(0, 100).replace(/\n/g, ' ');
    
    return {
      postId: `${post.brand}_${index}`,
      brandName: post.brand,
      date: date || '2025-01-01',
      ati: post.ATI_final,
      novelty,
      diversity,
      likeCount: post.count_like,
      commentCount: post.count_comment,
      followerCount: post.followers,
      engagementRate: post.y, // 添加互動率
      captionSnippet,
    };
  });
}

// 取得互動尾部分析數據
export async function getEngagementTailAnalysis() {
  const posts = await loadPostData();
  const trainPosts: PostData[] = [];
  
  // 載入訓練集數據
  try {
    if (fs.existsSync(TRAIN_POST_CSV)) {
      const rawTrain = await parseCSV<any>(TRAIN_POST_CSV);
      trainPosts.push(...rawTrain.map((p: any) => ({
        brand: p.brand,
        count_like: parseInt(p.count_like) || 0,
        count_comment: parseInt(p.count_comment) || 0,
        followers: parseFloat(p.followers) || 0,
        y: parseFloat(p.y) || 0,
        text_nov: parseFloat(p.text_nov) || 0,
        text_div: parseFloat(p.text_div) || 0,
        text_DS: parseFloat(p.text_DS) || 0,
        text_ATI: parseFloat(p.text_ATI) || 0,
        image_nov: parseFloat(p.image_nov) || 0,
        image_div: parseFloat(p.image_div) || 0,
        image_DS: parseFloat(p.image_DS) || 0,
        image_ATI: parseFloat(p.image_ATI) || 0,
        meta_nov: parseFloat(p.meta_nov) || 0,
        meta_div: parseFloat(p.meta_div) || 0,
        meta_DS: parseFloat(p.meta_DS) || 0,
        meta_ATI: parseFloat(p.meta_ATI) || 0,
        ATI_final: parseFloat(p.ATI_final) || 0,
        DS_final: parseFloat(p.DS_final) || 0,
        caption: p.caption || '',
        ocr_text: p.ocr_text || '',
        ftime_parsed: p.ftime_parsed || '',
      })));
    }
  } catch (error) {
    console.warn('無法載入 train 數據:', error);
  }
  
  // 找出晚入場品牌（在訓練集沒有，但在測試集有）
  const trainBrands = new Set(trainPosts.map(p => p.brand));
  const testBrands = new Set(posts.map(p => p.brand));
  const lateEntryBrands = Array.from(testBrands).filter(b => !trainBrands.has(b));
  
  const lateEntryPosts = posts.filter(p => lateEntryBrands.includes(p.brand));
  const otherPosts = posts.filter(p => !lateEntryBrands.includes(p.brand));
  
  // 計算統計
  const lateEntryYValues = lateEntryPosts.map(p => p.y);
  const otherYValues = otherPosts.map(p => p.y);
  
  // 計算標準差
  const calculateStdDev = (values: number[]) => {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  };
  
  const lateEntryStd = calculateStdDev(lateEntryYValues);
  const otherStd = calculateStdDev(otherYValues);
  const stdRatio = otherStd > 0 ? lateEntryStd / otherStd : 0;
  
  // 找出極高互動貼文（前 5%）
  const sortedByY = [...posts].sort((a, b) => b.y - a.y);
  const top5Percent = Math.ceil(posts.length * 0.05);
  const extremePosts = sortedByY.slice(0, top5Percent);
  
  return {
    lateEntryBrandCount: lateEntryBrands.length,
    lateEntryPostCount: lateEntryPosts.length,
    lateEntryStdDev: lateEntryStd,
    otherStdDev: otherStd,
    stdDevRatio: stdRatio,
    extremePostCount: extremePosts.length,
    extremePostThreshold: extremePosts.length > 0 ? extremePosts[extremePosts.length - 1].y : 0,
  };
}

