# AXON 次期機能実装ガイド

## 実装状況

### ✅ 完了: サーバーアクション・ユーティリティ関数
- ✅ `app/actions/generatePointsFromComment.ts` - コメント反映型生成
- ✅ `app/utils/diffOutline.ts` - 履歴差分表示
- ✅ `app/utils/classifyPoints.ts` - 論点分類
- ✅ `app/utils/referenceSuggest.ts` - 参考文献サジェスト
- ✅ `app/data/references.json` - 参考文献データ

### ⏳ 実装中: `page.tsx`への統合

## 実装手順

### Step 1: インポートの追加

`page.tsx`の10-11行目に以下を追加：

```typescript
import { generateAdditionalPoints, type GenerationIntent } from './actions/generateAdditionalPoints';
import { generatePointsFromComment, type CommentType } from './actions/generatePointsFromComment';
import { diffOutline, type OutlineDiffResult } from './utils/diffOutline';
import { classifyPoints, type PointTag, type TaggedPoint } from './utils/classifyPoints';
import { suggestReferences } from './utils/referenceSuggest';
import ShareButtons from './components/ShareButtons';
```

### Step 2: 型定義の拡張

`page.tsx`の42-45行目の`ReportOutline`型に以下を追加：

```typescript
type ReportOutline = {
  sections: Section[];
  coreQuestion?: string;
  level?: 1 | 2 | 3; // 追加
};
```

### Step 3: 定数の追加

`page.tsx`の56行目の後に以下を追加：

```typescript
// 新機能の制限（Freeプラン）
const FREE_COMMENT_LIMIT = 3; // Free: コメント反映型生成は1日3回まで
const FREE_EXPAND_LIMIT = 3; // Free: 段階的拡張は1日3回まで
const FREE_REGENERATE_LIMIT = 3; // Free: セクション再生成は1日3回まで
const FREE_DIFF_LIMIT = 3; // Free: 差分表示は履歴3件まで
```

### Step 4: 状態変数の追加

`page.tsx`の157行目の後に以下を追加：

```typescript
  // コメント反映型生成の状態
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentSection, setCommentSection] = useState<'序論' | '本論' | '結論'>('本論');
  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState<CommentType>('criticism');
  const [targetPointIndex, setTargetPointIndex] = useState<number | undefined>(undefined);
  const [isGeneratingFromComment, setIsGeneratingFromComment] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  
  // 段階的アウトライン拡張の状態
  const [outlineLevel, setOutlineLevel] = useState<1 | 2 | 3>(2);
  const [isExpandingLevel, setIsExpandingLevel] = useState(false);
  const [expandCount, setExpandCount] = useState(0);
  
  // 履歴差分表示の状態
  const [outlineHistory, setOutlineHistory] = useState<ReportOutline[]>([]);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
  
  // セクション再生成の状態
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenerateSection, setRegenerateSection] = useState<'序論' | '本論' | '結論'>('本論');
  const [regenerateMode, setRegenerateMode] = useState<'add' | 'replace'>('add');
  const [regenerateComment, setRegenerateComment] = useState('');
  const [regenerateCount, setRegenerateCount] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // 参考文献サジェストの状態
  const [showReferences, setShowReferences] = useState(false);
  const [suggestedReferences, setSuggestedReferences] = useState<Array<{ category: string; references: string[] }>>([]);
  
  // 論点分類の状態
  const [taggedPoints, setTaggedPoints] = useState<Map<string, TaggedPoint[]>>(new Map());
  const [selectedTags, setSelectedTags] = useState<PointTag[]>([]);
  const [showTags, setShowTags] = useState(false);
```

### Step 5: ハンドラー関数の追加

`page.tsx`の`handleCopyLink`関数（517行目）の後に以下を追加：

詳細は別ファイル `page-features.ts` を参照

### Step 6: UIの追加

各機能のUIモーダルを追加（1217行目の`</div>`の前）

## 次のステップ

実装の詳細は、各機能ごとに段階的に進めていきます。
