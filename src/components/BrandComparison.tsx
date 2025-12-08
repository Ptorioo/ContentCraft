// 品牌對比組件 - 雙品牌 PK 介面
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, Sparkles, Image as ImageIcon, Award, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
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
  mostAveragePosts: Array<{ 
    id: number;
    ati: number; 
    ds: number; 
    caption: string; 
    likes: number;
    comments?: number;
    engagement?: number;
    url?: string;
  }>;
  mostNovelPosts: Array<{ 
    id: number;
    ati: number; 
    ds: number; 
    caption: string; 
    likes: number;
    comments?: number;
    engagement?: number;
    url?: string;
  }>;
}

const BrandComparison: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brand1, setBrand1] = useState<string>('');
  const [brand2, setBrand2] = useState<string>('');
  const [brand1Details, setBrand1Details] = useState<BrandDetails | null>(null);
  const [brand2Details, setBrand2Details] = useState<BrandDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadBrands();
  }, []);

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
      
      if (brandList.length === 0) {
        setError('API 返回空列表，請檢查 CSV 檔案');
        return;
      }
      
      const validBrands = brandList.filter((b: any) => b && b.brand && b.brand.trim() !== '');
      
      if (validBrands.length === 0) {
        setError('沒有有效的品牌數據');
        return;
      }
      
      setBrands(validBrands);
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

  // 計算比較數據
  const comparisonData = brand1Details && brand2Details ? {
    ati: [
      { name: '品牌 1', value: brand1Details.ATI_final_mean, color: '#8B5CF6' },
      { name: '品牌 2', value: brand2Details.ATI_final_mean, color: '#EC4899' },
    ],
    ds: [
      { name: '品牌 1', value: brand1Details.DS_final_mean * 100, color: '#8B5CF6' },
      { name: '品牌 2', value: brand2Details.DS_final_mean * 100, color: '#EC4899' },
    ],
    engagement: [
      { name: '品牌 1', value: brand1Details.y_mean, color: '#8B5CF6' },
      { name: '品牌 2', value: brand2Details.y_mean, color: '#EC4899' },
    ],
    posts: [
      { name: '品牌 1', value: brand1Details.n_posts, color: '#8B5CF6' },
      { name: '品牌 2', value: brand2Details.n_posts, color: '#EC4899' },
    ],
  } : null;

  // 判斷勝負
  const getWinner = (value1: number, value2: number, lowerIsBetter: boolean = false) => {
    if (lowerIsBetter) {
      return value1 < value2 ? 1 : value1 > value2 ? 2 : 0;
    }
    return value1 > value2 ? 1 : value1 < value2 ? 2 : 0;
  };

  if (loadingBrands) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          <p>載入品牌列表中...</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="p-6 space-y-6">
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
          {/* 品牌 1 選擇 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              品牌 1
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
                className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900"
                style={{ zIndex: 10 }}
              >
                <option value="">-- 選擇品牌 1 --</option>
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
              <p className="text-sm text-purple-600 mt-2 font-medium">
                {formatBrandName(brand1)}
              </p>
            )}
          </div>

          {/* 品牌 2 選擇 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              品牌 2
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
                className="w-full px-4 py-3 border-2 border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                style={{ zIndex: 10 }}
              >
                <option value="">-- 選擇品牌 2 --</option>
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
              <p className="text-sm text-pink-600 mt-2 font-medium">
                {formatBrandName(brand2)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 對比結果 */}
      {brand1Details && brand2Details && comparisonData && (
        <>
          {/* 核心指標對比卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* ATI 對比 */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs uppercase font-semibold text-gray-500 mb-3">ATI 分數</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-sm font-medium">{formatBrandName(brand1)}</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {brand1Details.ATI_final_mean.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-pink-500"></div>
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
                      <span>{formatBrandName(brand1)} 勝出（較低 ATI = 較新穎）</span>
                    </div>
                  ) : getWinner(brand1Details.ATI_final_mean, brand2Details.ATI_final_mean, true) === 2 ? (
                    <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                      <Award size={14} />
                      <span>{formatBrandName(brand2)} 勝出（較低 ATI = 較新穎）</span>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">平手</div>
                  )}
                </div>
              </div>
            </div>

            {/* DS 對比 */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs uppercase font-semibold text-gray-500 mb-3">內容多樣性 (DS)</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-sm font-medium">{formatBrandName(brand1)}</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {(brand1Details.DS_final_mean * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                    <span className="text-sm font-medium">{formatBrandName(brand2)}</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {(brand2Details.DS_final_mean * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  {getWinner(brand1Details.DS_final_mean, brand2Details.DS_final_mean) === 1 ? (
                    <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                      <Award size={14} />
                      <span>{formatBrandName(brand1)} 勝出</span>
                    </div>
                  ) : getWinner(brand1Details.DS_final_mean, brand2Details.DS_final_mean) === 2 ? (
                    <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                      <Award size={14} />
                      <span>{formatBrandName(brand2)} 勝出</span>
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
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-sm font-medium">{formatBrandName(brand1)}</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {brand1Details.y_mean.toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-pink-500"></div>
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
                      <span>{formatBrandName(brand1)} 勝出</span>
                    </div>
                  ) : getWinner(brand1Details.y_mean, brand2Details.y_mean) === 2 ? (
                    <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                      <Award size={14} />
                      <span>{formatBrandName(brand2)} 勝出</span>
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
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-sm font-medium">{formatBrandName(brand1)}</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {brand1Details.n_posts}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-pink-500"></div>
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
                      <span>{formatBrandName(brand1)} 更多</span>
                    </div>
                  ) : getWinner(brand1Details.n_posts, brand2Details.n_posts) === 2 ? (
                    <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                      <Award size={14} />
                      <span>{formatBrandName(brand2)} 更多</span>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">相同</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 對比圖表 */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">指標對比圖</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'ATI', 品牌1: brand1Details.ATI_final_mean, 品牌2: brand2Details.ATI_final_mean },
                  { name: 'DS (%)', 品牌1: brand1Details.DS_final_mean * 100, 品牌2: brand2Details.DS_final_mean * 100 },
                  { name: '互動率', 品牌1: brand1Details.y_mean, 品牌2: brand2Details.y_mean },
                  { name: '貼文數', 品牌1: brand1Details.n_posts, 品牌2: brand2Details.n_posts },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="品牌1" fill="#8B5CF6" name={formatBrandName(brand1)} />
                  <Bar dataKey="品牌2" fill="#EC4899" name={formatBrandName(brand2)} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 詳細對比表格 */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
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
                        <span className="text-green-600 font-medium">品牌 1</span>
                      ) : getWinner(brand1Details.ATI_final_mean, brand2Details.ATI_final_mean, true) === 2 ? (
                        <span className="text-green-600 font-medium">品牌 2</span>
                      ) : (
                        <span className="text-gray-500">平手</span>
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium text-gray-900">DS (%)</td>
                    <td className="py-3 px-4 text-center">{(brand1Details.DS_final_mean * 100).toFixed(2)}%</td>
                    <td className="py-3 px-4 text-center">{(brand2Details.DS_final_mean * 100).toFixed(2)}%</td>
                    <td className="py-3 px-4 text-center">
                      {((brand1Details.DS_final_mean - brand2Details.DS_final_mean) * 100 > 0 ? '+' : '')}
                      {((brand1Details.DS_final_mean - brand2Details.DS_final_mean) * 100).toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getWinner(brand1Details.DS_final_mean, brand2Details.DS_final_mean) === 1 ? (
                        <span className="text-green-600 font-medium">品牌 1</span>
                      ) : getWinner(brand1Details.DS_final_mean, brand2Details.DS_final_mean) === 2 ? (
                        <span className="text-green-600 font-medium">品牌 2</span>
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
                      {((brand1Details.y_mean - brand2Details.y_mean) > 0 ? '+' : '')}
                      {(brand1Details.y_mean - brand2Details.y_mean).toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getWinner(brand1Details.y_mean, brand2Details.y_mean) === 1 ? (
                        <span className="text-green-600 font-medium">品牌 1</span>
                      ) : getWinner(brand1Details.y_mean, brand2Details.y_mean) === 2 ? (
                        <span className="text-green-600 font-medium">品牌 2</span>
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
                        <span className="text-green-600 font-medium">品牌 1</span>
                      ) : getWinner(brand1Details.n_posts, brand2Details.n_posts) === 2 ? (
                        <span className="text-green-600 font-medium">品牌 2</span>
                      ) : (
                        <span className="text-gray-500">相同</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
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
                ? '請選擇品牌 1'
                : '請選擇品牌 2'}
          </p>
        </div>
      )}

      {loading && (
        <div className="text-center text-gray-500 py-4">
          <p>載入品牌數據中...</p>
        </div>
      )}
    </div>
  );
};

export default BrandComparison;

