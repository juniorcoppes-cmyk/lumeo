import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default do Next é 1MB. As fotos já são comprimidas no cliente (~900KB
      // cada), mas o form de criar evento sobe duas juntas (story + paisagem),
      // que somadas passam de 1MB — daí a folga.
      bodySizeLimit: "10mb",
    },
  },
  // O guia do meio liberal é um HTML estático em public/guia.html. A URL
  // pública dele é /guia (limpa, é a canonical p/ SEO); o rewrite serve o
  // arquivo sem expor o .html.
  async rewrites() {
    return [{ source: "/guia", destination: "/guia.html" }];
  },
};

export default nextConfig;
