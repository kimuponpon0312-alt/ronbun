'use server';

import { createClient } from '@supabase/supabase-js';
import type { Field } from './generatePoints';

// 分野の内部名を日本語表示名にマッピング（統計用）
const FIELD_DISPLAY_MAP: Record<Field, string> = {
  literature: '文学',
  law: '法学',
  philosophy: '哲学',
  sociology: '社会学',
  history: '歴史学',
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function saveStatistics(field: Field): Promise<void> {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase credentials are not set. Statistics will not be saved.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 今日の日付で統計を取得または更新
    const today = new Date().toISOString().split('T')[0];
    
    // 既存のレコードをチェック
    const { data: existing, error: selectError } = await supabase
      .from('generation_stats')
      .select('*')
      .eq('date', today)
      .eq('field', FIELD_DISPLAY_MAP[field] || field) // 表示名に変換
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116はレコードが見つからない場合のエラーコードなので無視
      throw selectError;
    }

    if (existing) {
      // 既存レコードを更新
      const { error: updateError } = await supabase
        .from('generation_stats')
        .update({ count: existing.count + 1 })
        .eq('id', existing.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      // 新規レコードを作成
      const { error: insertError } = await supabase
        .from('generation_stats')
        .insert({
          date: today,
          field: FIELD_DISPLAY_MAP[field] || field, // 表示名に変換
          count: 1,
        });

      if (insertError) {
        throw insertError;
      }
    }
  } catch (error) {
    console.error('Failed to save statistics:', error);
    // エラーが発生しても処理を継続（統計はオプショナル）
  }
}
