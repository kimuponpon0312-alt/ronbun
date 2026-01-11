'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getReportOutlines } from '../actions/getReportOutlines';
import type { ReportOutline } from '../actions/getReportOutlines';
import { saveShareData } from '../actions/saveShareData';

// 分野の表示名マッピング
const FIELD_DISPLAY_NAMES: Record<string, string> = {
  literature: '文学',
  law: '法学',
  philosophy: '哲学',
  sociology: '社会学',
  history: '歴史学',
};

type GroupedOutlines = Record<string, ReportOutline[]>;

export default function MyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [outlines, setOutlines] = useState<ReportOutline[]>([]);
  const [groupedOutlines, setGroupedOutlines] = useState<GroupedOutlines>({});
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedOutline, setSelectedOutline] = useState<ReportOutline | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // レポート構成を取得
  useEffect(() => {
    if (status === 'authenticated' && mounted) {
      loadOutlines();
    }
  }, [status, mounted]);

  const loadOutlines = async () => {
    setLoading(true);
    try {
      const data = await getReportOutlines();
      setOutlines(data);

      // 分野ごとにグループ化
      const grouped: GroupedOutlines = {};
      data.forEach((outline) => {
        if (!grouped[outline.field]) {
          grouped[outline.field] = [];
        }
        grouped[outline.field].push(outline);
      });

      setGroupedOutlines(grouped);

      // デフォルトで全ての分野を展開
      setExpandedFields(new Set(Object.keys(grouped)));
    } catch (error) {
      console.error('[MyPage] レポート構成取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleField = (field: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(field)) {
      newExpanded.delete(field);
    } else {
      newExpanded.add(field);
    }
    setExpandedFields(newExpanded);
  };

  const handleDetail = (outline: ReportOutline) => {
    setSelectedOutline(outline);
    setShowDetailModal(true);
  };

  const handleEdit = (outline: ReportOutline) => {
    // ホームページに遷移して、入力フォームに反映
    const params = new URLSearchParams({
      field: outline.field,
      topic: encodeURIComponent(outline.topic || ''),
      wordCount: outline.wordCount.toString(),
      supervisorType: outline.supervisorType,
    });
    router.push(`/?${params.toString()}`);
  };

  const handleShare = async (outline: ReportOutline) => {
    try {
      const shareData = {
        field: outline.field as 'literature' | 'law' | 'philosophy' | 'sociology' | 'history',
        question: outline.topic,
        wordCount: outline.wordCount,
        instructorType: outline.supervisorType as '理論重視型' | '実務重視型',
        outline: {
          sections: outline.sections,
          coreQuestion: outline.coreQuestion,
        },
        createdAt: outline.createdAt,
      };
      const reportId = await saveShareData(shareData);
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const shareLink = `${baseUrl}/share/${reportId}?ref=share10`;
      setShareUrl(shareLink);
      
      // クリップボードにコピー
      await navigator.clipboard.writeText(shareLink);
      alert('共有リンクをクリップボードにコピーしました');
    } catch (error) {
      console.error('[MyPage] 共有リンク生成エラー:', error);
      alert('共有リンクの生成に失敗しました');
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  if (status === 'loading' || !mounted || loading) {
    return (
      <div className="min-h-[calc(100vh-128px)] bg-gray-50 flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const fields = Object.keys(groupedOutlines).sort();

  return (
    <div className="bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">マイページ</h1>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors"
              >
                ホーム
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>

          {/* アカウント情報 */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">アカウント情報</h2>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
                <dd className="text-sm text-gray-900 mt-1">{session.user?.email || '未設定'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">プラン</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {typeof window !== 'undefined'
                    ? localStorage.getItem('report_designer_plan') === 'pro'
                      ? 'Pro'
                      : 'Free'
                    : 'Free'}
                </dd>
              </div>
            </dl>
          </div>

          {/* 統計情報 */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">統計情報</h2>
            <p className="text-sm text-gray-600">
              保存済みレポート構成: {outlines.length}件
              <br />
              分野別: {fields.map((f) => `${FIELD_DISPLAY_NAMES[f] || f}(${groupedOutlines[f]?.length || 0}件)`).join(', ')}
            </p>
          </div>
        </div>

        {/* 生成履歴（分野ごとにグループ化） */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">生成履歴</h2>

          {fields.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-4">まだレポート構成が保存されていません</p>
              <Link
                href="/"
                className="inline-block bg-purple-600 text-white px-6 py-2 rounded-md font-medium hover:bg-purple-700 transition-colors"
              >
                最初のレポート構成を作成する
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* 分野ヘッダー（折りたたみ可能） */}
                  <button
                    onClick={() => toggleField(field)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-semibold text-gray-900">
                        {FIELD_DISPLAY_NAMES[field] || field}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({groupedOutlines[field]?.length || 0}件)
                      </span>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        expandedFields.has(field) ? 'transform rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* レポートリスト（展開時のみ表示） */}
                  {expandedFields.has(field) && (
                    <div className="divide-y divide-gray-200">
                      {groupedOutlines[field]?.map((outline) => (
                        <div key={outline.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                                {outline.topic || '（課題文なし）'}
                              </p>
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span>{outline.wordCount.toLocaleString()}字</span>
                                <span>{outline.supervisorType}</span>
                                <span>
                                  {new Date(outline.createdAt).toLocaleDateString('ja-JP')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 操作ボタン */}
                          <div className="flex items-center space-x-2 mt-3">
                            <button
                              onClick={() => handleDetail(outline)}
                              className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                            >
                              詳細表示
                            </button>
                            <button
                              onClick={() => handleEdit(outline)}
                              className="px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors"
                            >
                              再編集
                            </button>
                            <button
                              onClick={() => handleShare(outline)}
                              className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
                            >
                              共有リンク
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 詳細表示モーダル */}
      {showDetailModal && selectedOutline && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">レポート構成の詳細</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* メタ情報 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500 mb-1">分野</dt>
                  <dd className="font-medium text-gray-900">
                    {FIELD_DISPLAY_NAMES[selectedOutline.field] || selectedOutline.field}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 mb-1">字数</dt>
                  <dd className="font-medium text-gray-900">
                    {selectedOutline.wordCount.toLocaleString()}字
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 mb-1">指導教員タイプ</dt>
                  <dd className="font-medium text-gray-900">{selectedOutline.supervisorType}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 mb-1">作成日</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(selectedOutline.createdAt).toLocaleString('ja-JP')}
                  </dd>
                </div>
              </dl>
            </div>

            {/* 課題文 */}
            {selectedOutline.topic && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">課題文</h4>
                <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {selectedOutline.topic}
                </p>
              </div>
            )}

            {/* 分野の問いの本質 */}
            {selectedOutline.coreQuestion && (
              <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  {FIELD_DISPLAY_NAMES[selectedOutline.field] || selectedOutline.field}の問いの本質:
                </p>
                <p className="text-sm text-blue-800 italic">{selectedOutline.coreQuestion}</p>
              </div>
            )}

            {/* レポート構造 */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">レポート構造</h4>
              <div className="space-y-6">
                {selectedOutline.sections.map((section, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <h5 className="text-lg font-semibold text-gray-800 mb-3">{section.title}</h5>
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
                      <p className="text-gray-500 text-sm italic">論点なし</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  handleEdit(selectedOutline);
                  setShowDetailModal(false);
                }}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md font-medium hover:bg-purple-700 transition-colors"
              >
                再編集
              </button>
              <button
                onClick={() => {
                  handleShare(selectedOutline);
                }}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md font-medium hover:bg-green-700 transition-colors"
              >
                共有リンク生成
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md font-medium hover:bg-gray-300 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
