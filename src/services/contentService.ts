const API_URL = import.meta.env.VITE_API_BASE;

export const analyzeContent = async (content: string, file?: File): Promise<string> => {
  const apiUrl = `${API_URL}/api/analyze`;

  const formData = new FormData();
  formData.append('content', content);
  if (file) {
    formData.append('file', file);
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to analyze content');
  }

  const data = await response.json();
  return data.message;
};
