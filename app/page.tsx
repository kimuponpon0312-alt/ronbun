'use client';

import { useState } from 'react';

type Field = '法学' | '経済学' | '文学' | '社会学';

interface OutlineSection {
  title: string;
  points: string[];
}

interface ReportOutline {
  sections: OutlineSection[];
}

// ダミーデータ生成関数
function generateDummyOutline(field: Field, wordCount: number): ReportOutline {
  const baseSections: Record<Field, () => OutlineSection[]> = {
    法学: () => [
      {
        title: 'はじめに',
        points: [
          '問題提起：法律問題の背景と重要性',
          '本レポートの目的と構成の提示',
          '検討範囲の限定',
        ],
      },
      {
        title: '現行法制度の検討',
        points: [
          '関連する法律条文の解釈',
          '判例の整理と分析',
          '学説の対立点の整理',
        ],
      },
      {
        title: '問題点の指摘',
        points: [
          '現行制度における課題の明確化',
          '実務上の問題点',
          '理論上の矛盾点',
        ],
      },
      {
        title: '結論',
        points: [
          '検討結果の総括',
          '今後の展望',
        ],
      },
    ],
    経済学: () => [
      {
        title: '序論',
        points: [
          '研究背景と動機',
          '問題意識の明確化',
          '分析の枠組みの提示',
        ],
      },
      {
        title: '理論的考察',
        points: [
          '関連する経済理論の整理',
          '先行研究のレビュー',
          '理論モデルの提示',
        ],
      },
      {
        title: '実証分析',
        points: [
          'データの説明',
          '分析手法の説明',
          '結果の提示と解釈',
        ],
      },
      {
        title: '結論',
        points: [
          '分析結果の要約',
          '政策的含意',
          '今後の研究課題',
        ],
      },
    ],
    文学: () => [
      {
        title: 'はじめに',
        points: [
          '作品の背景と執筆動機',
          '先行研究の整理',
          '本論の視点の提示',
        ],
      },
      {
        title: 'テーマの分析',
        points: [
          '主要テーマの抽出と考察',
          '作品構造の分析',
          '言語表現の特徴',
        ],
      },
      {
        title: '作品の意義',
        points: [
          '当時の社会背景との関係',
          '後世への影響',
          '現代における意義',
        ],
      },
      {
        title: 'おわりに',
        points: [
          '分析の総括',
          '残された課題',
        ],
      ],
    ],
    社会学: () => [
      {
        title: '序論',
        points: [
          '研究の背景と問題意識',
          '研究目的と意義',
          '分析の枠組み',
        ],
      },
      {
        title: '理論的視座',
        points: [
          '関連する社会理論の整理',
          '先行研究のレビュー',
          '分析概念の明確化',
        ],
      },
      {
        title: '実証的検討',
        points: [
          '調査方法の説明',
          'データの分析',
          '結果の解釈',
        ],
      },
      {
        title: '結論',
        points: [
          '知見の総括',
          '理論的含意',
          '今後の研究への示唆',
        ],
      ],
    ],
  };

  const sections = baseSections[field]();
  
  // 字数に応じてセクション数を調整（簡単な調整）
  if (wordCount < 2000) {
    // 短い場合はセクションを減らす
    return { sections: sections.slice(0, 3) };
  } else if (wordCount > 5000) {
    // 長い場合は各セクションの論点を増やす
    return {
      sections: sections.map((section, index) => ({
        ...section,
        points: [...section.points, `追加の論点${index + 1}`],
      })),
    };
  }

  return { sections };
}

export default function Home() {
  const [field, setField] = useState<Field>('法学');
  const [question, setQuestion] = useState('');
  const [wordCount, setWordCount] = useState(3000);
  const [outline, setOutline] = useState<ReportOutline | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const generatedOutline = generateDummyOutline(field, wordCount);
    setOutline(generatedOutline);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          文系レポート構成ジェネレーター
        </h1>

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
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              構成を生成
            </button>
          </div>
        </form>

        {outline && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">レポート構成</h2>
            <div className="space-y-6">
              {outline.sections.map((section, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">
                    {section.title}
                  </h3>
                  <ul className="space-y-2">
                    {section.points.map((point, pointIndex) => (
                      <li key={pointIndex} className="text-gray-700 flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
