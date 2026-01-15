# 使用回数制限について

## 概要

Freeプランのユーザーに対して、1日の使用回数制限を設けています。

## 制限内容

- **Proプラン**: 制限なし
- **管理者（kimuponpon0312@gmail.com）**: 制限なし
- **Freeプラン**: 1日3回まで

## データベーススキーマ

### usage_logs テーブル

使用ログを記録するためのテーブルです。Supabaseで以下のSQLを実行してテーブルを作成してください。

```sql
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  date DATE NOT NULL,
  action_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスを追加（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_usage_logs_email_date ON usage_logs(email, date);
CREATE INDEX IF NOT EXISTS idx_usage_logs_date ON usage_logs(date);
```

## 動作

1. ユーザーがAPIを呼び出す前に、`checkUsageLimit()`関数で使用回数をチェック
2. 制限を超えている場合は、403エラー（LIMIT_EXCEEDED）を返す
3. 成功した場合のみ、`logUsage()`関数で使用ログを記録

## 注意事項

- Supabaseが設定されていない環境（開発環境など）では、制限チェックがスキップされます
- 管理者のメールアドレスは制限対象外です
- ログインしていないユーザーは制限対象外（別途フロントエンドで制限）
