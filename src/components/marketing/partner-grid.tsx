import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  filterPublishablePartners,
  type PartnerRecord,
} from "@/content/partner-publication";

export function PartnerGrid({
  partners,
  emptyMessage = "Approved partner marks will appear here after relationship and publication permissions are recorded.",
}: {
  partners: readonly PartnerRecord[];
  emptyMessage?: string;
}) {
  const approvedPartners = filterPublishablePartners(partners);

  if (approvedPartners.length === 0) {
    return <p className="marketing-empty-state">{emptyMessage}</p>;
  }

  return (
    <div className="marketing-partner-grid">
      {approvedPartners.map((partner) => {
        const logoPath = partner.logo.approvedOfficialPath;
        if (!logoPath) return null;

        return (
          <Card key={partner.id} className="marketing-partner-card">
            <CardContent>
              <Image
                src={logoPath}
                alt={partner.logo.alt}
                width={240}
                height={120}
                className="marketing-partner-card__logo"
              />
            </CardContent>
            <CardHeader>
              <CardTitle>
                <h3>{partner.displayName}</h3>
              </CardTitle>
              <p>{partner.category.replace("-", " / ")}</p>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
