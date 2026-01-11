# page.tsx 統合パッチドキュメント

## 対象機能
- ✅ 参考文献サジェスト
- ✅ 論点分類表示
- ✅ 履歴差分表示

---

## ① 追加すべき import 一覧

### 追加位置
**11行目**（`import ShareButtons from './components/ShareButtons';`）の**直後**に追加

### import 文
```typescript
import { suggestReferences } from './utils/referenceSuggest';
import { classifyPoints, type TaggedPoint, type PointTag, filterByTags } from './utils/classifyPoints';
import { diffOutline, type OutlineDiffResult } from './utils/diffOutline';
```

---

## ② 追加すべき state 一覧

### 追加位置
**157行目**（`const [isGeneratingAdditional, setIsGeneratingAdditional] = useState(false);`）の**直後**に追加

### state 定義
```typescript
  // 参考文献サジェスト
  const [referenceSuggestions, setReferenceSuggestions] = useState<Array<{ category: string; references: string[] }>>([]);
  const [showReferences, setShowReferences] = useState(false);

  // 論点分類
  const [taggedPoints, setTaggedPoints] = useState<Record<string, TaggedPoint[]>>({});
  const [selectedTags, setSelectedTags] = useState<PointTag[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);

  // 履歴差分表示
  const [previousOutline, setPreviousOutline] = useState<ReportOutline | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [diffResult, setDiffResult] = useState<OutlineDiffResult | null>(null);
```

---

## ③ 追加すべき handler 関数

### 追加位置
**517行目**（`};` - `handleCopyLink`関数の終了）の**直後**に追加

### handler 関数群
```typescript
  // 参考文献サジェスト生成
  const handleGenerateReferences = () => {
    if (!outline) return;
    
    // 全セクションの論点を収集
    const allPoints: string[] = [];
    outline.sections.forEach(section => {
      allPoints.push(...(section.points || []));
    });

    // 参考文献サジェストを生成
    const suggestions = suggestReferences(field, allPoints);
    setReferenceSuggestions(suggestions);
    setShowReferences(true);
  };

  // 論点分類実行
  const handleClassifyPoints = () => {
    if (!outline) return;

    const tagged: Record<string, TaggedPoint[]> = {};
    outline.sections.forEach(section => {
      if (section.points && section.points.length > 0) {
        tagged[section.title] = classifyPoints(section.points);
      }
    });
    setTaggedPoints(tagged);
    setShowTagFilter(true);
  };

  // タグでフィルタリング
  const handleFilterByTags = (tags: PointTag[]) => {
    setSelectedTags(tags);
  };

  // 履歴差分計算
  const handleShowDiff = () => {
    if (!outline || !previousOutline) return;

    const diff = diffOutline(previousOutline, outline);
    setDiffResult(diff);
    setShowDiff(true);
  };

```

---

## ④ UI 追加パッチ

### 4-1. 履歴差分表示ボタン（アクションボタン群に追加）

#### 追加位置
**807行目**（`続きから生成`ボタン）の**直後**に追加

#### UI ブロック
```typescript
                {/* 履歴差分表示ボタン */}
                {previousOutline && (
                  <button
                    onClick={handleShowDiff}
                    className="flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors bg-yellow-600 text-white hover:bg-yellow-700"
                    title="前回との差分を表示"
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
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    差分表示
                  </button>
                )}
```

### 4-2. 論点分類・フィルタボタン（アクションボタン群に追加）

#### 追加位置
**上記の履歴差分表示ボタンの直後**に追加

#### UI ブロック
```typescript
                {/* 論点分類ボタン */}
                <button
                  onClick={handleClassifyPoints}
                  disabled={!outline}
                  className="flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  title="論点をタグ付けして分類"
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
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  論点分類
                </button>
```

### 4-3. 履歴差分表示モーダル

#### 追加位置
**1217行目**（`前回の続きから生成モーダル`の閉じタグ`</div>`）の**直後**に追加

#### UI ブロック
```typescript
        {/* 履歴差分表示モーダル */}
        {showDiff && diffResult && previousOutline && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  構成の差分表示
                </h3>
                <button
                  onClick={() => {
                    setShowDiff(false);
                    setDiffResult(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {diffResult.hasChanges ? (
                <div className="space-y-6">
                  {diffResult.diffs.map((diff, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4">
                      <h4 className="text-lg font-semibold text-gray-800 mb-3">
                        {diff.sectionTitle}
                      </h4>

                      {/* 追加された論点 */}
                      {diff.addedPoints.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-green-700 mb-2">追加された論点:</p>
                          <ul className="space-y-1">
                            {diff.addedPoints.map((point, pointIndex) => (
                              <li key={pointIndex} className="text-sm text-gray-700 flex items-start">
                                <span className="text-green-500 mr-2">+</span>
                                <span className="bg-green-50 px-2 py-1 rounded">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 削除された論点 */}
                      {diff.removedPoints.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-red-700 mb-2">削除された論点:</p>
                          <ul className="space-y-1">
                            {diff.removedPoints.map((point, pointIndex) => (
                              <li key={pointIndex} className="text-sm text-gray-700 flex items-start">
                                <span className="text-red-500 mr-2">-</span>
                                <span className="bg-red-50 px-2 py-1 rounded line-through">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 変更された論点 */}
                      {diff.modifiedPoints.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-blue-700 mb-2">変更された論点:</p>
                          <ul className="space-y-3">
                            {diff.modifiedPoints.map((modified, modIndex) => (
                              <li key={modIndex} className="text-sm">
                                <div className="flex items-start mb-1">
                                  <span className="text-red-500 mr-2">-</span>
                                  <span className="bg-red-50 px-2 py-1 rounded line-through text-gray-600">
                                    {modified.before}
                                  </span>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-green-500 mr-2">+</span>
                                  <span className="bg-green-50 px-2 py-1 rounded text-gray-700">
                                    {modified.after}
                                  </span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">
                  変更はありません。
                </p>
              )}
            </div>
          </div>
        )}
```

### 4-4. 論点分類・フィルタUI（セクション表示エリアに追加）

#### 追加位置
**902行目**（`</div>` - セクション表示エリアの終了タグ）の**直前**に追加

#### UI ブロック
```typescript
            {/* 論点分類・フィルタUI */}
            {showTagFilter && Object.keys(taggedPoints).length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-800">
                    論点分類・フィルタ
                  </h3>
                  <button
                    onClick={() => {
                      setShowTagFilter(false);
                      setSelectedTags([]);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    閉じる
                  </button>
                </div>

                {/* タグ選択UI */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">フィルタするタグ:</p>
                  <div className="flex flex-wrap gap-2">
                    {(['理論', '実務', '歴史', '比較', '事例', '反論', '定義', '分析', '方法論', '検証'] as PointTag[]).map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          const newTags = selectedTags.includes(tag)
                            ? selectedTags.filter(t => t !== tag)
                            : [...selectedTags, tag];
                          handleFilterByTags(newTags);
                        }}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          selectedTags.includes(tag)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 分類された論点表示 */}
                <div className="space-y-4">
                  {Object.entries(taggedPoints).map(([sectionTitle, points]) => {
                    const filteredPoints = selectedTags.length > 0
                      ? filterByTags(points, selectedTags)
                      : points;

                    if (filteredPoints.length === 0) return null;

                    return (
                      <div key={sectionTitle} className="border-l-4 border-indigo-500 pl-4">
                        <h4 className="text-lg font-semibold text-gray-800 mb-3">{sectionTitle}</h4>
                        <ul className="space-y-2">
                          {filteredPoints.map((taggedPoint, index) => (
                            <li key={index} className="text-gray-700">
                              <div className="flex items-start gap-2">
                                <span className="text-indigo-500">•</span>
                                <div className="flex-1">
                                  <span>{taggedPoint.text}</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {taggedPoint.tags.map((tagInfo, tagIndex) => (
                                      <span
                                        key={tagIndex}
                                        className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700"
                                        title={`信頼度: ${(tagInfo.confidence * 100).toFixed(0)}%`}
                                      >
                                        {tagInfo.tag} ({Math.round(tagInfo.confidence * 100)}%)
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
```

### 4-5. 参考文献サジェスト機能の統合（既存セクションを更新）

#### 更新位置
**945行目**（`<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">` - Proプランの参考文献リスト表示部分）を**置き換え**

#### 更新後のUIブロック
```typescript
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-700">
                      分野「{FIELD_DISPLAY_NAMES[field]}」に関連する参考文献リスト（構造的カテゴリ）:
                    </p>
                    <button
                      onClick={handleGenerateReferences}
                      disabled={!outline}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      サジェスト生成
                    </button>
                  </div>

                  {showReferences && referenceSuggestions.length > 0 ? (
                    <div className="space-y-4 text-sm">
                      {referenceSuggestions.map((suggestion, index) => (
                        <div key={index}>
                          <h4 className="font-semibold text-gray-800 mb-2">{suggestion.category}</h4>
                          <ul className="space-y-1 text-gray-600 ml-4">
                            {suggestion.references.map((ref, refIndex) => (
                              <li key={refIndex}>• {ref}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4 text-sm">
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">理論的基盤</h4>
                        <ul className="space-y-1 text-gray-600 ml-4">
                          <li>• 基礎理論書・概説書</li>
                          <li>• 主要な研究文献</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">方法論・アプローチ</h4>
                        <ul className="space-y-1 text-gray-600 ml-4">
                          <li>• 分析手法に関する文献</li>
                          <li>• 実証研究の事例</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">具体的検討</h4>
                        <ul className="space-y-1 text-gray-600 ml-4">
                          <li>• 関連する研究論文</li>
                          <li>• 時事資料・データ</li>
                        </ul>
                      </div>
                    </div>
                  )}
                  <p className="mt-4 text-xs text-gray-500 italic">
                    Proプランでは、学術的に評価されやすい参考文献の構造的カテゴリを自動で提示します
                  </p>
                </div>
```

### 4-6. handleSubmit 内での前回構成保存

#### 更新位置
**372行目**（`setOutline(designedOutline);`）の**直前**に追加（重要: setOutlineの前）

#### 追加コード
```typescript
      // 前回の構成を保存（差分表示用）
      if (outline) {
        setPreviousOutline({ ...outline });
      }
```

### 4-7. handleContinueGeneration 内での前回構成保存

#### 更新位置
**472行目**（`setOutline({ ...outline, sections: updatedSections });`）の**直前**に追加（重要: setOutlineの前）

#### 追加コード
```typescript
        // 前回の構成を保存（差分表示用）
        if (outline) {
          setPreviousOutline({ ...outline });
        }
```

### 4-7. handleContinueGeneration 内での前回構成保存

#### 更新位置
**472行目**（`setOutline({ ...outline, sections: updatedSections });`）の**直後**に追加

#### 追加コード
```typescript
        // 前回の構成を保存（差分表示用）
        if (outline) {
          setPreviousOutline({ ...outline });
        }
```

---

## ⑤ 実装時の注意事項

1. **import順序**: 既存のimport文の後に追加してください
2. **state初期化**: 全てのstateは適切な初期値で初期化されています
3. **型エラー回避**: `PointTag`型は`classifyPoints.ts`からエクスポートされています
4. **依存関係**: 
   - 参考文献サジェスト: `outline`が必要
   - 論点分類: `outline`が必要
   - 履歴差分: `outline`と`previousOutline`が必要
5. **Free/Pro分岐**: 
   - 参考文献サジェストはProプランのみ表示（既存ロジックを維持）
   - 論点分類・履歴差分は全プランで利用可能
6. **エラーハンドリング**: 各handler関数内で`outline`の存在チェックを実装済み

---

## ⑥ 動作確認ポイント

- ✅ 参考文献サジェストボタンをクリックすると、生成された論点に基づいた文献リストが表示される
- ✅ 論点分類ボタンをクリックすると、各論点にタグが付与され表示される
- ✅ タグフィルターで選択したタグに該当する論点のみが表示される
- ✅ 構成を再生成すると、前回の構成が`previousOutline`に保存される（`setOutline`の前に保存）
- ✅ 「続きから生成」を実行すると、更新前の構成が`previousOutline`に保存される（`setOutline`の前に保存）
- ✅ 差分表示ボタンをクリックすると、前回との差分がハイライト表示される