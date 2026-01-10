'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function MyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  if (status === 'loading' || !mounted) {
    return (
      <div className="min-h-[calc(100vh-128px)] bg-gray-50 flex items-center justify-center">
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

  return (
    <div className="bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">マイページ</h1>
          
          {/* ユーザー情報 */}
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
                    ? localStorage.getItem('report_designer_plan') === 'pro' ? 'Pro' : 'Free'
                    : 'Free'
                  }
                </dd>
              </div>
            </dl>
          </div>

          {/* 利用状況 */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">利用状況</h2>
            <p className="text-sm text-gray-600">
              本日の設計回数: {typeof window !== 'undefined' 
                ? parseInt(localStorage.getItem('report_designer_count') || '0', 10)
                : 0
              }回
            </p>
          </div>

          {/* アクション */}
          <div className="space-y-4">
            <Link
              href="/"
              className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors text-center"
            >
              ホームに戻る
            </Link>
            <Link
              href="/pricing"
              className="block w-full bg-purple-600 text-white py-2 px-4 rounded-md font-medium hover:bg-purple-700 transition-colors text-center"
            >
              料金プランを確認
            </Link>
            <button
              onClick={handleSignOut}
              className="block w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md font-medium hover:bg-gray-300 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
