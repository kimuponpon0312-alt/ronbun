'use client';

type ShareButtonsProps = {
  shareUrl: string;
  title?: string;
  description?: string; // サービス紹介文（レポート未生成時）
};

export default function ShareButtons({ shareUrl, title = 'AXON - 文系レポ助', description }: ShareButtonsProps) {
  // シェアURLにref=share10を付与
  const shareUrlWithRef = `${shareUrl}?ref=share10`;

  // デバイス判定（userAgentで分岐）
  const isMobile = () => {
    if (typeof window === 'undefined') return false;
    const userAgent = navigator.userAgent || navigator.vendor;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
  };

  // シェアテキストを生成（レポート生成後か未生成かで分岐）
  const getShareText = () => {
    if (description) {
      // レポート未生成時：サービス紹介文
      return `${description}\n\n${shareUrlWithRef}`;
    } else {
      // レポート生成後：レポート構造の共有
      return `${title} のレポート構造を共有します。\n\n共有してくれた方にPro 10%割引！\n\n${shareUrlWithRef}`;
    }
  };

  // X（旧Twitter）でシェア（PCは必ずブラウザ優先）
  const handleXShare = () => {
    const text = getShareText();
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    // PCは常にブラウザで開く（_blankで新規タブ）
    window.open(url, '_blank', 'width=550,height=420');
  };

  // LINEでシェア（PCは必ずブラウザ優先）
  const handleLineShare = () => {
    const text = getShareText();
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrlWithRef)}&text=${encodeURIComponent(text)}`;
    // PCは常にブラウザで開く（_blankで新規タブ）
    window.open(url, '_blank', 'width=550,height=420');
  };

  // Instagramでシェア（PC/スマホで分岐）
  const handleInstagramShare = async () => {
    const text = getShareText();
    const mobile = isMobile();

    if (mobile) {
      // スマホ: まずクリップボードにコピー、その後アプリ起動を試みる
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        console.error('[handleInstagramShare] クリップボードコピーに失敗:', err);
      }

      // Instagramアプリ起動を試みる（instagram://スキーム）
      // iframeを使用してアプリ起動を試みる（ページ遷移を防ぐ）
      const appUrl = `instagram://`;
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.src = appUrl;
      document.body.appendChild(iframe);
      
      // iframeを即座に削除（アプリ起動をトリガーした後）
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 100);
      
      // アプリ起動後、ユーザーにメッセージを表示（テキストはクリップボードにコピー済み）
      setTimeout(() => {
        alert('テキストをクリップボードにコピーしました。\n\nInstagramアプリが開かない場合は、ブラウザで https://www.instagram.com/ を開いてください。');
      }, 500);
    } else {
      // PC: ブラウザ版Instagramを新規タブで開く（必ずブラウザ優先）
      const webUrl = `https://www.instagram.com/`;
      window.open(webUrl, '_blank');
      
      // テキストをクリップボードにコピー
      try {
        await navigator.clipboard.writeText(text);
        alert('Instagramブラウザ版を開きました。テキストもクリップボードにコピーしました。');
      } catch (err) {
        console.error('[handleInstagramShare] クリップボードコピーに失敗:', err);
        alert('Instagramブラウザ版を開きました。');
      }
    }
  };

  // リンクをコピー（ref=share10を含む）
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrlWithRef);
      alert('リンクをクリップボードにコピーしました。共有してくれた方にPro 10%割引が適用されます。');
    } catch (err) {
      console.error('[handleCopyLink] コピーに失敗:', err);
      alert('リンクのコピーに失敗しました');
    }
  };

  return (
    <div className="space-y-4">
      {/* 割引情報 */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 text-center">
        <p className="text-sm font-semibold text-purple-900 mb-1">
          💰 シェア特典
        </p>
        <p className="text-xs text-purple-700">
          このリンクを共有してくれた方にPro 10%割引を適用します
        </p>
      </div>

      {/* シェアボタン */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* X（旧Twitter） */}
        <button
          onClick={handleXShare}
          className="flex flex-col items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span className="text-xs">X</span>
        </button>

        {/* LINE */}
        <button
          onClick={handleLineShare}
          className="flex flex-col items-center justify-center gap-2 px-4 py-3 bg-[#06C755] text-white rounded-lg font-medium hover:bg-[#05B048] transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.086.766.062 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          </svg>
          <span className="text-xs">LINE</span>
        </button>

        {/* Instagram */}
        <button
          onClick={handleInstagramShare}
          className="flex flex-col items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <svg
            className="w-6 h-6"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
          <span className="text-xs">Instagram</span>
        </button>

        {/* リンクコピー */}
        <button
          onClick={handleCopyLink}
          className="flex flex-col items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
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
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span className="text-xs">コピー</span>
        </button>
      </div>
    </div>
  );
}
