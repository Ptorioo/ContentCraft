const API_URL = import.meta.env.VITE_API_BASE || "http://localhost:8787";

export const analyzeContent = async (
  content: string,
  file?: File
): Promise<string> => {
  const apiUrl = `${API_URL}/api/analyze`;

  const formData = new FormData();
  formData.append("content", content);
  if (file) {
    formData.append("file", file);
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Failed to analyze content: HTTP ${response.status} ${response.statusText} ${text}`
    );
  }

  const data = await response.json();
  // Expecting: { ati: number, components: {...}, ... }
  if (typeof data?.ati === "number") {
    return `ATI score: ${data.ati.toFixed(2)}`;
  }

  // fallback
  return JSON.stringify(data);
};
