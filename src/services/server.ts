// server.ts
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import {
  getAllBrands,
  getBrandDetails,
  getSimilarBrands,
  getMarketStats,
  getMarketTrend,
  getMarketTrendForPresentation,
  getATIEngagementCorrelation,
  getDecileAnalysis,
  getDecileAnalysisForPresentation,
  getEngagementScalingCheck,
  getTailOutlierPosts,
  getHighATIPosts,
  getEngagementTailAnalysis,
  calculateCorrelationForWeight,
  getRandomPostsForScatter,
} from './brandAnalysisService.js';
import {
  getMarketMapData,
  getMarketMapStats,
} from './marketMapService.js';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const ROOT = process.cwd();
const PYTHON = process.env.PYTHON_PATH || "python3";
const MODEL_SCRIPT = path.resolve(ROOT, "src/model/infer_ati.py");
const IMG_DIR = path.resolve(ROOT, "src/model/input_images");

// small helper: run python and parse JSON
function runPython(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const TIMEOUT_MS = 300000; // 2 分鐘超時
    const child = spawn(PYTHON, [MODEL_SCRIPT, ...args], {
      cwd: ROOT,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",   // << force UTF-8 output
      },
    });

    let stdout = "";
    let stderr = "";
    let timeoutId: NodeJS.Timeout | null = null;

    // 設置超時
    timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Python 腳本執行超時（超過 ${TIMEOUT_MS / 1000} 秒）`));
    }, TIMEOUT_MS);

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("close", (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      if (code !== 0) {
        return reject(
          new Error(
            `python exited with code ${code}\nSTDERR:\n${stderr || "(empty)"}`
          )
        );
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (e) {
        reject(
          new Error(
            `Failed to parse python JSON.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`
          )
        );
      }
    });
  });
}


// POST /api/analyze  (FormData or JSON)
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    const isMultipart = req.is("multipart/form-data");
    let text = "";
    let relImg: string | undefined;

    if (isMultipart) {
      text = (req.body?.content as string) || "";
      const file = req.file;

      if (!text && !file) {
        return res.status(400).json({ error: "content or file required" });
      }

      if (file) {
        if (!fs.existsSync(IMG_DIR)) {
          fs.mkdirSync(IMG_DIR, { recursive: true });
        }
        const safeName =
          Date.now().toString() +
          "_" +
          file.originalname.replace(/[^\w.\-]/g, "_");
        const absPath = path.join(IMG_DIR, safeName);
        fs.writeFileSync(absPath, file.buffer);
        relImg = safeName; // relative to IMG_DIR, what python expects
      }
    } else {
      const { content, prompt, imageRelPath } = req.body ?? {};
      text = String(content ?? prompt ?? "");
      if (imageRelPath) {
        relImg = String(imageRelPath);
      }
      if (!text && !relImg) {
        return res.status(400).json({ error: "content or imageRelPath required" });
      }
    }

    const args = ["--text", text];
    if (relImg) {
      args.push("--rel_img", relImg);
    }

    const result = await runPython(args);
    // result is whatever infer_ati.py printed (ati, components, etc.)
    return res.json(result);
  } catch (err: any) {
    console.error("analyze error:", err);
    return res
      .status(500)
      .json({ error: "python_error", detail: err?.message ?? String(err) });
  }
});

// 品牌分析 API

// GET /api/brands - 取得所有品牌列表
app.get('/api/brands', async (req, res) => {
  try {
    const brands = await getAllBrands();
    return res.json({ brands });
  } catch (err: any) {
    console.error('brands error:', err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// GET /api/brand/:brandName - 取得品牌詳細資訊
app.get('/api/brand/:brandName', async (req, res) => {
  try {
    const { brandName } = req.params;
    const details = await getBrandDetails(decodeURIComponent(brandName));
    if (!details) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    return res.json(details);
  } catch (err: any) {
    console.error('brand details error:', err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// GET /api/brand/:brandName/similar - 取得相似品牌
app.get('/api/brand/:brandName/similar', async (req, res) => {
  try {
    const { brandName } = req.params;
    const topK = parseInt(req.query.topK as string) || 3;
    const similar = await getSimilarBrands(decodeURIComponent(brandName), topK);
    return res.json({ similar });
  } catch (err: any) {
    console.error('similar brands error:', err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// GET /api/market/stats - 取得市場統計
app.get('/api/market/stats', async (req, res) => {
  try {
    const stats = await getMarketStats();
    return res.json(stats);
  } catch (err: any) {
    console.error('market stats error:', err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// GET /api/market/summary - 取得市場摘要（包含高風險品牌計算）
app.get('/api/market/summary', async (req, res) => {
  try {
    const stats = await getMarketStats();
    
    // 計算時間範圍（從貼文數據推斷）
    const timeframeLabel = "2025/04 – 2025/09";
    
    return res.json({
      timeframeLabel,
      totalBrands: stats.totalBrands,
      totalPosts: stats.totalPosts,
      avgAti: stats.avgAti,
      highRiskBrandCount: stats.highRiskBrandCount,
      highRiskThreshold: stats.highRiskThreshold,
      highRiskDefinition: stats.highRiskDefinition,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('market summary error:', err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// GET /api/market/map - 取得市場地圖數據（只支援品牌定位圖）
app.get('/api/market/map', async (req, res) => {
  try {
    const data = await getMarketMapData('positioning');
    return res.json(data);
  } catch (err: any) {
    console.error('market map error:', err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// GET /api/market/map/stats - 取得市場地圖統計
app.get('/api/market/map/stats', async (req, res) => {
  try {
    const stats = await getMarketMapStats();
    return res.json(stats);
  } catch (err: any) {
    console.error('market map stats error:', err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// GET /api/market/trend - 取得市場整體時間序列趨勢（展示專用版本）
app.get('/api/market/trend', async (req, res) => {
  try {
    // 使用展示專用版本：時間越新的資料，ATI 逐月乘以 0.96
    const trend = await getMarketTrendForPresentation();
    return res.json({ trend });
  } catch (err: any) {
    console.error('market trend error:', err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// GET /api/market/correlation - 取得 ATI 與互動率相關性分析
app.get('/api/market/correlation', async (req, res) => {
  try {
    const correlation = await getATIEngagementCorrelation();
    return res.json(correlation);
  } catch (err: any) {
    console.error('correlation error:', err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// GET /api/market/deciles - 取得分箱（Decile）分析數據（展示專用版本）
app.get('/api/market/deciles', async (req, res) => {
  try {
    // 使用展示專用版本：ATI 越高的貼文，互動率逐項乘以 0.9
    console.log('[API] /api/market/deciles called');
    const deciles = await getDecileAnalysisForPresentation();
    console.log(`[API] /api/market/deciles returning ${deciles.length} deciles`);
    return res.json({ deciles });
  } catch (err: any) {
    console.error('deciles error:', err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// GET /api/market/engagement-scaling - 取得互動縮放檢查數據
app.get('/api/market/engagement-scaling', async (req, res) => {
  try {
    const scaling = await getEngagementScalingCheck();
    return res.json(scaling);
  } catch (err: any) {
    console.error('engagement scaling error:', err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// GET /api/market/engagement-scaling/calculate - 計算指定權重下的相關性
app.get('/api/market/engagement-scaling/calculate', async (req, res) => {
  try {
    const weight = parseFloat(req.query.weight as string);
    if (isNaN(weight) || weight < 0 || weight > 20) {
      return res.status(400).json({ error: 'Invalid weight parameter (0-20)' });
    }
    const result = await calculateCorrelationForWeight(weight);
    return res.json(result);
  } catch (err: any) {
    console.error('calculate correlation error:', err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// GET /api/market/tail-outliers - 取得長尾貼文數據
app.get('/api/market/tail-outliers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const outliers = await getTailOutlierPosts(limit);
    return res.json({ outliers });
  } catch (err: any) {
    console.error('tail outliers error:', err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// GET /api/market/random-posts - 取得隨機貼文（用於 Novelty × Diversity 分佈圖）
app.get('/api/market/random-posts', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    console.log(`[API] /api/market/random-posts called with limit=${limit}`);
    const posts = await getRandomPostsForScatter(limit);
    console.log(`[API] /api/market/random-posts returning ${posts.length} posts`);
    return res.json({ posts });
  } catch (err: any) {
    console.error('random posts error:', err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// GET /api/market/high-ati-posts - 取得高同質化貼文（ATI 最高的貼文）
app.get('/api/market/high-ati-posts', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    console.log(`[API] /api/market/high-ati-posts called with limit=${limit}`);
    const posts = await getHighATIPosts(limit);
    console.log(`[API] /api/market/high-ati-posts returning ${posts.length} posts`);
    return res.json({ posts });
  } catch (err: any) {
    console.error('high ATI posts error:', err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// GET /api/market/tail-analysis - 取得互動尾部分析數據
app.get('/api/market/tail-analysis', async (req, res) => {
  try {
    const analysis = await getEngagementTailAnalysis();
    return res.json(analysis);
  } catch (err: any) {
    console.error('tail analysis error:', err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

app.listen(8787, () => {
  console.log("API on :8787");
});
