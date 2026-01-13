'use server';

// 分野：各分野の思考設計思想を反映
// 文学：解釈の妥当性を設計する
// 法学：規範適用プロセスを設計する
// 哲学：概念操作と反論処理を設計する
// 社会学：説明モデルを設計する
// 歴史学：史料解釈の枠組みを設計する
export type Field = 'literature' | 'law' | 'philosophy' | 'sociology' | 'history';
export type InstructorType = '理論重視型' | '実務重視型';

export type TemplateItem = {
  text: string;
  weight_theory: number;
  weight_practical: number;
};

export type FieldTemplate = {
  coreQuestion: string;
  intro: TemplateItem[];
  body: TemplateItem[];
  conclusion: TemplateItem[];
};

export type Templates = Record<Field, FieldTemplate>;

export type GeneratePointsResult = {
  points: string[];
  isFallback: boolean;
  coreQuestion?: string;
};

// 分野別テンプレート（JSONから読み込む）
// eslint-disable-next-line @typescript-eslint/no-var-requires
const templatesData = require('../data/templates.json') as unknown;

const templates = templatesData as Templates;

// テンプレート項目を取得する関数
// 指導教員タイプに応じて重み付けでソート
function getTemplateItems(
  items: TemplateItem[],
  instructorType: InstructorType
): string[] {
  // 指導教員タイプに応じた重みを取得
  const weightKey = instructorType === '理論重視型' ? 'weight_theory' : 'weight_practical';
  
  // 重みでソート（高い順）
  const sortedItems = [...items].sort((a, b) => {
    const weightA = a[weightKey];
    const weightB = b[weightKey];
    return weightB - weightA;
  });
  
  // テキストのみを返す
  return sortedItems.map(item => item.text);
}

// 開発用ダミーデータを返す関数
function getDummyData(): GeneratePointsResult {
  return {
    points: [
      '【テスト用】序論の論点1: この問題の歴史的背景を確認する',
      '【テスト用】序論の論点2: 現代における課題を定義する',
      '【テスト用】序論の論点3: 本稿の目的を提示する',
      '【テスト用】本論の論点1: 先行研究の限界を指摘する',
      '【テスト用】本論の論点2: 新しいアプローチを提案する',
      '【テスト用】結論の論点1: 議論の総括と今後の展望',
    ],
    isFallback: true,
    coreQuestion: '【テスト用】なぜAPIなしでも開発が進められるのか？',
  };
}

export async function generatePoints(
  field: Field,
  question: string,
  wordCount: number,
  sectionTitle: string,
  instructorType: InstructorType
): Promise<GeneratePointsResult> {
  // OpenAI APIキーの確認
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    console.warn('[generatePoints] OPENAI_API_KEYが設定されていません。ダミーデータを返します。');
    return getDummyData();
  }

  try {
    // テンプレートから該当するセクションの項目を取得
    const fieldTemplate = templates[field];
    if (!fieldTemplate) {
      console.error(`[generatePoints] 分野 "${field}" のテンプレートが見つかりません`);
      return getDummyData();
    }

    // セクションタイトルを英語キーにマッピング
    const sectionMap: Record<string, keyof Omit<FieldTemplate, 'coreQuestion'>> = {
      '序論': 'intro',
      '本論': 'body',
      '結論': 'conclusion',
    };

    const sectionKey = sectionMap[sectionTitle];
    if (!sectionKey || !fieldTemplate[sectionKey]) {
      console.error(`[generatePoints] セクション "${sectionTitle}" のテンプレートが見つかりません`);
      return getDummyData();
    }

    // 重み付けでソートされた論点を取得
    const items = fieldTemplate[sectionKey] as TemplateItem[];
    const points = getTemplateItems(items, instructorType);

    return {
      points,
      isFallback: false, // テンプレートベースなので常にfalse
      coreQuestion: fieldTemplate.coreQuestion,
    };
  } catch (error) {
    // エラーはconsole.errorに記録するが、UIには表示しない
    console.error('[generatePoints] エラーが発生しました（ダミーデータを返します）:', error);
    
    // 開発用ダミーデータを返す（AI APIが失敗した場合でもテスト可能にする）
    return getDummyData();
  }
}
