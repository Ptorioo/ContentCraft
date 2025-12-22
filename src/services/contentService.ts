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

  // 從後端獲取 Novelty 和 Diversity（後端已計算並返回）
  let novelty = data?.novelty ?? 0.5;
  let diversity = data?.diversity ?? 0.5;
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
