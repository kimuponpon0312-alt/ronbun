'use server';

import { createClient } from '@supabase/supabase-js';
import { auth } from '../../auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export type Section = {
  title: string;
  points: string[];
};

export type ReportOutlineData = {
  field: string;
  topic: string;
  wordCount: number;
  supervisorType: string;
  sections: Section[];
  coreQuestion?: string;
};

export async function saveReportOutline(data: ReportOutlineData): Promise<string | null> {
  // 認証チェック
  const session = await auth();
  if (!session?.user?.email) {
    console.error('[saveReportOutline] ユーザーがログインしていません');
    return null;
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase credentials are not set. Report outline will not be saved.');
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const { data: savedData, error } = await supabase
      .from('report_outlines')
      .insert({
        user_id: session.user.email,
        field: data.field,
        topic: data.topic,
        word_count: data.wordCount,
        supervisor_type: data.supervisorType,
        sections: data.sections,
        core_question: data.coreQuestion || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[saveReportOutline] 保存エラー:', error);
      return null;
    }

    console.log('[saveReportOutline] レポート構成を保存しました:', savedData.id);
    return savedData.id;
  } catch (error) {
    console.error('[saveReportOutline] エラーが発生しました:', error);
    return null;
  }
}
