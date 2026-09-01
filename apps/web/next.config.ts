import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Nao anuncia o framework em header de resposta.
  poweredByHeader: false,
};

export default config;
