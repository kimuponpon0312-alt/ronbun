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
