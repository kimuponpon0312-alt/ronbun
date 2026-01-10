'use client';

import Link from 'next/link';

export default function VerifyRequestPage() {
  return (
    <div className="min-h-[calc(100vh-128px)] bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            メールを確認してください
          </h2>
          <p className="mt-4 text-sm text-gray-600">
            認証リンクをメールアドレスに送信しました。
            <br />
            メールボックスを確認して、リンクをクリックしてください。
          </p>
          <p className="mt-2 text-xs text-gray-500">
            メールが届かない場合は、迷惑メールフォルダも確認してください。
          </p>
        </div>
        <div>
          <Link
            href="/"
            className="font-medium text-purple-600 hover:text-purple-500 text-sm"
          >
            トップページに戻る →
          </Link>
        </div>
      </div>
    </div>
  );
}
