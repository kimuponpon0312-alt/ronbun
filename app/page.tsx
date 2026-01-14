'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import { saveAs } from 'file-saver';
import { generatePoints } from './actions/generatePoints';
import { saveStatistics } from './actions/saveStatistics';
import { saveShareData } from './actions/saveShareData';
import ShareButtons from './components/ShareButtons';
import ReportGallery from './components/ReportGallery';
import { diffOutline, type ReportOutline as DiffReportOutline, type OutlineDiffResult } from './utils/diffOutline';
import { suggestReferences } from './utils/referenceSuggest';
import { classifyPoints, type TaggedPoint } from './utils/classifyPoints';
import { generatePointsFromComment } from './actions/generatePointsFromComment';
import { gradeOutline, type GradeResult } from './actions/gradeOutline';
import { generateSentence } from './actions/generateSentence';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase env vars are missing. Check your .env file.');
  // ビルドを通すためにエラーを投げない
}

const supabase = createClient(supabaseUrl, supabaseKey);

type Field = 'literature' | 'law' | 'philosophy' | 'sociology' | 'history';
type InstructorType = '理論重視型' | '実務重視型';
type Plan = 'free' | 'pro';

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

type Section = {
  title: string;
  points: string[];
  isFallback?: boolean;
};

type ReportOutline = {
  sections: Section[];
  coreQuestion?: string;
};

const STORAGE_KEY_PLAN = 'report_designer_plan';
const STORAGE_KEY_DESIGN_COUNT = 'report_designer_count';
const STORAGE_KEY_LAST_DESIGN_DATE = 'report_designer_last_date';
const STORAGE_KEY_GUEST_DESIGN_COUNT = 'report_designer_guest_count';
const STORAGE_KEY_GUEST_LAST_DESIGN_DATE = 'report_designer_guest_last_date';

const GUEST_LIMIT = 1;
const FREE_PLAN_LIMIT = 5;

const sectionTemplates: Record<Field, (length: number) => Section[]> = {
  literature: (length) => [
    { title: '序論', points: [] },
    { title: '本論', points: [] },
    { title: '結論', points: [] },
  ],
  law: (length) => [
    { title: '序論', points: [] },
    { title: '本論', points: [] },
    { title: '結論', points: [] },
  ],
  philosophy: (length) => [
    { title: '序論', points: [] },
    { title: '本論', points: [] },
    { title: '結論', points: [] },
  ],
  sociology: (length) => [
    { title: '序論', points: [] },
    { title: '本論', points: [] },
    { title: '結論', points: [] },
  ],
  history: (length) => [
    { title: '序論', points: [] },
    { title: '本論', points: [] },
    { title: '結論', points: [] },
  ],
};

async function designOutline(
  field: Field,
  question: string,
  wordCount: number,
  instructorType: InstructorType
): Promise<ReportOutline> {
  let sections = sectionTemplates[field](wordCount);

  if (wordCount < 2000) {
    sections = sections.slice(0, 2);
  }

  let coreQuestion: string | undefined;
  const sectionsWithPoints = await Promise.all(
    sections.map(async (section): Promise<Section> => {
      try {
        const result = (await generatePoints(
          field as Parameters<typeof generatePoints>[0],
          question,
          wordCount,
          section.title,
          instructorType as Parameters<typeof generatePoints>[4]
        )) as unknown as { points: string[]; isFallback: boolean; coreQuestion?: string };
        
        if (result && result.coreQuestion) {
          coreQuestion = result.coreQuestion;
        }
        return {
          ...section,
          points: result?.points || ['学術テンプレートの読み込み中'],
        };
      } catch (error) {
        console.error(`[designOutline] Error in "${section.title}":`, error);
        return {
          ...section,
          points: ['学術テンプレートの読み込み中'],
        };
      }
    })
  );

  return {
    sections: sectionsWithPoints,
    coreQuestion,
  };
}

export default function Home() {
  const { data: session, status } = useSession();
  const [field, setField] = useState<Field>('law');
  const [question, setQuestion] = useState('');
  const [wordCount, setWordCount] = useState(3000);
  const [instructorType, setInstructorType] = useState<InstructorType>('理論重視型');
  const [outline, setOutline] = useState<ReportOutline | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState<Plan>('free');
  const [designCount, setDesignCount] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [hasShareRef, setHasShareRef] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [previousOutline, setPreviousOutline] = useState<ReportOutline | null>(null);
  const [diffResult, setDiffResult] = useState<OutlineDiffResult | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [classifiedPoints, setClassifiedPoints] = useState<Record<string, TaggedPoint[]>>({});
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [referenceList, setReferenceList] = useState<Array<{ category: string; references: string[] }>>([]);
  const [showReferences, setShowReferences] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [generatingSentence, setGeneratingSentence] = useState<{ sectionIndex: number; pointIndex: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // URLクエリパラメータからidを取得してデータを復元
  useEffect(() => {
    const reportId = searchParams.get('id');
    const userEmail = session?.user?.email;
    if (reportId && userEmail) {
      const loadReportData = async () => {
        try {
          const { data, error } = await supabase
            .from('saved_reports')
            .select('*')
            .eq('id', reportId)
            .eq('email', userEmail)
            .single();

          if (error) throw error;

          if (data) {
            // データを復元
            setQuestion(data.topic || '');
            setEditingReportId(data.id);
            
            // contentをパースしてoutlineに設定
            try {
              const parsedContent = JSON.parse(data.content);
              if (parsedContent && parsedContent.sections) {
                setOutline({
                  sections: parsedContent.sections,
                  coreQuestion: parsedContent.coreQuestion,
                });
              }
            } catch (parseError) {
              console.error('データのパースエラー:', parseError);
            }
          }
        } catch (err) {
          console.error('レポートデータの取得エラー:', err);
          alert('レポートデータの取得に失敗しました');
        }
      };
      
      loadReportData();
    } else if (reportId) {
      // ログインしていない場合はログインを促す
      setShowLoginModal(true);
    }
  }, [searchParams, session]);

  // バナー表示ロジック: URLクエリパラメータのみをチェック
  useEffect(() => {
    const refParam = searchParams.get('ref');
    setHasShareRef(refParam === 'share10');
  }, [searchParams]);

  useEffect(() => {
    if (status === 'loading') return;

    const isLoggedIn = !!session;
    const today = new Date().toISOString().split('T')[0];

    if (isLoggedIn) {
      const savedPlan = localStorage.getItem(STORAGE_KEY_PLAN) as Plan | null;
      if (savedPlan === 'free' || savedPlan === 'pro') {
        setPlan(savedPlan);
      }
      const lastDate = localStorage.getItem(STORAGE_KEY_LAST_DESIGN_DATE);
      if (lastDate === today) {
        const count = parseInt(localStorage.getItem(STORAGE_KEY_DESIGN_COUNT) || '0', 10);
        setDesignCount(count);
      } else {
        setDesignCount(0);
        localStorage.setItem(STORAGE_KEY_DESIGN_COUNT, '0');
        localStorage.setItem(STORAGE_KEY_LAST_DESIGN_DATE, today);
      }
    } else {
      const lastGuestDate = localStorage.getItem(STORAGE_KEY_GUEST_LAST_DESIGN_DATE);
      if (lastGuestDate === today) {
        const count = parseInt(localStorage.getItem(STORAGE_KEY_GUEST_DESIGN_COUNT) || '0', 10);
        setDesignCount(count);
      } else {
        setDesignCount(0);
        localStorage.setItem(STORAGE_KEY_GUEST_DESIGN_COUNT, '0');
        localStorage.setItem(STORAGE_KEY_GUEST_LAST_DESIGN_DATE, today);
      }
    }
  }, [session, status]);

  useEffect(() => {
    if (plan === 'free') {
      setInstructorType('理論重視型');
    }
  }, [plan]);

  // シェア後の回数回復：visibilitychangeイベントリスナー
  useEffect(() => {
    const handleVisibilityChange = () => {
      // isSharingがtrueで、非表示から表示に戻った瞬間を検知
      if (isSharing && document.visibilityState === 'visible') {
        const isLoggedIn = !!session;
        const today = new Date().toISOString().split('T')[0];

        // 本日の回数制限をリセット
        if (isLoggedIn) {
          localStorage.setItem(STORAGE_KEY_DESIGN_COUNT, '0');
          localStorage.setItem(STORAGE_KEY_LAST_DESIGN_DATE, today);
          setDesignCount(0);
        } else {
          localStorage.setItem(STORAGE_KEY_GUEST_DESIGN_COUNT, '0');
          localStorage.setItem(STORAGE_KEY_GUEST_LAST_DESIGN_DATE, today);
          setDesignCount(0);
        }

        // 回数回復メッセージを表示
        alert('回数が回復しました！🎉');

        // 状態をリセット
        setIsSharing(false);
        setShowShareModal(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSharing, session]);

  const handlePlanChange = (newPlan: Plan) => {
    setPlan(newPlan);
    localStorage.setItem(STORAGE_KEY_PLAN, newPlan);
  };

  const incrementDesignCount = () => {
    const isLoggedIn = !!session;
    const today = new Date().toISOString().split('T')[0];

    if (isLoggedIn) {
      const lastDate = localStorage.getItem(STORAGE_KEY_LAST_DESIGN_DATE);
      if (lastDate !== today) {
        setDesignCount(1);
        localStorage.setItem(STORAGE_KEY_DESIGN_COUNT, '1');
        localStorage.setItem(STORAGE_KEY_LAST_DESIGN_DATE, today);
      } else {
        const newCount = designCount + 1;
        setDesignCount(newCount);
        localStorage.setItem(STORAGE_KEY_DESIGN_COUNT, newCount.toString());
      }
    } else {
      const lastGuestDate = localStorage.getItem(STORAGE_KEY_GUEST_LAST_DESIGN_DATE);
      if (lastGuestDate !== today) {
        setDesignCount(1);
        localStorage.setItem(STORAGE_KEY_GUEST_DESIGN_COUNT, '1');
        localStorage.setItem(STORAGE_KEY_GUEST_LAST_DESIGN_DATE, today);
      } else {
        const newCount = designCount + 1;
        setDesignCount(newCount);
        localStorage.setItem(STORAGE_KEY_GUEST_DESIGN_COUNT, newCount.toString());
      }
    }
  };

  const canDesign = (): boolean => {
    const isLoggedIn = !!session;
    if (isLoggedIn) {
      if (plan === 'pro') return true;
      return designCount < FREE_PLAN_LIMIT;
    } else {
      return designCount < GUEST_LIMIT;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canDesign()) {
      const isLoggedIn = !!session;
      if (isLoggedIn) {
        setShowLimitModal(true);
      } else {
        setShowRegisterModal(true);
      }
      return;
    }

    setIsLoading(true);

    await saveStatistics(field as Parameters<typeof saveStatistics>[0]).catch((err) =>
      console.error('[handleSubmit] 統計保存に失敗:', err)
    );

    try {
      const designedOutline = await designOutline(
        field,
        question,
        wordCount,
        instructorType
      );
      if (outline) {
        setPreviousOutline({ ...outline });
      }
      setOutline(designedOutline);

      if (!session) {
        setShowLoginModal(true);
        setIsLoading(false);
        return;
      }

      try {
        const contentString = JSON.stringify(designedOutline, null, 2);
        
        // 既存レポートIDがある場合はUPDATE、ない場合はINSERT
        if (editingReportId) {
          const { error: updateError } = await supabase
            .from('saved_reports')
            .update({
              topic: question,
              content: contentString,
            })
            .eq('id', editingReportId)
            .eq('email', session.user?.email);
            
          if (updateError) {
            console.error('DB更新エラー:', updateError);
          } else {
            console.log('レポートを更新しました:', editingReportId);
          }
        } else {
          const { error: insertError } = await supabase
            .from('saved_reports')
            .insert({
              email: session.user?.email,
              topic: question,
              content: contentString,
            });
            
          if (insertError) {
            console.error('DB保存エラー:', insertError);
          }
        }
      } catch (err) {
        console.error('Supabase Error:', err);
      }

      try {
        const shareData = {
          field,
          question,
          wordCount,
          instructorType,
          outline: designedOutline,
          createdAt: new Date().toISOString(),
        };
        const reportId = await saveShareData(shareData);
        if (reportId) {
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
          const shareLink = `${baseUrl}/share/${reportId}?ref=share10`;
          setShareUrl(shareLink);
        } else {
          console.warn('[handleSubmit] 共有データの保存に失敗しました（reportIdがnull）');
        }
      } catch (shareError) {
        console.error('[handleSubmit] 共有データ保存に失敗:', shareError);
      }

      incrementDesignCount();
    } catch (err) {
      console.error('[handleSubmit] 構成設計中にエラー:', err);
      setOutline({
        sections: [
          { title: '序論', points: ['学術テンプレートの読み込み中'] },
          { title: '本論', points: ['学術テンプレートの読み込み中'] },
          { title: '結論', points: ['学術テンプレートの読み込み中'] },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ヘッダー用：サービスの共有（DB保存なし）
  const handleServiceShare = () => {
    // shareUrlをトップページURLに設定（サービス共有モード）
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    setShareUrl(null); // サービス共有モードを明示
    setShowShareModal(true);
  };

  // レポート結果エリア用：レポートの共有（DB保存あり）
  const handleReportShare = async () => {
    // outlineが存在しない場合はエラー
    if (!outline) {
      alert('まずレポートを生成してください');
      return;
    }

    // 既にshareUrlが発行済みの場合はモーダルを開く
    if (shareUrl) {
      setShowShareModal(true);
      return;
    }

    // shareUrlがない場合、saveShareDataを実行してURLを生成
    setIsSharing(true);
    try {
      const shareData = {
        field,
        question,
        wordCount,
        instructorType,
        outline,
        createdAt: new Date().toISOString(),
      };
      
      const reportId = await saveShareData(shareData);
      if (reportId) {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const shareLink = `${baseUrl}/share/${reportId}?ref=share10`;
        setShareUrl(shareLink);
        setShowShareModal(true);
      } else {
        console.error('[handleReportShare] 共有データの保存に失敗しました（reportIdがnull）');
        alert('共有リンクの生成に失敗しました。もう一度お試しください。');
      }
    } catch (shareError) {
      console.error('[handleReportShare] 共有データ保存に失敗:', shareError);
      // エラーオブジェクト全体を出力
      if (shareError instanceof Error) {
        console.error('[handleReportShare] エラー詳細:', {
          message: shareError.message,
          stack: shareError.stack,
          name: shareError.name,
        });
      } else {
        console.error('[handleReportShare] エラーオブジェクト:', JSON.stringify(shareError, null, 2));
      }
      alert('共有リンクの生成に失敗しました。もう一度お試しください。');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      if (!shareUrl) {
        alert('まずレポートを生成してください');
        return;
      }
      // shareUrlには既に?ref=share10が含まれている
      await navigator.clipboard.writeText(shareUrl);
      alert('リンクをクリップボードにコピーしました');
    } catch (err) {
      console.error('[handleCopyLink] コピーに失敗:', err);
      alert('リンクのコピーに失敗しました');
    }
  };

  const handleExportWord = async () => {
    if (!outline || !question) {
      alert('まずレポートを生成してください');
      return;
    }

    try {
      // Wordドキュメントの作成
      const children: Paragraph[] = [];

      // タイトル（question）を大見出しとして追加
      children.push(
        new Paragraph({
          text: question,
          heading: HeadingLevel.TITLE,
          spacing: { after: 400 },
        })
      );

      // 各セクションを処理
      outline.sections.forEach((section) => {
        // セクションタイトルを見出し1として追加
        children.push(
          new Paragraph({
            text: section.title,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 200 },
          })
        );

        // 各論点を箇条書きリストとして追加
        section.points.forEach((point) => {
          children.push(
            new Paragraph({
              text: point,
              bullet: {
                level: 0,
              },
              spacing: { after: 100 },
            })
          );
        });
      });

      // ドキュメントを作成
      const doc = new Document({
        sections: [
          {
            children: children,
          },
        ],
      });

      // Wordファイルを生成してダウンロード
      const blob = await Packer.toBlob(doc);
      saveAs(blob, 'report_structure.docx');
    } catch (error) {
      console.error('[handleExportWord] Word書き出しエラー:', error);
      if (error instanceof Error) {
        console.error('[handleExportWord] エラー詳細:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      }
      alert('Wordファイルの書き出しに失敗しました。もう一度お試しください。');
    }
  };

  const handleShowDiff = () => {
    if (!outline || !previousOutline) return;
    const diff = diffOutline(previousOutline, outline);
    setDiffResult(diff);
    setShowDiff(true);
  };

  const handleGradeOutline = async () => {
    if (!outline || !question) {
      alert('まずレポートを生成してください');
      return;
    }

    setIsGrading(true);
    setGradeResult(null);
    try {
      const result = await gradeOutline(field, question, outline);
      if (result) {
        setGradeResult(result);
        setShowGradeModal(true);
      } else {
        alert('評価の生成に失敗しました。もう一度お試しください。');
      }
    } catch (error) {
      console.error('[handleGradeOutline] 評価生成エラー:', error);
      if (error instanceof Error) {
        console.error('[handleGradeOutline] エラー詳細:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      }
      alert('評価の生成に失敗しました。もう一度お試しください。');
    } finally {
      setIsGrading(false);
    }
  };

  const handleClassifyPoints = () => {
    if (!outline) return;
    const tagged: Record<string, TaggedPoint[]> = {};
    outline.sections.forEach(section => {
      if (section.points && section.points.length > 0) {
        tagged[section.title] = classifyPoints(section.points);
      }
    });
    setClassifiedPoints(tagged);
    setShowTagFilter(true);
  };

  const handleGenerateReferences = () => {
    if (!outline) return;
    const allPoints: string[] = [];
    outline.sections.forEach(section => {
      allPoints.push(...(section.points || []));
    });
    const suggestions = suggestReferences(field, allPoints);
    setReferenceList(suggestions);
    setShowReferences(true);
  };

  const handleContinueGeneration = () => {
    if (!session) {
      setShowLoginModal(true);
      return;
    }
    setShowContinueModal(true);
  };

  // 論点の編集ハンドラ
  const handlePointChange = (sectionIndex: number, pointIndex: number, newValue: string) => {
    if (!outline) return;
    const newSections = [...outline.sections];
    const newPoints = [...newSections[sectionIndex].points];
    newPoints[pointIndex] = newValue;
    newSections[sectionIndex] = { ...newSections[sectionIndex], points: newPoints };
    setOutline({ ...outline, sections: newSections });
  };

  // 論点を追加
  const handleAddPoint = (sectionIndex: number) => {
    if (!outline) return;
    const newSections = [...outline.sections];
    const newPoints = [...newSections[sectionIndex].points, '新しい論点'];
    newSections[sectionIndex] = { ...newSections[sectionIndex], points: newPoints };
    setOutline({ ...outline, sections: newSections });
  };

  // 論点を削除
  const handleDeletePoint = (sectionIndex: number, pointIndex: number) => {
    if (!outline) return;
    const newSections = [...outline.sections];
    const newPoints = newSections[sectionIndex].points.filter((_, idx) => idx !== pointIndex);
    newSections[sectionIndex] = { ...newSections[sectionIndex], points: newPoints };
    setOutline({ ...outline, sections: newSections });
  };

  // 書き出しの一文を生成してクリップボードにコピー
  const handleGenerateSentence = async (sectionIndex: number, pointIndex: number) => {
    if (!outline) return;

    const section = outline.sections[sectionIndex];
    const point = section.points[pointIndex];

    if (!point || point.trim().length === 0) {
      alert('論点が空です。まず論点を入力してください。');
      return;
    }

    setGeneratingSentence({ sectionIndex, pointIndex });

    try {
      const sentence = await generateSentence(field, point, section.title);
      
      if (sentence) {
        // クリップボードにコピー
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(sentence);
          setToastMessage('書き出しをコピーしました！');
          // 3秒後にトーストを非表示
          setTimeout(() => setToastMessage(null), 3000);
        } else {
          // フォールバック: テキストエリアに選択してコピー
          const textarea = document.createElement('textarea');
          textarea.value = sentence;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          try {
            document.execCommand('copy');
            setToastMessage('書き出しをコピーしました！');
            setTimeout(() => setToastMessage(null), 3000);
          } catch (err) {
            console.error('[handleGenerateSentence] コピーに失敗しました:', err);
            alert(`書き出しの一文:\n\n${sentence}\n\n（クリップボードへのコピーに失敗したため、上記のテキストを手動でコピーしてください）`);
          }
          document.body.removeChild(textarea);
        }
      } else {
        alert('書き出しの生成に失敗しました。もう一度お試しください。');
      }
    } catch (error) {
      console.error('[handleGenerateSentence] エラー:', error);
      alert('書き出しの生成に失敗しました。もう一度お試しください。');
    } finally {
      setGeneratingSentence(null);
    }
  };

  // 編集されたoutlineをDBに保存
  const handleSaveEditedOutline = async () => {
    if (!outline || !session) {
      alert('ログインが必要です');
      return;
    }

    try {
      const contentString = JSON.stringify(outline, null, 2);
      
      if (editingReportId) {
        // 既存レポートを更新
        const { error: updateError } = await supabase
          .from('saved_reports')
          .update({
            topic: question,
            content: contentString,
          })
          .eq('id', editingReportId)
          .eq('email', session.user?.email);
          
        if (updateError) {
          console.error('DB更新エラー:', updateError);
          alert('更新に失敗しました');
        } else {
          alert('レポートを更新しました');
        }
      } else {
        // 新規レポートとして保存
        const { error: insertError } = await supabase
          .from('saved_reports')
          .insert({
            email: session.user?.email,
            topic: question,
            content: contentString,
          });
          
        if (insertError) {
          console.error('DB保存エラー:', insertError);
          alert('保存に失敗しました');
        } else {
          alert('レポートを保存しました');
        }
      }
    } catch (err) {
      console.error('保存エラー:', err);
      alert('保存に失敗しました');
    }
  };

  return (
    <div className="bg-gray-50 py-8 px-4">
      {/* 画面幅を 4xl から 3xl に変更して引き締めました */}
      <div className="max-w-3xl mx-auto">
        {session && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">プラン:</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePlanChange('free')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      plan === 'free'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Free
                  </button>
                  <button
                    onClick={() => handlePlanChange('pro')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      plan === 'pro'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Pro
                  </button>
                </div>
              </div>
              {plan === 'free' ? (
                <div className="text-sm text-gray-600">
                  本日の残り: {FREE_PLAN_LIMIT - designCount}回
                </div>
              ) : (
                <div className="text-sm text-purple-600 font-medium">
                  🔓 無制限
                </div>
              )}
            </div>
          </div>
        )}

        {!session && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                <span className="font-medium">本日の残り: </span>
                <span className={designCount < GUEST_LIMIT ? 'text-green-600' : 'text-red-600'}>
                  {GUEST_LIMIT - designCount}回
                </span>
                <span className="text-gray-500 ml-2">（未ログイン）</span>
              </div>
              <Link
                href="/auth/signin"
                className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
              >
                無料登録で1日5回まで →
              </Link>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          {hasShareRef && (
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg p-4 mb-6 shadow-lg relative">
              <button
                onClick={() => {
                  setHasShareRef(false);
                }}
                className="absolute top-2 right-2 text-white hover:text-gray-200 transition-colors p-1"
                title="閉じる"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <p className="text-lg font-bold mb-1">💰 特別割引クーポン適用中</p>
              <p className="text-sm opacity-90">
                このリンクから登録すると、Proプランが10%割引になります
              </p>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1"></div>
            <div className="flex-1 text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                AXON
          </h1>
              <p className="text-sm text-gray-500 mb-1">文系レポ助</p>
              <p className="text-lg text-gray-600 italic">
                書けないを、構造で解決する。
              </p>
            </div>
            <div className="flex-1 flex justify-end">
              <button
                onClick={handleServiceShare}
                className="flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors bg-green-600 text-white hover:bg-green-700 text-sm whitespace-nowrap"
                title="サービスを共有"
              >
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                <span className="hidden sm:inline">共有</span>
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="space-y-6">
            <div>
              <label htmlFor="field" className="block text-sm font-medium text-gray-700 mb-2">
                分野
              </label>
              <select
                id="field"
                value={field}
                onChange={(e) => setField(e.target.value as Field)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              >
                <option value="literature">{FIELD_DISPLAY_NAMES.literature}</option>
                <option value="law">{FIELD_DISPLAY_NAMES.law}</option>
                <option value="philosophy">{FIELD_DISPLAY_NAMES.philosophy}</option>
                <option value="sociology">{FIELD_DISPLAY_NAMES.sociology}</option>
                <option value="history">{FIELD_DISPLAY_NAMES.history}</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 italic">
                {FIELD_DESCRIPTIONS[field]}
          </p>
        </div>

            <div>
              <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
                課題文
              </label>
              <textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="レポートの課題文を入力してください"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="wordCount" className="block text-sm font-medium text-gray-700 mb-2">
                字数
              </label>
              <input
                type="number"
                id="wordCount"
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
                min="500"
                max="10000"
                step="500"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label htmlFor="instructorType" className="block text-sm font-medium text-gray-700">
                  指導教員タイプ（論点の重み付け）
                </label>
                {plan === 'free' && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
                    🔒 Pro限定
                  </span>
                )}
              </div>
              <select
                id="instructorType"
                value={instructorType}
                onChange={(e) => setInstructorType(e.target.value as InstructorType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading || plan === 'free'}
              >
                <option value="理論重視型">理論重視型 - 理論的フレームワークを重視する重み付け</option>
                <option value="実務重視型">実務重視型 - 実務的な観点を重視する重み付け</option>
              </select>
              {plan === 'free' && (
                <p className="mt-1 text-xs text-gray-500">
                  Freeプランでは「理論重視型」の重み付けのみ利用可能です
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                同じ構成項目でも、教員タイプに応じて表示順序と強調度が自動調整されます
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !canDesign()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading
                ? '設計中...'
                : canDesign()
                  ? '構造を提示する'
                  : session
                    ? '1日の制限に達しました'
                    : '本日の制限に達しました（無料登録で1日5回まで）'}
            </button>
            {!session && (
              <p className="text-xs text-gray-500 text-center mt-2">
                無料登録すると、1日5回までレポート構造を設計できます
              </p>
            )}
          </div>
        </form>

        <ReportGallery />

        {outline && (
          <div className="bg-white rounded-lg shadow-md p-6">
            {outline.coreQuestion && (
              <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  {FIELD_DISPLAY_NAMES[field]}の問いの本質:
                </p>
                <p className="text-sm text-blue-800 italic">
                  {outline.coreQuestion}
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">レポート構造</h2>
                <p className="text-sm text-gray-500 mt-1">
                  暫定構成（学術テンプレート）
                </p>
              </div>
              <div className="flex items-center gap-2 relative flex-wrap">
                <button
                  onClick={handleReportShare}
                  disabled={isSharing || !outline}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap ${
                    isSharing || !outline
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                  title={isSharing ? 'URL発行中...' : shareUrl ? 'リンクを共有' : 'レポートを共有'}
                >
                  {isSharing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      URL発行中...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                        />
                      </svg>
                      {shareUrl ? 'リンクを共有' : 'レポートを共有'}
                    </>
                  )}
                </button>

                <button
                  onClick={handleGradeOutline}
                  disabled={isGrading || !outline}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap ${
                    isGrading || !outline
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                  title={isGrading ? '評価中...' : 'この構成で模擬採点する'}
                >
                  {isGrading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      評価中...
                    </>
                  ) : (
                    <>
                      <span>🧪</span>
                      模擬採点
                    </>
                  )}
                </button>

                {previousOutline && (
                  <button
                    onClick={handleShowDiff}
                    className="flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors bg-yellow-600 text-white hover:bg-yellow-700 whitespace-nowrap"
                    title="前回との差分を表示"
                  >
                    <svg
                      className="w-5 h-5 flex-shrink-0"
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

                <button
                  onClick={handleClassifyPoints}
                  disabled={!outline}
                  className="flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                  title="論点をタグ付けして分類"
                >
                  <svg
                    className="w-5 h-5 flex-shrink-0"
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

                <button
                  disabled={plan === 'free'}
                  onClick={() => {
                    if (plan === 'free') {
                      setShowTooltip(!showTooltip);
                      setTimeout(() => setShowTooltip(false), 3000);
                    } else {
                      handleExportWord();
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap ${
                    plan === 'free'
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                  title={plan === 'free' ? 'Proプラン限定機能です' : 'Word書き出し'}
                >
                  {plan === 'free' && <span>🔒</span>}
                  <svg
                    className="w-5 h-5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Word
                </button>
                {showTooltip && plan === 'free' && (
                  <div className="absolute top-full right-0 mt-2 bg-gray-900 text-white text-sm px-3 py-2 rounded-md shadow-lg z-10 whitespace-nowrap">
                    Proプラン限定機能です
                    <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-6">
              {outline.sections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {section.title}
                    </h3>
                    <button
                      onClick={() => handleAddPoint(sectionIndex)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      title="論点を追加"
                    >
                      + 論点を追加
                    </button>
                  </div>
                  {section.points && section.points.length > 0 ? (
                    <ul className="space-y-2">
                      {section.points.map((point, pointIndex) => {
                        const taggedPoint = classifiedPoints[section.title]?.[pointIndex];
                        return (
                          <li key={pointIndex} className="text-gray-700 flex items-start gap-2">
                            <span className="text-blue-500 mt-2">•</span>
                            <div className="flex-1">
                              <textarea
                                value={point}
                                onChange={(e) => handlePointChange(sectionIndex, pointIndex, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[2.5rem]"
                                rows={Math.max(1, Math.ceil(point.length / 50))}
                                placeholder="論点を入力してください"
                              />
                              {taggedPoint && taggedPoint.tags && taggedPoint.tags.length > 0 && (
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
                              )}
                            </div>
                            <div className="flex flex-col gap-1 mt-2">
                              <button
                                onClick={() => handleGenerateSentence(sectionIndex, pointIndex)}
                                disabled={generatingSentence?.sectionIndex === sectionIndex && generatingSentence?.pointIndex === pointIndex}
                                className={`px-2 py-1 text-sm rounded transition-colors ${
                                  generatingSentence?.sectionIndex === sectionIndex && generatingSentence?.pointIndex === pointIndex
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                                }`}
                                title="書き出しの一文を生成してコピー"
                              >
                                {generatingSentence?.sectionIndex === sectionIndex && generatingSentence?.pointIndex === pointIndex ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                                ) : (
                                  <span>✍️</span>
                                )}
                              </button>
                              <button
                                onClick={() => handleDeletePoint(sectionIndex, pointIndex)}
                                className="px-2 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                title="この論点を削除"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="mb-3">
                      <p className="text-gray-500 text-sm italic mb-2">
                        論点がありません
                      </p>
                      <button
                        onClick={() => handleAddPoint(sectionIndex)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        + 論点を追加
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 保存ボタン */}
            {session && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleSaveEditedOutline}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  {editingReportId ? '変更を保存（Update）' : 'レポートを保存'}
                </button>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-gray-800">
                    参考文献リスト提案
                  </h3>
                  {plan === 'free' && (
                    <div className="relative group">
                      <span className="text-lg">🔒</span>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-sm px-3 py-2 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        Proプラン限定機能です
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    </div>
                  )}
                </div>
                {plan === 'free' && (
                  <Link
                    href="/pricing"
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Proプランにアップグレード →
                  </Link>
                )}
              </div>
              {plan === 'free' ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <p className="text-gray-600 mb-3">
                    参考文献リストの自動提案はProプラン限定機能です
                  </p>
                  <Link
                    href="/pricing"
                    className="inline-block bg-purple-600 text-white px-4 py-2 rounded-md font-medium hover:bg-purple-700 transition-colors text-sm"
                  >
                    Proプランを確認する
                  </Link>
                </div>
              ) : (
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

                  {showReferences && referenceList.length > 0 ? (
                    <div className="space-y-4 text-sm">
                      {referenceList.map((suggestion, index) => (
                        <div key={index}>
                          <h4 className="font-semibold text-gray-800 mb-2">{suggestion.category}</h4>
                          <ul className="space-y-2 text-gray-600 ml-4">
                            {suggestion.references.map((ref, refIndex) => {
                              const encodedRef = encodeURIComponent(ref);
                              const googleScholarUrl = `https://scholar.google.co.jp/scholar?q=${encodedRef}`;
                              const ciniiUrl = `https://ci.nii.ac.jp/search?q=${encodedRef}`;
                              return (
                                <li key={refIndex} className="flex items-start gap-2 group">
                                  <span className="text-gray-400 mt-1">•</span>
                                  <div className="flex-1 flex items-center gap-2 flex-wrap">
                                    <span className="text-gray-700">{ref}</span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <a
                                        href={googleScholarUrl}
            target="_blank"
            rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                                        title="Google Scholarで検索"
                                      >
                                        <span>🔗</span>
                                        <span>Scholar</span>
          </a>
          <a
                                        href={ciniiUrl}
            target="_blank"
            rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                                        title="CiNiiで検索"
          >
                                        <span>🔗</span>
                                        <span>CiNii</span>
          </a>
        </div>
    </div>
                                </li>
                              );
                            })}
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
              )}
            </div>
          </div>
        )}

        {showLimitModal && session && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                1日の制限に達しました
              </h3>
              <p className="text-gray-700 mb-6">
                Freeプランでは1日5回まで構造を提示できます。本日の設計回数が上限に達しました。
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowLimitModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md font-medium hover:bg-gray-300 transition-colors"
                >
                  閉じる
                </button>
                <button
                  onClick={() => {
                    handlePlanChange('pro');
                    setShowLimitModal(false);
                  }}
                  className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md font-medium hover:bg-purple-700 transition-colors"
                >
                  Proプランに切り替え
                </button>
              </div>
            </div>
          </div>
        )}

        {showRegisterModal && !session && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                本日の制限に達しました
              </h3>
              <p className="text-gray-700 mb-6">
                無料登録すると、1日5回までレポート構成を生成できます。
                <br />
                パスワード不要のマジックリンク認証で、簡単に登録できます。
              </p>
              <div className="flex flex-col space-y-3">
                <Link
                  href="/auth/signin"
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-md font-medium hover:bg-purple-700 transition-colors text-center"
                  onClick={() => setShowRegisterModal(false)}
                >
                  無料登録する
                </Link>
                <button
                  onClick={() => setShowRegisterModal(false)}
                  className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md font-medium hover:bg-gray-300 transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {showLoginModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  ログインが必要です
                </h3>
                <button
                  onClick={() => setShowLoginModal(false)}
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
              <p className="text-gray-700 mb-6">
                思考の履歴を保存するにはログインが必要です
              </p>
              <div className="flex flex-col space-y-3">
                <Link
                  href="/auth/signin"
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-md font-medium hover:bg-purple-700 transition-colors text-center"
                  onClick={() => setShowLoginModal(false)}
                >
                  ログインする
                </Link>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md font-medium hover:bg-gray-300 transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {shareUrl ? 'レポートの共有' : 'サービスの共有'}
                </h3>
                <button
                  onClick={() => setShowShareModal(false)}
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

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  共有リンク
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl || (typeof window !== 'undefined' ? `${window.location.origin}?ref=share10` : '')}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors text-sm"
                  >
                    コピー
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {shareUrl 
                    ? 'このリンクを共有すると、グループレポートの構造をチームメンバーと確認できます。共有してくれた方にPro 10%割引を適用します。'
                    : 'AXONのトップページを共有します。共有してくれた方にPro 10%割引を適用します。'
                  }
                </p>
              </div>

              <div>
                <ShareButtons 
                  shareUrl={shareUrl || (typeof window !== 'undefined' ? window.location.origin : '')}
                  {...(shareUrl ? {} : { description: 'AXON（文系レポ助）は、文系レポートの構造設計を支援するツールです。書けないを、構造で解決します。無料で5回まで利用可能。' })}
                  onShareClick={() => setIsSharing(true)}
                />
              </div>
            </div>
          </div>
        )}

        {showGradeModal && gradeResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  🧪 AI模擬採点結果（鬼教授モード）
                </h3>
                <button
                  onClick={() => {
                    setShowGradeModal(false);
                    setGradeResult(null);
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

              <div className="space-y-6">
                {/* 評価グレード */}
                <div className="flex items-center justify-center">
                  <div
                    className={`text-6xl font-bold px-8 py-4 rounded-lg ${
                      gradeResult.grade === 'S'
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900'
                        : gradeResult.grade === 'A'
                        ? 'bg-gradient-to-r from-green-400 to-green-600 text-green-900'
                        : gradeResult.grade === 'B'
                        ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-blue-900'
                        : gradeResult.grade === 'C'
                        ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-orange-900'
                        : 'bg-gradient-to-r from-red-400 to-red-600 text-red-900'
                    }`}
                  >
                    {gradeResult.grade}
                  </div>
                </div>

                {/* 教授からのコメント */}
                <div className="bg-gray-50 border-l-4 border-purple-500 p-4 rounded">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    教授からのコメント
                  </h4>
                  <p className="text-gray-700 leading-relaxed">
                    {gradeResult.comment}
                  </p>
                </div>

                {/* 不足している視点 */}
                {gradeResult.missingPoints && gradeResult.missingPoints.length > 0 && (
                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      不足している視点
                    </h4>
                    <ul className="space-y-2">
                      {gradeResult.missingPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-2 text-gray-700">
                          <span className="text-amber-600 mt-1">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowGradeModal(false);
                    setGradeResult(null);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

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

        {/* トースト通知 */}
        {toastMessage && (
          <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-fade-in">
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
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{toastMessage}</span>
          </div>
        )}
        </div>
    </div>
  );
}