import type { NextConfig } from "next";

// PWAの設定を初期化
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development", // 開発中は無効にする
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  // 画像を使うための設定（もしあれば）
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Googleログインのアイコン用
      },
    ],
  },
};

// PWA設定で全体を囲む
export default withPWA(nextConfig);
