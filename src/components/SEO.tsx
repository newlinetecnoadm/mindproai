import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  type?: string;
  image?: string;
}

const SEO = ({ 
  title = "Mind Pro AI — Mapas Mentais, Boards Kanban e Agenda",
  description = "Plataforma de produtividade visual com mapas mentais, boards Kanban e agenda integrada. Organize ideias e projetos em um só lugar.",
  canonical = "https://mindproai.com.br/",
  type = "website",
  image = "/mindpro-social.png"
}: SEOProps) => {
  const siteName = "Mind Pro AI";
  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      {/* OpenGraph tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={canonical} />

      {/* Twitter tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD Schema.org markup */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "Mind Pro AI",
          "description": "Visual productivity platform with mind maps, Kanban boards, and integrated agenda.",
          "url": "https://mindproai.com.br/",
          "applicationCategory": "BusinessApplication, Productivity",
          "operatingSystem": "Web",
          "author": {
            "@type": "Organization",
            "name": "Mind Pro AI"
          }
        })}
      </script>
    </Helmet>
  );
};

export default SEO;
