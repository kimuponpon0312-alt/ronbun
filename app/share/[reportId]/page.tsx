import { Metadata } from 'next';
import { getShareData } from '../../actions/saveShareData';
import type { ShareData } from '../../actions/saveShareData';
import ShareViewer from './ShareViewer';

const FIELD_DISPLAY_NAMES: Record<string, string> = {
  literature: '文学',
  law: '法学',
  philosophy: '哲学',
  sociology: '社会学',
  history: '歴史学',
};

type PageProps = {
  params: Promise<{ reportId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { reportId } = await params;
  const shareData = await getShareData(reportId);

  if (!shareData) {
    return {
      title: '共有リンクが見つかりません | AXON',
      description: 'このリンクは無効か、期限切れの可能性があります。',
    };
  }

  const fieldName = FIELD_DISPLAY_NAMES[shareData.field] || shareData.field;
  const title = `${fieldName}のレポート構造 - AXON`;
  const description = shareData.question
    ? `${shareData.question.substring(0, 100)}...`
    : `${fieldName}分野のレポート構造が共有されました。`;

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const url = `${baseUrl}/share/${reportId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'AXON',
      type: 'website',
      locale: 'ja_JP',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function SharePage({ params }: PageProps) {
  const { reportId } = await params;
  const shareData = await getShareData(reportId);

  if (!shareData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">共有リンクが見つかりません</h1>
          <p className="text-gray-600 mb-6">
            このリンクは無効か、期限切れの可能性があります。
          </p>
          <a
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            トップページに戻る
          </a>
        </div>
      </div>
    );
  }

  return <ShareViewer shareData={shareData} reportId={reportId} />;
}
