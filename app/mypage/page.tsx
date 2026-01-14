'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// Supabaseクライアントの作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type SavedReport = {
  id: string;
  topic: string;
  content: string;
  created_at: string;
};

export default function MyPage() {
  const { data: session, status } = useSession();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      fetchReports(session.user.email);
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status, session]);

  const fetchReports = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('saved_reports')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('データ取得エラー:', err);
      alert('履歴の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // ▼▼▼ 追加: 削除機能 ▼▼▼
  const deleteReport = async (id: string) => {
    if (!window.confirm('このレポート履歴を削除してもよろしいですか？')) return;

    try {
      const { error } = await supabase
        .from('saved_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // 画面からも削除（再読み込みせずにスッと消す）
      setReports((prev) => prev.filter((report) => report.id !== id));
    } catch (err) {
      console.error('削除エラー:', err);
      alert('削除に失敗しました');
    }
  };
  // ▲▲▲ 追加ここまで ▲▲▲

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">マイページ</h1>
          <p className="text-gray-600 mb-6">履歴を表示するにはログインが必要です。</p>
          <Link
            href="/auth/signin"
            className="inline-block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            ログインする
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">思考の履歴</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
            ← 新しく生成する
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">読み込み中...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">
              まだ保存されたレポートはありません。
            </p>
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors"
            >
              最初のレポートを作る
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {reports.map((report) => (
              <div key={report.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden group">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800 line-clamp-1">
                        {report.topic}
                      </h2>
                      <span className="text-sm text-gray-500">
                        {new Date(report.created_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                    {/* 削除ボタン（ゴミ箱） */}
                    <button
                      onClick={() => deleteReport(report.id)}
                      className="text-gray-400 hover:text-red-500 p-2 transition-colors rounded-full hover:bg-red-50"
                      title="削除する"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded text-sm text-gray-700 max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {(() => {
                      try {
                        const parsed = JSON.parse(report.content);
                        return parsed.sections ? (
                          <ul className="list-disc pl-4 space-y-1">
                            {parsed.sections.map((s: any, i: number) => (
                              <li key={i}>
                                <span className="font-bold">{s.title}</span>: {s.points?.join(', ')}
                              </li>
                            ))}
                          </ul>
                        ) : report.content;
                      } catch {
                        return report.content;
                      }
                    })()}
                  </div>
                  
                  {/* 編集・続きを書くボタン */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Link
                      href={`/?id=${report.id}`}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      編集・続きを書く
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}