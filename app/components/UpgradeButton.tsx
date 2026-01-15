'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface UpgradeButtonProps {
  className?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'link';
}

export default function UpgradeButton({ 
  className = '', 
  children = 'Proプランにアップグレード',
  variant = 'primary'
}: UpgradeButtonProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    if (status === 'loading') {
      return;
    }

    if (!session) {
      // ログインしていない場合はログインページへ
      router.push('/auth/signin');
      return;
    }

    setIsLoading(true);

    try {
      // ★重要：ここで明示的にメールアドレスを送信
      const userEmail = session.user?.email;
      const userId = (session.user as any)?.id;
      
      console.log('[UpgradeButton] 決済リクエスト送信:', { email: userEmail, userId });

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: userEmail, // クライアントからメールアドレスを明示的に送信
          userId: userId // ユーザーIDも送信
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Checkoutセッションの作成に失敗しました');
      }

      const data = await response.json();
      
      if (data.url) {
        // Stripe Checkoutページへリダイレクト
        window.location.href = data.url;
      } else {
        throw new Error('Checkout URLが取得できませんでした');
      }
    } catch (error) {
      // エラーの詳細をログに記録（開発環境のみ）
      if (process.env.NODE_ENV === 'development') {
        console.error('[UpgradeButton] エラー詳細:', {
          error,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'エラーが発生しました。もう一度お試しください。';
      
      alert(errorMessage);
      setIsLoading(false);
    }
  };

  // ボタンのスタイルを決定
  const getButtonStyles = () => {
    const baseStyles = 'inline-flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    
    switch (variant) {
      case 'primary':
        return `${baseStyles} bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`;
      case 'secondary':
        return `${baseStyles} bg-gray-200 text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2`;
      case 'link':
        return `${baseStyles} text-purple-600 hover:text-purple-700 underline focus:outline-none`;
      default:
        return baseStyles;
    }
  };

  return (
    <button
      onClick={handleUpgrade}
      disabled={isLoading || status === 'loading'}
      className={`${getButtonStyles()} ${className}`}
    >
      {isLoading ? '処理中...' : children}
    </button>
  );
}
