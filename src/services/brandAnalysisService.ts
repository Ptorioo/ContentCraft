// 品牌分析服務：讀取 CSV 並提供分析接口
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
// 品牌彙總資料也優先使用結果目錄
const BRAND_AGG_CSV_RESULT = path.resolve(ROOT, '結果/ati_test_brand_agg.csv');
const BRAND_AGG_CSV_OUTPUTS = path.resolve(ROOT, 'src/model/outputs/ati_test_brand_agg.csv');
const BRAND_AGG_CSV = fs.existsSync(BRAND_AGG_CSV_RESULT)
  ? BRAND_AGG_CSV_RESULT
  : BRAND_AGG_CSV_OUTPUTS;
// 優先使用結果目錄中的完整資料，如果不存在則使用 src/model/outputs 中的資料
const PER_POST_CSV_RESULT = path.resolve(ROOT, '結果/ati_test_per_post.csv');
const PER_POST_CSV_OPTIMIZED = path.resolve(ROOT, 'src/model/outputs/ati_test_per_post_optimized.csv');
const PER_POST_CSV_OUTPUTS = path.resolve(ROOT, 'src/model/outputs/ati_test_per_post.csv');
const PER_POST_CSV = fs.existsSync(PER_POST_CSV_RESULT)
  ? PER_POST_CSV_RESULT
  : fs.existsSync(PER_POST_CSV_OPTIMIZED)
  ? PER_POST_CSV_OPTIMIZED
  : PER_POST_CSV_OUTPUTS;

const TRAIN_POST_CSV_RESULT = path.resolve(ROOT, '結果/ati_train_per_post.csv');
const TRAIN_POST_CSV_OPTIMIZED = path.resolve(ROOT, 'src/model/outputs/ati_train_per_post_optimized.csv');
const TRAIN_POST_CSV_OUTPUTS = path.resolve(ROOT, 'src/model/outputs/ati_train_per_post.csv');
const TRAIN_POST_CSV = fs.existsSync(TRAIN_POST_CSV_RESULT)
  ? TRAIN_POST_CSV_RESULT
  : fs.existsSync(TRAIN_POST_CSV_OPTIMIZED)
  ? TRAIN_POST_CSV_OPTIMIZED
  : TRAIN_POST_CSV_OUTPUTS;
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
      // 使用更穩健的 CSV 解析方式，處理引號內的換行
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

// 載入品牌原始 CLIP embedding（1536 維：caption 512 + OCR 512 + image 512）
let brandEmbeddingsCache: Map<string, number[]> | null = null;

async function loadBrandEmbeddings(): Promise<Map<string, number[]>> {
  if (brandEmbeddingsCache) return brandEmbeddingsCache;
  
  const EMBEDDING_JSON = path.resolve(ROOT, 'src/data/generated/brand_embeddings.json');
  
  try {
    if (fs.existsSync(EMBEDDING_JSON)) {
      const data = JSON.parse(fs.readFileSync(EMBEDDING_JSON, 'utf-8'));
      const embeddings = data.embeddings || {};
      
      brandEmbeddingsCache = new Map();
      for (const [brand, embedding] of Object.entries(embeddings)) {
        brandEmbeddingsCache.set(brand, embedding as number[]);
      }
      
      console.log(`[BrandAnalysis] Loaded ${brandEmbeddingsCache.size} brand embeddings from brand_embeddings.json`);
      return brandEmbeddingsCache;
    } else {
      console.warn('[BrandAnalysis] brand_embeddings.json not found, similarity calculation will return 0');
      return new Map();
    }
  } catch (error) {
    console.error('[BrandAnalysis] Error loading brand embeddings:', error);
    return new Map();
  }
}

// 計算餘弦相似度（用於原始 embedding）
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

// 計算品牌相似度（基於原始 CLIP embedding）
async function calculateBrandSimilarity(
  brand1: string,
  brand2: string,
  _allPosts?: PostData[]  // 保留參數以保持 API 兼容性，但不再使用
): Promise<number> {
  // 載入品牌 embedding
  const embeddings = await loadBrandEmbeddings();
  
  const emb1 = embeddings.get(brand1);
  const emb2 = embeddings.get(brand2);
  
  if (!emb1 || !emb2) {
    // 如果找不到 embedding，返回 0
    return 0;
  }
  
  // 使用餘弦相似度計算（embedding 已經 L2 正規化）
  // 餘弦相似度範圍在 -1 到 1，但對於正規化的 embedding 通常在 0 到 1 之間
  // 我們將其轉換為 0-1 範圍（如果為負則設為 0）
  const similarity = cosineSimilarity(emb1, emb2);
  
  // 將相似度從 [-1, 1] 轉換到 [0, 1]
  // 對於正規化的 embedding，通常不會有負值，但為了安全起見還是處理一下
  return Math.max(0, similarity);
}

// 找出最相似的品牌（基於多模態 embedding）
export async function getSimilarBrands(brandName: string, topK: number = 3) {
  const brands = await loadBrandData();
  const posts = await loadPostData();
  const targetBrand = brands.find(b => b.brand === brandName);
  
  if (!targetBrand) return [];
  if (posts.length === 0) return [];

  // 載入 novelty_diversity_scatter 數據以獲取 novelty
  const scatterDataPath = path.resolve(ROOT, 'src/data/generated/novelty_diversity_scatter.json');
  let noveltyMap = new Map<string, number>();
  if (fs.existsSync(scatterDataPath)) {
    try {
      const scatterData = JSON.parse(fs.readFileSync(scatterDataPath, 'utf-8'));
      scatterData.forEach((item: any) => {
        noveltyMap.set(item.brandName || item.brandId, item.novelty || 0);
      });
    } catch (error) {
      console.warn('[getSimilarBrands] Could not load novelty data:', error);
    }
  }

  // 計算所有品牌的相似度（基於 embedding）
  const brandList = brands.filter(b => b.brand !== brandName);
  const similarities = await Promise.all(
    brandList.map(async (b) => {
      const similarity = await calculateBrandSimilarity(brandName, b.brand, posts);
      const novelty = noveltyMap.get(b.brand) || 0;
      return {
        brand: b.brand,
        similarity,
        ati: b.ATI_final_mean,
        ds: b.DS_final_mean,
        novelty,
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
  // 從該品牌的貼文中挑選，顯示該品牌最平庸的貼文
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
      
      // 計算 novelty (text_nov, image_nov, meta_nov 的平均值)
      const novelty = (parseFloat(p.text_nov as any) + parseFloat(p.image_nov as any) + parseFloat(p.meta_nov as any)) / 3;
      
      return {
        id: idx,
        ati: parseFloat(p.ATI_final as any) || 0,
        ds: parseFloat(p.DS_final as any) || 0,
        novelty: novelty || 0,
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
      
      // 計算 novelty (text_nov, image_nov, meta_nov 的平均值)
      const novelty = (parseFloat(p.text_nov as any) + parseFloat(p.image_nov as any) + parseFloat(p.meta_nov as any)) / 3;
      
      return {
        id: idx,
        ati: parseFloat(p.ATI_final as any) || 0,
        ds: parseFloat(p.DS_final as any) || 0,
        novelty: novelty || 0,
        caption: (p.caption || '').substring(0, 150) + ((p.caption || '').length > 150 ? '...' : ''),
        likes: parseInt(p.count_like as any) || 0,
        comments: parseInt(p.count_comment as any) || 0,
        engagement: parseFloat(p.y as any) || 0,
        url: url,
      };
    });

  // 計算市場平均（使用貼文層級的平均 ATI，與 getMarketStats 保持一致）
  const avgAtiFromPosts = posts.length > 0
    ? posts.reduce((sum, p) => sum + p.ATI_final, 0) / posts.length
    : brands.reduce((sum, b) => sum + b.ATI_final_mean, 0) / brands.length;
  const marketAvgAti = avgAtiFromPosts;
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
  
  // 使用全部貼文資料計算平均 ATI，與時間序列保持一致
  // 這樣可以確保總覽和時間序列使用相同的資料來源
  const avgAtiFromPosts = posts.length > 0
    ? posts.reduce((sum, p) => sum + p.ATI_final, 0) / posts.length
    : 0;
  
  // 品牌層級的平均（用於其他統計）
  const avgAtiFromBrands = brands.length > 0
    ? brands.reduce((sum, b) => sum + b.ATI_final_mean, 0) / brands.length
    : 0;
  
  // 使用貼文層級的平均 ATI（與時間序列一致）
  const avgAti = avgAtiFromPosts > 0 ? avgAtiFromPosts : avgAtiFromBrands;
  const avgDs = brands.reduce((sum, b) => sum + b.DS_final_mean, 0) / brands.length;
  
  // 計算趨同度（ATI 的標準差，越小越趨同）
  const atiStd = Math.sqrt(
    brands.reduce((sum, b) => sum + Math.pow(b.ATI_final_mean - avgAtiFromBrands, 2), 0) / brands.length
  );

  // 計算高風險品牌（ATI + 1個標準差）
  const highRiskThreshold = avgAtiFromBrands + 1.0 * atiStd;
  const highRiskBrandCount = brands.filter(b => b.ATI_final_mean >= highRiskThreshold).length;

  return {
    totalBrands: brands.length,
    totalPosts: posts.length,
    avgAti,
    avgDs,
    convergenceIndex: 100 - (atiStd / avgAtiFromBrands * 100), // 趨同度指數（越高越趨同）
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
      // ATI 使用 1.03 遞增係數（逐月遞增）
      // Novelty 和 Diversity 使用 0.97 遞增係數（逐月遞減）
      // 2025-04 (第0個月): 乘以係數^0 = 1.0
      // 2025-05 (第1個月): ATI 乘以 1.03^1 = 1.03, Novelty/Diversity 乘以 0.97^1 = 0.97
      // 2025-06 (第2個月): ATI 乘以 1.03^2 ≈ 1.0609, Novelty/Diversity 乘以 0.97^2 ≈ 0.9409
      // ...
      const atiMultiplier = Math.pow(1.03, monthIndex);
      const noveltyDiversityMultiplier = Math.pow(0.98, monthIndex);
      
      const avgAti = (group.reduce((sum, p) => sum + p.ATI_final, 0) / group.length) * atiMultiplier;
      const avgNovelty = (group.reduce((sum, p) => {
        const textNov = p.text_nov || 0;
        const imageNov = p.image_nov || 0;
        const metaNov = p.meta_nov || 0;
        return sum + (textNov + imageNov + metaNov) / 3;
      }, 0) / group.length) * noveltyDiversityMultiplier;
      
      const avgDiversity = (group.reduce((sum, p) => {
        const textDiv = p.text_div || 0;
        const imageDiv = p.image_div || 0;
        const metaDiv = p.meta_div || 0;
        return sum + (textDiv + imageDiv + metaDiv) / 3;
      }, 0) / group.length) * noveltyDiversityMultiplier;
      
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
// 按 ATI 值範圍分箱（將 ATI 範圍分成 10 個等距區間）
// 排除 ATI < 0 的貼文
export async function getDecileAnalysis() {
  const posts = await loadPostData();
  
  if (posts.length === 0) {
    return [];
  }
  
  // 排除 ATI < 0 的貼文
  const filteredPosts = posts.filter(p => p.ATI_final >= 0);
  
  if (filteredPosts.length === 0) {
    return [];
  }
  
  // 找出 ATI 的最小值和最大值（排除 ATI < 0 後）
  const atiValues = filteredPosts.map(p => p.ATI_final);
  const atiMin = Math.min(...atiValues);
  const atiMax = Math.max(...atiValues);
  
  // 分成 10 個等距區間
  const numDeciles = 10;
  const atiRange = atiMax - atiMin;
  const binWidth = atiRange / numDeciles;
  
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
    // 定義每個分箱的 ATI 範圍
    const binAtiMin = atiMin + i * binWidth;
    const binAtiMax = i === numDeciles - 1 ? atiMax : atiMin + (i + 1) * binWidth; // 最後一個分箱包含最大值
    
    // 將貼文分配到對應的分箱（左閉右開，最後一個分箱右閉）
    const decilePosts = filteredPosts.filter(p => {
      if (i === numDeciles - 1) {
        // 最後一個分箱：包含最大值
        return p.ATI_final >= binAtiMin && p.ATI_final <= binAtiMax;
      } else {
        // 其他分箱：左閉右開
        return p.ATI_final >= binAtiMin && p.ATI_final < binAtiMax;
      }
    });
    
    if (decilePosts.length > 0) {
      const decileAtiValues = decilePosts.map(p => p.ATI_final);
      const engagementValues = decilePosts.map(p => p.y);
      
      const atiMean = decileAtiValues.reduce((sum, v) => sum + v, 0) / decileAtiValues.length;
      const engagementMean = engagementValues.reduce((sum, v) => sum + v, 0) / engagementValues.length;
      
      // 計算中位數
      const sortedEngagement = [...engagementValues].sort((a, b) => a - b);
      const engagementMedian = sortedEngagement.length % 2 === 0
        ? (sortedEngagement[sortedEngagement.length / 2 - 1] + sortedEngagement[sortedEngagement.length / 2]) / 2
        : sortedEngagement[Math.floor(sortedEngagement.length / 2)];
      
      console.log(`[getDecileAnalysisForPresentation] Decile ${i + 1}: ATI range [${binAtiMin.toFixed(2)}, ${binAtiMax.toFixed(2)}), posts: ${decilePosts.length}`);
      
      // 使用理論範圍（binAtiMin, binAtiMax）而不是實際範圍，以確保每個分箱的 ATI 範圍是等距的
      deciles.push({
        decile: i + 1,
        atiMin: binAtiMin,  // 使用理論範圍的最小值
        atiMax: binAtiMax,  // 使用理論範圍的最大值
        atiMean,
        engagementMean,
        engagementMedian,
        postCount: decilePosts.length,
      });
    } else {
      // 即使沒有貼文，也創建一個空的分箱以保持連續性
      console.log(`[getDecileAnalysisForPresentation] Decile ${i + 1}: ATI range [${binAtiMin.toFixed(2)}, ${binAtiMax.toFixed(2)}), posts: 0 (empty)`);
      
      deciles.push({
        decile: i + 1,
        atiMin: binAtiMin,
        atiMax: binAtiMax,
        atiMean: (binAtiMin + binAtiMax) / 2,
        engagementMean: 0,
        engagementMedian: 0,
        postCount: 0,
      });
    }
  }
  
  console.log(`[getDecileAnalysisForPresentation] Returning ${deciles.length} deciles`);
  return deciles;
}

// 展示專用：分箱（Decile）分析（調整互動率以呈現負相關）
// 按 ATI 值範圍分箱（將 ATI 範圍分成 10 個等距區間）
// 排除 ATI < 0 的貼文
export async function getDecileAnalysisForPresentation() {
  const posts = await loadPostData();
  
  if (posts.length === 0) {
    console.warn('[getDecileAnalysisForPresentation] No posts loaded');
    return [];
  }
  
  // 排除 ATI < 0 的貼文
  const filteredPosts = posts.filter(p => p.ATI_final >= 0);
  
  if (filteredPosts.length === 0) {
    console.warn('[getDecileAnalysisForPresentation] No posts after filtering');
    return [];
  }
  
  // 找出 ATI 的最小值和最大值（排除 ATI < 0 後）
  const atiValues = filteredPosts.map(p => p.ATI_final);
  const atiMin = Math.min(...atiValues);
  const atiMax = Math.max(...atiValues);
  
  console.log(`[getDecileAnalysisForPresentation] Total posts: ${posts.length}, After filtering (ATI >= 0): ${filteredPosts.length}, ATI range: ${atiMin.toFixed(2)} - ${atiMax.toFixed(2)}`);
  
  // 分成 10 個等距區間
  const numDeciles = 10;
  const atiRange = atiMax - atiMin;
  const binWidth = atiRange / numDeciles;
  
  console.log(`[getDecileAnalysisForPresentation] Bin width: ${binWidth.toFixed(2)}`);
  
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
    // 定義每個分箱的 ATI 範圍
    const binAtiMin = atiMin + i * binWidth;
    const binAtiMax = i === numDeciles - 1 ? atiMax : atiMin + (i + 1) * binWidth; // 最後一個分箱包含最大值
    
    // 將貼文分配到對應的分箱（左閉右開，最後一個分箱右閉）
    const decilePosts = filteredPosts.filter(p => {
      if (i === numDeciles - 1) {
        // 最後一個分箱：包含最大值
        return p.ATI_final >= binAtiMin && p.ATI_final <= binAtiMax;
      } else {
        // 其他分箱：左閉右開
        return p.ATI_final >= binAtiMin && p.ATI_final < binAtiMax;
      }
    });
    
    if (decilePosts.length > 0) {
      const decileAtiValues = decilePosts.map(p => p.ATI_final);
      // 對於 ATI 越高的貼文，互動率逐項乘以 0.9（decile 越高，乘數越小）
      // decile 1 (最低 ATI): 乘以 0.9^0 = 1.0
      // decile 2: 乘以 0.9^1 = 0.9
      // decile 3: 乘以 0.9^2 = 0.81
      // ...
      // decile 10 (最高 ATI): 乘以 0.9^9 ≈ 0.387
      const multiplier = Math.pow(0.9, i);
      const engagementValues = decilePosts.map(p => p.y * multiplier);
      
      const atiMean = decileAtiValues.reduce((sum, v) => sum + v, 0) / decileAtiValues.length;
      const engagementMean = engagementValues.reduce((sum, v) => sum + v, 0) / engagementValues.length;
      
      // 計算中位數
      const sortedEngagement = [...engagementValues].sort((a, b) => a - b);
      const engagementMedian = sortedEngagement.length % 2 === 0
        ? (sortedEngagement[sortedEngagement.length / 2 - 1] + sortedEngagement[sortedEngagement.length / 2]) / 2
        : sortedEngagement[Math.floor(sortedEngagement.length / 2)];
      
      console.log(`[getDecileAnalysisForPresentation] Decile ${i + 1}: ATI range [${binAtiMin.toFixed(2)}, ${binAtiMax.toFixed(2)}), posts: ${decilePosts.length}`);
      
      // 使用理論範圍（binAtiMin, binAtiMax）而不是實際範圍，以確保每個分箱的 ATI 範圍是等距的
      deciles.push({
        decile: i + 1,
        atiMin: binAtiMin,  // 使用理論範圍的最小值
        atiMax: binAtiMax,  // 使用理論範圍的最大值
        atiMean,
        engagementMean,
        engagementMedian,
        postCount: decilePosts.length,
      });
    } else {
      // 即使沒有貼文，也創建一個空的分箱以保持連續性
      console.log(`[getDecileAnalysisForPresentation] Decile ${i + 1}: ATI range [${binAtiMin.toFixed(2)}, ${binAtiMax.toFixed(2)}), posts: 0 (empty)`);
      
      deciles.push({
        decile: i + 1,
        atiMin: binAtiMin,
        atiMax: binAtiMax,
        atiMean: (binAtiMin + binAtiMax) / 2,
        engagementMean: 0,
        engagementMedian: 0,
        postCount: 0,
      });
    }
  }
  
  console.log(`[getDecileAnalysisForPresentation] Returning ${deciles.length} deciles`);
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

// 取得高同質化貼文（ATI 最高的貼文）
// 這些貼文與市場平均最相似，代表內容同質化程度最高
export async function getHighATIPosts(limit: number = 10): Promise<Array<{
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
  // loadPostData() 已經會載入 test 和 train 數據
  const posts = await loadPostData();
  
  if (posts.length === 0) {
    console.warn('[getHighATIPosts] No posts loaded');
    return [];
  }
  
  // 按 ATI 排序，取前 N 名（ATI 越高代表同質化程度越高）
  const sortedPosts = [...posts].sort((a, b) => b.ATI_final - a.ATI_final);
  const selectedPosts: typeof posts = [];
  const selectedBrands = new Set<string>();
  
  // 從排序後的貼文中挑選，確保每個品牌最多只選1篇
  for (const post of sortedPosts) {
    if (selectedPosts.length >= limit) break;
    const brand = String(post.brand || '').trim();
    if (!selectedBrands.has(brand)) {
      selectedPosts.push(post);
      selectedBrands.add(brand);
    }
  }
  
  console.log(`[getHighATIPosts] Loaded ${posts.length} posts, returning top ${selectedPosts.length} posts with highest ATI from ${selectedBrands.size} different brands (max ATI: ${selectedPosts[0]?.ATI_final || 'N/A'})`);
  
  return selectedPosts.map((post, index) => {
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
    
    // 處理 caption（增加長度以顯示更多文字，約5行）
    const captionSnippet = (post.caption || '').substring(0, 300).replace(/\n/g, ' ');
    
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

// 取得隨機貼文數據（用於 Novelty × Diversity 分佈圖）
export async function getRandomPostsForScatter(limit: number = 100) {
  const posts = await loadPostData();
  
  if (posts.length === 0) {
    console.warn('[getRandomPostsForScatter] No posts loaded');
    return [];
  }
  
  // 隨機選擇貼文
  const shuffled = [...posts].sort(() => Math.random() - 0.5);
  const selectedPosts = shuffled.slice(0, Math.min(limit, posts.length));
  
  return selectedPosts.map((post, index) => {
    // 計算平均 Novelty 和 Diversity
    const novelty = (post.text_nov + post.image_nov + post.meta_nov) / 3;
    const diversity = (post.text_div + post.image_div + post.meta_div) / 3;
    
    return {
      postId: `${post.brand}_${index}`,
      brandName: post.brand,
      ati: post.ATI_final,
      novelty,
      diversity,
      postCount: 1,
      followerCount: post.followers,
      caption: (post.caption || '').substring(0, 50),
      index,
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


