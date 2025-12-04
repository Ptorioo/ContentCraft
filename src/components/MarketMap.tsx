// 市場地圖 Tab B
import React, { useState, useEffect } from 'react';
import { Map, TrendingUp, Info } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, ReferenceLine } from 'recharts';
import { formatBrandName } from '../utils/brandNames';

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
  method: string;
}

interface MarketMapStats {
  totalBrands: number;
  avgAti: number;
  avgDs: number;
  convergenceIndex: number;
  atiStd: number;
}

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
  const [method, setMethod] = useState<'simple' | 'ati_ds' | 'pca' | 'positioning'>('positioning');

  useEffect(() => {
    loadMarketMap();
  }, [method]);

  const loadMarketMap = async () => {
    setLoading(true);
    try {
      const [mapRes, statsRes] = await Promise.all([
        fetch(`http://localhost:8787/api/market/map?method=${method}`),
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
    // 假設 ATI 範圍約 25-52
    const normalized = (ati - 25) / (52 - 25); // 正規化到 [0, 1]
    const hue = (1 - normalized) * 120; // 從綠色(120)到紅色(0)
    return `hsl(${hue}, 70%, 50%)`;
  };

  // 準備散佈圖數據
  const scatterData = mapData?.points.map(p => ({
    ...p,
    x: p.x * 100, // 轉換為百分比
    y: p.y * 100,
    fill: colorBy === 'ati' ? getColorByAti(p.ati) : CLUSTER_COLORS[(p.cluster || 0) % CLUSTER_COLORS.length],
  })) || [];

  // 自定義 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    const data = payload[0].payload as BrandPoint & { x: number; y: number };
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-gray-900 mb-2">{formatBrandName(data.brand)}</p>
        <div className="text-sm space-y-1">
          <p>ATI: <span className="font-medium">{data.ati.toFixed(1)}</span></p>
          <p>DS: <span className="font-medium">{data.ds.toFixed(3)}</span></p>
          <p>互動率: <span className="font-medium">{data.y_mean.toFixed(4)}</span></p>
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
      {/* 標題和說明 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <Map className="mr-2" size={24} />
          市場地圖
        </h2>
        <p className="text-gray-600">
          視覺化所有品牌在內容空間的分佈。每個點代表一個品牌，位置反映其內容特徵。
        </p>
      </div>

      {/* 市場統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-gray-500">品牌總數</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalBrands}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-gray-500">平均 ATI</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.avgAti.toFixed(1)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-gray-500">平均 DS</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{(stats.avgDs * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-gray-500">趨同度指數</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{stats.convergenceIndex.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">越高越趨同</p>
        </div>
      </div>

      {/* 控制面板 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              顏色依據
            </label>
            <select
              value={colorBy}
              onChange={(e) => setColorBy(e.target.value as 'ati' | 'cluster')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="ati">ATI 高低</option>
              <option value="cluster">聚類群組</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              降維方法
            </label>
            <select
              value={method}
              onChange={(e) => {
                setMethod(e.target.value as 'simple' | 'ati_ds' | 'pca' | 'positioning');
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="positioning">品牌定位圖 (DS vs ATI)</option>
              <option value="simple">標準化 (Z-score)</option>
              <option value="ati_ds">ATI vs DS (標準化)</option>
              <option value="pca">PCA 降維</option>
            </select>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Info size={16} />
            <span>
              {colorBy === 'ati' 
                ? '顏色：綠色=新穎(低ATI)，紅色=平均(高ATI)'
                : '顏色：不同群組代表不同的內容風格'}
            </span>
          </div>
        </div>
      </div>

      {/* 散佈圖 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {method === 'positioning' ? '品牌定位圖' : '品牌分佈圖'}
        </h3>
        <div className="h-96 relative">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 40, left: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              {method === 'positioning' ? (
                <>
                  <XAxis 
                    type="number" 
                    dataKey="ds" 
                    name="DS"
                    domain={[0, 1]}
                    label={{ value: '內容多樣性 (DS)', position: 'insideBottom', offset: -5 }}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    type="number" 
                    dataKey="ati" 
                    name="ATI"
                    label={{ value: '趨同程度 (ATI)', angle: -90, position: 'insideLeft' }}
                    stroke="#6b7280"
                  />
                  {/* 象限劃分線 */}
                  {stats && (
                    <>
                      <ReferenceLine 
                        x={stats.avgDs}
                        stroke="#9ca3af"
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        strokeOpacity={0.5}
                      />
                      <ReferenceLine 
                        y={stats.avgAti}
                        stroke="#9ca3af"
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        strokeOpacity={0.5}
                      />
                    </>
                  )}
                </>
              ) : (
                <>
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="X"
                    label={{ value: 'X 軸（內容特徵 1）', position: 'insideBottom', offset: -5 }}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Y"
                    label={{ value: 'Y 軸（內容特徵 2）', angle: -90, position: 'insideLeft' }}
                    stroke="#6b7280"
                  />
                </>
              )}
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Scatter 
                name="品牌" 
                data={method === 'positioning' ? mapData?.points.map(p => ({
                  ...p,
                  fill: colorBy === 'ati' ? getColorByAti(p.ati) : CLUSTER_COLORS[(p.cluster || 0) % CLUSTER_COLORS.length],
                })) || [] : scatterData} 
                fill="#AE9FD0"
              >
                {(method === 'positioning' ? mapData?.points.map(p => ({
                  ...p,
                  fill: colorBy === 'ati' ? getColorByAti(p.ati) : CLUSTER_COLORS[(p.cluster || 0) % CLUSTER_COLORS.length],
                })) || [] : scatterData).map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fill}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          {method === 'positioning' && stats && (
            <div className="absolute top-4 right-4 bg-white/90 border border-gray-200 rounded-lg p-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-green-700 font-semibold">高度差異化<br/>低趨同</div>
                <div className="text-blue-700 font-semibold">高度差異化<br/>高趨同</div>
                <div className="text-purple-700 font-semibold">低度差異化<br/>低趨同</div>
                <div className="text-red-700 font-semibold">低度差異化<br/>高趨同</div>
              </div>
              <p className="text-gray-500 mt-2 text-center">
                平均線: DS={stats.avgDs.toFixed(2)}, ATI={stats.avgAti.toFixed(1)}
              </p>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-4 text-center">
          * 滑鼠移到點上可查看品牌詳細資訊
        </p>
      </div>

      {/* 聚類說明 */}
      {colorBy === 'cluster' && (
        <div className="bg-[#F5F2F7] border border-[#D4C9E0] rounded-xl p-4">
          <h4 className="font-semibold text-[#5A4A6F] mb-2">聚類說明</h4>
          <p className="text-sm text-[#7A6B8F]">
            品牌被自動分成 {mapData.clusters} 個群組，每個群組代表相似的內容風格。
            群組越集中，表示市場越趨同；群組越分散，表示市場越多元。
          </p>
        </div>
      )}

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
        </p>
      </div>
    </div>
  );
};

export default MarketMap;

