const API_URL = import.meta.env.VITE_API_BASE || "http://localhost:8787";

import { mockAnalytics } from "../data/mockAnalytics";
import { AnalyticsDataset } from "../types/index";

export interface AnalyzeResult {
  text: string;
  analytics?: AnalyticsDataset;
}

export const analyzeContent = async (
  content: string,
  file?: File
): Promise<AnalyzeResult> => {
  const apiUrl = `${API_URL}/api/analyze`;

  const formData = new FormData();
  formData.append("content", content);
  if (file) formData.append("file", file);

  const response = await fetch(apiUrl, { method: "POST", body: formData });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Failed to analyze content: HTTP ${response.status} ${text}`
    );
  }

  const data = await response.json();

  const noveltyImage = data?.novelty?.image;
  const diversityImage = data?.diversity?.image;

  const reply =
    typeof data?.ati === "number"
      ? `ATI score: ${data.ati.toFixed(2)}\n${
          data.ati < 50 ? "Lower than average" : "Higher than average"
        }`
      : JSON.stringify(data);

  const mergedAnalytics: AnalyticsDataset =
    typeof data?.ati === "number" &&
    typeof noveltyImage === "number" &&
    typeof diversityImage === "number"
      ? {
          ...mockAnalytics,
          noveltyDiversityScatter: [
            ...mockAnalytics.noveltyDiversityScatter,
            {
              brandId: `user-${Date.now()}`,
              brandName: "Your input",
              ati: data.ati,
              novelty: noveltyImage,
              diversity: diversityImage,
              postCount: 1,
              followerCount: 0,
            },
          ],
        }
      : mockAnalytics;

  return {
    text: reply,
    analytics: mergedAnalytics,
  };
};
