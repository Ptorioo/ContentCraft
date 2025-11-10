import React, { useState } from 'react';
import {
  AnalyticsDataset,
  BrandRiskMetric,
  TailOutlierPost,
} from '../types/analytics';
import { ArrowLeft, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';

interface AnalyticsDashboardProps {
  data: AnalyticsDataset;
  onBackToChat: () => void;
}

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

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
              <td className="py-3 font-medium text-gray-900">{row.brandName}</td>
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

const OutlierList: React.FC<{ posts: TailOutlierPost[] }> = ({ posts }) => (
  <div className="grid gap-4 md:grid-cols-2">
    {posts.map((post) => (
      <div
        key={post.postId}
        className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 shadow-sm"
      >
        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
          {post.imageUrl ? (
            <img
              src={post.imageUrl}
              alt={post.brandName}
              className="w-full h-full object-cover"
            />
          ) : (
            <Sparkles className="text-purple-500" size={24} />
          )}
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-gray-900">{post.brandName}</p>
          <p className="text-xs text-gray-500">{post.date}</p>
          <p className="text-sm text-gray-700 line-clamp-2">{post.captionSnippet}</p>
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span>ATI {post.ati.toFixed(1)}</span>
            <span>Novelty {post.novelty.toFixed(2)}</span>
            <span>Diversity {post.diversity.toFixed(2)}</span>
            <span>❤️ {post.likeCount}</span>
            <span>💬 {post.commentCount}</span>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ data, onBackToChat }) => {
  const [selectedCase, setSelectedCase] = useState(data.caseStudies[0]?.brandId ?? '');
  const activeCase = data.caseStudies.find((c) => c.brandId === selectedCase) ?? data.caseStudies[0];
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">ATI 分析儀表板</h2>
            <p className="text-sm text-gray-500">
              觀察 2025/04 – 2025/09 之間 56 個茶飲品牌的 Instagram 多模態趨勢
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

        <section>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs uppercase font-semibold text-gray-500">平均 ATI</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {data.summary.avgAti.toFixed(1)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                更新時間 {new Date(data.summary.lastUpdated).toLocaleString()}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs uppercase font-semibold text-gray-500">監測品牌</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{data.summary.totalBrands}</p>
              <p className="text-sm text-gray-500 mt-1">
                時間範圍 {data.summary.timeframeLabel}，共 {data.summary.totalPosts} 則貼文
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs uppercase font-semibold text-gray-500">高風險品牌</p>
              <p className="text-3xl font-bold text-rose-600 mt-2">
                {data.summary.highRiskBrandCount}
              </p>
              <p className="text-sm text-gray-500 mt-1">ATI ≧ 70 的品牌數量</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">ATI 時間序列</h3>
              <TrendingUp className="text-purple-500" size={20} />
            </div>
            <div className="space-y-3 text-sm">
              {data.atiTrend.map((point) => (
                <div
                  key={point.date}
                  className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0"
                >
                  <span className="text-gray-500">{point.date}</span>
                  <div className="flex items-center gap-4 text-gray-700">
                    <span>ATI {point.avgAti.toFixed(1)}</span>
                    <span>Novelty {point.avgNovelty.toFixed(2)}</span>
                    <span>Diversity {point.avgDiversity.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-gray-400">
              圖表預留區：後續可串接線圖（ATI / Novelty / Diversity）供即時視覺化。
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Novelty × Diversity 分佈（抽樣）
            </h3>
            <div className="aspect-[4/3] bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <p className="text-sm text-gray-500">
                圖表預留區：後續串接散佈圖（品牌 x Novelty vs Diversity）。
              </p>
            </div>
            <div className="space-y-2">
              {data.noveltyDiversityScatter.map((brand) => (
                <div key={brand.brandId} className="flex justify-between text-sm text-gray-700">
                  <span className="font-medium text-gray-900">{brand.brandName}</span>
                  <span>
                    ATI {brand.ati.toFixed(1)} · N {brand.novelty.toFixed(2)} · D{' '}
                    {brand.diversity.toFixed(2)}
                  </span>
                </div>
              ))}
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
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    {cs.brandName}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-5 grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{activeCase.brandName}</p>
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
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                        }
                      `}
                    >
                      {scenario.title}
                    </button>
                  ))}
                </div>
                {activeCase.scenarioTests[selectedScenarioIdx] && (
                  <div className="border border-purple-200 bg-purple-50 rounded-lg p-4 space-y-3 text-sm text-purple-900">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {activeCase.scenarioTests[selectedScenarioIdx].title}
                      </span>
                      <span className="text-xs font-semibold bg-white text-purple-600 px-2 py-1 rounded-full border border-purple-200">
                        預測 ATI {activeCase.scenarioTests[selectedScenarioIdx].adjustedAti.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-purple-800">
                      {activeCase.scenarioTests[selectedScenarioIdx].description}
                    </p>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase text-purple-700">調整項目</p>
                      <ul className="list-disc list-inside text-purple-800 space-y-1">
                        {activeCase.scenarioTests[selectedScenarioIdx].changes.map((change) => (
                          <li key={change}>{change}</li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-xs text-purple-600">
                      與原始貼文相比，ATI {activeCase.scenarioTests[selectedScenarioIdx].adjustedAti - activeCase.baseline.ati > 0 ? '上升' : '下降'}{' '}
                      {Math.abs(activeCase.scenarioTests[selectedScenarioIdx].adjustedAti - activeCase.baseline.ati).toFixed(1)} 點。
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">晚入場品牌觀察</h3>
            <p className="text-sm text-gray-500 mb-4">
              訓練期無貼文、僅在測試期出現的品牌如何影響長尾
            </p>
            <div className="space-y-3">
              {data.lateEntryBrands.map((brand) => (
                <div key={brand.brandId} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">{brand.brandName}</span>
                    <span className="text-rose-500 font-semibold">ATI {brand.ati.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    首貼日期 {brand.firstPostDate} · 平均互動 {brand.avgEngagement.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">多模態貢獻拆解</h3>
            <p className="text-sm text-gray-500 mb-4">
              文字、影像、metadata 對整體 ATI 的貢獻與權重估計
            </p>
            <div className="space-y-3 text-sm">
              {(['text', 'image', 'metadata'] as const).map((key) => {
                const labelMap = {
                  text: '文字模態',
                  image: '影像模態',
                  metadata: '互動 / 時間等 metadata',
                };
                const value = data.modalityBreakdown[key];
                return (
                  <div key={key} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{labelMap[key]}</span>
                      <span className="text-xs text-gray-500">
                        權重 {formatPercent(value.engagementWeight)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-600 mt-2">
                      <span>ATI {value.ati.toFixed(1)}</span>
                      <span>Novelty {value.novelty.toFixed(2)}</span>
                      <span>Diversity {value.diversity.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-4">
              合成 ATI：{data.modalityBreakdown.combinedAti.toFixed(1)}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">互動縮放檢查</h3>
            <p className="text-sm text-gray-500 mb-3">
              目前留言權重設定為 {data.engagementScaling.commentWeight.toFixed(1)}x
              ，與 ATI 的相關係數為 {data.engagementScaling.correlationWithAti.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">{data.engagementScaling.note}</p>
            <div className="mt-4 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-500">
              預留圖表：可放不同縮放比對照的箱型圖或殘差圖。
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">長尾貼文檔案夾</h3>
            <OutlierList posts={data.tailOutliers} />
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">偏態與模型診斷</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {data.distributionDiagnostics.map((diag) => (
              <div key={diag.chartTitle} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-4">
                  <p className="text-sm font-semibold text-gray-900">{diag.chartTitle}</p>
                  <p className="text-xs uppercase text-gray-400 mt-1">{diag.diagnosticType}</p>
                  <p className="text-sm text-gray-600 mt-2">{diag.description}</p>
                </div>
                <div className="bg-gray-100 h-32 flex items-center justify-center">
                  {diag.placeholderImageUrl ? (
                    <img
                      src={diag.placeholderImageUrl}
                      alt={diag.chartTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-gray-500">圖表待補</span>
                  )}
                </div>
                <div className="p-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-2">關鍵觀察</p>
                  <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                    {diag.keyTakeaways.map((takeaway) => (
                      <li key={takeaway}>{takeaway}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;


