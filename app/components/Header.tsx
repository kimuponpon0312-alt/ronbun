'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import UpgradeButton from './UpgradeButton';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default function Header() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [userPlan, setUserPlan] = useState<'free' | 'pro' | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ユーザーのプランを取得
  useEffect(() => {
    if (!session?.user?.email || !supabase) {
      setUserPlan(null);
      return;
    }

    const userEmail = session.user.email;

    // 一般ユーザーの場合はDBから取得
    const fetchUserPlan = async () => {
      try {
        // profilesテーブルから取得
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('plan')
          .eq('email', userEmail)
          .maybeSingle();
        
        if (profileError) {
          console.warn('[Header] profilesテーブル検索エラー:', profileError);
        }
        
        if (profileData?.plan === 'free' || profileData?.plan === 'pro') {
          setUserPlan(profileData.plan);
        } else {
          // DBにプラン情報がない場合は`free`を設定
          setUserPlan('free');
        }
      } catch (error) {
        console.error('[Header] DBからプランを取得できませんでした:', error);
        // エラー時は`free`を設定
        setUserPlan('free');
      }
    };
    
    fetchUserPlan();
  }, [session]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ロゴとブランド名 */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                AXON
              </span>
              <span className="text-xs text-gray-500">文系レポ助</span>
            </div>
          </Link>

          {/* キャッチコピー */}
          <div className="hidden md:flex items-center">
            <p className="text-sm text-gray-600 italic">
              書けないを、構造で解決する。
            </p>
          </div>

          {/* ナビゲーション */}
          <nav className="flex items-center space-x-6">
            <Link
              href="/"
              className="text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors"
            >
              ホーム
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors"
            >
              料金プラン
            </Link>
            
            {/* ログイン状態 */}
            {mounted && (
              <>
                {status === 'loading' ? (
                  <div className="w-20 h-8 bg-gray-200 animate-pulse rounded"></div>
                ) : session ? (
                  <div className="flex items-center space-x-4">
                    {/* プラン表示とアップグレードボタン */}
                    {userPlan === 'free' && (
                      <UpgradeButton
                        variant="primary"
                        className="text-sm px-4 py-2"
                      >
                        Proプラン: ¥1,000/月
                      </UpgradeButton>
                    )}
                    {userPlan === 'pro' && (
                      <span className="text-xs text-purple-600 font-medium bg-purple-50 px-3 py-1 rounded-full">
                        Proプラン契約中
                      </span>
                    )}
                    <Link
                      href="/mypage"
                      className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      マイページ
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors"
                    >
                      ログアウト
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/auth/signin"
                    className="text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-md transition-colors"
                  >
                    ログイン
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
