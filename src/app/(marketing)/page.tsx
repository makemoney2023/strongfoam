import { ScrollWorldPage } from "@/components/scroll-world-page";
import { faqItems } from "@/content/site";
import { homeGraph } from "@/lib/site-schema";

export default function Home() {
  const jsonLd = homeGraph(faqItems);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="flex-1">
        <ScrollWorldPage />
      </main>
    </>
  );
}
