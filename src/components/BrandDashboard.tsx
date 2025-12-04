// 品牌儀表板 Tab A
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, Sparkles, Image as ImageIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getBrandChineseName, formatBrandName } from '../utils/brandNames';

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
    caption: string; 
    likes: number;
    comments?: number;
    engagement?: number;
  }>;
  mostNovelPosts: Array<{ 
    id: number;
    ati: number; 
    ds: number; 
    caption: string; 
    likes: number;
    comments?: number;
    engagement?: number;
  }>;
}

interface SimilarBrand {
  brand: string;
  similarity: number;
  ati: number;
  ds: number;
  y_mean: number;
  atiDiff?: number;
  dsDiff?: number;
}

const BrandDashboard: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [brandDetails, setBrandDetails] = useState<BrandDetails | null>(null);
  const [similarBrands, setSimilarBrands] = useState<SimilarBrand[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      loadBrandDetails(selectedBrand);
      loadSimilarBrands(selectedBrand);
    }
  }, [selectedBrand]);

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
      const validBrands = brandList.filter(b => b && b.brand && b.brand.trim() !== '');
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

  const loadBrandDetails = async (brandName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8787/api/brand/${encodeURIComponent(brandName)}`);
      const data = await res.json();
      setBrandDetails(data);
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

  // 品牌已載入，但詳細資訊還在載入
  if (!brandDetails && !loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            選擇品牌 ({brands.length} 個品牌)
          </label>
          <select
            value={selectedBrand || ''}
            onChange={(e) => {
              console.log('選擇品牌:', e.target.value);
              setSelectedBrand(e.target.value);
            }}
            className="w-full max-w-md px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900 text-base"
            style={{ zIndex: 10, minHeight: '44px' }}
          >
            <option value="">-- 請選擇品牌 --</option>
            {brands.map((b) => (
              <option key={b.brand} value={b.brand}>
                {formatBrandName(b.brand)}
              </option>
            ))}
          </select>
          {selectedBrand && (
            <p className="text-sm text-gray-500 mt-2">已選擇: {formatBrandName(selectedBrand)}</p>
          )}
        </div>
        {loading && <div className="text-gray-500">載入品牌資訊中...</div>}
        {!selectedBrand && (
          <div className="text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
            ⚠️ 請從上方下拉選單選擇一個品牌
          </div>
        )}
      </div>
    );
  }

  if (!brandDetails) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          <p>載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 品牌選擇 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          選擇品牌
        </label>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
            style={{ zIndex: 10, appearance: 'auto' }}
          >
            {brands.map((b) => (
              <option key={b.brand} value={b.brand}>
                {formatBrandName(b.brand)}
              </option>
            ))}
          </select>
      </div>

      {/* 核心指標卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
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
          <p className="text-xs text-gray-400 mt-2">
            市場平均: {brandDetails.marketAvgAti.toFixed(1)}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs uppercase font-semibold text-gray-500">內容新穎度 (DS)</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {(brandDetails.DS_final_mean * 100).toFixed(1)}%
          </p>
          <div className="flex items-center mt-2 text-sm">
            {brandDetails.dsVsMarket > 0 ? (
              <>
                <Sparkles className="text-[#8B7BA5] mr-1" size={16} />
                <span className="text-[#8B7BA5] font-medium">
                  高於市場平均 {Math.abs(brandDetails.dsVsMarketPercent || 0).toFixed(1)}%
                </span>
              </>
            ) : (
              <span className="text-gray-500">
                低於市場平均 {Math.abs(brandDetails.dsVsMarketPercent || 0).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            市場平均: {(brandDetails.marketAvgDs * 100).toFixed(1)}%
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs uppercase font-semibold text-gray-500">貼文數</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {brandDetails.n_posts}
          </p>
          <p className="text-sm text-gray-500 mt-1">分析樣本</p>
        </div>
      </div>

      {/* ATI 趨勢圖 */}
      {brandDetails.atiTrend && brandDetails.atiTrend.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="mr-2" size={20} />
            ATI 趨勢（內容新穎度變化）
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={brandDetails.atiTrend.map(t => ({ ...t, marketAvg: brandDetails.marketAvgAti }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="period" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  label={{ value: 'ATI', angle: -90, position: 'insideLeft' }}
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'marketAvg') return [`${value.toFixed(1)}`, '市場平均'];
                    return [`${value.toFixed(1)}`, 'ATI 分數'];
                  }}
                  labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="ati" 
                  stroke="#AE9FD0" 
                  strokeWidth={2}
                  dot={{ fill: '#AE9FD0', r: 4 }}
                  name="ATI 分數"
                />
                <Line 
                  type="monotone" 
                  dataKey="marketAvg" 
                  stroke="#9ca3af" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name="市場平均"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            * 趨勢圖按貼文順序分組，非實際時間序列
          </p>
        </div>
      )}

      {/* 最相似的品牌 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="mr-2" size={20} />
          最像你的三個品牌
        </h3>
        <div className="space-y-3">
          {similarBrands.length > 0 ? (
            similarBrands.map((sb, idx) => (
              <div key={sb.brand} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-bold text-[#8B7BA5]">#{idx + 1}</span>
                    <p className="font-semibold text-gray-900">{formatBrandName(sb.brand)}</p>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>ATI: <span className="font-medium">{sb.ati.toFixed(1)}</span> 
                      {sb.atiDiff !== undefined && (
                        <span className="text-gray-500 ml-1">(差異 {sb.atiDiff.toFixed(1)})</span>
                      )}
                    </p>
                    <p>DS: <span className="font-medium">{sb.ds.toFixed(3)}</span>
                      {sb.dsDiff !== undefined && (
                        <span className="text-gray-500 ml-1">(差異 {sb.dsDiff.toFixed(3)})</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-lg font-bold text-[#8B7BA5] mb-1">
                    {(sb.similarity * 100).toFixed(1)}%
                  </p>
                  <div className="w-32 h-3 bg-gray-200 rounded-full">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{ 
                        background: 'linear-gradient(to right, #AE9FD0, #9B8BB5)',
                        width: `${Math.min(sb.similarity * 100, 100)}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">相似度</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">沒有找到相似品牌</p>
          )}
        </div>
      </div>

      {/* 最不新穎的貼文 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          你最不一樣的三篇貼文（最像市場平均）
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          這些貼文與市場平均最相似，可能缺乏差異化
        </p>
        <div className="space-y-4">
          {brandDetails.mostAveragePosts.map((post, idx) => (
            <div key={post.id || idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="flex items-start gap-4">
                {/* 縮圖佔位符（目前沒有圖片路徑） */}
                <div className="flex-shrink-0 w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                  <ImageIcon className="text-gray-400" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                        ATI: {post.ati.toFixed(1)}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">
                        DS: {post.ds.toFixed(3)}
                      </span>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <div>👍 {post.likes}</div>
                      {post.comments !== undefined && <div>💬 {post.comments}</div>}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
                    {post.caption || '（無文字內容）'}
                  </p>
                  {post.engagement !== undefined && (
                    <p className="text-xs text-gray-500 mt-2">
                      互動率: {post.engagement.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 最新穎的貼文 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Sparkles className="mr-2" size={20} />
          你最不一樣的三篇貼文（最與眾不同）
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          這些貼文最具差異化，與市場平均最不同
        </p>
        <div className="space-y-4">
          {brandDetails.mostNovelPosts.map((post, idx) => (
            <div key={post.id || idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="flex items-start gap-4">
                {/* 縮圖佔位符（目前沒有圖片路徑） */}
                <div className="flex-shrink-0 w-20 h-20 bg-green-100 rounded-lg flex items-center justify-center">
                  <ImageIcon className="text-green-500" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                        ATI: {post.ati.toFixed(1)}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">
                        DS: {post.ds.toFixed(3)}
                      </span>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <div>👍 {post.likes}</div>
                      {post.comments !== undefined && <div>💬 {post.comments}</div>}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
                    {post.caption || '（無文字內容）'}
                  </p>
                  {post.engagement !== undefined && (
                    <p className="text-xs text-gray-500 mt-2">
                      互動率: {post.engagement.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BrandDashboard;

