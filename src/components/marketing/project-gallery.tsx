import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { selectMarketingProjects } from "@/components/marketing/marketing-page-model";
import type { ProjectRecord } from "@/content/projects";

export function ProjectGallery({
  projects,
  emptyMessage = "Approved project photography will appear here as public derivatives become available.",
}: {
  projects: readonly ProjectRecord[];
  emptyMessage?: string;
}) {
  const approvedProjects = selectMarketingProjects(projects);

  if (approvedProjects.length === 0) {
    return <p className="marketing-empty-state">{emptyMessage}</p>;
  }

  return (
    <div className="marketing-project-grid">
      {approvedProjects.map((project) => (
        <Card key={project.id} className="marketing-project-card">
          <figure>
            <div className="marketing-project-card__media">
              <Image
                src={project.publicImagePath}
                alt={project.media.alt}
                fill
                sizes="(max-width: 767px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <figcaption>
              <CardHeader>
                <CardTitle>
                  <h3>{project.permissionSafeCaption}</h3>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{project.category.replaceAll("-", " ")}</p>
              </CardContent>
            </figcaption>
          </figure>
        </Card>
      ))}
    </div>
  );
}
