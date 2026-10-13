import { ResponsivePicture } from "@/components/marketing/responsive-picture";
import type { ServiceMedia } from "@/content/page-media";

export function ServiceMediaGallery({
  slug,
  title,
  media,
}: {
  slug: string;
  title: string;
  media: ServiceMedia;
}) {
  return (
    <section
      className="marketing-section page-rail service-media"
      aria-labelledby={`${slug}-field-media`}
    >
      <div className="marketing-section__intro">
        <p className="section-kicker">In the field</p>
        <h2 id={`${slug}-field-media`}>{title} on site</h2>
      </div>
      <div className="service-media__grid">
        {media.images.map((image) => (
          <figure key={image.manifestId} className="service-media__item">
            <ResponsivePicture
              image={image}
              sizes="(max-width: 900px) 100vw, 33vw"
              className="service-media__img"
            />
            <figcaption>{image.alt}</figcaption>
          </figure>
        ))}
        {media.videos.map((video) => (
          <figure
            key={video.manifestId}
            className="service-media__item service-media__item--video"
          >
            <video
              className="service-media__video"
              autoPlay
              muted
              loop
              playsInline
              controls
              preload="metadata"
              poster={video.poster}
              width={video.width}
              height={video.height}
              aria-label={video.alt}
            >
              <source src={video.src} type="video/mp4" />
            </video>
            <figcaption>{video.alt}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
