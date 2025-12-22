import React from 'react';
import { Lightbulb, AlertTriangle, CheckCircle, Image, Type, TrendingUp } from 'lucide-react';
import { ImprovementSuggestion, TextSuggestion } from '../services/improvementService';

interface ImprovementSuggestionsProps {
  suggestions: ImprovementSuggestion[];
  onShowABTest?: () => void;
}

const ImprovementSuggestions: React.FC<ImprovementSuggestionsProps> = ({
  suggestions,
  onShowABTest,
}) => {
  if (suggestions.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="text-green-600" size={24} />
          <div>
            <div className="font-semibold text-green-900">內容差異化良好</div>
            <div className="text-sm text-green-700 mt-1">
              您的內容已經具有良好差異化，建議保持當前風格。
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getIcon = (category: string, priority: string) => {
    if (priority === 'high') {
      return <AlertTriangle className="text-red-500" size={20} />;
    }
    if (category === 'text') return <Type className="text-blue-500" size={20} />;
    if (category === 'image') return <Image className="text-purple-500" size={20} />;
    return <TrendingUp className="text-orange-500" size={20} />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-yellow-200 bg-yellow-50';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const labels = { high: '高', medium: '中', low: '低' };
    const colors = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-orange-100 text-orange-700',
      low: 'bg-yellow-100 text-yellow-700',
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority as keyof typeof colors]}`}
      >
        {labels[priority as keyof typeof labels]}優先
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="text-purple-600" size={20} />
        <h3 className="text-lg font-semibold text-gray-900">改進建議</h3>
      </div>

      {suggestions.map((suggestion, index) => {
        const isTextSuggestion = suggestion.category === 'text';
        const textSuggestion = suggestion as TextSuggestion;

        return (
          <div
            key={index}
            className={`border rounded-xl p-5 ${getPriorityColor(suggestion.priority)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1">
                {getIcon(suggestion.category, suggestion.priority)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{suggestion.title}</h4>
                    {getPriorityBadge(suggestion.priority)}
                  </div>
                  <p className="text-sm text-gray-700">{suggestion.description}</p>
                </div>
              </div>
            </div>

            {/* 文字建議的特殊處理 */}
            {isTextSuggestion && textSuggestion.foundWords && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  發現的詞彙：{textSuggestion.foundWords.join('、')}
                </div>
                {textSuggestion.alternatives && Object.keys(textSuggestion.alternatives).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(textSuggestion.alternatives).map(([word, alts]) => (
                      <div key={word} className="text-sm">
                        <span className="font-medium text-gray-700">「{word}」</span>
                        <span className="text-gray-600 mx-2">→</span>
                        <span className="text-blue-600">
                          {alts.slice(0, 3).join('、')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 可執行建議 */}
            {suggestion.actionable && suggestion.actionable.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-sm font-medium text-gray-700">具體建議：</div>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  {suggestion.actionable.map((action, idx) => (
                    <li key={idx}>{action}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 文字建議顯示 A/B 測試按鈕 */}
            {isTextSuggestion && onShowABTest && (
              <button
                onClick={onShowABTest}
                className="mt-4 w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                使用 A/B 測試調整文字
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ImprovementSuggestions;

