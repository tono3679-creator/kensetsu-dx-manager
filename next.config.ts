import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 認証必須の業務アプリのため、従来の動的レンダリングモデルを採用
  cacheComponents: false,
  // PGlite (WASM版PostgreSQL) と postgres ドライバはバンドルせずNode.jsから直接読み込む
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  // デモモードは起動時に supabase/migrations の SQL を読み込むため、サーバーレス環境でも同梱する
  outputFileTracingIncludes: {
    "/**": ["./supabase/migrations/*.sql"],
  },
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // 現場写真アップロード用（クライアント側で圧縮した画像を送信）
      bodySizeLimit: "8mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
