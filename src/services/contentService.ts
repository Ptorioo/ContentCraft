const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const analyzeContent = async (content: string, file?: File): Promise<string> => {
  const apiUrl = `${SUPABASE_URL}/functions/v1/analyze-content`;

  const formData = new FormData();
  formData.append('content', content);
  if (file) {
    formData.append('file', file);
  }

  const headers = {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to analyze content');
  }

  const data = await response.json();
  return data.message;
};
