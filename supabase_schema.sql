-- Supabase テーブル作成SQL
-- このSQLをSupabaseのSQL Editorで実行してください

CREATE TABLE IF NOT EXISTS generation_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  field VARCHAR(20) NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, field)
);

-- インデックスを作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_generation_stats_date ON generation_stats(date);
CREATE INDEX IF NOT EXISTS idx_generation_stats_field ON generation_stats(field);

-- 更新時刻を自動更新するトリガー（オプション）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_generation_stats_updated_at 
BEFORE UPDATE ON generation_stats 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- レポート構成保存用テーブル
CREATE TABLE IF NOT EXISTS report_outlines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL, -- NextAuthのユーザーID（emailまたはsub）
  field VARCHAR(20) NOT NULL,
  topic TEXT NOT NULL, -- 課題文
  word_count INTEGER NOT NULL,
  supervisor_type VARCHAR(20) NOT NULL, -- 指導教員タイプ
  sections JSONB NOT NULL, -- セクション情報（配列）
  core_question TEXT, -- 分野の問いの本質
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスを作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_report_outlines_user_id ON report_outlines(user_id);
CREATE INDEX IF NOT EXISTS idx_report_outlines_field ON report_outlines(field);
CREATE INDEX IF NOT EXISTS idx_report_outlines_created_at ON report_outlines(created_at DESC);

-- 更新時刻を自動更新するトリガー
CREATE TRIGGER update_report_outlines_updated_at 
BEFORE UPDATE ON report_outlines 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- 共有レポート保存用テーブル
CREATE TABLE IF NOT EXISTS shared_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスを作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_shared_reports_created_at ON shared_reports(created_at DESC);

-- RLS (Row Level Security) を有効化
ALTER TABLE shared_reports ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 全員が参照可能（SELECT）
CREATE POLICY "Anyone can view shared reports"
  ON shared_reports
  FOR SELECT
  USING (true);

-- RLSポリシー: 誰でも作成可能（INSERT）
CREATE POLICY "Anyone can create shared reports"
  ON shared_reports
  FOR INSERT
  WITH CHECK (true);
