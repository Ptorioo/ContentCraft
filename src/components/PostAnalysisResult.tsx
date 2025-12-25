import React, { useMemo, useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Scatter,
  Cell,
  TooltipProps,
} from 'recharts';
import { BrandRiskMetric } from '../types/analytics';
import { PostAnalysisData } from '../types';
import ImprovementSuggestions from './ImprovementSuggestions';
import ABTestPanel from './ABTestPanel';
import { generateImprovementSuggestions } from '../services/improvementService';

interface PostAnalysisResultProps {
  analysisData: PostAnalysisData;
  originalText?: string;
  originalImage?: File;
  onAnalysisUpdate?: (data: PostAnalysisData) => void;
  showABTest?: boolean;
  onShowABTestChange?: (show: boolean) => void;
  abTestData?: {
    modifiedText?: string;
    modifiedAnalysis?: PostAnalysisData;
  };
  onABTestDataChange?: (data: { modifiedText?: string; modifiedAnalysis?: PostAnalysisData }) => void;
}

// 工具提示組件
const ScatterTooltip: React.FC<TooltipProps<number, number>> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  
  // 優先查找用戶貼文的 payload（isUserInput === true）
  // 如果沒有，再使用第一個 payload
  let data: any = null;
  let isUserInput = false;
  
  // 優先查找用戶貼文
  const userPayload = payload.find((p: any) => p.payload?.isUserInput === true);
  if (userPayload) {
    data = userPayload.payload;
    isUserInput = true;
  } else {
    // 如果沒有找到用戶貼文，使用第一個 payload
    data = payload[0].payload as any;
    isUserInput = data?.isUserInput === true;
  }
  
  if (!data) return null;
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      {isUserInput && (
        <div className="font-semibold text-purple-600 mb-2">您的貼文</div>
      )}
      <div className="space-y-1">
        {!isUserInput && (
          <div><span className="font-medium">品牌：</span>{data.brandName || '未知'}</div>
        )}
        <div><span className="font-medium">ATI：</span>{data.ati?.toFixed(2) || 'N/A'}</div>
        <div><span className="font-medium">Novelty：</span>{data.novelty?.toFixed(3) || 'N/A'}</div>
        <div><span className="font-medium">Diversity：</span>{data.diversity?.toFixed(3) || 'N/A'}</div>
        {data.followerCount && !isUserInput && (
          <div><span className="font-medium">追蹤數：</span>{data.followerCount.toLocaleString()}</div>
        )}
      </div>
    </div>
  );
};

const PostAnalysisResult: React.FC<PostAnalysisResultProps> = ({
  analysisData,
  originalText = '',
  originalImage,
  onAnalysisUpdate,
  showABTest: externalShowABTest,
  onShowABTestChange,
  abTestData: externalABTestData,
  onABTestDataChange,
}) => {
  const { ati, avgAti, novelty, diversity } = analysisData;
  const [internalShowABTest, setInternalShowABTest] = useState(false);
  
  // 使用外部狀態（如果提供），否則使用內部狀態
  const showABTest = externalShowABTest !== undefined ? externalShowABTest : internalShowABTest;
  const setShowABTest = (value: boolean) => {
    if (onShowABTestChange) {
      onShowABTestChange(value);
    } else {
      setInternalShowABTest(value);
    }
  };

  const userPoint = useMemo(() => ({
    novelty,
    diversity,
    ati,
    brandName: '您的貼文', // 用戶輸入的貼文不屬於任何品牌
  }), [novelty, diversity, ati]);

  // 生成改進建議
  const suggestions = useMemo(() => {
    return generateImprovementSuggestions(analysisData, originalText);
  }, [analysisData, originalText]);
  const [scatterPosts, setScatterPosts] = useState<any[]>([]);
  const [loadingScatterPosts, setLoadingScatterPosts] = useState(true);
  const [hoveredScatterIndex, setHoveredScatterIndex] = useState<number | null>(null);

  // 載入市場散布圖數據
  useEffect(() => {
    const loadScatterData = async () => {
      try {
        const response = await fetch('http://localhost:8787/api/market/random-posts?limit=100');
        if (response.ok) {
          const data = await response.json();
          setScatterPosts(data.posts || []);
        }
      } catch (error) {
        console.error('Failed to load scatter data:', error);
      } finally {
        setLoadingScatterPosts(false);
      }
    };
    
    loadScatterData();
  }, []);

  // 準備散布圖數據
  const scatterData = useMemo(() => {
    const marketPoints = scatterPosts.map((post: any, index: number) => ({
      ...post,
      novelty: post.novelty || 0,
      diversity: post.diversity || 0,
      ati: post.ati || 0,
      brandName: post.brandName || '未知品牌',
      index,
      isUserInput: false,
    }));

    // 確保用戶數據點的 novelty 和 diversity 是有效數字
    const userInputPoint = {
      novelty: typeof userPoint.novelty === 'number' && !isNaN(userPoint.novelty) && isFinite(userPoint.novelty) ? userPoint.novelty : 0.5,
      diversity: typeof userPoint.diversity === 'number' && !isNaN(userPoint.diversity) && isFinite(userPoint.diversity) ? userPoint.diversity : 0.5,
      ati: typeof userPoint.ati === 'number' && !isNaN(userPoint.ati) && isFinite(userPoint.ati) ? userPoint.ati : 0,
      brandName: '您的貼文', // 明確設置，不使用 spread operator 以避免被覆蓋
      index: marketPoints.length,
      isUserInput: true,
    };

    return [...marketPoints, userInputPoint];
  }, [scatterPosts, userPoint]);

  // 計算軸範圍（確保包含用戶數據點）
  const axisRanges = useMemo(() => {
    if (scatterData.length === 0) {
      return {
        novelty: [0, 1],
        diversity: [0, 1],
      };
    }

    const novelties = scatterData.map(d => d.novelty).filter((v): v is number => typeof v === 'number' && !isNaN(v) && isFinite(v));
    const diversities = scatterData.map(d => d.diversity).filter((v): v is number => typeof v === 'number' && !isNaN(v) && isFinite(v));

    if (novelties.length === 0 || diversities.length === 0) {
      return {
        novelty: [0, 1],
        diversity: [0, 1],
      };
    }

    const noveltyMin = Math.max(0, Math.min(...novelties) - 0.05);
    const noveltyMax = Math.min(1, Math.max(...novelties) + 0.05);
    const diversityMin = Math.max(0, Math.min(...diversities) - 0.05);
    const diversityMax = Math.min(1, Math.max(...diversities) + 0.05);

    return {
      novelty: [noveltyMin, noveltyMax],
      diversity: [diversityMin, diversityMax],
    };
  }, [scatterData]);

  // 根據 ATI 計算顏色
  const getColorByAti = (atiValue: number): string => {
    // 使用市場數據的 ATI 範圍來計算顏色
    const atiValues = scatterData.filter(d => !d.isUserInput).map(d => d.ati).filter((v): v is number => typeof v === 'number');
    if (atiValues.length === 0) {
      return '#8B5CF6'; // 預設紫色
    }

    const minAti = Math.min(...atiValues);
    const maxAti = Math.max(...atiValues);
    const range = maxAti - minAti || 1;
    const normalized = (atiValue - minAti) / range;

    // 使用漸層：低 ATI (藍色) -> 高 ATI (紅色)
    if (normalized < 0.5) {
      const t = normalized * 2;
      const r = Math.round(34 + (255 - 34) * t);
      const g = Math.round(197 + (193 - 197) * t);
      const b = Math.round(220 + (7 - 220) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const t = (normalized - 0.5) * 2;
      const r = 255;
      const g = Math.round(193 - 193 * t);
      const b = Math.round(7 - 7 * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  const atiRange = useMemo(() => {
    const atis = scatterData.filter(d => !d.isUserInput).map(d => d.ati).filter((v): v is number => typeof v === 'number');
    if (atis.length === 0) return { min: 0, max: 50 };
    return {
      min: Math.min(...atis),
      max: Math.max(...atis),
    };
  }, [scatterData]);

  const isLowerThanAverage = ati < avgAti;
  const comparisonText = isLowerThanAverage ? '低於市場平均' : '高於市場平均';
  const comparisonColor = isLowerThanAverage ? 'text-green-600' : 'text-red-600';

  const handleApplyABTest = (modifiedText: string, modifiedAnalysis: PostAnalysisData) => {
    onAnalysisUpdate?.(modifiedAnalysis);
    setShowABTest(false);
  };

  return (
    <div className="mt-4 space-y-6">
      {/* ATI 分數卡片 */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
        <div>
          <div className="text-sm text-gray-600 mb-2">內容雷同性指數 (ATI)</div>
          <div className="text-4xl font-bold text-gray-900 mb-2">{ati.toFixed(2)}</div>
          <div className={`text-lg font-semibold ${comparisonColor}`}>
            {comparisonText} (市場平均: {avgAti.toFixed(1)})
          </div>
        </div>
      </div>

      {/* Novelty × Diversity 散布圖 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Novelty × Diversity 分佈
            </h3>
            <p className="text-sm text-gray-600">
              您的貼文在市場中的位置（紫色點 = 您的貼文）
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColorByAti(atiRange.min) }}></div>
                <span>低 ATI</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColorByAti(atiRange.max) }}></div>
                <span>高 ATI</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span>您的貼文</span>
              </div>
            </div>
          </div>
          {loadingScatterPosts ? (
            <div className="h-80 flex items-center justify-center text-gray-500">
              載入數據中...
            </div>
          ) : (
            <div className="h-80 w-full" style={{ minWidth: 0, minHeight: 320 }}>
              <ResponsiveContainer width="100%" height={320}>
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                  onMouseLeave={() => setHoveredScatterIndex(null)}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    type="number"
                    dataKey="novelty"
                    name="Novelty"
                    domain={axisRanges.novelty}
                    tickFormatter={(value: number) => value.toFixed(3)}
                    label={{ value: 'Novelty (新穎度)', position: 'bottom', offset: 10, style: { textAnchor: 'middle' } }}
                    allowDataOverflow={true}
                  />
                  <YAxis
                    type="number"
                    dataKey="diversity"
                    name="Diversity"
                    domain={axisRanges.diversity}
                    tickFormatter={(value: number) => value.toFixed(3)}
                    label={{ value: 'Diversity (多樣性)', angle: -90, position: 'left', offset: 15, style: { textAnchor: 'middle' } }}
                    allowDataOverflow={true}
                  />
                  <Tooltip
                    content={ScatterTooltip}
                    cursor={{ strokeDasharray: '3 3' }}
                  />
                  {/* 市場數據點 - 保持原顏色但降低透明度、較小 */}
                  <Scatter
                    data={scatterData.filter(p => !p.isUserInput)}
                    onMouseEnter={(data, index) => {
                      // index 是過濾後數組的索引，需要找到原始 scatterData 中的索引
                      const marketPoints = scatterData.filter(p => !p.isUserInput);
                      const actualIndex = marketPoints[index]?.index;
                      if (actualIndex !== undefined) {
                        setHoveredScatterIndex(actualIndex);
                      }
                    }}
                    shape={(props: any) => {
                      const { cx, cy } = props;
                      return <circle cx={cx} cy={cy} r={3} fill={props.fill} fillOpacity={props.fillOpacity} />;
                    }}
                  >
                    {scatterData
                      .filter(p => !p.isUserInput)
                      .map((point, index) => {
                        const actualIndex = point.index;
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={getColorByAti(point.ati)}
                            fillOpacity={
                              hoveredScatterIndex === null
                                ? 0.3
                                : hoveredScatterIndex === actualIndex
                                  ? 0.8
                                  : 0.15
                            }
                          />
                        );
                      })}
                  </Scatter>
                  {/* 用戶輸入的數據點 - 紫色、稍大（放在最後以確保在最上層，可被點擊） */}
                  {scatterData.filter(p => p.isUserInput).length > 0 && (
                    <Scatter
                      data={scatterData.filter(p => p.isUserInput)}
                      name="您的貼文"
                      onMouseEnter={(data, index) => {
                        // 找到用戶貼文在原始 scatterData 中的索引
                        const userPoint = scatterData.find(p => p.isUserInput);
                        if (userPoint?.index !== undefined) {
                          setHoveredScatterIndex(userPoint.index);
                        }
                      }}
                      shape={(props: any) => {
                        const { cx, cy } = props;
                        // 保持視覺大小為 4px，但確保可點擊
                        return (
                          <circle 
                            cx={cx} 
                            cy={cy} 
                            r={4} 
                            fill={props.fill} 
                            fillOpacity={props.fillOpacity} 
                            stroke="#7C3AED" 
                            strokeWidth={1.5}
                            style={{ pointerEvents: 'all', cursor: 'pointer' }}
                          />
                        );
                      }}
                    >
                      {scatterData
                        .filter(p => p.isUserInput)
                        .map((point, index) => (
                          <Cell
                            key={`user-cell-${index}`}
                            fill="#8B5CF6"
                            fillOpacity={hoveredScatterIndex === point.index ? 1.0 : 0.9}
                          />
                        ))}
                    </Scatter>
                  )}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3">
            共 {scatterPosts.length} 篇隨機挑選的市場貼文樣本
          </p>
      </div>

      {/* 改進建議 */}
      <ImprovementSuggestions
        suggestions={suggestions}
        onShowABTest={() => setShowABTest(true)}
      />

      {/* A/B 測試按鈕（始終顯示，即使沒有文字建議） */}
      {!showABTest && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <button
            onClick={() => setShowABTest(true)}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <span>使用 A/B 測試調整文字內容</span>
          </button>
        </div>
      )}

      {/* A/B 測試面板 */}
      {showABTest && (
        <ABTestPanel
          originalText={originalText}
          originalImage={originalImage}
          originalAnalysis={analysisData}
          onApplyChanges={handleApplyABTest}
          initialModifiedText={externalABTestData?.modifiedText}
          initialModifiedAnalysis={externalABTestData?.modifiedAnalysis}
          onDataChange={onABTestDataChange}
        />
      )}
    </div>
  );
};

export default PostAnalysisResult;

