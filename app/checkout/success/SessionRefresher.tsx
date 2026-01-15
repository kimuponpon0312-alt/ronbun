'use client';

import { useEffect } from 'react';

/**
 * 決済成功後にクライアント側で何か状態をリフレッシュしたくなったとき用の空コンポーネント
 * 現状は何もしていません。
 */
const SessionRefresher = () => {
  useEffect(() => {
    // ここに必要ならセッション関連のクライアント処理を書く
    // 例: localStorage.removeItem('checkoutSession');
  }, []);

  return null;
};

export default SessionRefresher;
