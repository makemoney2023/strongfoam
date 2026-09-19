import Image from "next/image";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";

export function BrandLogo({
  variant,
  className,
  priority = false,
}: {
  variant: "onLight" | "onDark";
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={site.brandLogos[variant]}
      alt="Strong Foam Insulation"
      width={280}
      height={67}
      priority={priority}
      className={cn("h-8 w-auto max-w-full object-contain object-left", className)}
    />
  );
}
