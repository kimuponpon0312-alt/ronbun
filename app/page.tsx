'use client';

import { useState } from 'react';
import { generatePoints } from './actions/generatePoints';

type GeneratePointsResult = {
  points: string[];
  isFallback: boolean;
};
import { saveStatistics } from './actions/saveStatistics';

type Field = '法学' | '経済学' | '文学' | '社会学';
type InstructorType = '厳格型' | '実務重視型' | '理論重視型' | '柔軟型';

type Section = {
  title: string;
  points: string[];
  isFallback?: boolean;
};

type ReportOutline = {
  sections: Section[];
  hasFallback?: boolean; // フォールバックが使用されたかどうか
};

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

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
    } catch (err) {
      setError('レポート構成の生成に失敗しました。再度お試しください。');
      console.error('Error generating outline:', err);
    } finally {
      setIsLoading(false);
    }
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
              <label htmlFor="instructorType" className="block text-sm font-medium text-gray-700 mb-2">
                指導教員タイプ
              </label>
              <select
                id="instructorType"
                value={instructorType}
                onChange={(e) => setInstructorType(e.target.value as InstructorType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              >
                <option value="厳格型">厳格型 - 厳密な論理構成を重視</option>
                <option value="実務重視型">実務重視型 - 実務的な観点を重視</option>
                <option value="理論重視型">理論重視型 - 理論的フレームワークを重視</option>
                <option value="柔軟型">柔軟型 - 創造的な視点を重視</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? '生成中...' : '構成を生成'}
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">レポート構成</h2>
              {outline.hasFallback && (
                <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  暫定構成を表示しています
                </span>
              )}
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
                  {section.points.length > 0 ? (
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
                      論点が生成されませんでした。
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
