'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { generatePoints } from './actions/generatePoints';
import { saveStatistics } from './actions/saveStatistics';

// 型定義（generatePoints.tsから直接インポートできない場合のフォールバック）
type Field = 'literature' | 'law' | 'philosophy' | 'sociology' | 'history';
type InstructorType = '理論重視型' | '実務重視型';
type Plan = 'free' | 'pro';

// 分野の表示名マッピング（内部は英語、表示は日本語）
const FIELD_DISPLAY_NAMES: Record<Field, string> = {
  literature: '文学',
  law: '法学',
  philosophy: '哲学',
  sociology: '社会学',
  history: '歴史学',
};

// 分野の思想説明
const FIELD_DESCRIPTIONS: Record<Field, string> = {
  literature: '解釈の妥当性を設計する',
  law: '規範適用プロセスを設計する',
  philosophy: '概念操作と反論処理を設計する',
  sociology: '説明モデルを設計する',
  history: '史料解釈の枠組みを設計する',
};

type Section = {
  title: string;
  points: string[];
  isFallback?: boolean;
};

type ReportOutline = {
  sections: Section[];
  coreQuestion?: string; // 分野の問いの本質
};

// LocalStorage のキー
const STORAGE_KEY_PLAN = 'report_designer_plan';
const STORAGE_KEY_DESIGN_COUNT = 'report_designer_count';
const STORAGE_KEY_LAST_DESIGN_DATE = 'report_designer_last_date';

// Freeプランの制限（1日5回）
const FREE_PLAN_LIMIT = 5;

// セクション構成を定義（タイトルのみ、論点はテンプレートから設計）
const sectionTemplates: Record<Field, (length: number) => Section[]> = {
  literature: (length) => [
    { title: '序論', points: [] },
    { title: '本論', points: [] },
    { title: '結論', points: [] },
  ],
  law: (length) => [
    { title: '序論', points: [] },
    { title: '本論', points: [] },
    { title: '結論', points: [] },
  ],
  philosophy: (length) => [
    { title: '序論', points: [] },
    { title: '本論', points: [] },
    { title: '結論', points: [] },
  ],
  sociology: (length) => [
    { title: '序論', points: [] },
    { title: '本論', points: [] },
    { title: '結論', points: [] },
  ],
  history: (length) => [
    { title: '序論', points: [] },
    { title: '本論', points: [] },
    { title: '結論', points: [] },
  ],
};

// レポート構成を設計する関数（テンプレートベース）
async function designOutline(
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

  // 各セクションの論点をテンプレートベースで設計（重み付け済み）
  let coreQuestion: string | undefined;
  const sectionsWithPoints = await Promise.all(
    sections.map(async (section): Promise<Section> => {
      try {
        const result = (await generatePoints(
          field as Parameters<typeof generatePoints>[0],
          question,
          wordCount,
          section.title,
          instructorType as Parameters<typeof generatePoints>[4]
        )) as unknown as { points: string[]; isFallback: boolean; coreQuestion?: string };
        
        if (result && result.coreQuestion) {
          coreQuestion = result.coreQuestion;
        }
        return {
          ...section,
          points: result?.points || ['学術テンプレートの読み込み中'],
        };
      } catch (error) {
        // エラーはログのみ、必ずテンプレートを返す
        console.error(`[designOutline] セクション "${section.title}" の設計中にエラー:`, error);
        return {
          ...section,
          points: ['学術テンプレートの読み込み中'],
        };
      }
    })
  );

  return {
    sections: sectionsWithPoints,
    coreQuestion,
  };
}

export default function Home() {
  const [field, setField] = useState<Field>('law');
  const [question, setQuestion] = useState('');
  const [wordCount, setWordCount] = useState(3000);
  const [instructorType, setInstructorType] = useState<InstructorType>('理論重視型');
  const [outline, setOutline] = useState<ReportOutline | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState<Plan>('free');
  const [designCount, setDesignCount] = useState(0); // 生成→設計に変更
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // プランと設計回数の初期化
  useEffect(() => {
    // プランをlocalStorageから読み込み
    const savedPlan = localStorage.getItem(STORAGE_KEY_PLAN) as Plan | null;
    if (savedPlan === 'free' || savedPlan === 'pro') {
      setPlan(savedPlan);
    }

    // 設計回数と日付をチェック
    const lastDate = localStorage.getItem(STORAGE_KEY_LAST_DESIGN_DATE);
    const today = new Date().toISOString().split('T')[0];

    if (lastDate === today) {
      // 今日の日付なら回数を読み込み
      const count = parseInt(localStorage.getItem(STORAGE_KEY_DESIGN_COUNT) || '0', 10);
      setDesignCount(count);
    } else {
      // 日付が変わっていたらリセット
      setDesignCount(0);
      localStorage.setItem(STORAGE_KEY_DESIGN_COUNT, '0');
      localStorage.setItem(STORAGE_KEY_LAST_DESIGN_DATE, today);
    }
  }, []);

  // Freeプランの場合、指導教員タイプを固定（理論重視型のみ）
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

  // 設計回数を更新
  const incrementDesignCount = () => {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem(STORAGE_KEY_LAST_DESIGN_DATE);
    
    // 日付が変わっていたらリセット
    if (lastDate !== today) {
      setDesignCount(1);
      localStorage.setItem(STORAGE_KEY_DESIGN_COUNT, '1');
      localStorage.setItem(STORAGE_KEY_LAST_DESIGN_DATE, today);
    } else {
      // 同じ日ならカウントをインクリメント
      const newCount = designCount + 1;
      setDesignCount(newCount);
      localStorage.setItem(STORAGE_KEY_DESIGN_COUNT, newCount.toString());
    }
  };

  // 設計可能かチェック
  const canDesign = (): boolean => {
    if (plan === 'pro') {
      return true; // Proプランは無制限
    }
    return designCount < FREE_PLAN_LIMIT; // Freeプランは1日5回まで
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Freeプランの制限チェック
    if (!canDesign()) {
      setShowLimitModal(true);
      return;
    }

    setIsLoading(true);

      // 統計を保存（エラーはログのみ、処理は継続）
      // 内部は英語、表示は日本語なのでマッピング不要（saveStatistics側で処理）
      await saveStatistics(field as Parameters<typeof saveStatistics>[0]).catch((err) =>
        console.error('[handleSubmit] 統計保存に失敗:', err)
      );

    try {
      // レポート構成を設計（テンプレートベース、必ず成功）
      const designedOutline = await designOutline(
        field,
        question,
        wordCount,
        instructorType
      );
      setOutline(designedOutline);

      // 設計回数をカウント
      incrementDesignCount();
    } catch (err) {
      // エラーはログのみ、必ずテンプレートを返すためUIにエラーは表示しない
      console.error('[handleSubmit] 構成設計中にエラー:', err);
      // フォールバックとして空の構成を設定（通常は到達しない）
      setOutline({
        sections: [
          { title: '序論', points: ['学術テンプレートの読み込み中'] },
          { title: '本論', points: ['学術テンプレートの読み込み中'] },
          { title: '結論', points: ['学術テンプレートの読み込み中'] },
        ],
      });
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
                本日の残り: {FREE_PLAN_LIMIT - designCount}回
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
                <option value="literature">{FIELD_DISPLAY_NAMES.literature}</option>
                <option value="law">{FIELD_DISPLAY_NAMES.law}</option>
                <option value="philosophy">{FIELD_DISPLAY_NAMES.philosophy}</option>
                <option value="sociology">{FIELD_DISPLAY_NAMES.sociology}</option>
                <option value="history">{FIELD_DISPLAY_NAMES.history}</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 italic">
                {FIELD_DESCRIPTIONS[field]}
              </p>
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
                  指導教員タイプ（論点の重み付け）
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
                <option value="理論重視型">理論重視型 - 理論的フレームワークを重視する重み付け</option>
                <option value="実務重視型">実務重視型 - 実務的な観点を重視する重み付け</option>
              </select>
              {plan === 'free' && (
                <p className="mt-1 text-xs text-gray-500">
                  Freeプランでは「理論重視型」の重み付けのみ利用可能です
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                同じ構成項目でも、教員タイプに応じて表示順序と強調度が自動調整されます
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !canDesign()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? '設計中...' : canDesign() ? '構造を提示する' : '1日の制限に達しました'}
            </button>
          </div>
        </form>

        {outline && (
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* 分野の問いの本質を表示 */}
            {outline.coreQuestion && (
              <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  {FIELD_DISPLAY_NAMES[field]}の問いの本質:
                </p>
                <p className="text-sm text-blue-800 italic">
                  {outline.coreQuestion}
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">レポート構造</h2>
                <p className="text-sm text-gray-500 mt-1">
                  暫定構成（学術テンプレート）
                </p>
              </div>
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
                  ) : (
                    <p className="text-gray-500 text-sm italic">
                      学術テンプレートの読み込み中
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
                    分野「{FIELD_DISPLAY_NAMES[field]}」に関連する参考文献リスト（構造的カテゴリ）:
                  </p>
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">理論的基盤</h4>
                      <ul className="space-y-1 text-gray-600 ml-4">
                        <li>• 基礎理論書・概説書</li>
                        <li>• 主要な研究文献</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">方法論・アプローチ</h4>
                      <ul className="space-y-1 text-gray-600 ml-4">
                        <li>• 分析手法に関する文献</li>
                        <li>• 実証研究の事例</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">具体的検討</h4>
                      <ul className="space-y-1 text-gray-600 ml-4">
                        <li>• 関連する研究論文</li>
                        <li>• 時事資料・データ</li>
                      </ul>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-gray-500 italic">
                    Proプランでは、学術的に評価されやすい参考文献の構造的カテゴリを自動で提示します
                  </p>
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
                Freeプランでは1日5回まで構造を提示できます。本日の設計回数が上限に達しました。
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
