const API_URL = import.meta.env.VITE_API_BASE || "http://localhost:8787";

export interface PostAnalysisData {
  ati: number;
  avgAti: number;
  novelty: number;
  diversity: number;
  components?: {
    DS_text: number;
    DS_image: number;
    DS_final: number;
  };
  textATI?: number;
  imageATI?: number;
}

export interface AnalyzeResult {
  text: string;
  analysisData?: PostAnalysisData;
}

export const analyzeContent = async (
  content: string,
  file?: File
): Promise<AnalyzeResult> => {
  const apiUrl = `${API_URL}/api/analyze`;

  const formData = new FormData();
  formData.append("content", content);
  if (file) formData.append("file", file);

  // 同時獲取市場平均 ATI，用於正確比較
  const [analyzeResponse, marketStatsResponse] = await Promise.all([
    fetch(apiUrl, { method: "POST", body: formData }),
    fetch(`${API_URL}/api/market/stats`).catch(() => null), // 如果失敗，使用預設值
  ]);

  if (!analyzeResponse.ok) {
    const text = await analyzeResponse.text().catch(() => "");
    throw new Error(
      `Failed to analyze content: HTTP ${analyzeResponse.status} ${text}`
    );
  }

  const data = await analyzeResponse.json();
  
  // 獲取市場平均 ATI（如果 API 調用成功）
  let avgAti = 50; // 預設值（如果無法獲取）
  if (marketStatsResponse?.ok) {
    try {
      const marketStats = await marketStatsResponse.json();
      avgAti = marketStats.avgAti || 50;
    } catch (e) {
      console.warn("Failed to parse market stats, using default:", e);
    }
  }

  // 從後端獲取 Novelty 和 Diversity
  // 後端返回格式：{ novelty: { text: ..., image: ... }, diversity: { text: ..., image: ... } }
  // 計算綜合的 novelty 和 diversity（使用與 ATI 計算相同的權重）
  let novelty = 0.5;
  let diversity = 0.5;
  
  // 檢查是否有圖片：檢查 rel_img_paths 是否為非空字串
  const hasImage = data?.rel_img_paths && data.rel_img_paths !== '' && data.rel_img_paths !== null;
  
  if (typeof data?.novelty === 'object' && data?.novelty?.text !== undefined) {
    const textNov = data.novelty.text;
    if (hasImage && data.novelty.image !== undefined) {
      // 有圖片時：權重 [0.2, 0.8]（文字 20%，圖片 80%）
      const imageNov = data.novelty.image;
      novelty = 0.2 * textNov + 0.8 * imageNov;
    } else {
      // 無圖片時：只使用文字值（權重 [1.0, 0.0]）
      novelty = textNov;
    }
  } else if (typeof data?.novelty === 'number') {
    novelty = data.novelty;
  }
  
  if (typeof data?.diversity === 'object' && data?.diversity?.text !== undefined) {
    const textDiv = data.diversity.text;
    if (hasImage && data.diversity.image !== undefined) {
      // 有圖片時：權重 [0.2, 0.8]
      const imageDiv = data.diversity.image;
      diversity = 0.2 * textDiv + 0.8 * imageDiv;
    } else {
      // 無圖片時：只使用文字值
      diversity = textDiv;
    }
  } else if (typeof data?.diversity === 'number') {
    diversity = data.diversity;
  }
  let textATI = 0;
  let imageATI = 0;
  
  if (data?.components) {
    const dsText = data.components.DS_text || 0;
    const dsImage = data.components.DS_image || 0;
    
    // 計算各模態的 ATI
    textATI = 100 * (1 - dsText);
    imageATI = 100 * (1 - dsImage);
  }

  const reply =
    typeof data?.ati === "number"
      ? `ATI score: ${data.ati.toFixed(2)}\n${
          data.ati < avgAti ? "低於市場平均" : "高於市場平均"
        } (市場平均: ${avgAti.toFixed(1)})`
      : JSON.stringify(data);

  const analysisData: PostAnalysisData | undefined =
    typeof data?.ati === "number"
      ? {
          ati: data.ati,
          avgAti,
          novelty,
          diversity,
          components: data?.components,
          textATI,
          imageATI,
        }
      : undefined;

  return {
    text: reply,
    analysisData,
  };
};
