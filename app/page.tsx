'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { generatePoints } from './actions/generatePoints';
import { saveStatistics } from './actions/saveStatistics';

type GeneratePointsResult = {
  points: string[];
  isFallback: boolean;
};

type Field = '法学' | '経済学' | '文学' | '社会学';
type InstructorType = '厳格型' | '実務重視型' | '理論重視型' | '柔軟型';
type Plan = 'free' | 'pro';

type Section = {
  title: string;
  points: string[];
  isFallback?: boolean;
};

type ReportOutline = {
  sections: Section[];
  hasFallback?: boolean; // フォールバックが使用されたかどうか
};

// LocalStorage のキー
const STORAGE_KEY_PLAN = 'report_generator_plan';
const STORAGE_KEY_GENERATION_COUNT = 'report_generator_count';
const STORAGE_KEY_LAST_GENERATION_DATE = 'report_generator_last_date';

// Freeプランの制限
const FREE_PLAN_LIMIT = 5;

// セクション構成を定義（タイトルのみ、論点はAIで生成）
const sectionTemplates: Record<Field, (length: number) => Section[]> = {
  法学: (length) => [
    {
      title: '序論',
      points: [], // AIで生成
    },
    {
      title: '本論',
      points: [], // AIで生成
    },
    {
      title: '結論',
      points: [], // AIで生成
    },
  ],

  経済学: (length) => [
    {
      title: '序論',
      points: [], // AIで生成
    },
    {
      title: '本論',
      points: [], // AIで生成
    },
    {
      title: '結論',
      points: [], // AIで生成
    },
  ],

  文学: (length) => [
    {
      title: '序論',
      points: [], // AIで生成
    },
    {
      title: '本論',
      points: [], // AIで生成
    },
    {
      title: '結論',
      points: [], // AIで生成
    },
  ],

  社会学: (length) => [
    {
      title: '序論',
      points: [], // AIで生成
    },
    {
      title: '本論',
      points: [], // AIで生成
    },
    {
      title: '結論',
      points: [], // AIで生成
    },
  ],
};

async function generateOutline(
  field: Field,
  question: string,
  wordCount: number,
  instructorType: InstructorType
): Promise<ReportOutline> {
  // セクション構成を取得
  let sections = sectionTemplates[field](wordCount);

  if (wordCount < 2000) {
    sections = sections.slice(0, 2);
  }

  // 各セクションの論点をAIで生成（フォールバック対応）
  const sectionsWithPoints = await Promise.all(
    sections.map(async (section): Promise<Section> => {
      const result = (await generatePoints(
        field,
        question,
        wordCount,
        section.title,
        instructorType
      )) as unknown as { points: string[]; isFallback: boolean };
      return {
        ...section,
        points: result.points,
        isFallback: result.isFallback,
      };
    })
  );

  // フォールバックが使用されたかどうかを判定
  const hasFallback = sectionsWithPoints.some((section) => section.isFallback);

  return {
    sections: sectionsWithPoints,
    hasFallback,
  };
}

export default function Home() {
  const [field, setField] = useState<Field>('法学');
  const [question, setQuestion] = useState('');
  const [wordCount, setWordCount] = useState(3000);
  const [instructorType, setInstructorType] = useState<InstructorType>('理論重視型');
  const [outline, setOutline] = useState<ReportOutline | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>('free');
  const [generationCount, setGenerationCount] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // プランと生成回数の初期化
  useEffect(() => {
    // プランをlocalStorageから読み込み
    const savedPlan = localStorage.getItem(STORAGE_KEY_PLAN) as Plan | null;
    if (savedPlan === 'free' || savedPlan === 'pro') {
      setPlan(savedPlan);
    }

    // 生成回数と日付をチェック
    const lastDate = localStorage.getItem(STORAGE_KEY_LAST_GENERATION_DATE);
    const today = new Date().toISOString().split('T')[0];

    if (lastDate === today) {
      // 今日の日付なら回数を読み込み
      const count = parseInt(localStorage.getItem(STORAGE_KEY_GENERATION_COUNT) || '0', 10);
      setGenerationCount(count);
    } else {
      // 日付が変わっていたらリセット
      setGenerationCount(0);
      localStorage.setItem(STORAGE_KEY_GENERATION_COUNT, '0');
      localStorage.setItem(STORAGE_KEY_LAST_GENERATION_DATE, today);
    }
  }, []);

  // Freeプランの場合、指導教員タイプを固定
  useEffect(() => {
    if (plan === 'free') {
      setInstructorType('理論重視型');
    }
  }, [plan]);

  // Freeプランの場合、指導教員タイプを固定
  useEffect(() => {
    if (plan === 'free') {
      setInstructorType('理論重視型');
    }
  }, [plan]);

  // プラン変更時の処理
  const handlePlanChange = (newPlan: Plan) => {
    setPlan(newPlan);
    localStorage.setItem(STORAGE_KEY_PLAN, newPlan);
  };

  // 生成回数を更新
  const incrementGenerationCount = () => {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem(STORAGE_KEY_LAST_GENERATION_DATE);
    
    // 日付が変わっていたらリセット
    if (lastDate !== today) {
      setGenerationCount(1);
      localStorage.setItem(STORAGE_KEY_GENERATION_COUNT, '1');
      localStorage.setItem(STORAGE_KEY_LAST_GENERATION_DATE, today);
    } else {
      // 同じ日ならカウントをインクリメント
      const newCount = generationCount + 1;
      setGenerationCount(newCount);
      localStorage.setItem(STORAGE_KEY_GENERATION_COUNT, newCount.toString());
    }
  };

  // 生成可能かチェック
  const canGenerate = (): boolean => {
    if (plan === 'pro') {
      return true; // Proプランは無制限
    }
    return generationCount < FREE_PLAN_LIMIT; // Freeプランは1日5回まで
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Freeプランの制限チェック
    if (!canGenerate()) {
      setShowLimitModal(true);
      return;
    }

    setIsLoading(true);

    try {
      // 統計を保存（エラーが発生しても処理は継続）
      await saveStatistics(field).catch((err) =>
        console.error('Failed to save statistics:', err)
      );

      // アウトラインを生成
      const generatedOutline = await generateOutline(
        field,
        question,
        wordCount,
        instructorType
      );
      setOutline(generatedOutline);

      // 生成回数をカウント
      incrementGenerationCount();
    } catch (err) {
      setError('レポート構成の生成に失敗しました。再度お試しください。');
      console.error('Error generating outline:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* プラン切り替えUI */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">プラン:</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePlanChange('free')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    plan === 'free'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Free
                </button>
                <button
                  onClick={() => handlePlanChange('pro')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    plan === 'pro'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Pro
                </button>
              </div>
            </div>
            {plan === 'free' && (
              <div className="text-sm text-gray-600">
                本日の残り: {FREE_PLAN_LIMIT - generationCount}回
              </div>
            )}
            {plan === 'pro' && (
              <div className="text-sm text-purple-600 font-medium">
                🔓 無制限
              </div>
            )}
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            AXON
          </h1>
          <p className="text-sm text-gray-500 mb-1">文系レポ助</p>
          <p className="text-lg text-gray-600 italic">
            書けないを、構造で解決する。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="space-y-6">
            <div>
              <label htmlFor="field" className="block text-sm font-medium text-gray-700 mb-2">
                分野
              </label>
              <select
                id="field"
                value={field}
                onChange={(e) => setField(e.target.value as Field)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              >
                <option value="法学">法学</option>
                <option value="経済学">経済学</option>
                <option value="文学">文学</option>
                <option value="社会学">社会学</option>
              </select>
            </div>

            <div>
              <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
                課題文
              </label>
              <textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="レポートの課題文を入力してください"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="wordCount" className="block text-sm font-medium text-gray-700 mb-2">
                字数
              </label>
              <input
                type="number"
                id="wordCount"
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
                min="500"
                max="10000"
                step="500"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label htmlFor="instructorType" className="block text-sm font-medium text-gray-700">
                  指導教員タイプ
                </label>
                {plan === 'free' && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
                    🔒 Pro限定
                  </span>
                )}
              </div>
              <select
                id="instructorType"
                value={instructorType}
                onChange={(e) => setInstructorType(e.target.value as InstructorType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading || plan === 'free'}
              >
                <option value="厳格型">厳格型 - 厳密な論理構成を重視</option>
                <option value="実務重視型">実務重視型 - 実務的な観点を重視</option>
                <option value="理論重視型">理論重視型 - 理論的フレームワークを重視</option>
                <option value="柔軟型">柔軟型 - 創造的な視点を重視</option>
              </select>
              {plan === 'free' && (
                <p className="mt-1 text-xs text-gray-500">
                  Freeプランでは「理論重視型」のみ利用可能です
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !canGenerate()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? '生成中...' : canGenerate() ? '構成を生成' : '1日の制限に達しました'}
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {outline && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-900">レポート構成</h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {outline.hasFallback && (
                  <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                    暫定構成を表示しています
                  </span>
                )}
                {/* 書き出しボタン（Pro限定） */}
                <div className="flex items-center gap-2 relative">
                  <button
                    disabled={plan === 'free'}
                    onClick={() => {
                      if (plan === 'free') {
                        setShowTooltip(!showTooltip);
                        setTimeout(() => setShowTooltip(false), 3000);
                      }
                      // PDF書き出し機能（未実装）
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                      plan === 'free'
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                    title={plan === 'free' ? 'Proプラン限定機能です' : 'PDF書き出し'}
                  >
                    {plan === 'free' && <span>🔒</span>}
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    PDF
                  </button>
                  <button
                    disabled={plan === 'free'}
                    onClick={() => {
                      if (plan === 'free') {
                        setShowTooltip(!showTooltip);
                        setTimeout(() => setShowTooltip(false), 3000);
                      }
                      // Word書き出し機能（未実装）
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                      plan === 'free'
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    title={plan === 'free' ? 'Proプラン限定機能です' : 'Word書き出し'}
                  >
                    {plan === 'free' && <span>🔒</span>}
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Word
                  </button>
                  {showTooltip && plan === 'free' && (
                    <div className="absolute top-full right-0 mt-2 bg-gray-900 text-white text-sm px-3 py-2 rounded-md shadow-lg z-10 whitespace-nowrap">
                      Proプラン限定機能です
                      <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {outline.hasFallback && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-800">
                  AI生成に失敗したため、暫定構成を表示しています。論点は学術レポートで頻出するパターンに基づいています。
                </p>
              </div>
            )}
            <div className="space-y-6">
              {outline.sections.map((section, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">
                    {section.title}
                  </h3>
                  {section.points && section.points.length > 0 ? (
                    <ul className="space-y-2">
                      {section.points.map((point, pointIndex) => (
                        <li key={pointIndex} className="text-gray-700 flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  ) : section.isFallback ? (
                    <p className="text-amber-600 text-sm italic bg-amber-50 px-3 py-2 rounded">
                      暫定構成を表示しています
                    </p>
                  ) : (
                    <p className="text-gray-500 text-sm italic">
                      論点が生成されませんでした。
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* 参考文献リスト提案セクション（Pro限定） */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-gray-800">
                    参考文献リスト提案
                  </h3>
                  {plan === 'free' && (
                    <div className="relative group">
                      <span className="text-lg">🔒</span>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-sm px-3 py-2 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        Proプラン限定機能です
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    </div>
                  )}
                </div>
                {plan === 'free' && (
                  <Link
                    href="/pricing"
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Proプランにアップグレード →
                  </Link>
                )}
              </div>
              {plan === 'free' ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <p className="text-gray-600 mb-3">
                    参考文献リストの自動提案はProプラン限定機能です
                  </p>
                  <Link
                    href="/pricing"
                    className="inline-block bg-purple-600 text-white px-4 py-2 rounded-md font-medium hover:bg-purple-700 transition-colors text-sm"
                  >
                    Proプランを確認する
                  </Link>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-3">
                    分野「{field}」に関連する参考文献候補：
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>参考文献提案機能は準備中です</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Proプランでは自動で参考文献リストを生成します</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 制限超過モーダル */}
        {showLimitModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                1日の制限に達しました
              </h3>
              <p className="text-gray-700 mb-6">
                Freeプランでは1日5回まで生成可能です。本日の生成回数が上限に達しました。
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowLimitModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md font-medium hover:bg-gray-300 transition-colors"
                >
                  閉じる
                </button>
                <button
                  onClick={() => {
                    handlePlanChange('pro');
                    setShowLimitModal(false);
                  }}
                  className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md font-medium hover:bg-purple-700 transition-colors"
                >
                  Proプランに切り替え
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
