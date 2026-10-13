import type { ResponsiveImage } from "@/content/page-media";

export function ResponsivePicture({
  image,
  sizes,
  className,
  priority = false,
}: {
  image: ResponsiveImage;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const set = (ext: string) =>
    image.widths.map((w) => `${image.base}-${w}.${ext} ${w}w`).join(", ");
  const largest = Math.max(...image.widths);
  return (
    <picture>
      <source type="image/avif" srcSet={set("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={set("webp")} sizes={sizes} />
      <img
        src={`${image.base}-${largest}.webp`}
        alt={image.alt}
        width={image.width}
        height={image.height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={className}
      />
    </picture>
  );
}
