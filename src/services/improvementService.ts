// 改進建議服務
import { PostAnalysisData } from '../types';

// 促銷詞彙列表（來自模型定義）
const PROMO_WORDS = ['折', '折扣', '%off', '% off', '促銷', '滿', '送', '優惠', '特價', '買一送一', '買一送二', '限時', '早鳥'];
const FLAVOR_WORDS = ['芒果', '草莓', '葡萄', '百香', '抹茶', '烏龍', '紅茶', '綠茶', '奶蓋', '珍珠', '椰果', '仙草'];
const CTA_WORDS = ['快來', '立刻', '今天', '現在', '一起', '打卡', '留言', '分享', '抽獎'];

// 詞彙替代建議
const WORD_ALTERNATIVES: Record<string, string[]> = {
  '限時': ['即日起', '期間限定', '季節限定', '專屬時段'],
  '優惠': ['特別活動', '獨家方案', '專屬福利', '驚喜回饋'],
  '特價': ['精選價格', '限定價格', '會員價', '特別價格'],
  '買一送一': ['成雙優惠', '雙倍享受', '配對特惠'],
  '促銷': ['特別活動', '專屬方案', '限時活動'],
  '折扣': ['優惠方案', '特別價格', '專屬價格'],
};

export interface ImprovementSuggestion {
  category: 'text' | 'image' | 'general';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionable?: string[]; // 具體可執行的建議
}

export interface TextSuggestion extends ImprovementSuggestion {
  category: 'text';
  foundWords?: string[]; // 發現的問題詞彙
  alternatives?: Record<string, string[]>; // 替代建議
}

export function generateImprovementSuggestions(
  analysisData: PostAnalysisData,
  originalText: string
): ImprovementSuggestion[] {
  const suggestions: ImprovementSuggestion[] = [];
  
  const { ati, avgAti, textATI = 0, imageATI = 0, components } = analysisData;
  
  // 1. 文字模態分析
  if (textATI > avgAti + 5) {
    const textSuggestions = generateTextSuggestions(originalText, textATI, avgAti);
    suggestions.push(...textSuggestions);
  }
  
  // 2. 圖片模態分析
  if (imageATI > avgAti + 5 && components?.DS_image !== undefined) {
    const imageSuggestion: ImprovementSuggestion = {
      category: 'image',
      priority: imageATI > avgAti + 15 ? 'high' : 'medium',
      title: '圖片風格需要調整',
      description: `圖片模態 ATI 為 ${imageATI.toFixed(1)}，高於市場平均 ${avgAti.toFixed(1)}，表示圖片風格與市場過於相似`,
      actionable: [
        '嘗試使用更獨特的構圖角度',
        '使用不同的色彩搭配',
        '避免使用市場常見的拍攝風格',
        '考慮使用生活場景而非單純產品特寫',
      ],
    };
    suggestions.push(imageSuggestion);
  }
  
  // 3. 整體建議
  if (ati > avgAti) {
    const improvement = ati - avgAti;
    suggestions.push({
      category: 'general',
      priority: improvement > 15 ? 'high' : improvement > 8 ? 'medium' : 'low',
      title: '整體內容差異化建議',
      description: `您的 ATI 為 ${ati.toFixed(1)}，比市場平均高 ${improvement.toFixed(1)} 分。建議調整內容以提升差異化。`,
      actionable: [
        textATI > imageATI ? '優先調整文字內容' : '優先調整圖片風格',
        '參考市場中低 ATI 標竿品牌的內容策略',
        '增加原創性元素，減少常見的促銷表達',
      ],
    });
  } else if (ati < avgAti - 5) {
    suggestions.push({
      category: 'general',
      priority: 'low',
      title: '內容差異化良好',
      description: `您的 ATI 為 ${ati.toFixed(1)}，低於市場平均，表示內容具有良好差異化，建議保持此風格。`,
    });
  }
  
  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function generateTextSuggestions(
  text: string,
  textATI: number,
  avgAti: number
): TextSuggestion[] {
  const suggestions: TextSuggestion[] = [];
  const lowerText = text.toLowerCase();
  
  // 檢測促銷詞彙
  const foundPromoWords = PROMO_WORDS.filter(word => lowerText.includes(word.toLowerCase()));
  if (foundPromoWords.length > 0 && textATI > avgAti) {
    const alternatives: Record<string, string[]> = {};
    foundPromoWords.forEach(word => {
      if (WORD_ALTERNATIVES[word]) {
        alternatives[word] = WORD_ALTERNATIVES[word];
      }
    });
    
    suggestions.push({
      category: 'text',
      priority: foundPromoWords.length > 2 ? 'high' : 'medium',
      title: '檢測到常見促銷詞彙',
      description: `發現 ${foundPromoWords.length} 個常見促銷詞彙，這些詞彙在市場中使用頻繁，可能導致 ATI 上升`,
      foundWords: foundPromoWords,
      alternatives,
      actionable: [
        `考慮減少或替換以下詞彙：${foundPromoWords.join('、')}`,
        '使用更具特色和原創性的表達方式',
      ],
    });
  }
  
  // 文字長度建議
  const textLength = text.trim().length;
  if (textLength < 30 && textATI > avgAti) {
    suggestions.push({
      category: 'text',
      priority: 'medium',
      title: '文字長度建議',
      description: `目前文字長度為 ${textLength} 字，較短的文字可能導致與市場相似度較高`,
      actionable: [
        '建議增加至 50-100 字',
        '加入故事性內容或產品特色描述',
        '描述使用場景或品牌故事',
      ],
    });
  }
  
  // 基於 ATI 分數的具體建議
  if (textATI > avgAti + 15) {
    suggestions.push({
      category: 'text',
      priority: 'high',
      title: '文字內容需要大幅調整',
      description: `文字模態 ATI 為 ${textATI.toFixed(1)}，明顯高於市場平均，建議大幅調整文字內容`,
      actionable: [
        '重新思考文字表達方式',
        '避免使用市場常見的套路和表達',
        '增加原創性和品牌特色',
      ],
    });
  } else if (textATI > avgAti + 5) {
    suggestions.push({
      category: 'text',
      priority: 'medium',
      title: '文字內容可以微調',
      description: `文字模態 ATI 為 ${textATI.toFixed(1)}，略高於市場平均，建議微調以提升差異化`,
      actionable: [
        '調整部分詞彙表達',
        '增加更具特色的描述',
      ],
    });
  }
  
  return suggestions;
}

// 內容類型分類
export type ContentType = 'promotional' | 'product' | 'story' | 'ugc' | 'other';

export function classifyContentType(caption: string, ocrText: string = ''): ContentType {
  const text = (caption + ' ' + ocrText).toLowerCase();
  
  // 促銷活動類：包含促銷詞彙
  if (PROMO_WORDS.some(kw => text.includes(kw.toLowerCase()))) {
    return 'promotional';
  }
  
  // UGC 類：包含 @mention 或用戶相關詞彙
  if (text.includes('@') || text.includes('粉絲') || text.includes('分享') || text.includes('打卡')) {
    return 'ugc';
  }
  
  // 故事分享類：較長文字，包含情感詞彙
  const storyKeywords = ['今天', '昨天', '開心', '感謝', '喜歡', '感動', '美好'];
  if (text.length > 60 && storyKeywords.some(kw => text.includes(kw))) {
    return 'story';
  }
  
  // 產品特寫類：主要是產品描述，較少故事性
  const productKeywords = ['新品', '推薦', '好喝', '推薦飲品', '特色'];
  if (productKeywords.some(kw => text.includes(kw)) && text.length < 80) {
    return 'product';
  }
  
  return 'other';
}

export function getContentTypeLabel(type: ContentType): string {
  const labels: Record<ContentType, string> = {
    promotional: '促銷活動類',
    product: '產品特寫類',
    story: '故事分享類',
    ugc: '用戶UGC類',
    other: '其他',
  };
  return labels[type];
}

