import type { MetadataRoute } from "next";

const BASE = "https://www.lumeo.app.br";

// Só as páginas públicas — o resto do app é logado/por convite e não deve
// ser indexado. O /guia é o motivo principal deste sitemap existir: é a
// porta de entrada de SEO (quem pesquisa "meio liberal", "casa de swing"
// etc. acha o Lumeo por ela).
export default function sitemap(): MetadataRoute.Sitemap {
  const paginas = [
    { path: "/", priority: 1 },
    { path: "/guia", priority: 0.9 },
    { path: "/como-funciona", priority: 0.7 },
    { path: "/planos", priority: 0.6 },
    { path: "/termos", priority: 0.3 },
    { path: "/privacidade", priority: 0.3 },
    { path: "/regras", priority: 0.3 },
  ];

  return paginas.map(({ path, priority }) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority,
  }));
}
