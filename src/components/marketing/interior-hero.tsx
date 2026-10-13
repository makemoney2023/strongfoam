import { cn } from "@/lib/utils";

export function InteriorHero({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <header className={cn("marketing-interior-hero", className)}>
      <div className="page-rail marketing-interior-hero__inner">
        {eyebrow ? <p className="section-kicker">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </header>
  );
}
