'use server';

import { auth } from '@/auth';
import { createClient } from '@supabase/supabase-js';

// Freeプランの1日の制限回数
const FREE_PLAN_DAILY_LIMIT = 3;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * ユーザーの使用回数制限をチェックする
 * @returns {Promise<{ allowed: boolean; count: number; limit: number; error?: string }>}
 */
export async function checkUsageLimit(): Promise<{
  allowed: boolean;
  count: number;
  limit: number;
  error?: string;
}> {
  // セッション情報を取得
  const session = await auth();
  const userEmail = session?.user?.email;

  // ログインしていない場合は制限あり
  if (!userEmail) {
    return {
      allowed: false,
      count: 0,
      limit: 0,
      error: 'ログインが必要です',
    };
  }

  // Supabaseが設定されていない場合は制限なし（開発環境など）
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[checkUsageLimit] Supabase credentials are not set. Allowing unlimited usage.');
    return {
      allowed: true,
      count: 0,
      limit: Infinity,
    };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 今日の日付を取得
    const today = new Date().toISOString().split('T')[0];

    // 今日の使用回数をカウント（action_typeに関係なく、すべてのログをカウント）
    const { data: usageLogs, error: selectError } = await supabase
      .from('usage_logs')
      .select('id')
      .eq('email', userEmail)
      .eq('date', today);

    if (selectError) {
      // テーブルが存在しない場合は、作成を試みる（エラーを無視）
      console.error('[checkUsageLimit] Error fetching usage logs:', selectError);
      // エラーが発生しても、制限なしとして扱う（開発環境など）
      return {
        allowed: true,
        count: 0,
        limit: Infinity,
      };
    }

    const count = usageLogs?.length || 0;

    // Freeプランの場合は3回まで
    // TODO: 将来的にDBからプラン情報を取得する
    const limit = FREE_PLAN_DAILY_LIMIT;

    return {
      allowed: count < limit,
      count,
      limit,
      error: count >= limit ? `1日の制限（${limit}回）に達しました` : undefined,
    };
  } catch (error) {
    console.error('[checkUsageLimit] Unexpected error:', error);
    // エラーが発生した場合は、制限なしとして扱う（開発環境など）
    return {
      allowed: true,
      count: 0,
      limit: Infinity,
    };
  }
}

/**
 * 使用ログを記録する
 * @param actionType アクションタイプ（例: 'generatePoints'）
 */
export async function logUsage(actionType: string): Promise<void> {
  const session = await auth();
  const userEmail = session?.user?.email;

  if (!userEmail) {
    return;
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const today = new Date().toISOString().split('T')[0];

    // 使用ログを記録
    await supabase.from('usage_logs').insert({
      email: userEmail,
      date: today,
      action_type: actionType,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // ログ記録のエラーは無視（統計はオプショナル）
    console.error('[logUsage] Failed to log usage:', error);
  }
}
