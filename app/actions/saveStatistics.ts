'use server';

import { createClient } from '@supabase/supabase-js';

type Field = '法学' | '経済学' | '文学' | '社会学';

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
      .eq('field', field)
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
          field: field,
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
