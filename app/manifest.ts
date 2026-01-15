import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '文系レポ助 (AXON)',
    short_name: 'AXON',
    description: '書けないを、構造で解決する。学術レポート作成支援AI',
    start_url: '/',
    display: 'standalone', // URLバーを消してアプリっぽくする
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
