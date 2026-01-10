'use client';

import { useState } from 'react';

type Field = '法学' | '経済学' | '文学' | '社会学';

type Section = {
  title: string;
  points: string[];
};

type ReportOutline = {
  sections: Section[];
};

const outlineGenerators: Record<Field, (length: number) => Section[]> = {
  法学: (length) => [
    {
      title: '序論',
      points: ['問題提起', '研究目的'],
    },
    {
      title: '本論',
      points: [
        '関連法規の整理',
        '判例・学説の検討',
        ...(length > 5000 ? ['評価・批判'] : []),
      ],
    },
    {
      title: '結論',
      points: ['結論の整理', '残された課題'],
    },
  ],

  経済学: (length) => [
    {
      title: '序論',
      points: ['テーマ設定', '分析視角'],
    },
    {
      title: '本論',
      points: [
        '理論モデルの説明',
        'データ・事例分析',
        ...(length > 5000 ? ['政策的含意'] : []),
      ],
    },
    {
      title: '結論',
      points: ['分析結果の要約', '今後の課題'],
    },
  ],

  文学: (length) => [
    {
      title: '序論',
      points: ['作品・作者紹介', '問題意識'],
    },
    {
      title: '本論',
      points: [
        '表現・構成の分析',
        '主題の考察',
        ...(length > 5000 ? ['他作品との比較'] : []),
      ],
    },
    {
      title: '結論',
      points: ['解釈のまとめ', '文学的意義'],
    },
  ],

  社会学: (length) => [
    {
      title: '序論',
      points: ['社会的背景', '研究課題'],
    },
    {
      title: '本論',
      points: [
        '先行研究の整理',
        '社会構造の分析',
        ...(length > 5000 ? ['制度的含意'] : []),
      ],
    },
    {
      title: '結論',
      points: ['考察のまとめ', '残された課題'],
    },
  ],
};

function generateDummyOutline(field: Field, wordCount: number): ReportOutline {
  const sections = outlineGenerators[field](wordCount);

  if (wordCount < 2000) {
    return { sections: sections.slice(0, 2) };
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
