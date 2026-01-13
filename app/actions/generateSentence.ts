'use server';

import OpenAI from 'openai';

const openaiApiKey = process.env.OPENAI_API_KEY;

export type Field = 'literature' | 'law' | 'philosophy' | 'sociology' | 'history';

const FIELD_DISPLAY_NAMES: Record<Field, string> = {
  literature: '文学',
  law: '法学',
  philosophy: '哲学',
  sociology: '社会学',
  history: '歴史学',
};

// セクションタイトルの役割説明
const SECTION_ROLES: Record<string, string> = {
  '序論': '研究の背景、問題設定、目的を提示する導入部分',
  '本論': '主要な論点を展開し、分析や検討を行う中心部分',
  '結論': '議論を総括し、成果や今後の展望を示す締めくくり部分',
};

// ダミーデータを返す関数（開発用）
function getDummySentence(point: string, context: string): string {
  const templates = [
    `本節では、${point}について、${context}の観点から詳細に検討する。`,
    `以上の背景を踏まえ、本稿では${point}に着目し、議論を展開する。`,
    `${point}に関して、${context}の文脈において、以下に分析を加える。`,
    `本項では、${point}を中心に、${context}の視点から考察を行う。`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

export async function generateSentence(
  field: Field,
  point: string,
  context: string
): Promise<string | null> {
  // OpenAI APIキーの確認
  if (!openaiApiKey) {
    console.warn('[generateSentence] OPENAI_API_KEYが設定されていません。ダミーデータを返します。');
    return getDummySentence(point, context);
  }

  if (!point || point.trim().length === 0) {
    console.error('[generateSentence] 論点が空です');
    return getDummySentence(point, context);
  }

  try {
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const fieldName = FIELD_DISPLAY_NAMES[field];
    const sectionRole = SECTION_ROLES[context] || context;

    const prompt = `あなたは${fieldName}の学術論文を執筆する学生の指導をしている教授です。

以下の論点について、アカデミックな書き出しの一文を生成してください。

【セクションの役割】
${sectionRole}

【論点】
${point}

【要件】
- 学術的な文体で、簡潔で明確な一文
- その論点を書き始めるための導入文
- 50文字程度
- 日本語で記述

一文のみを返してください。説明や補足は不要です。`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `あなたは${fieldName}の学術論文を執筆する学生の指導をしている教授です。アカデミックな文体で、簡潔で明確な書き出しの一文を生成してください。`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();
    if (!responseText) {
      console.error('[generateSentence] レスポンスが空です');
      return getDummySentence(point, context);
    }

    // レスポンスから一文を抽出（改行や余分な文字を除去）
    const sentence = responseText
      .split('\n')
      .map(line => line.trim())
      .find(line => line.length > 0 && !line.startsWith('【') && !line.startsWith('*'));

    return sentence || responseText;
  } catch (error) {
    console.error('[generateSentence] エラーが発生しました:', error);
    if (error instanceof Error) {
      console.error('[generateSentence] エラー詳細:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    return getDummySentence(point, context);
  }
}
