'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPublicReports, type PublicReport } from '../actions/getPublicReports';

const FIELD_DISPLAY_NAMES: Record<string, string> = {
  literature: '文学',
  law: '法学',
  philosophy: '哲学',
  sociology: '社会学',
  history: '歴史学',
};

// 日付をフォーマット（YYYY/MM/DD形式）
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  } catch {
    return dateString;
  }
}

// テキストを省略（30文字程度で「...」を付ける）
function truncateText(text: string, maxLength: number = 30): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
}

export default function ReportGallery() {
  const [reports, setReports] = useState<PublicReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await getPublicReports();
        setReports(data);
      } catch (error) {
        console.error('[ReportGallery] データ取得エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, []);

  // データがない場合は何も表示しない
  if (isLoading) {
    return (
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            みんなの生成事例
          </h2>
          <div className="text-center text-gray-500">読み込み中...</div>
        </div>
      </section>
    );
  }

  if (!reports || reports.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          みんなの生成事例
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <Link
              key={report.id}
              href={`/share/${report.id}`}
              className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 border border-gray-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                  {FIELD_DISPLAY_NAMES[report.field] || report.field}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(report.createdAt)}
                </span>
              </div>
              <p className="text-sm text-gray-700 line-clamp-2">
                {truncateText(report.topic, 50)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
