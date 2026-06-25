import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // 게임이 import 하는 오디오 에셋(.wav/.mp3/.ogg)을 URL 문자열로 번들한다.
    config.module.rules.push({
      test: /\.(wav|mp3|ogg)$/,
      type: "asset/resource",
      generator: {
        filename: "static/media/[name].[hash][ext]",
      },
    });
    return config;
  },
};

export default nextConfig;
