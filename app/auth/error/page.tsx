'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const errorMessage = searchParams?.get('error') || null;

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'サーバー設定に問題があります。';
      case 'AccessDenied':
        return 'アクセスが拒否されました。';
      case 'Verification':
        return '認証リンクが無効または期限切れです。';
      default:
        return '認証中にエラーが発生しました。';
    }
  };

  return (
    <div className="min-h-[calc(100vh-128px)] bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            認証エラー
          </h2>
          <p className="mt-4 text-sm text-red-600">
            {getErrorMessage(errorMessage)}
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <Link
            href="/auth/signin"
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
          >
            再度ログインを試す
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-purple-600 hover:text-purple-500"
          >
            トップページに戻る →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-128px)] bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
