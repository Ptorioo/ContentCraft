const API_URL = import.meta.env.VITE_API_BASE || "http://localhost:8787";

import { mockAnalytics } from '../data/mockAnalytics';
import { AnalyticsDataset } from '../types/index';

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
    throw new Error(`Failed to analyze content: HTTP ${response.status} ${text}`);
  }

  const data = await response.json();

  const reply =
    typeof data?.ati === "number"
      ? `ATI score: ${data.ati.toFixed(2)}`
      : JSON.stringify(data);

  return {
    text: reply,
    analytics: mockAnalytics,  // attach your analytics here
  };
};