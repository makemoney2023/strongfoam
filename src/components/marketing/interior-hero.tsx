import { ResponsivePicture } from "@/components/marketing/responsive-picture";
import type { ResponsiveImage, ServiceVideo } from "@/content/page-media";
import { cn } from "@/lib/utils";

export type HeroMedia = ResponsiveImage | ServiceVideo;

export function InteriorHero({
  eyebrow,
  title,
  description,
  className,
  media,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  className?: string;
  media?: HeroMedia;
}) {
  return (
    <header
      className={cn(
        "marketing-interior-hero",
        media && "marketing-interior-hero--media",
        className,
      )}
    >
      {media ? (
        <div className="marketing-interior-hero__media" aria-hidden="true">
          {"src" in media ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- poster doubles as the reduced-motion still */}
              <img
                src={media.poster}
                alt=""
                width={media.width}
                height={media.height}
                className="marketing-interior-hero__still"
              />
              <video
                className="marketing-interior-hero__video"
                src={media.src}
                poster={media.poster}
                width={media.width}
                height={media.height}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            </>
          ) : (
            <ResponsivePicture
              image={media}
              sizes="100vw"
              priority
              className="marketing-interior-hero__still"
            />
          )}
        </div>
      ) : null}
      <div className="page-rail marketing-interior-hero__inner">
        {eyebrow ? <p className="section-kicker">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </header>
  );
}
