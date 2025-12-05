export interface Attachment {
  name: string;
  url: string;
  type?: string;
}

export interface AnalyticsSummary {
  timeframeLabel: string;
  totalBrands: number;
  totalPosts: number;
  avgAti: number;
  highRiskBrandCount: number;
  lastUpdated: string;
}

export interface TrendPoint {
  date: string;
  avgAti: number;
  avgNovelty: number;
  avgDiversity: number;
}

export interface BrandRiskMetric {
  brandId: string;
  brandName: string;
  ati: number;
  novelty: number;
  diversity: number;
  postCount: number;
  followerCount: number;
  samplePostId?: string;
}

export interface LateEntryBrandMetric {
  brandId: string;
  brandName: string;
  firstPostDate: string;
  ati: number;
  avgEngagement: number;
}

export interface ModalityComponent {
  ati: number;
  novelty: number;
  diversity: number;
  engagementWeight: number;
}

export interface ModalityBreakdown {
  text: ModalityComponent;
  image: ModalityComponent;
  metadata: ModalityComponent;
  combinedAti: number;
}

export interface EngagementScalingCheck {
  likeWeight: number;
  commentWeight: number;
  correlationWithAti: number;
  note?: string;
}

export interface TailOutlierPost {
  postId: string;
  brandName: string;
  date: string;
  ati: number;
  novelty: number;
  diversity: number;
  likeCount: number;
  commentCount: number;
  followerCount: number;
  captionSnippet: string;
  imageUrl?: string;
}

export interface PostSnapshot {
  postId: string;
  date: string;
  captionSnippet: string;
  imageUrl?: string;
  ati: number;
  novelty: number;
  diversity: number;
  likeCount: number;
  commentCount: number;
}

export interface ScenarioAdjustment {
  title: string;
  description: string;
  adjustedAti: number;
  changes: string[];
}

export interface CaseStudy {
  brandId: string;
  brandName: string;
  trapRanking: 'highest' | 'lowest';
  rationale: string;
  baseline: PostSnapshot;
  scenarioTests: ScenarioAdjustment[];
}

export interface DistributionDiagnostic {
  chartTitle: string;
  diagnosticType: 'ols-residuals' | 'bayesian-ppc' | 'engagement-tail';
  description: string;
  keyTakeaways: string[];
  placeholderImageUrl?: string;
}

export interface AnalyticsDataset {
  summary: AnalyticsSummary;
  atiTrend: TrendPoint[];
  noveltyDiversityScatter: BrandRiskMetric[];
  topHighRiskBrands: BrandRiskMetric[];
  resilientBrands: BrandRiskMetric[];
  lateEntryBrands: LateEntryBrandMetric[];
  modalityBreakdown: ModalityBreakdown;
  engagementScaling: EngagementScalingCheck;
  caseStudies: CaseStudy[];
  distributionDiagnostics: DistributionDiagnostic[];
  tailOutliers: TailOutlierPost[];
}

export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  attachment?: Attachment;
  analyticsData?: AnalyticsDataset;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: Date;
}

export type ContentType = 'resume' | 'intro' | 'cover-letter' | 'linkedin' | 'general';