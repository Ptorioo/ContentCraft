import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Copy, Check } from 'lucide-react';
import { PostAnalysisData } from '../types';
import { analyzeContent } from '../services/contentService';

interface ABTestPanelProps {
  originalText: string;
  originalImage?: File;
  originalAnalysis: PostAnalysisData;
  onApplyChanges?: (modifiedText: string, modifiedAnalysis: PostAnalysisData) => void;
  initialModifiedText?: string;
  initialModifiedAnalysis?: PostAnalysisData;
  onDataChange?: (data: { modifiedText?: string; modifiedAnalysis?: PostAnalysisData }) => void;
}

const ABTestPanel: React.FC<ABTestPanelProps> = ({
  originalText,
  originalImage,
  originalAnalysis,
  onApplyChanges,
  initialModifiedText,
  initialModifiedAnalysis,
  onDataChange,
}) => {
  const [modifiedText, setModifiedText] = useState(initialModifiedText || originalText);
  const [modifiedAnalysis, setModifiedAnalysis] = useState<PostAnalysisData | null>(initialModifiedAnalysis || null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 當 originalText 改變時，重置 modifiedText（但只有在沒有初始值的情況下）
  useEffect(() => {
    if (!initialModifiedText) {
      setModifiedText(originalText);
      setModifiedAnalysis(null);
      setError(null);
    }
  }, [originalText, initialModifiedText]);

  // 當外部傳入的初始值改變時，更新內部狀態
  useEffect(() => {
    if (initialModifiedText !== undefined) {
      setModifiedText(initialModifiedText);
    }
    if (initialModifiedAnalysis !== undefined) {
      setModifiedAnalysis(initialModifiedAnalysis);
    }
  }, [initialModifiedText, initialModifiedAnalysis]);

  // 自動調整 textarea 高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [modifiedText]);

  const handleCalculate = async () => {
    if (!modifiedText.trim()) {
      setError('請輸入修改後的文字內容');
      return;
    }

    setIsCalculating(true);
    setError(null);
    try {
      const result = await analyzeContent(modifiedText, originalImage);
      if (result.analysisData) {
        setModifiedAnalysis(result.analysisData);
        // 通知外部組件數據已更新
        onDataChange?.({
          modifiedText,
          modifiedAnalysis: result.analysisData,
        });
      } else {
        setError('計算失敗，請重試');
      }
    } catch (err: any) {
      setError(err.message || '計算失敗');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleApply = () => {
    if (modifiedAnalysis) {
      onApplyChanges?.(modifiedText, modifiedAnalysis);
      setApplied(true);
      setTimeout(() => setApplied(false), 2000);
    }
  };

  const handleReset = () => {
    setModifiedText(originalText);
    setModifiedAnalysis(null);
    setError(null);
  };

  const atiDiff = modifiedAnalysis
    ? modifiedAnalysis.ati - originalAnalysis.ati
    : 0;
  const isImproved = atiDiff < 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">A/B 測試</h3>
        <button
          onClick={handleReset}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          <RefreshCw size={14} />
          重置
        </button>
      </div>

      <div className="space-y-4">
        {/* 修改版本 */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">編輯文字內容</div>
          <div className="bg-white rounded-lg border-2 border-purple-300 p-4">
            {originalImage && (
              <div className="mb-3">
                <img
                  src={URL.createObjectURL(originalImage)}
                  alt="貼文圖片"
                  className="w-full rounded-lg max-h-48 object-contain"
                />
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={modifiedText}
              onChange={(e) => {
                const newText = e.target.value;
                setModifiedText(newText);
                // 通知外部組件文字已更新
                onDataChange?.({
                  modifiedText: newText,
                  modifiedAnalysis: modifiedAnalysis || undefined,
                });
              }}
              placeholder="輸入修改後的文字內容..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none overflow-hidden"
              rows={1}
            />
          </div>
        </div>

        <button
          onClick={handleCalculate}
          disabled={isCalculating || !modifiedText.trim()}
          className={`
            w-full py-2 px-4 rounded-lg font-medium transition-colors
            ${
              isCalculating || !modifiedText.trim()
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }
          `}
        >
          {isCalculating ? (
            <span className="flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin" />
              計算中...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <RefreshCw size={16} />
              計算 ATI
            </span>
          )}
        </button>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {modifiedAnalysis && (
          <>
            <div
              className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                isImproved
                  ? 'bg-green-50 border-green-300'
                  : 'bg-orange-50 border-orange-300'
              }`}
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 mb-1">修改後 ATI 分數</div>
                <div className="text-2xl font-bold text-gray-900">
                  {modifiedAnalysis.ati.toFixed(1)}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-lg font-bold ${
                    isImproved ? 'text-green-600' : 'text-orange-600'
                  }`}
                >
                  {isImproved ? '↓' : '↑'} {Math.abs(atiDiff).toFixed(1)} 分
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {isImproved ? '改善了' : '增加了'}
                </div>
              </div>
            </div>

            {modifiedText !== originalText && (
              <button
                onClick={handleApply}
                disabled={applied}
                className={`
                  w-full py-2 px-4 rounded-lg font-medium transition-colors
                  ${
                    applied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }
                `}
              >
                {applied ? (
                  <span className="flex items-center justify-center gap-2">
                    <Check size={16} />
                    已套用
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Copy size={16} />
                    套用修改
                  </span>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ABTestPanel;

