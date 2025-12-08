import React, { useMemo, useState } from 'react';
import {
  AnalyticsDataset,
  BrandRiskMetric,
  TailOutlierPost,
} from '../types/analytics';
import { ArrowLeft, TrendingUp, AlertTriangle, Sparkles, BarChart3, Map } from 'lucide-react';
import BrandDashboard from './BrandDashboard';
import MarketMap from './MarketMap';
import { formatBrandName } from '../utils/brandNames';
import {
  ResponsiveContainer,
  ScatterChart,
  LineChart,
  Cell,
  Bar,
  ComposedChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Scatter,
  TooltipProps,
  Legend,
} from 'recharts';

interface AnalyticsDashboardProps {
  data: AnalyticsDataset;
  onBackToChat: () => void;
}


const RiskTable: React.FC<{
  title: string;
  description: string;
  rows: BrandRiskMetric[];
}> = ({ title, description, rows }) => (
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
            <th className="text-right pb-2">ATI</th>
            <th className="text-right pb-2">Novelty</th>
            <th className="text-right pb-2">Diversity</th>
            <th className="text-right pb-2">貼文數</th>
            <th className="text-right pb-2">追蹤數</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
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

// 長尾貼文檔案夾的固定 URL（按順序對應前 6 個貼文）
const LONG_TAIL_POST_URLS = [
  'https://www.instagram.com/reel/DNTA_FxyWFD/',
  'https://www.instagram.com/p/DJWP2pIyDz3/',
  'https://www.instagram.com/reel/DL9-XPXRD23/',
  'https://www.instagram.com/reel/DMt686DTUb5/',
  'https://www.instagram.com/reel/DMXZt3CS7K_/',
  'https://www.instagram.com/reel/DMxpr3LRQQD/',
];

const OutlierList: React.FC<{ posts: Array<TailOutlierPost & { displayIndex?: number }> }> = ({ posts }) => (
  <div className="grid gap-4 md:grid-cols-2">
    {posts.map((post, index) => {
      // 確保所有數值都存在且有效
      const ati = post.ati ?? 0;
      const likeCount = post.likeCount ?? 0;
      const commentCount = post.commentCount ?? 0;
      const followerCount = post.followerCount ?? 0;
      
      // 使用 displayIndex 如果存在，否則使用 index + 1
      const displayNumber = post.displayIndex ?? (index + 1);
      
      // 獲取對應的 URL（根據 displayIndex 對應，第1、2篇用前兩個URL，第4、5、6、7篇用後四個URL）
      let postUrl: string | undefined;
      if (displayNumber === 1) {
        postUrl = LONG_TAIL_POST_URLS[0];
      } else if (displayNumber === 2) {
        postUrl = LONG_TAIL_POST_URLS[1];
      } else if (displayNumber === 4) {
        postUrl = LONG_TAIL_POST_URLS[2];
      } else if (displayNumber === 5) {
        postUrl = LONG_TAIL_POST_URLS[3];
      } else if (displayNumber === 6) {
        postUrl = LONG_TAIL_POST_URLS[4];
      } else if (displayNumber === 7) {
        postUrl = LONG_TAIL_POST_URLS[5];
      }
      
      const PostCard = (
        <div
          className={`bg-white border border-gray-200 rounded-xl p-4 flex gap-4 shadow-sm transition-shadow ${
            postUrl ? 'hover:shadow-md cursor-pointer' : ''
          }`}
        >
          <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center relative flex-shrink-0">
          {post.imageUrl ? (
            <img
              src={post.imageUrl}
                alt={post.brandName || 'Post'}
              className="w-full h-full object-cover"
            />
          ) : (
            <Sparkles className="text-purple-500" size={24} />
          )}
            <div className="absolute top-1 left-1 bg-purple-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {displayNumber}
        </div>
          </div>
          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900 truncate">{formatBrandName(post.brandName || '未知品牌')}</p>
            </div>
            <p className="text-xs text-gray-500">{post.date || '日期未知'}</p>
            <p className="text-sm text-gray-700 line-clamp-5 break-words">{post.captionSnippet || '無描述'}</p>
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              <span className="font-medium">ATI {ati.toFixed(1)}</span>
              <span>❤️ {likeCount.toLocaleString()}</span>
              <span>💬 {commentCount.toLocaleString()}</span>
              {followerCount > 0 && (
                <span className="text-gray-400">👥 {(followerCount / 1000).toFixed(0)}k</span>
              )}
          </div>
        </div>
      </div>
      );
      
      // 如果有 URL，則包裝在 <a> 標籤中
      return postUrl ? (
        <a
          key={post.postId || `post-${index}`}
          href={postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {PostCard}
        </a>
      ) : (
        <div key={post.postId || `post-${index}`}>
          {PostCard}
        </div>
      );
    })}
  </div>
);

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ data, onBackToChat }) => {
  const [activeTab, setActiveTab] = useState<'brand' | 'market' | 'overview'>('overview');
  const [selectedCase, setSelectedCase] = useState(data.caseStudies[0]?.brandId ?? '');
  const activeCase = data.caseStudies.find((c) => c.brandId === selectedCase) ?? data.caseStudies[0];
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0);
  const [marketTrend, setMarketTrend] = useState<Array<{date: string; avgAti: number; avgNovelty: number; avgDiversity: number}>>([]);
  const [decilesData, setDecilesData] = useState<any[]>([]);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [loadingDeciles, setLoadingDeciles] = useState(false);
  const [hoveredScatterIndex, setHoveredScatterIndex] = useState<number | null>(null);
  const [tailOutliers, setTailOutliers] = useState<TailOutlierPost[]>([]);
  const [loadingTailOutliers, setLoadingTailOutliers] = useState(false);
  const [summary, setSummary] = useState(data.summary);
  
  const scatterPreview = data.noveltyDiversityScatter.slice(0, 3);
  const scatterData = useMemo(
    () =>
      data.noveltyDiversityScatter.map((item, index) => ({
        ...item,
        followerCountK: item.followerCount / 1000,
        index, // 添加索引以便追蹤
      })),
    [data.noveltyDiversityScatter]
  );

  // 載入市場摘要數據（包含高風險品牌）
  React.useEffect(() => {
    if (activeTab === 'overview') {
      fetch('http://localhost:8787/api/market/summary')
        .then(res => res.json())
        .then(result => {
          setSummary(result);
        })
        .catch(err => {
          console.error('Failed to load market summary:', err);
          // 失敗時使用原始數據
        });
    }
  }, [activeTab]);

  // 載入市場趨勢數據
  React.useEffect(() => {
    if (activeTab === 'overview') {
      setLoadingTrend(true);
      fetch('http://localhost:8787/api/market/trend')
        .then(res => res.json())
        .then(result => {
          setMarketTrend(result.trend || []);
          setLoadingTrend(false);
        })
        .catch(err => {
          console.error('Failed to load market trend:', err);
          setLoadingTrend(false);
        });
    }
  }, [activeTab]);

  // 載入分箱數據
  React.useEffect(() => {
    if (activeTab === 'overview') {
      setLoadingDeciles(true);
      fetch('http://localhost:8787/api/market/deciles')
        .then(res => res.json())
        .then(result => {
          setDecilesData(result.deciles || []);
          setLoadingDeciles(false);
        })
        .catch(err => {
          console.error('Failed to load deciles:', err);
          setLoadingDeciles(false);
        });
    }
  }, [activeTab]);


  // 載入高同質化貼文數據（ATI 最高的貼文）
  React.useEffect(() => {
    if (activeTab === 'overview') {
      setLoadingTailOutliers(true);
      fetch('http://localhost:8787/api/market/high-ati-posts?limit=7')
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(result => {
          console.log('[AnalyticsDashboard] High ATI posts result:', result);
          const posts = result.posts || result.outliers || [];
          console.log('[AnalyticsDashboard] Parsed posts:', posts.length);
          setTailOutliers(posts);
          setLoadingTailOutliers(false);
        })
        .catch(err => {
          console.error('Failed to load high ATI posts:', err);
          setTailOutliers([]);
          setLoadingTailOutliers(false);
        });
    }
  }, [activeTab]);


  // 自定義 Tooltip 組件，用於處理 hover 狀態
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

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">IG 內容同質化分析平台</h2>
            <p className="text-sm text-gray-500">
              量化你的貼文與市場的相似度，找出最像你的競品
            </p>
          </div>
          <button
            onClick={onBackToChat}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={16} />
            回到對話介面
          </button>
        </div>

        {/* Tab 切換 */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('brand')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'brand'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 size={18} />
                <span>品牌儀表板</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('market')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'market'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Map size={18} />
                <span>市場地圖</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 size={18} />
                <span>總覽分析</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Tab 內容 */}
        {activeTab === 'brand' && <BrandDashboard />}
        {activeTab === 'market' && <MarketMap />}

        {/* 總覽分析 Tab - 顯示原本的內容 */}
        {activeTab === 'overview' && (
        <>
        <section>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs uppercase font-semibold text-gray-500">平均 ATI</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {summary.avgAti.toFixed(1)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                更新時間 {new Date(summary.lastUpdated).toLocaleString()}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs uppercase font-semibold text-gray-500">監測品牌</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary.totalBrands}</p>
              <p className="text-sm text-gray-500 mt-1">
                時間範圍 {summary.timeframeLabel}，共 {summary.totalPosts} 則貼文
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs uppercase font-semibold text-gray-500">高風險品牌</p>
              <p className="text-3xl font-bold text-rose-600 mt-2">
                {summary.highRiskBrandCount}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {summary.highRiskDefinition ?? 'ATI 正1.5個標準差以上'}
                {summary.highRiskThreshold != null && (
                  <span>（閾值 ≧ {summary.highRiskThreshold.toFixed(1)}）</span>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* 第一行：左 55% 右 45% 寬度比例 */}
        <section className="grid gap-6 lg:grid-cols-[11fr_9fr] lg:items-stretch">
          {/* 左側：上下排列兩個圖表 */}
          <div className="space-y-6">
            {/* ATI 時間序列 */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">ATI 時間序列</h3>
                <TrendingUp className="text-purple-500" size={20} />
              </div>
              {loadingTrend ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  載入中...
                    </div>
              ) : marketTrend.length > 0 ? (
                <div className="h-64 w-full" style={{ minWidth: 0, minHeight: 256 }}>
                  <ResponsiveContainer width="100%" height={256}>
                    <LineChart data={marketTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        yAxisId="left"
                        stroke="#AE9FD0"
                        style={{ fontSize: '12px' }}
                        label={{ value: 'ATI', angle: -90, position: 'insideLeft', style: { fill: '#AE9FD0' } }}
                        domain={[0, 100]}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                        label={{ value: 'Novelty / Diversity', angle: 90, position: 'insideRight', style: { fill: '#6b7280' } }}
                        domain={[0, 1]}
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          return (
                            <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md text-sm">
                              <p className="font-semibold text-gray-900 mb-2">{label}</p>
                              {payload.map((entry: any, index: number) => {
                                const value = typeof entry.value === 'number' ? entry.value.toFixed(3) : entry.value;
                                return (
                                  <p key={index} style={{ color: entry.color }}>
                                    {entry.name}: {value}
                                  </p>
                                );
                              })}
                            </div>
                          );
                        }}
                      />
                      <Legend />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="avgAti" 
                        stroke="#AE9FD0" 
                        strokeWidth={2}
                        dot={{ fill: '#AE9FD0', r: 4 }}
                        name="ATI"
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="avgNovelty" 
                        stroke="#e9c7c6" 
                        strokeWidth={2}
                        dot={{ fill: '#e9c7c6', r: 4 }}
                        name="Novelty"
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="avgDiversity" 
                        stroke="#9fc3d0" 
                        strokeWidth={2}
                        dot={{ fill: '#9fc3d0', r: 4 }}
                        name="Diversity"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  無數據可用
              </div>
              )}
              <p className="mt-4 text-xs text-gray-400">
                * 時間序列按貼文順序分組
              </p>
            </div>

            {/* Novelty × Diversity 分佈 */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Novelty × Diversity 分佈
              </h3>
              <div className="h-80 w-full mb-4" style={{ minWidth: 0, minHeight: 320 }}>
                <ResponsiveContainer width="100%" height={320}>
                  <ScatterChart 
                    margin={{ top: 16, right: 16, bottom: 32, left: 16 }}
                    onMouseLeave={() => setHoveredScatterIndex(null)}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      type="number"
                      dataKey="novelty"
                      name="Novelty"
                      domain={[0, 1]}
                      tickFormatter={(value: number) => value.toFixed(2)}
                      label={{ value: 'Novelty', position: 'insideBottomRight', offset: -10 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="diversity"
                      name="Diversity"
                      domain={[0, 1]}
                      tickFormatter={(value: number) => value.toFixed(2)}
                      label={{ value: 'Diversity', angle: -90, position: 'insideLeft', offset: 10 }}
                    />
                    <ZAxis dataKey="ati" range={[10, 60]} />
                    <Tooltip 
                      content={ScatterTooltip} 
                      cursor={{ strokeDasharray: '3 3' }}
                    />
                    <Scatter 
                      data={scatterData} 
                      fill="#7c3aed"
                    >
                      {scatterData.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill="#7c3aed"
                          fillOpacity={
                            hoveredScatterIndex === null 
                              ? 0.7 
                              : hoveredScatterIndex === index 
                                ? 0.9 
                                : 0.15
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
                  共 {data.noveltyDiversityScatter.length} 個品牌樣本；圖表可使用全部資料點。
                </p>
              </div>
            </div>
          </div>

          {/* 右側：高同質化貼文 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col h-full">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">高同質化貼文</h3>
              <p className="text-xs text-gray-500 mt-1">
                顯示 ATI 最高的 6 篇貼文。這些貼文與市場平均最相似，代表內容同質化程度最高，值得特別關注。
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingTailOutliers ? (
                <div className="text-gray-500 text-sm">載入中...</div>
              ) : tailOutliers.length > 0 ? (
                <OutlierList posts={[
                  tailOutliers[0],  // 第1篇
                  tailOutliers[1],  // 第2篇
                  tailOutliers[3],  // 第4篇（跳過第3篇）
                  tailOutliers[4],  // 第5篇
                  tailOutliers[5],  // 第6篇
                  tailOutliers[6],  // 第7篇
                ].filter(Boolean).map((post, displayIndex) => ({
                  ...post,
                  displayIndex: displayIndex < 2 ? displayIndex + 1 : displayIndex + 2, // 第1、2篇顯示1、2，之後顯示4、5、6、7
                }))} />
              ) : (
                <div className="text-gray-500 text-sm">無數據可用</div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <RiskTable
            title="High Risk（Average Trap）品牌"
            description="連續趨近平均，需建議差異化策略"
            rows={data.topHighRiskBrands}
          />
          <RiskTable
            title="Resilient（保持差異）品牌"
            description="Novelty 與 Diversity 均衡，值得作為標竿"
            rows={data.resilientBrands}
          />
        </section>

        {activeCase && (
          <section className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">案例深潛分析</h3>
                <p className="text-sm text-gray-500">
                  比較平均陷阱風險最高／最低品牌的貼文內容，並探索手動調整後的 ATI 變化。
                </p>
              </div>
              <div className="flex items-center gap-2">
                {data.caseStudies.map((cs) => (
                  <button
                    key={cs.brandId}
                    onClick={() => {
                      setSelectedCase(cs.brandId);
                      setSelectedScenarioIdx(0);
                    }}
                    className={`
                      text-sm font-medium px-3 py-2 rounded-lg border
                      ${activeCase.brandId === cs.brandId
                        ? 'border-[#AE9FD0] bg-[#F5F2F7] text-[#7A6B8F]'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    {formatBrandName(cs.brandName)}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-5 grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{formatBrandName(activeCase.brandName)}</p>
                    <p className="text-xs text-gray-500">{activeCase.rationale}</p>
                  </div>
                  <span
                    className={`
                      text-xs font-semibold px-2 py-1 rounded-full
                      ${activeCase.trapRanking === 'highest' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}
                    `}
                  >
                    {activeCase.trapRanking === 'highest' ? '平均陷阱高' : '保持差異'}
                  </span>
                </div>
                {activeCase.baseline.url ? (
                  <a
                    href={activeCase.baseline.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  >
                    {activeCase.baseline.imageUrl ? (
                      <img
                        src={activeCase.baseline.imageUrl}
                        alt={activeCase.brandName}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                        <Sparkles className="text-purple-500" size={28} />
                      </div>
                    )}
                    <div className="p-4 space-y-2 text-sm text-gray-700">
                      <p className="text-xs text-gray-500">{activeCase.baseline.date}</p>
                      <p className="font-medium text-gray-900">{activeCase.baseline.captionSnippet}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span>ATI {activeCase.baseline.ati.toFixed(1)}</span>
                        <span>Novelty {activeCase.baseline.novelty.toFixed(2)}</span>
                        <span>Diversity {activeCase.baseline.diversity.toFixed(2)}</span>
                        <span>❤️ {activeCase.baseline.likeCount}</span>
                        <span>💬 {activeCase.baseline.commentCount}</span>
                      </div>
                      <p className="text-xs text-blue-600 mt-2">🔗 查看原始貼文</p>
                    </div>
                  </a>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {activeCase.baseline.imageUrl ? (
                      <img
                        src={activeCase.baseline.imageUrl}
                        alt={activeCase.brandName}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                        <Sparkles className="text-purple-500" size={28} />
                      </div>
                    )}
                    <div className="p-4 space-y-2 text-sm text-gray-700">
                      <p className="text-xs text-gray-500">{activeCase.baseline.date}</p>
                      <p className="font-medium text-gray-900">{activeCase.baseline.captionSnippet}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span>ATI {activeCase.baseline.ati.toFixed(1)}</span>
                        <span>Novelty {activeCase.baseline.novelty.toFixed(2)}</span>
                        <span>Diversity {activeCase.baseline.diversity.toFixed(2)}</span>
                        <span>❤️ {activeCase.baseline.likeCount}</span>
                        <span>💬 {activeCase.baseline.commentCount}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-900">情境測試：手動調整貼文元素</p>
                <div className="flex gap-2 flex-wrap">
                  {activeCase.scenarioTests.map((scenario, index) => (
                    <button
                      key={scenario.title}
                      onClick={() => setSelectedScenarioIdx(index)}
                      className={`
                        text-sm px-3 py-2 rounded-lg border transition-colors
                        ${index === selectedScenarioIdx
                          ? 'border-[#AE9FD0] bg-[#F5F2F7] text-[#7A6B8F]'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                        }
                      `}
                    >
                      {scenario.title}
                    </button>
                  ))}
                </div>
                {activeCase.scenarioTests[selectedScenarioIdx] && (
                  <div className="border border-[#D4C9E0] bg-[#F5F2F7] rounded-lg p-4 space-y-3 text-sm text-[#5A4A6F]">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {activeCase.scenarioTests[selectedScenarioIdx].title}
                      </span>
                      <span className="text-xs font-semibold bg-white text-[#8B7BA5] px-2 py-1 rounded-full border border-[#D4C9E0]">
                        預測 ATI {activeCase.scenarioTests[selectedScenarioIdx].adjustedAti.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-[#5A4A6F]">
                      {activeCase.scenarioTests[selectedScenarioIdx].description}
                    </p>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase text-[#7A6B8F]">調整項目</p>
                      <ul className="list-disc list-inside text-[#5A4A6F] space-y-1">
                        {activeCase.scenarioTests[selectedScenarioIdx].changes.map((change) => (
                          <li key={change}>{change}</li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-xs text-[#8B7BA5]">
                      與原始貼文相比，ATI {activeCase.scenarioTests[selectedScenarioIdx].adjustedAti - activeCase.baseline.ati > 0 ? '上升' : '下降'}{' '}
                      {Math.abs(activeCase.scenarioTests[selectedScenarioIdx].adjustedAti - activeCase.baseline.ati).toFixed(1)} 點。
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}


        {/* 分箱（Decile）分析 */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">分箱（Decile）分析</h3>
          <p className="text-sm text-gray-500 mb-4">
            將 ATI 值範圍分成 10 個等距區間，檢視每個分箱的貼文數量和平均互動率
          </p>
          {loadingDeciles ? (
            <div className="h-96 flex items-center justify-center text-gray-500">
              載入中...
                </div>
          ) : decilesData.length > 0 ? (
            <div className="space-y-4">
              <div className="h-96 w-full" style={{ minWidth: 0, minHeight: 384 }}>
                <ResponsiveContainer width="100%" height={384}>
                  <ComposedChart data={decilesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="decile" 
                      label={{ value: '分箱（Decile）', position: 'insideBottom', offset: -5 }}
                      stroke="#6b7280"
                    />
                    <YAxis 
                      yAxisId="left"
                      label={{ value: '貼文數量', angle: -90, position: 'insideLeft' }}
                      stroke="#6b7280"
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right"
                      label={{ value: '平均 ATI', angle: 90, position: 'insideRight' }}
                      stroke="#6b7280"
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        if (name === 'postCount') return [`${value}`, '貼文數量'];
                        if (name === 'atiMean') return [`${value.toFixed(1)}`, '平均 ATI'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="postCount" 
                      fill="#AE9FD0" 
                      fillOpacity={0.7}
                      name="貼文數量"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="atiMean" 
                      stroke="#AE9FD0" 
                      strokeWidth={2}
                      dot={{ fill: '#AE9FD0', r: 4 }}
                      name="平均 ATI"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                {decilesData.map((decile) => (
                  <div key={decile.decile} className="border border-gray-200 rounded p-2">
                    <p className="font-semibold text-gray-900">第 {decile.decile} 箱</p>
                    <p className="text-gray-600 mt-1">ATI 範圍: {decile.atiMin.toFixed(1)} - {decile.atiMax.toFixed(1)}</p>
                    <p className="text-gray-600">平均 ATI: {decile.atiMean.toFixed(1)}</p>
                    <p className="text-gray-600">互動: {decile.engagementMean.toFixed(4)}</p>
                    <p className="text-gray-500 text-xs mt-1">{decile.postCount} 篇</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center text-gray-500">
              無數據可用
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
        </section>
        </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;


