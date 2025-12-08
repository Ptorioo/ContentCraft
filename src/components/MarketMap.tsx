// 市場地圖 Tab B
import React, { useState, useEffect, useMemo } from 'react';
import { Map, TrendingUp, Info, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, TooltipProps } from 'recharts';
import { formatBrandName } from '../utils/brandNames';
import brandRankingsJson from '../data/generated/brand_rankings.json';
import noveltyDiversityScatterJson from '../data/generated/novelty_diversity_scatter.json';

interface BrandPoint {
  brand: string;
  x: number;
  y: number;
  ati: number;
  ds: number;
  y_mean: number;
  n_posts: number;
  cluster?: number;
}

interface MarketMapData {
  points: BrandPoint[];
  clusters: number;
  method: string;  // 'embedding_based', 'ati_aware', 或 'legacy'
  reduction_method?: string;  // 'UMAP', 'PCA', 'UMAP_polar_with_ATI_radius' 等
  explained_variance?: number;  // 解釋變異或距離保留相關性
  strategy?: string;  // 'distance', 'axis', 'radius', 'corner', 'center', 'cluster_center'
  ati_distance_correlation?: number;  // ATI 與距離的相關性
  ati_cluster_distance_correlation?: number;  // ATI 與到聚類中心距離的相關性
}

interface MarketMapStats {
  totalBrands: number;
  avgAti: number;
  avgDs: number;
  convergenceIndex: number;
  atiStd: number;
}

interface BrandRiskMetric {
  brandId: string;
  brandName: string;
  ati: number;
  novelty: number;
  diversity: number;
  postCount: number;
  followerCount: number;
  samplePostId?: string;
}

const RiskTable: React.FC<{
  title: string;
  description: string;
  rows: BrandRiskMetric[];
}> = ({ title, description, rows }) => {
  // 根據標題判斷是 High Risk 還是 Resilient
  const isHighRisk = title.includes('High Risk') || title.includes('Average Trap');
  
  const [sortBy, setSortBy] = useState<'ati' | 'novelty' | 'diversity'>('ati');
  
  const sortedRows = React.useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      if (sortBy === 'ati') {
        // High Risk: ATI 高到低, Resilient: ATI 低到高
        return isHighRisk ? b.ati - a.ati : a.ati - b.ati;
      } else if (sortBy === 'novelty') {
        // High Risk: Novelty 低到高, Resilient: Novelty 高到低
        return isHighRisk ? a.novelty - b.novelty : b.novelty - a.novelty;
      } else if (sortBy === 'diversity') {
        // High Risk: Diversity 低到高, Resilient: Diversity 高到低
        return isHighRisk ? a.diversity - b.diversity : b.diversity - a.diversity;
      }
      return 0;
    });
    return sorted.slice(0, 5);
  }, [rows, sortBy, isHighRisk]);

  const handleSort = (field: 'ati' | 'novelty' | 'diversity') => {
    setSortBy(field);
  };

  // 獲取排序指示器
  const getSortIndicator = (field: 'ati' | 'novelty' | 'diversity') => {
    if (sortBy !== field) return null;
    if (field === 'ati') {
      return isHighRisk ? '↓' : '↑';
    } else {
      return isHighRisk ? '↑' : '↓';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <AlertTriangle className="text-amber-500" size={20} />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-gray-500 uppercase text-xs">
            <tr>
              <th className="text-left pb-2">品牌</th>
              <th className="text-right pb-2">
                <button
                  onClick={() => handleSort('ati')}
                  className="flex items-center justify-end gap-1 hover:text-gray-700 transition-colors w-full"
                >
                  <span>ATI</span>
                  {getSortIndicator('ati') && (
                    <span className="text-xs">{getSortIndicator('ati')}</span>
                  )}
                </button>
              </th>
              <th className="text-right pb-2">
                <button
                  onClick={() => handleSort('novelty')}
                  className="flex items-center justify-end gap-1 hover:text-gray-700 transition-colors w-full"
                >
                  <span>Novelty</span>
                  {getSortIndicator('novelty') && (
                    <span className="text-xs">{getSortIndicator('novelty')}</span>
                  )}
                </button>
              </th>
              <th className="text-right pb-2">
                <button
                  onClick={() => handleSort('diversity')}
                  className="flex items-center justify-end gap-1 hover:text-gray-700 transition-colors w-full"
                >
                  <span>Diversity</span>
                  {getSortIndicator('diversity') && (
                    <span className="text-xs">{getSortIndicator('diversity')}</span>
                  )}
                </button>
              </th>
              <th className="text-right pb-2">貼文數</th>
              <th className="text-right pb-2">追蹤數</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedRows.map((row) => (
              <tr key={row.brandId} className="hover:bg-gray-50">
                <td className="py-3 font-medium text-gray-900">{formatBrandName(row.brandName)}</td>
                <td className="py-3 text-right text-gray-700">{row.ati.toFixed(1)}</td>
                <td className="py-3 text-right text-gray-700">{row.novelty.toFixed(2)}</td>
                <td className="py-3 text-right text-gray-700">{row.diversity.toFixed(2)}</td>
                <td className="py-3 text-right text-gray-700">{row.postCount}</td>
                <td className="py-3 text-right text-gray-700">
                  {(row.followerCount / 1000).toFixed(1)}k
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CLUSTER_COLORS = [
  '#AE9FD0', // 紫色（卡片用）
  '#ec4899', // 粉紅色
  '#e9c7c6', // 米色（原綠色）
  '#f59e0b', // 橘色
  '#9fc3d0', // 淺藍色（原藍色）
  '#ef4444', // 紅色
];

const MarketMap: React.FC = () => {
  const [mapData, setMapData] = useState<MarketMapData | null>(null);
  const [stats, setStats] = useState<MarketMapStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [colorBy, setColorBy] = useState<'ati' | 'cluster'>('ati');
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(null);
  const [hoveredScatterIndex, setHoveredScatterIndex] = useState<number | null>(null);
  
  // 載入品牌排名數據
  const brandRankings = brandRankingsJson as {
    highRiskBrands: BrandRiskMetric[];
    resilientBrands: BrandRiskMetric[];
  };

  // Novelty × Diversity 分佈數據
  const scatterPreview = (noveltyDiversityScatterJson as BrandRiskMetric[]).slice(0, 3);
  const scatterData = useMemo(
    () =>
      (noveltyDiversityScatterJson as BrandRiskMetric[]).map((item, index) => ({
        ...item,
        followerCountK: item.followerCount / 1000,
        index, // 添加索引以便追蹤
      })),
    []
  );

  // 計算動態軸範圍（根據實際數據範圍，加上 10% 邊距）
  const axisRanges = useMemo(() => {
    if (scatterData.length === 0) {
      return { novelty: [0, 1], diversity: [0, 1] };
    }
    
    const novelties = scatterData.map(d => d.novelty);
    const diversities = scatterData.map(d => d.diversity);
    
    const novMin = Math.min(...novelties);
    const novMax = Math.max(...novelties);
    const novRange = novMax - novMin;
    const novPadding = novRange * 0.1;
    
    const divMin = Math.min(...diversities);
    const divMax = Math.max(...diversities);
    const divRange = divMax - divMin;
    const divPadding = divRange * 0.1;
    
    return {
      novelty: [Math.max(0, novMin - novPadding), Math.min(1, novMax + novPadding)],
      diversity: [Math.max(0, divMin - divPadding), Math.min(1, divMax + divPadding)],
    };
  }, [scatterData]);

  // 計算 ATI 的範圍（用於顏色映射）
  const atiRange = useMemo(() => {
    if (scatterData.length === 0) return { min: 0, max: 50 };
    const atis = scatterData.map(d => d.ati);
    return {
      min: Math.min(...atis),
      max: Math.max(...atis),
    };
  }, [scatterData]);

  // 根據 ATI 值計算顏色（從藍色到紅色）
  const getColorByAtiForScatter = (ati: number): string => {
    const normalized = (ati - atiRange.min) / (atiRange.max - atiRange.min);
    // 使用漸層：低 ATI (藍色) -> 高 ATI (紅色)
    if (normalized < 0.5) {
      // 藍色到黃色
      const t = normalized * 2;
      const r = Math.round(34 + (255 - 34) * t);
      const g = Math.round(197 + (193 - 197) * t);
      const b = Math.round(220 + (7 - 220) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // 黃色到紅色
      const t = (normalized - 0.5) * 2;
      const r = 255;
      const g = Math.round(193 - 193 * t);
      const b = Math.round(7 - 7 * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  // ScatterTooltip 組件
  const ScatterTooltip = React.useCallback((props: TooltipProps<number, string>) => {
    const { active, payload } = props as any;
    React.useEffect(() => {
      if (!active || !payload || payload.length === 0) {
        setHoveredScatterIndex(null);
      } else {
        const point = payload[0]?.payload as BrandRiskMetric & { followerCountK: number; index?: number };
        if (point?.index !== undefined) {
          setHoveredScatterIndex(point.index);
        }
      }
    }, [active, payload]);
    
    if (!active || !payload || payload.length === 0) {
      return null;
    }
    const point = payload[0]?.payload as BrandRiskMetric & { followerCountK: number; index?: number };
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md text-sm text-gray-700">
        <p className="font-semibold text-gray-900">{formatBrandName(point.brandName)}</p>
        <p>ATI {point.ati.toFixed(1)}</p>
        <p>Novelty {point.novelty.toFixed(2)}</p>
        <p>Diversity {point.diversity.toFixed(2)}</p>
        <p>貼文數 {point.postCount}</p>
        <p>追蹤數 {(point.followerCount / 1000).toFixed(1)}k</p>
      </div>
    );
  }, []);

  useEffect(() => {
    loadMarketMap();
  }, []);

  const loadMarketMap = async () => {
    setLoading(true);
    try {
      const [mapRes, statsRes] = await Promise.all([
        fetch('http://localhost:8787/api/market/map?method=positioning'),
        fetch('http://localhost:8787/api/market/map/stats'),
      ]);
      
      const mapData = await mapRes.json();
      const statsData = await statsRes.json();
      
      setMapData(mapData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load market map:', error);
    } finally {
      setLoading(false);
    }
  };

  // 根據 ATI 計算顏色
  const getColorByAti = (ati: number): string => {
    // ATI 越低越好（越新穎），所以用綠色到紅色
    // 動態計算 ATI 範圍
    if (!mapData || mapData.points.length === 0) {
      return `hsl(120, 70%, 50%)`; // 預設綠色
    }
    const atiValues = mapData.points.map(p => p.ati);
    const atiMin = Math.min(...atiValues);
    const atiMax = Math.max(...atiValues);
    const atiRange = atiMax - atiMin || 1;
    const normalized = (ati - atiMin) / atiRange; // 正規化到 [0, 1]
    const hue = (1 - normalized) * 120; // 從綠色(120)到紅色(0)
    return `hsl(${hue}, 70%, 50%)`;
  };

  // 獲取當前懸停品牌的 cluster
  const hoveredCluster = hoveredBrand 
    ? mapData?.points.find(p => p.brand === hoveredBrand)?.cluster 
    : null;

  // 計算每個點的透明度和樣式
  const getPointStyle = (point: BrandPoint) => {
    const isSameCluster = hoveredCluster !== null && hoveredCluster !== undefined && point.cluster === hoveredCluster;
    const opacity = hoveredBrand === null ? 1 : (isSameCluster ? 1 : 0.2);
    const strokeWidth = isSameCluster ? 2.5 : 0.5;
    const strokeColor = isSameCluster ? '#1f2937' : 'transparent';
    
    return {
      opacity,
      strokeWidth,
      stroke: strokeColor,
    };
  };

  // 自定義 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    const data = payload[0].payload as BrandPoint & { x: number; y: number };
    
    return (
      <div 
        className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg"
        onMouseEnter={() => setHoveredBrand(data.brand)}
        onMouseLeave={() => setHoveredBrand(null)}
      >
        <p className="font-semibold text-gray-900 mb-2">{formatBrandName(data.brand)}</p>
        <div className="text-sm space-y-1">
          <p>ATI: <span className="font-medium">{data.ati.toFixed(1)}</span></p>
          <p>貼文數: <span className="font-medium">{data.n_posts}</span></p>
          {data.cluster !== undefined && (
            <p>群組: <span className="font-medium">#{data.cluster + 1}</span></p>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">載入市場地圖中...</div>
      </div>
    );
  }

  if (!mapData || !stats) {
    return (
      <div className="p-6">
        <div className="text-center text-red-500">無法載入市場地圖數據</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 標題 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <Map className="mr-2" size={24} />
          市場地圖
        </h2>
      </div>

      {/* Novelty × Diversity 分佈 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            品牌定位圖
          </h3>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColorByAtiForScatter(atiRange.min) }}></div>
              <span>低 ATI</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColorByAtiForScatter(atiRange.max) }}></div>
              <span>高 ATI</span>
            </div>
          </div>
        </div>
        <div className="h-80 w-full mb-4" style={{ minWidth: 0, minHeight: 320 }}>
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
                label={{ value: 'Novelty', position: 'bottom', offset: 10, style: { textAnchor: 'middle' } }}
                allowDataOverflow={false}
              />
              <YAxis
                type="number"
                dataKey="diversity"
                name="Diversity"
                domain={axisRanges.diversity}
                tickFormatter={(value: number) => value.toFixed(3)}
                label={{ value: 'Diversity', angle: -90, position: 'left', offset: 15, style: { textAnchor: 'middle' } }}
                allowDataOverflow={false}
              />
              <ZAxis dataKey="ati" range={[10, 60]} />
              <Tooltip 
                content={ScatterTooltip} 
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Scatter 
                data={scatterData}
              >
                {scatterData.map((point, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColorByAtiForScatter(point.ati)}
                    fillOpacity={
                      hoveredScatterIndex === null 
                        ? 0.7 
                        : hoveredScatterIndex === index 
                          ? 1.0 
                          : 0.2
                    }
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {scatterPreview.map((brand) => (
            <div key={brand.brandId} className="flex justify-between text-sm text-gray-700">
              <span className="font-medium text-gray-900">{formatBrandName(brand.brandName)}</span>
              <span>
                ATI {brand.ati.toFixed(1)} · N {brand.novelty.toFixed(2)} · D{' '}
                {brand.diversity.toFixed(2)}
              </span>
            </div>
          ))}
          <p className="text-xs text-gray-400 mt-3">
            共 {(noveltyDiversityScatterJson as BrandRiskMetric[]).length} 個品牌樣本；圖表可使用全部資料點。
          </p>
        </div>
      </div>

      {/* 品牌風險分析表格 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RiskTable
          title="High Risk（Average Trap）品牌"
          description="連續趨近平均，需建議差異化策略"
          rows={brandRankings.highRiskBrands}
        />
        <RiskTable
          title="Resilient（保持差異）品牌"
          description="Novelty 與 Diversity 均衡，值得作為標竿"
          rows={brandRankings.resilientBrands}
        />
      </div>

      {/* 趨同度說明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
          <TrendingUp className="mr-2" size={16} />
          趨同度分析
        </h4>
        <p className="text-sm text-blue-700 mb-2">
          趨同度指數：{stats.convergenceIndex.toFixed(1)}%
        </p>
        <p className="text-xs text-blue-600">
          {stats.convergenceIndex > 80 
            ? '⚠️ 市場高度趨同：大部分品牌內容相似，缺乏差異化'
            : stats.convergenceIndex > 60
            ? '⚠️ 市場中度趨同：部分品牌內容相似'
            : '✅ 市場較為多元：品牌內容有明顯差異'}
          {mapData?.method === 'embedding_based' && (
            <span className="block mt-1 text-xs text-gray-500">
              （基於 CLIP embedding 語意相似度計算）
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default MarketMap;

