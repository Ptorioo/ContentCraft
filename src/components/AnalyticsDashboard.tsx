import React, { useMemo, useState } from 'react';
import {
  AnalyticsDataset,
  TailOutlierPost,
} from '../types/analytics';
import { ArrowLeft, TrendingUp, Sparkles, BarChart3, Map } from 'lucide-react';
import BrandDashboard from './BrandDashboard';
import MarketMap from './MarketMap';
import { formatBrandName } from '../utils/brandNames';
import {
  ResponsiveContainer,
  ScatterChart,
  LineChart,
  Cell,
  Bar,
  BarChart,
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


// 長尾貼文檔案夾的固定 URL（按順序對應前 6 個貼文）
const LONG_TAIL_POST_URLS = [
  'https://www.instagram.com/p/DO7bFB5kc0V/',
  'https://www.instagram.com/p/DJihEgAMo6U/',
  'https://www.instagram.com/p/DINkMW1MQ9q/',
  'https://www.instagram.com/p/DLzNyxHhFT0/',
  'https://www.instagram.com/p/DJYslwQBj0m/',
  'https://www.instagram.com/p/DMwyTGpTHk4/',
];

const OutlierList: React.FC<{ posts: Array<TailOutlierPost & { displayIndex?: number }> }> = ({ posts }) => (
  <div className="space-y-4">
    {posts.map((post, index) => {
      // 確保所有數值都存在且有效
      const ati = post.ati ?? 0;
      const likeCount = post.likeCount ?? 0;
      const commentCount = post.commentCount ?? 0;
      const followerCount = post.followerCount ?? 0;
      
      // 使用 displayIndex 如果存在，否則使用 index + 1
      const displayNumber = post.displayIndex ?? (index + 1);
      
      // 獲取對應的 URL（根據 displayIndex 對應，第1-5篇分別對應 LONG_TAIL_POST_URLS[0-4]）
      let postUrl: string | undefined;
      if (displayNumber >= 1 && displayNumber <= 5) {
        postUrl = LONG_TAIL_POST_URLS[displayNumber - 1];
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
            <p className="text-sm text-gray-700 line-clamp-3 break-words">{post.captionSnippet || '無描述'}</p>
            <div className="space-y-1 text-xs text-gray-500">
              <div className="font-medium">ATI {ati.toFixed(1)}</div>
              <div>
                <span>❤️ {likeCount.toLocaleString()}</span>
                <span className="ml-2">💬 {commentCount.toLocaleString()}</span>
              </div>
              {followerCount > 0 && (
                <div className="text-gray-400">👥 {(followerCount / 1000).toFixed(0)}k</div>
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
  const [marketTrend, setMarketTrend] = useState<Array<{date: string; avgAti: number; avgNovelty: number; avgDiversity: number}>>([]);
  const [decilesData, setDecilesData] = useState<any[]>([]);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [loadingDeciles, setLoadingDeciles] = useState(false);
  const [hoveredScatterIndex, setHoveredScatterIndex] = useState<number | null>(null);
  const [tailOutliers, setTailOutliers] = useState<TailOutlierPost[]>([]);
  const [loadingTailOutliers, setLoadingTailOutliers] = useState(false);
  const [summary, setSummary] = useState(data?.summary);
  const [scatterPosts, setScatterPosts] = useState<Array<{
    postId: string;
    brandName: string;
    ati: number;
    novelty: number;
    diversity: number;
    postCount: number;
    followerCount: number;
    caption?: string;
    index: number;
  }>>([]);
  const [loadingScatterPosts, setLoadingScatterPosts] = useState(false);
  
  // 從 analyticsData 中提取用戶輸入的數據點（僅在對話介面中使用）
  const userInputPoints = useMemo(() => {
    if (!data?.noveltyDiversityScatter) return [];
    // 找出品牌名稱為 "Your input" 或包含 "user-" 的數據點
    return (data.noveltyDiversityScatter || [])
      .filter(item => item.brandName === "Your input" || item.brandId?.startsWith("user-"))
      .map((item, idx) => ({
        postId: `user-input-${idx}`,
        brandName: item.brandName || "Your input",
        ati: item.ati,
        novelty: item.novelty,
        diversity: item.diversity,
        postCount: item.postCount || 1,
        followerCount: item.followerCount || 0,
        caption: "您的輸入內容",
        index: -1 - idx, // 使用負數索引以區分用戶輸入
        isUserInput: true,
      }));
  }, [data?.noveltyDiversityScatter]);
  
  const scatterData = useMemo(
    () => {
      const marketPosts = scatterPosts.map((item, index) => ({
        ...item,
        followerCountK: item.followerCount / 1000,
        index,
        isUserInput: false,
      }));
      
      // 合併市場數據和用戶輸入數據（用戶輸入數據只在對話介面中顯示）
      return [...marketPosts, ...userInputPoints];
    },
    [scatterPosts, userInputPoints]
  );

  // 載入隨機貼文數據
  React.useEffect(() => {
    if (activeTab === 'overview') {
      setLoadingScatterPosts(true);
      fetch('http://localhost:8787/api/market/random-posts?limit=100')
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(result => {
          const posts = result.posts || [];
          setScatterPosts(posts);
          setLoadingScatterPosts(false);
        })
        .catch(err => {
          console.error('Failed to load random posts:', err);
          setScatterPosts([]);
          setLoadingScatterPosts(false);
        });
    } else {
      // 切換到其他 tab 時清空數據
      setScatterPosts([]);
    }
  }, [activeTab]);


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
  const getColorByAti = (ati: number): string => {
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


  // 載入高雷同性貼文數據（ATI 最高的貼文）
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
          const posts = result.posts || result.outliers || [];
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
        const point = payload[0]?.payload as { brandName: string; ati: number; novelty: number; diversity: number; followerCount: number; caption?: string; index?: number };
        if (point?.index !== undefined) {
          setHoveredScatterIndex(point.index);
        }
      }
    }, [active, payload]);
    
    if (!active || !payload || payload.length === 0) {
      return null;
    }
    const point = payload[0]?.payload as { brandName: string; ati: number; novelty: number; diversity: number; followerCount: number; caption?: string; index?: number };
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md text-sm text-gray-700 max-w-xs">
        <p className="font-semibold text-gray-900 mb-2">ATI {point.ati.toFixed(1)}</p>
        <p className="text-xs text-gray-500 mb-1">Novelty {point.novelty.toFixed(2)} · Diversity {point.diversity.toFixed(2)}</p>
        <p className="text-xs text-gray-700 mt-2 leading-relaxed">
          {point.caption || '（無文字內容）'}
        </p>
      </div>
    );
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">IG 內容雷同性分析平台</h2>
            <p className="text-sm text-gray-500">
              量化你的貼文與市場的相似度，找出最像你的競品
            </p>
          </div>
          <button
            onClick={onBackToChat}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={16} />
            回到貼文評估
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

        {/* 第一行：左 55% 右 45% 寬度比例 (55:45) */}
        <section className="grid gap-6 lg:grid-cols-[11fr_9fr] lg:items-stretch">
          {/* 左側：上下排列三個圖表 */}
          <div className="space-y-6">
            {/* Diversity/Novelty 時間序列 */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Diversity/Novelty 時間序列</h3>
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
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                        label={{ value: 'Novelty / Diversity', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
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
                        type="monotone" 
                        dataKey="avgNovelty" 
                        stroke="#e9c7c6" 
                        strokeWidth={2}
                        dot={{ fill: '#e9c7c6', r: 4 }}
                        name="Novelty"
                      />
                      <Line 
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
                        stroke="#AE9FD0"
                        style={{ fontSize: '12px' }}
                        label={{ value: 'ATI', angle: -90, position: 'insideLeft', style: { fill: '#AE9FD0' } }}
                        domain={[0, 100]}
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
                        type="monotone" 
                        dataKey="avgAti" 
                        stroke="#AE9FD0" 
                        strokeWidth={2}
                        dot={{ fill: '#AE9FD0', r: 4 }}
                        name="ATI"
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Novelty × Diversity 分佈
                </h3>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColorByAti(atiRange.min) }}></div>
                    <span>低 ATI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColorByAti(atiRange.max) }}></div>
                    <span>高 ATI</span>
                  </div>
                </div>
              </div>
              {loadingScatterPosts ? (
                <div className="h-80 flex items-center justify-center text-gray-500">
                  載入貼文數據中...
                </div>
              ) : (
                <>
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
                          domain={[0, 1]}
                          tickFormatter={(value: number) => value.toFixed(3)}
                          label={{ value: 'Novelty', position: 'bottom', offset: 10, style: { textAnchor: 'middle' } }}
                          allowDataOverflow={true}
                        />
                        <YAxis
                          type="number"
                          dataKey="diversity"
                          name="Diversity"
                          domain={[0, 1]}
                          tickFormatter={(value: number) => value.toFixed(3)}
                          label={{ value: 'Diversity', angle: -90, position: 'left', offset: 15, style: { textAnchor: 'middle' } }}
                          allowDataOverflow={true}
                        />
                        <ZAxis dataKey="ati" range={[10, 60]} />
                        <Tooltip 
                          content={ScatterTooltip} 
                          cursor={{ strokeDasharray: '3 3' }}
                        />
                        {/* 市場數據點 */}
                        <Scatter 
                          data={scatterData.filter(p => !(p as any).isUserInput)}
                        >
                          {scatterData
                            .filter(p => !(p as any).isUserInput)
                            .map((point, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={getColorByAti(point.ati)}
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
                        {/* 用戶輸入的數據點，使用不同的樣式突出顯示 */}
                        {userInputPoints.length > 0 && (
                          <Scatter 
                            data={userInputPoints}
                            name="您的輸入"
                          >
                            {userInputPoints.map((point, index) => (
                              <Cell 
                                key={`user-cell-${index}`} 
                                fill="#8B5CF6" // 紫色，突出顯示
                                fillOpacity={hoveredScatterIndex === point.index ? 1.0 : 0.9}
                              />
                            ))}
                          </Scatter>
                        )}
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    共 {scatterPosts.length} 篇隨機挑選的貼文樣本；圖表可使用全部資料點。
                  </p>
                </>
              )}
            </div>
          </div>

          {/* 右側：高雷同性貼文 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col h-full">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">高雷同性貼文</h3>
              <p className="text-xs text-gray-500 mt-1">
                顯示 ATI 最高的 5 篇貼文。這些貼文與市場平均最相似，代表內容雷同性程度最高，值得特別關注。
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingTailOutliers ? (
                <div className="text-gray-500 text-sm">載入中...</div>
              ) : tailOutliers.length > 0 ? (
                <OutlierList posts={tailOutliers.slice(0, 5).map((post, index) => ({
                  ...post,
                  displayIndex: index + 1,
                }))} />
              ) : (
                <div className="text-gray-500 text-sm">無數據可用</div>
              )}
            </div>
          </div>
        </section>

        {/* 分箱（Decile）分析 */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">分箱（Decile）分析</h3>
          <p className="text-sm text-gray-500 mb-4">
            將 ATI 值範圍分成 10 個等距區間，檢視每個分箱的貼文數量
          </p>
          {loadingDeciles ? (
            <div className="h-96 flex items-center justify-center text-gray-500">
              載入中...
                </div>
          ) : decilesData.length > 0 ? (
            <div className="space-y-4">
              <div className="h-96 w-full" style={{ minWidth: 0, minHeight: 384 }}>
                <ResponsiveContainer width="100%" height={384}>
                  <BarChart data={decilesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="decile" 
                      label={{ value: '分箱（Decile）', position: 'insideBottom', offset: -5 }}
                      stroke="#6b7280"
                    />
                    <YAxis 
                      label={{ value: '貼文數量', angle: -90, position: 'insideLeft' }}
                      stroke="#6b7280"
                    />
                    <Tooltip />
                    <Bar 
                      dataKey="postCount" 
                      fill="#AE9FD0" 
                      fillOpacity={0.7}
                      name="貼文數量"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                {decilesData.map((decile) => (
                  <div key={decile.decile} className="border border-gray-200 rounded p-2">
                    <p className="font-semibold text-gray-900">第 {decile.decile} 箱</p>
                    <p className="text-gray-600 mt-1">ATI 範圍: {decile.atiMin.toFixed(1)} - {decile.atiMax.toFixed(1)}</p>
                    <p className="text-gray-600">平均 ATI: {decile.atiMean.toFixed(1)}</p>
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


