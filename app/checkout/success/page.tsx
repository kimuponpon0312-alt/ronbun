'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface ErrorResponse {
  error: string;
  debug?: {
    client_reference_id?: string;
    metadata?: any;
    profilesError?: any;
    usersError?: any;
    userId?: string;
    suggestion?: string;
    type?: string;
    message?: string;
  };
}

export default function SuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update } = useSession();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // 処理済みかどうかを追跡するref（再レンダリングでリセットされない）
  const hasProcessed = useRef(false);

  useEffect(() => {
    // 既に処理済みの場合は実行しない
    if (hasProcessed.current) {
      return;
    }

    const currentSessionId = searchParams.get('session_id');
    
    if (!currentSessionId) {
      router.push('/');
      return;
    }

    // 処理開始をマーク
    hasProcessed.current = true;
    setSessionId(currentSessionId);
    setIsProcessing(true);
    setError(null);
    setErrorDetails(null);

    const processPayment = async () => {
      try {
        console.log('[SuccessPage] 決済確認開始:', currentSessionId);

        // 1. サーバーサイドでStripe決済を確認し、DBを更新
        const response = await fetch('/api/checkout/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ session_id: currentSessionId }),
        });

        const responseData = await response.json();

        if (!response.ok) {
          console.error('[SuccessPage] APIエラー:', {
            status: response.status,
            data: responseData,
          });
          
          setErrorDetails(responseData.debug || null);
          throw new Error(responseData.error || '決済確認に失敗しました');
        }

        console.log('[SuccessPage] 決済確認成功:', responseData);

        // 2. セッションを強制リフレッシュして最新のプラン情報を取得
        console.log('[SuccessPage] セッションリフレッシュ開始');
        await update();
        
        // セッション更新を確実にするため、少し待機してから再度リフレッシュ
        await new Promise(resolve => setTimeout(resolve, 500));
        await update();
        
        console.log('[SuccessPage] セッションリフレッシュ完了');
        
        // 処理完了をマーク
        setIsCompleted(true);
        setIsProcessing(false);
      } catch (err) {
        console.error('[SuccessPage] エラー詳細:', {
          error: err,
          message: err instanceof Error ? err.message : '不明なエラー',
          stack: err instanceof Error ? err.stack : undefined,
        });
        
        // エラー時は再試行可能にする
        hasProcessed.current = false;
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
        setIsProcessing(false);
      }
    };

    processPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 依存配列を空にして、一度だけ実行されるようにする

  const handleRetry = async () => {
    if (!sessionId) {
      return;
    }

    // 再試行時は処理済みフラグをリセット
    hasProcessed.current = false;
    setIsProcessing(true);
    setError(null);
    setErrorDetails(null);

    try {
      console.log('[SuccessPage] 再試行開始:', sessionId);

      const response = await fetch('/api/checkout/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('[SuccessPage] 再試行APIエラー:', {
          status: response.status,
          data: responseData,
        });
        
        setErrorDetails(responseData.debug || null);
        throw new Error(responseData.error || '決済確認に失敗しました');
      }

      console.log('[SuccessPage] 再試行成功:', responseData);

      await update();
      
      setIsCompleted(true);
      setIsProcessing(false);
    } catch (err) {
      console.error('[SuccessPage] 再試行エラー:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-8 py-6 rounded-lg shadow-lg text-center max-w-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-2">処理中...</h1>
          <p className="mb-2">決済を確認し、アカウントを更新しています。</p>
          <p className="text-sm text-blue-600">しばらくお待ちください...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 border border-red-200 text-red-800 px-8 py-6 rounded-lg shadow-lg text-center max-w-3xl">
          <h1 className="text-2xl font-bold mb-4">⚠️ エラーが発生しました</h1>
          <p className="mb-4 text-lg font-semibold">{error}</p>
          
          {errorDetails && (
            <div className="bg-red-100 border border-red-300 rounded p-4 mb-4 text-left text-sm">
              <h3 className="font-bold mb-2">デバッグ情報:</h3>
              <pre className="whitespace-pre-wrap overflow-auto max-h-60">
                {JSON.stringify(errorDetails, null, 2)}
              </pre>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-300 rounded p-4 mb-4 text-left text-sm">
            <h3 className="font-bold mb-2">対処方法:</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>下の「再試行」ボタンをクリックして、もう一度お試しください</li>
              <li>問題が続く場合は、ブラウザを再読み込み（F5）してください</li>
              <li>それでも解決しない場合は、サポートまでお問い合わせください</li>
            </ul>
          </div>

          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={handleRetry}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
            >
              🔄 再試行
            </button>
            <Link 
              href="/"
              className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 transition"
            >
              トップページに戻る
            </Link>
          </div>

          <div className="mt-6 pt-4 border-t border-red-300">
            <p className="text-xs text-red-600">
              ※ 決済は正常に完了していますが、アカウントの更新に失敗しました。<br />
              サポートが必要な場合は、以下の情報をお知らせください:<br />
              <span className="font-mono text-xs bg-red-100 px-2 py-1 rounded">
                Session ID: {sessionId || 'N/A'}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 処理完了時のみ成功画面を表示
  if (isCompleted && !isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-green-100 border border-green-400 text-green-700 px-8 py-6 rounded-lg shadow-lg text-center max-w-2xl">
          <h1 className="text-2xl font-bold mb-4">🎉 決済成功！</h1>
          <p className="mb-4">
            自動でProプランへ切り替わりました。<br />
            すべての機能をご利用いただけます。
          </p>
          <Link 
            href="/"
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition"
          >
            トップページに戻る
          </Link>
        </div>
      </div>
    );
  }

  // 処理中の場合は処理中画面を表示（フォールバック）
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-8 py-6 rounded-lg shadow-lg text-center max-w-2xl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold mb-2">処理中...</h1>
        <p className="mb-2">決済を確認し、アカウントを更新しています。</p>
        <p className="text-sm text-blue-600">しばらくお待ちください...</p>
      </div>
    </div>
  );
}
