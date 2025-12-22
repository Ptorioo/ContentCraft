// 內容類型分析服務
import { classifyContentType, getContentTypeLabel, ContentType } from './improvementService';
import { loadPostData } from './brandAnalysisService';

export interface ContentTypeStats {
  type: ContentType;
  label: string;
  avgAti: number;
  count: number;
  recommendation?: 'recommended' | 'neutral' | 'avoid';
}

export async function getContentTypeAnalysis(): Promise<ContentTypeStats[]> {
  const posts = await loadPostData();
  
  // 按類型分組
  const typeStats: Record<ContentType, { count: number; totalAti: number }> = {
    promotional: { count: 0, totalAti: 0 },
    product: { count: 0, totalAti: 0 },
    story: { count: 0, totalAti: 0 },
    ugc: { count: 0, totalAti: 0 },
    other: { count: 0, totalAti: 0 },
  };
  
  // 統計各類型的 ATI
  posts.forEach(post => {
    const contentType = classifyContentType(post.caption || '', post.ocr_text || '');
    typeStats[contentType].count++;
    typeStats[contentType].totalAti += post.ATI_final || 0;
  });
  
  // 計算平均 ATI 並生成建議
  const allTypes: ContentTypeStats[] = Object.entries(typeStats)
    .filter(([_, stats]) => stats.count > 0) // 只返回有數據的類型
    .map(([type, stats]) => {
      const contentType = type as ContentType;
      const avgAti = stats.totalAti / stats.count;
      
      // 根據平均 ATI 給出建議
      let recommendation: 'recommended' | 'neutral' | 'avoid' = 'neutral';
      if (avgAti < 35) {
        recommendation = 'recommended';
      } else if (avgAti > 50) {
        recommendation = 'avoid';
      }
      
      return {
        type: contentType,
        label: getContentTypeLabel(contentType),
        avgAti,
        count: stats.count,
        recommendation,
      };
    })
    .sort((a, b) => a.avgAti - b.avgAti); // 按 ATI 排序（低 ATI 優先）
  
  return allTypes;
}

