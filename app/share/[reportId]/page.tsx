import { getShareData } from '../../actions/saveShareData';
import type { ShareData } from '../../actions/saveShareData';
import ShareViewer from './ShareViewer';

type PageProps = {
  params: Promise<{ reportId: string }>;
};

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
