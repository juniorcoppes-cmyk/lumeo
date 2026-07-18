import type { MetadataRoute } from "next";

const BASE = "https://www.lumeo.app.br";

// Deixa o Google indexar as páginas públicas e o /guia, mas mantém fora do
// índice o que é logado, por convite ou administrativo — nada disso deveria
// aparecer numa busca. Aponta pro sitemap pra acelerar a descoberta.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/inicio", "/perfil", "/chat", "/comunidade", "/eventos", "/cadastro", "/assinatura", "/notificacoes"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
