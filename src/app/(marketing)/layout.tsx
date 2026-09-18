import { SiteHeader } from "@/components/site-header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark min-h-full bg-background text-foreground">
      <SiteHeader />
      {children}
    </div>
  );
}
