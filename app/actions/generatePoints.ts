'use server';

import OpenAI from 'openai';
import { checkUsageLimit, logUsage } from './checkUsageLimit';

// 分野：各分野の思考設計思想を反映
// 文学：解釈の妥当性を設計する
// 法学：規範適用プロセスを設計する
// 哲学：概念操作と反論処理を設計する
// 社会学：説明モデルを設計する
// 歴史学：史料解釈の枠組みを設計する
export type Field = 'literature' | 'law' | 'philosophy' | 'sociology' | 'history';
export type InstructorType = '理論重視型' | '実務重視型' | 'カスタム';

const openaiApiKey = process.env.OPENAI_API_KEY;

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
  // カスタムタイプの場合は理論重視型の重み付けを使用（参考情報として）
  const weightKey = instructorType === '実務重視型' ? 'weight_practical' : 'weight_theory';
  
  // 重みでソート（高い順）
  const sortedItems = [...items].sort((a, b) => {
    const weightA = a[weightKey];
    const weightB = b[weightKey];
    return weightB - weightA;
  });
  
  // テキストのみを返す
  return sortedItems.map(item => item.text);
}

// フォールバック用ダミーデータを返す関数（APIキーがない場合のみ）
function getDummyData(sectionTitle: string): GeneratePointsResult {
  const sectionPoints: Record<string, string[]> = {
    '序論': [
      'この問題の歴史的背景を確認する',
      '現代における課題を定義する',
      '本稿の目的を提示する',
    ],
    '本論': [
      '先行研究の限界を指摘する',
      '新しいアプローチを提案する',
      '具体的な分析を展開する',
    ],
    '結論': [
      '議論の総括と今後の展望',
      '研究の意義と限界を明示する',
    ],
  };
  
  return {
    points: sectionPoints[sectionTitle] || ['論点を生成中...'],
    isFallback: true,
    coreQuestion: '研究課題の核心を問う',
  };
}

const FIELD_DISPLAY_NAMES: Record<Field, string> = {
  literature: '文学',
  law: '法学',
  philosophy: '哲学',
  sociology: '社会学',
  history: '歴史学',
};

const FIELD_DESCRIPTIONS: Record<Field, string> = {
  literature: '解釈の妥当性を設計する',
  law: '規範適用プロセスを設計する',
  philosophy: '概念操作と反論処理を設計する',
  sociology: '説明モデルを設計する',
  history: '史料解釈の枠組みを設計する',
};

const SECTION_ROLES: Record<string, string> = {
  '序論': '研究の背景、問題設定、目的を提示する導入部分',
  '本論': '主要な論点を展開し、分析や検討を行う中心部分',
  '結論': '議論を総括し、成果や今後の展望を示す締めくくり部分',
};

export async function generatePoints(
  field: Field,
  question: string,
  wordCount: number,
  sectionTitle: string,
  instructorType: InstructorType,
  customInstructorType?: string,
  additionalInstructions?: string
): Promise<GeneratePointsResult> {
  // 使用回数制限をチェック
  const usageCheck = await checkUsageLimit();
  if (!usageCheck.allowed) {
    const error = new Error(usageCheck.error || '使用回数の制限に達しました');
    (error as any).statusCode = 403;
    (error as any).code = 'LIMIT_EXCEEDED';
    throw error;
  }

  // OpenAI APIキーの確認 - APIキーがない場合のみダミーデータを返す
  if (!openaiApiKey) {
    console.warn('[generatePoints] OPENAI_API_KEYが設定されていません。ダミーデータを返します。');
    return getDummyData(sectionTitle);
  }

  try {
    // テンプレートから該当するセクションの項目を取得（参考情報として使用）
    const fieldTemplate = templates[field];
    if (!fieldTemplate) {
      console.error(`[generatePoints] 分野 "${field}" のテンプレートが見つかりません`);
      return getDummyData(sectionTitle);
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
      return getDummyData(sectionTitle);
    }

    // テンプレートから参考論点を取得
    const items = fieldTemplate[sectionKey] as TemplateItem[];
    const templatePoints = getTemplateItems(items, instructorType);

    // OpenAI APIを呼び出す
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const fieldName = FIELD_DISPLAY_NAMES[field];
    const fieldDescription = FIELD_DESCRIPTIONS[field];
    const sectionRole = SECTION_ROLES[sectionTitle] || sectionTitle;
    
    // 指導教員タイプの設定
    let instructorFocus: string;
    if (instructorType === 'カスタム' && customInstructorType) {
      instructorFocus = customInstructorType;
    } else if (instructorType === '理論重視型') {
      instructorFocus = '理論的な深掘りと概念の精緻化を重視';
    } else {
      instructorFocus = '実務的な応用と具体的な事例分析を重視';
    }

    // 論点の数を決定（文字数に応じて）
    const pointCount = wordCount < 2000 ? 3 : wordCount < 4000 ? 4 : 5;

    // 追加指示の組み込み
    const additionalInstructionsText = additionalInstructions 
      ? `\n\n【その他の要件・指示】\n${additionalInstructions}\n\n上記の追加指示も必ず反映してください。`
      : '';

    const prompt = `あなたは${fieldName}の学術論文を執筆する学生の指導をしている教授です。

【分野の特徴】
${fieldDescription}

【研究課題】
${question}

【セクション】
${sectionTitle}（${sectionRole}）

【指導方針】
${instructorFocus}${additionalInstructionsText}

【参考となる論点例】
${templatePoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

上記の参考例を踏まえつつ、研究課題「${question}」に特化した${sectionTitle}の論点を${pointCount}個生成してください。

【要件】
- 各論点は簡潔で明確な表現（30文字程度）
- 参考例の形式や構造を参考にするが、研究課題に合わせて独自にアプローチする
- 学術的な厳密性を保つ
- 日本語で記述

以下のJSON形式で返してください：
{
  "points": ["論点1", "論点2", "論点3", ...],
  "coreQuestion": "研究課題の核心を問う質問文"
}

JSONのみを返してください。説明や補足は不要です。`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `あなたは${fieldName}の学術論文を執筆する学生の指導をしている教授です。研究課題に基づいて、適切な論点を生成してください。`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      console.error('[generatePoints] レスポンスが空です');
      return getDummyData(sectionTitle);
    }

    try {
      const result = JSON.parse(responseText) as { points: string[]; coreQuestion?: string };
      
      // バリデーション
      if (!Array.isArray(result.points) || result.points.length === 0) {
        console.error('[generatePoints] 不正なレスポンス形式: pointsが配列でないか空です');
        return getDummyData(sectionTitle);
      }

      const resultData = {
        points: result.points,
        isFallback: false,
        coreQuestion: result.coreQuestion || fieldTemplate.coreQuestion,
      };

      // 使用ログを記録（成功時のみ）
      await logUsage('generatePoints');

      return resultData;
    } catch (parseError) {
      console.error('[generatePoints] JSONパースエラー:', parseError);
      console.error('[generatePoints] レスポンステキスト:', responseText);
      return getDummyData(sectionTitle);
    }
  } catch (error) {
    // 制限エラーの場合はそのままthrow
    if (error instanceof Error && (error as any).code === 'LIMIT_EXCEEDED') {
      throw error;
    }

    // その他のエラーはconsole.errorに記録するが、UIには表示しない
    console.error('[generatePoints] エラーが発生しました（ダミーデータを返します）:', error);
    if (error instanceof Error) {
      console.error('[generatePoints] エラー詳細:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    
    // エラー時はダミーデータを返す（フォールバック）
    return getDummyData(sectionTitle);
  }
}
