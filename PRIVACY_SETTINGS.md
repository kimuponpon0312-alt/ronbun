# プライバシー設定について

## 概要

レポートの公開設定機能を実装し、ユーザーのプライバシーを保護します。

## 機能

- レポート生成時に、公開設定のチェックボックスを表示
- デフォルトは**非公開**（チェックなし）
- ユーザーが明示的にチェックした場合のみ、「みんなの生成事例」に表示される

## データベーススキーマ

### shared_reports テーブル

`is_public`カラムを追加してください。

```sql
-- is_publicカラムを追加（既存テーブルがある場合）
ALTER TABLE shared_reports 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 既存のレコードはすべて非公開として扱う
UPDATE shared_reports 
SET is_public = false 
WHERE is_public IS NULL;
```

### テーブル作成（新規の場合）

```sql
CREATE TABLE IF NOT EXISTS shared_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_reports_created_at ON shared_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_reports_is_public ON shared_reports(is_public) WHERE is_public = true;

-- Row Level Security (RLS) の設定
ALTER TABLE shared_reports ENABLE ROW LEVEL SECURITY;

-- 公開レポートは誰でも閲覧可能
CREATE POLICY "Anyone can view public shared reports"
  ON shared_reports
  FOR SELECT
  USING (is_public = true);

-- 誰でもレポートを作成可能（公開設定はユーザーが指定）
CREATE POLICY "Anyone can create shared reports"
  ON shared_reports
  FOR INSERT
  WITH CHECK (true);
```

## 動作

1. **レポート生成時**:
   - ユーザーがチェックボックスをONにした場合: `is_public = true`で保存
   - チェックボックスがOFFの場合（デフォルト）: `is_public = false`で保存

2. **「みんなの生成事例」の表示**:
   - `getPublicReports()`関数で、`is_public = true`のレポートのみを取得
   - 非公開レポートは表示されない

3. **プライバシー保護**:
   - デフォルトで非公開（`is_public = false`）
   - ユーザーが明示的に公開を選択した場合のみ表示される

## 注意事項

- 既存のレポートはすべて非公開として扱われます
- 公開設定はレポート生成時にのみ設定可能（後から変更する機能は現在未実装）
- 匿名で表示されるため、メールアドレスなどの個人情報は表示されません
