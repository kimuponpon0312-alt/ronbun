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

export async function generatePoints(
  field: Field,
  question: string,
  wordCount: number,
  sectionTitle: string,
  instructorType: InstructorType
): Promise<GeneratePointsResult> {
  try {
    // テンプレートから該当するセクションの項目を取得
    const fieldTemplate = templates[field];
    if (!fieldTemplate) {
      console.error(`[generatePoints] 分野 "${field}" のテンプレートが見つかりません`);
      return {
        points: ['テンプレートの読み込みに失敗しました'],
        isFallback: false,
      };
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
      return {
        points: ['テンプレートの読み込みに失敗しました'],
        isFallback: false,
      };
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
    console.error('[generatePoints] エラーが発生しました:', error);
    
    // 必ずテンプレートを返す（フォールバック）
    const defaultTemplate = templates[field];
    if (defaultTemplate) {
      const sectionMap: Record<string, keyof Omit<FieldTemplate, 'coreQuestion'>> = {
        '序論': 'intro',
        '本論': 'body',
        '結論': 'conclusion',
      };
      const sectionKey = sectionMap[sectionTitle];
      if (sectionKey && defaultTemplate[sectionKey]) {
        const items = defaultTemplate[sectionKey] as TemplateItem[];
        return {
          points: getTemplateItems(items, instructorType),
          isFallback: false,
          coreQuestion: defaultTemplate.coreQuestion,
        };
      }
    }

    // 最終フォールバック
    return {
      points: ['学術テンプレートの読み込み中'],
      isFallback: false,
    };
  }
}
