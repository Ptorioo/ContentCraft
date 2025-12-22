// 品牌儀表板 Tab A - 整合單品牌分析和品牌對比
import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Users, Sparkles, Award, X } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { formatBrandName } from '../utils/brandNames';

interface Brand {
  brand: string;
  ati: number;
  ds: number;
  y_mean: number;
  n_posts: number;
}

interface BrandDetails {
  brand: string;
  n_posts: number;
  ATI_final_mean: number;
  DS_final_mean: number;
  y_mean: number;
  marketAvgAti: number;
  marketAvgDs: number;
  atiVsMarket: number;
  dsVsMarket: number;
  atiVsMarketPercent?: number;
  dsVsMarketPercent?: number;
  atiTrend?: Array<{ period: string; ati: number }>;
  mostAveragePosts: Array<{ 
    id: number;
    ati: number; 
    ds: number; 
    novelty?: number;
    caption: string; 
    likes: number;
    comments?: number;
    engagement?: number;
    url?: string; // Instagram 貼文 URL
  }>;
  mostNovelPosts: Array<{ 
    id: number;
    ati: number; 
    ds: number; 
    novelty?: number;
    caption: string; 
    likes: number;
    comments?: number;
    engagement?: number;
    url?: string; // Instagram 貼文 URL
  }>;
}

interface SimilarBrand {
  brand: string;
  similarity: number;
  ati: number;
  ds: number;
  novelty?: number;
  y_mean: number;
  atiDiff?: number;
  dsDiff?: number;
}

const BrandDashboard: React.FC = () => {
  // 單品牌分析相關 state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [brandDetails, setBrandDetails] = useState<BrandDetails | null>(null);
  const [similarBrands, setSimilarBrands] = useState<SimilarBrand[]>([]);
  const [similarBrandsSortBy, setSimilarBrandsSortBy] = useState<'ati' | 'novelty' | 'diversity'>('ati');
  
  // 品牌對比相關 state
  const [brand1, setBrand1] = useState<string>('');
  const [brand2, setBrand2] = useState<string>('');
  const [brand1Details, setBrand1Details] = useState<BrandDetails | null>(null);
  const [brand2Details, setBrand2Details] = useState<BrandDetails | null>(null);
  
  // 共用 state
  const [loading, setLoading] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      loadBrandDetails(selectedBrand, setBrandDetails);
      loadSimilarBrands(selectedBrand);
    }
  }, [selectedBrand]);

  useEffect(() => {
    if (brand1) {
      loadBrandDetails(brand1, setBrand1Details);
    } else {
      setBrand1Details(null);
    }
  }, [brand1]);

  useEffect(() => {
    if (brand2) {
      loadBrandDetails(brand2, setBrand2Details);
    } else {
      setBrand2Details(null);
    }
  }, [brand2]);

  // 計算排序後的相似品牌（必須在組件頂層）
  const sortedSimilarBrands = useMemo(() => {
    if (similarBrands.length === 0) return [];
    const sorted = [...similarBrands].sort((a, b) => {
      if (similarBrandsSortBy === 'ati') {
        return a.ati - b.ati; // 最低 ATI
      } else if (similarBrandsSortBy === 'novelty') {
        return (b.novelty || 0) - (a.novelty || 0); // 最高 Novelty
      } else if (similarBrandsSortBy === 'diversity') {
        return b.ds - a.ds; // 最高 Diversity
      }
      return 0;
    });
    return sorted.slice(0, 3);
  }, [similarBrands, similarBrandsSortBy]);

  const loadBrands = async () => {
    setLoadingBrands(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8787/api/brands');
      if (!res.ok) {
        throw new Error(`API 錯誤: ${res.status}`);
      }
      const data = await res.json();
      const brandList = data.brands || [];
      console.log('API 回應:', data); // 除錯用
      console.log('品牌列表長度:', brandList.length); // 除錯用
      console.log('前三個品牌:', brandList.slice(0, 3)); // 除錯用
      
      if (brandList.length === 0) {
        setError('API 返回空列表，請檢查 CSV 檔案');
        return;
      }
      
      // 確保品牌名稱不為空
      const validBrands = brandList.filter((b: any) => b && b.brand && b.brand.trim() !== '');
      console.log('有效品牌數量:', validBrands.length);
      
      if (validBrands.length === 0) {
        setError('沒有有效的品牌數據');
        return;
      }
      
      setBrands(validBrands);
      if (validBrands.length > 0) {
        setSelectedBrand(validBrands[0].brand);
        console.log('預設選擇品牌:', validBrands[0].brand);
      }
    } catch (error: any) {
      console.error('Failed to load brands:', error);
      setError(`無法載入品牌列表: ${error.message || '請確認後端 API 是否運行'}`);
    } finally {
      setLoadingBrands(false);
    }
  };

  const loadBrandDetails = async (brandName: string, setter: React.Dispatch<React.SetStateAction<BrandDetails | null>>) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8787/api/brand/${encodeURIComponent(brandName)}`);
      const data = await res.json();
      setter(data);
    } catch (error) {
      console.error('Failed to load brand details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSimilarBrands = async (brandName: string) => {
    try {
      const res = await fetch(`http://localhost:8787/api/brand/${encodeURIComponent(brandName)}/similar?topK=3`);
      const data = await res.json();
      setSimilarBrands(data.similar || []);
    } catch (error) {
      console.error('Failed to load similar brands:', error);
    }
  };

  // 計算對比數據
  // 使用總覽分析中 ATI 時間序列的顏色：Novelty (#e9c7c6) 和 Diversity (#9fc3d0)
  const comparisonData = brand1Details && brand2Details ? {
    ati: [
      { name: '你的品牌', value: brand1Details.ATI_final_mean, color: '#e9c7c6' },
      { name: '對手品牌', value: brand2Details.ATI_final_mean, color: '#9fc3d0' },
    ],
    ds: [
      { name: '你的品牌', value: brand1Details.DS_final_mean * 100, color: '#e9c7c6' },
      { name: '對手品牌', value: brand2Details.DS_final_mean * 100, color: '#9fc3d0' },
    ],
    engagement: [
      { name: '你的品牌', value: brand1Details.y_mean, color: '#e9c7c6' },
      { name: '對手品牌', value: brand2Details.y_mean, color: '#9fc3d0' },
    ],
    posts: [
      { name: '你的品牌', value: brand1Details.n_posts, color: '#e9c7c6' },
      { name: '對手品牌', value: brand2Details.n_posts, color: '#9fc3d0' },
    ],
  } : null;

  // 判斷勝負
  const getWinner = (value1: number, value2: number, lowerIsBetter: boolean = false) => {
    if (lowerIsBetter) {
      return value1 < value2 ? 1 : value1 > value2 ? 2 : 0;
    }
    return value1 > value2 ? 1 : value1 < value2 ? 2 : 0;
  };

  // 載入中或錯誤狀態
  if (loadingBrands) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          <p>載入品牌列表中...</p>
          <p className="text-sm mt-2">請稍候</p>
        </div>
      </div>
    );
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">載入失敗</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={loadBrands}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  // 沒有品牌數據
  if (brands.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          <p>沒有找到品牌數據</p>
          <button
            onClick={loadBrands}
            className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 單品牌分析 */}
      <div className="space-y-6">
        {/* 上面：左邊品牌選單+平均ATI，右邊最像的三個品牌 */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-stretch">
          {/* 左邊：品牌選單和平均ATI */}
          <div className="lg:col-span-4 space-y-4 flex flex-col">
      {/* 品牌選擇 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          選擇品牌
        </label>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
            style={{ zIndex: 10, appearance: 'auto' }}
          >
                <option value="">-- 請選擇品牌 --</option>
            {brands.map((b) => (
              <option key={b.brand} value={b.brand}>
                {formatBrandName(b.brand)}
              </option>
            ))}
          </select>
      </div>

            {/* 平均 ATI */}
            {brandDetails && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex-1 flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-gray-500">平均 ATI（內容新穎度分數）</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {brandDetails.ATI_final_mean.toFixed(1)}
            </p>
            <div className="flex items-center mt-2 text-sm">
              {brandDetails.atiVsMarket < 0 ? (
                <>
                  <TrendingDown className="text-green-500 mr-1" size={16} />
                  <span className="text-green-600 font-medium">
                    低於市場平均 {Math.abs(brandDetails.atiVsMarketPercent || 0).toFixed(1)}%
                  </span>
                  <span className="text-gray-500 ml-2">
                    ({Math.abs(brandDetails.atiVsMarket).toFixed(1)} 分)
                  </span>
                </>
              ) : (
                <>
                  <TrendingUp className="text-red-500 mr-1" size={16} />
                  <span className="text-red-600 font-medium">
                    高於市場平均 {Math.abs(brandDetails.atiVsMarketPercent || 0).toFixed(1)}%
                  </span>
                  <span className="text-gray-500 ml-2">
                    (+{brandDetails.atiVsMarket.toFixed(1)} 分)
                  </span>
                </>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-auto">
            市場平均: {brandDetails.marketAvgAti.toFixed(1)}
          </p>
        </div>
            )}

            {!brandDetails && !loading && selectedBrand && (
              <div className="text-center text-gray-500 py-4">
                <p>載入品牌資訊中...</p>
          </div>
            )}

            {!selectedBrand && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">請從上方下拉選單選擇一個品牌</p>
        </div>
            )}
      </div>

          {/* 右邊：最像的三個品牌 */}
          {brandDetails && (
            <div className="lg:col-span-6 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="mr-2" size={20} />
            最像你的三個品牌
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setSimilarBrandsSortBy('ati')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                similarBrandsSortBy === 'ati'
                  ? 'bg-purple-100 text-purple-700 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              最低 ATI
            </button>
            <button
              onClick={() => setSimilarBrandsSortBy('novelty')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                similarBrandsSortBy === 'novelty'
                  ? 'bg-purple-100 text-purple-700 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              最高 Novelty
            </button>
            <button
              onClick={() => setSimilarBrandsSortBy('diversity')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                similarBrandsSortBy === 'diversity'
                  ? 'bg-purple-100 text-purple-700 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              最高 Diversity
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {sortedSimilarBrands.length > 0 ? (
            sortedSimilarBrands.map((sb, idx) => (
              <div key={sb.brand} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-2 flex-1 text-sm">
                  <span className="text-lg font-bold text-[#8B7BA5] w-8 flex-shrink-0">#{idx + 1}</span>
                  <span className="font-semibold text-gray-900 flex-shrink-0" style={{ minWidth: '60px' }}>{formatBrandName(sb.brand)}</span>
                  <span className="text-gray-600" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                    ATI: <span className="font-medium">{sb.ati.toFixed(1)}</span>
                      {sb.atiDiff !== undefined && (
                      <span className="text-gray-500">(差異 {sb.atiDiff.toFixed(1)})</span>
                    )}
                  </span>
                </div>
                <div className="text-right ml-4 flex flex-col items-end">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-lg font-bold text-[#8B7BA5]">
                      {(sb.similarity * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">相似度</p>
                  </div>
                  <div className="w-32 h-3 bg-gray-200 rounded-full">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{ 
                        background: 'linear-gradient(to right, #AE9FD0, #9B8BB5)',
                        width: `${Math.min(sb.similarity * 100, 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">沒有找到相似品牌</p>
          )}
        </div>
      </div>
          )}
        </div>

        {/* 下方：左邊最不像的三篇文，右邊最像的三篇文 */}
        {brandDetails && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左邊：最不像的三篇文（最與眾不同） */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                <Sparkles className="mr-2" size={20} />
                你最不一樣的三篇貼文（最與眾不同）
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                這些貼文最具差異化，與市場平均最不同
              </p>
              <div className="space-y-4">
                {brandDetails.mostNovelPosts.map((post, idx) => {
                  const PostCard = (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                            ATI: {post.ati.toFixed(1)}
                          </span>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          <div>👍 {post.likes}</div>
                          {post.comments !== undefined && <div>💬 {post.comments}</div>}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">
                        {post.caption || '（無文字內容）'}
                      </p>
                    </div>
                  );
                  
                  return (
                    <div key={post.id || idx}>
                      {PostCard}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 右邊：最像的三篇文（最像市場平均） */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          你最相似的三篇貼文（最平庸）
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          這些貼文與市場平均最相似，代表內容雷同性程度最高
        </p>
        <div className="space-y-4">
          {brandDetails.mostAveragePosts.slice(0, 3).map((post, idx) => {
            const PostCard = (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                          ATI: {post.ati.toFixed(1)}
                        </span>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <div>👍 {post.likes}</div>
                        {post.comments !== undefined && <div>💬 {post.comments}</div>}
                      </div>
                    </div>
                      <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">
                      {post.caption || '（無文字內容）'}
                      </p>
              </div>
            );
            
            return (
              <div key={post.id || idx}>
                {PostCard}
              </div>
            );
          })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 品牌對比分析 */}
      <div className="space-y-6 border-t border-gray-200 pt-6">
        {/* 標題 */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="text-purple-600" size={28} />
            品牌對比分析
          </h2>
          <p className="text-sm text-gray-500 mt-1">選擇兩個品牌進行各項指標的詳細對比</p>
        </div>

        {/* 品牌選擇區域 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 你的品牌選擇 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                你的品牌
              </label>
              <div className="relative">
                <select
                  value={brand1}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === brand2) {
                      alert('請選擇不同的品牌');
                      return;
                    }
                    setBrand1(value);
                  }}
                  className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:border-opacity-50 bg-white text-gray-900"
                  style={{ borderColor: '#e9c7c6', zIndex: 10 }}
                >
                  <option value="">-- 選擇你的品牌 --</option>
                  {brands.map((b) => (
                    <option key={b.brand} value={b.brand} disabled={b.brand === brand2}>
                      {formatBrandName(b.brand)}
                    </option>
                  ))}
                </select>
                {brand1 && (
                  <button
                    onClick={() => setBrand1('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                  >
                    <X size={16} className="text-gray-400" />
                  </button>
                )}
              </div>
              {brand1 && (
                <p className="text-sm mt-2 font-medium" style={{ color: '#e9c7c6' }}>
                  {formatBrandName(brand1)}
                </p>
              )}
            </div>

            {/* 對手品牌選擇 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                對手品牌
              </label>
              <div className="relative">
                <select
                  value={brand2}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === brand1) {
                      alert('請選擇不同的品牌');
                      return;
                    }
                    setBrand2(value);
                  }}
                  className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:border-opacity-50 bg-white text-gray-900"
                  style={{ borderColor: '#9fc3d0', zIndex: 10 }}
                >
                  <option value="">-- 選擇對手品牌 --</option>
                  {brands.map((b) => (
                    <option key={b.brand} value={b.brand} disabled={b.brand === brand1}>
                      {formatBrandName(b.brand)}
                    </option>
                  ))}
                </select>
                {brand2 && (
                  <button
                    onClick={() => setBrand2('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                  >
                    <X size={16} className="text-gray-400" />
                  </button>
                )}
              </div>
              {brand2 && (
                <p className="text-sm mt-2 font-medium" style={{ color: '#9fc3d0' }}>
                  {formatBrandName(brand2)}
                </p>
              )}
            </div>
        </div>
      </div>

        {/* 對比結果 */}
        {brand1Details && brand2Details && comparisonData && (
          <>
            {/* 三個指標卡片：ATI 分數、平均互動率、貼文數量 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* ATI 對比 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <p className="text-xs uppercase font-semibold text-gray-500 mb-3">ATI 分數</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#e9c7c6' }}></div>
                      <span className="text-sm font-medium">{formatBrandName(brand1)}</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">
                      {brand1Details.ATI_final_mean.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#9fc3d0' }}></div>
                      <span className="text-sm font-medium">{formatBrandName(brand2)}</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">
                      {brand2Details.ATI_final_mean.toFixed(1)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    {getWinner(brand1Details.ATI_final_mean, brand2Details.ATI_final_mean, true) === 1 ? (
                      <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                        <Award size={14} />
                        <span>{formatBrandName(brand1)}勝出（較低 ATI = 較新穎）</span>
                      </div>
                    ) : getWinner(brand1Details.ATI_final_mean, brand2Details.ATI_final_mean, true) === 2 ? (
                      <div className="flex items-center gap-1 text-red-600 text-sm font-medium">
                        <Award size={14} />
                        <span>{formatBrandName(brand2)}勝出（較低 ATI = 較新穎）</span>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">平手</div>
                    )}
                  </div>
                </div>
              </div>

              {/* 互動率對比 */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <p className="text-xs uppercase font-semibold text-gray-500 mb-3">平均互動率</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#e9c7c6' }}></div>
                      <span className="text-sm font-medium">{formatBrandName(brand1)}</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">
                      {brand1Details.y_mean.toFixed(4)}
                        </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#9fc3d0' }}></div>
                      <span className="text-sm font-medium">{formatBrandName(brand2)}</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">
                      {brand2Details.y_mean.toFixed(4)}
                        </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    {getWinner(brand1Details.y_mean, brand2Details.y_mean) === 1 ? (
                      <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                        <Award size={14} />
                        <span>{formatBrandName(brand1)}勝出</span>
                      </div>
                    ) : getWinner(brand1Details.y_mean, brand2Details.y_mean) === 2 ? (
                      <div className="flex items-center gap-1 text-red-600 text-sm font-medium">
                        <Award size={14} />
                        <span>{formatBrandName(brand2)}勝出</span>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">平手</div>
                    )}
                  </div>
                </div>
              </div>

              {/* 貼文數對比 */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <p className="text-xs uppercase font-semibold text-gray-500 mb-3">貼文數量</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#e9c7c6' }}></div>
                      <span className="text-sm font-medium">{formatBrandName(brand1)}</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">
                      {brand1Details.n_posts}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#9fc3d0' }}></div>
                      <span className="text-sm font-medium">{formatBrandName(brand2)}</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">
                      {brand2Details.n_posts}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    {getWinner(brand1Details.n_posts, brand2Details.n_posts) === 1 ? (
                      <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                        <Award size={14} />
                        <span>{formatBrandName(brand1)}更多</span>
                      </div>
                    ) : getWinner(brand1Details.n_posts, brand2Details.n_posts) === 2 ? (
                      <div className="flex items-center gap-1 text-red-600 text-sm font-medium">
                        <Award size={14} />
                        <span>{formatBrandName(brand2)}更多</span>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">相同</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 左邊柱狀圖，右邊詳細比較表格（指標對比圖和ATI卡片等寬，詳細對比佔剩餘寬度） */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 左邊：對比圖表（和ATI卡片等寬，1/3寬度） */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">指標對比圖</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'ATI', '你的品牌': brand1Details.ATI_final_mean, '對手品牌': brand2Details.ATI_final_mean },
                      { name: '貼文數', '你的品牌': brand1Details.n_posts, '對手品牌': brand2Details.n_posts },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="你的品牌" fill="#e9c7c6" name={formatBrandName(brand1)} />
                      <Bar dataKey="對手品牌" fill="#9fc3d0" name={formatBrandName(brand2)} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 右邊：詳細對比表格（佔剩餘寬度，2/3寬度） */}
              <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">詳細對比</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">指標</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">{formatBrandName(brand1)}</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">{formatBrandName(brand2)}</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">差異</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">勝出</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-4 font-medium text-gray-900">ATI 分數</td>
                        <td className="py-3 px-4 text-center">{brand1Details.ATI_final_mean.toFixed(2)}</td>
                        <td className="py-3 px-4 text-center">{brand2Details.ATI_final_mean.toFixed(2)}</td>
                        <td className="py-3 px-4 text-center">
                          {((brand1Details.ATI_final_mean - brand2Details.ATI_final_mean) > 0 ? '+' : '')}
                          {(brand1Details.ATI_final_mean - brand2Details.ATI_final_mean).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {getWinner(brand1Details.ATI_final_mean, brand2Details.ATI_final_mean, true) === 1 ? (
                            <span className="text-green-600 font-medium">{formatBrandName(brand1)}</span>
                          ) : getWinner(brand1Details.ATI_final_mean, brand2Details.ATI_final_mean, true) === 2 ? (
                            <span className="text-red-600 font-medium">{formatBrandName(brand2)}</span>
                          ) : (
                            <span className="text-gray-500">平手</span>
                          )}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-4 font-medium text-gray-900">平均互動率</td>
                        <td className="py-3 px-4 text-center">{brand1Details.y_mean.toFixed(4)}</td>
                        <td className="py-3 px-4 text-center">{brand2Details.y_mean.toFixed(4)}</td>
                        <td className="py-3 px-4 text-center">
                          {brand2Details.y_mean !== 0 ? (
                            <>
                              {((brand1Details.y_mean - brand2Details.y_mean) / brand2Details.y_mean * 100) > 0 ? '+' : ''}
                              {((brand1Details.y_mean - brand2Details.y_mean) / brand2Details.y_mean * 100).toFixed(1)}%
                            </>
                          ) : (
                            brand1Details.y_mean > 0 ? '∞' : '0%'
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {getWinner(brand1Details.y_mean, brand2Details.y_mean) === 1 ? (
                            <span className="text-green-600 font-medium">{formatBrandName(brand1)}</span>
                          ) : getWinner(brand1Details.y_mean, brand2Details.y_mean) === 2 ? (
                            <span className="text-red-600 font-medium">{formatBrandName(brand2)}</span>
                          ) : (
                            <span className="text-gray-500">平手</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium text-gray-900">貼文數量</td>
                        <td className="py-3 px-4 text-center">{brand1Details.n_posts}</td>
                        <td className="py-3 px-4 text-center">{brand2Details.n_posts}</td>
                        <td className="py-3 px-4 text-center">
                          {((brand1Details.n_posts - brand2Details.n_posts) > 0 ? '+' : '')}
                          {brand1Details.n_posts - brand2Details.n_posts}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {getWinner(brand1Details.n_posts, brand2Details.n_posts) === 1 ? (
                            <span className="text-green-600 font-medium">{formatBrandName(brand1)}</span>
                          ) : getWinner(brand1Details.n_posts, brand2Details.n_posts) === 2 ? (
                            <span className="text-red-600 font-medium">{formatBrandName(brand2)}</span>
                          ) : (
                            <span className="text-gray-500">相同</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 提示訊息 */}
        {(!brand1 || !brand2) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              {!brand1 && !brand2 
                ? '請選擇兩個品牌開始對比分析'
                : !brand1 
                  ? '請選擇你的品牌'
                  : '請選擇對手品牌'}
            </p>
          </div>
        )}

        {loading && (
          <div className="text-center text-gray-500 py-4">
            <p>載入品牌數據中...</p>
        </div>
        )}
      </div>
    </div>
  );
};

export default BrandDashboard;

