'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { ShareData } from '../../actions/saveShareData';
import ShareButtons from '../../components/ShareButtons';

// 分野の表示名マッピング
const FIELD_DISPLAY_NAMES: Record<string, string> = {
  literature: '文学',
  law: '法学',
  philosophy: '哲学',
  sociology: '社会学',
  history: '歴史学',
};

type ShareViewerProps = {
  shareData: ShareData;
  reportId: string;
};

function ShareViewerContent({ shareData, reportId }: ShareViewerProps) {
  const searchParams = useSearchParams();
  const refParam = searchParams?.get('ref');
  const showDiscount = refParam === 'share10';

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${baseUrl}/share/${reportId}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">AXON</h1>
              <p className="text-xs text-gray-500">共有されたレポート構造</p>
            </div>
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              自分でも設計する →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 割引情報バナー（ref=share10の場合） */}
        {showDiscount && (
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg p-4 mb-6 text-center shadow-lg">
            <p className="text-lg font-bold mb-1">💰 特別割引クーポン</p>
            <p className="text-sm opacity-90">
              このリンクから登録すると、Proプランが10%割引になります
            </p>
          </div>
        )}

        {/* メタ情報 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">レポート情報</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500 mb-1">分野</dt>
              <dd className="font-medium text-gray-900">
                {FIELD_DISPLAY_NAMES[shareData.field] || shareData.field}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 mb-1">字数</dt>
              <dd className="font-medium text-gray-900">{shareData.wordCount.toLocaleString()}字</dd>
            </div>
            <div>
              <dt className="text-gray-500 mb-1">指導教員タイプ</dt>
              <dd className="font-medium text-gray-900">{shareData.instructorType}</dd>
            </div>
            <div>
              <dt className="text-gray-500 mb-1">作成日</dt>
              <dd className="font-medium text-gray-900">
                {new Date(shareData.createdAt).toLocaleDateString('ja-JP')}
              </dd>
            </div>
          </dl>
          {shareData.question && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <dt className="text-gray-500 mb-2">課題文</dt>
              <dd className="text-gray-900 whitespace-pre-wrap">{shareData.question}</dd>
            </div>
          )}
        </div>

        {/* レポート構造 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {shareData.outline.coreQuestion && (
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p className="text-sm font-semibold text-blue-900 mb-1">
                {FIELD_DISPLAY_NAMES[shareData.field] || shareData.field}の問いの本質:
              </p>
              <p className="text-sm text-blue-800 italic">
                {shareData.outline.coreQuestion}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">レポート構造</h2>
              <p className="text-sm text-gray-500 mt-1">
                暫定構成（学術テンプレート）
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {shareData.outline.sections.map((section, index) => (
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
        </div>

        {/* 共有ボタン */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">この構造を共有</h3>
          <ShareButtons shareUrl={shareUrl} />
        </div>

        {/* CTA：自分でも設計する */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-2">自分でも構造を設計してみませんか？</h3>
          <p className="mb-6 opacity-90">
            AXONで、あなたのレポート構造も設計できます。無料で5回まで利用可能です。
          </p>
          <Link
            href="/"
            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-md font-medium hover:bg-gray-100 transition-colors"
          >
            今すぐ始める
          </Link>
          {showDiscount && (
            <p className="mt-3 text-sm opacity-90">
              ※ このリンクからアクセスした場合、Proプランが10%割引になります
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ShareViewer({ shareData, reportId }: ShareViewerProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <ShareViewerContent shareData={shareData} reportId={reportId} />
    </Suspense>
  );
}
