import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O tracing não enxerga arquivos lidos por caminho montado em runtime
  outputFileTracingIncludes: {
    "/api/relatorios/painel": [
      "./node_modules/@sparticuz/chromium/bin/**",
      "./public/assets/emulogLogo.svg",
    ],
  },
};

export default nextConfig;
