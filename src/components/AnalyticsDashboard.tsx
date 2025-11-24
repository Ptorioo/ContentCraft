import React from 'react';
import {
  AnalyticsDataset,
} from '../types/index';

interface AnalyticsDashboardProps {
  data: AnalyticsDataset;
  onBackToChat: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ data }) => {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
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
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

