import summaryJson from './generated/summary.json';
import noveltyDiversityScatterJson from './generated/novelty_diversity_scatter.json';
import brandRankingsJson from './generated/brand_rankings.json';
import modalityBreakdownJson from './generated/modality_breakdown.json';
import {
  AnalyticsDataset,
  AnalyticsSummary,
  BrandRiskMetric,
} from '../types/analytics';
import caseStudiesJson from './generated/case_studies.json';

const computedSummary: AnalyticsSummary = {
  timeframeLabel: summaryJson.timeframeLabel,
  totalBrands: summaryJson.totalBrands,
  totalPosts: summaryJson.totalPosts,
  avgAti: summaryJson.avgAti,
  highRiskBrandCount: summaryJson.highRiskBrandCount,
  highRiskThreshold: summaryJson.highRiskThreshold,
  highRiskDefinition: summaryJson.highRiskDefinition,
  lastUpdated: summaryJson.lastUpdated,
};

const computedNoveltyDiversityScatter = noveltyDiversityScatterJson as BrandRiskMetric[];
const computedBrandRankings = brandRankingsJson as {
  highRiskBrands: BrandRiskMetric[];
  resilientBrands: BrandRiskMetric[];
};
const computedModalityBreakdown = modalityBreakdownJson as AnalyticsDataset['modalityBreakdown'];
const computedCaseStudies = caseStudiesJson as AnalyticsDataset['caseStudies'];

export const mockAnalytics: AnalyticsDataset = {
  summary: computedSummary,
  atiTrend: [],
  noveltyDiversityScatter: computedNoveltyDiversityScatter,
  topHighRiskBrands: computedBrandRankings.highRiskBrands,
  resilientBrands: computedBrandRankings.resilientBrands,
  lateEntryBrands: [
    {
      brandId: 'b048',
      brandName: '霧峰茶苑',
      firstPostDate: '2025-08-06',
      ati: 69.5,
      avgEngagement: 1840,
    },
    {
      brandId: 'b052',
      brandName: '沐曦手搖',
      firstPostDate: '2025-09-12',
      ati: 66.8,
      avgEngagement: 920,
    },
  ],
  modalityBreakdown: {
    ...computedModalityBreakdown,
  },
  engagementScaling: {
    likeWeight: 1,
    commentWeight: 4.8,
    correlationWithAti: -0.42,
    note: '留言權重估計為 4.8x 時，ATI 與互動表現的相關性最平衡。',
  },
  caseStudies: computedCaseStudies,
  distributionDiagnostics: [
    {
      chartTitle: 'OLS 殘差檢查',
      diagnosticType: 'ols-residuals',
      description: '檢查訓練集殘差是否呈現系統性偏差，與 Novelty、Diversity 的關係。',
      keyTakeaways: [
        '殘差分佈近似對稱，僅在高 ATI 端略有聚集。',
        'Novelty < 0.25 時殘差偏正，顯示模型低估平均陷阱程度。',
        '建議後續在促銷語句特徵上加強細緻度。',
      ],
      placeholderImageUrl: 'https://placehold.co/520x260?text=OLS+Residuals',
    },
    {
      chartTitle: 'Bayesian Posterior Predictive Check',
      diagnosticType: 'bayesian-ppc',
      description: '比較模擬貼文互動的 posterior 分佈與實際觀測值。',
      keyTakeaways: [
        '大部分互動區間落在 95% 信賴區間內，模型校準度佳。',
        '在留言極高的貼文仍偏低估，顯示尾部尚需調整。',
      ],
      placeholderImageUrl: 'https://placehold.co/520x260?text=PPC',
    },
    {
      chartTitle: '互動尾部分析',
      diagnosticType: 'engagement-tail',
      description: '檢視晚入場品牌與極值貼文如何拉伸右尾。',
      keyTakeaways: [
        '晚入場品牌的互動標準差為其他品牌的 1.7 倍，拉高尾部風險。',
        '極高互動貼文多為限時活動，需額外標示避免干擾趨勢判讀。',
      ],
      placeholderImageUrl: 'https://placehold.co/520x260?text=Tail+Analysis',
    },
  ],
  tailOutliers: [
    {
      postId: 'p-qa-04',
      brandName: '青嵐手搖',
      date: '2025-09-08',
      ati: 78.9,
      novelty: 0.19,
      diversity: 0.22,
      likeCount: 1845,
      commentCount: 62,
      followerCount: 184000,
      captionSnippet: '青嵐桂花烏龍買一送一，限時 48 小時內兌換！',
      imageUrl: 'https://placehold.co/400x400?text=QA',
    },
    {
      postId: 'p-ql-18',
      brandName: '逐鹿茶屋',
      date: '2025-07-14',
      ati: 46.7,
      novelty: 0.52,
      diversity: 0.49,
      likeCount: 326,
      commentCount: 18,
      followerCount: 62000,
      captionSnippet: '逐鹿與在地農合作的梅子青茶，低糖版本今日上市。',
      imageUrl: 'https://placehold.co/400x400?text=QL',
    },
  ],
};


