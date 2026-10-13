import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  filterPublishableLocations,
  type PublicLocation,
} from "@/content/marketing-governance";

export function LocationCards({
  locations,
  emptyMessage,
}: {
  locations: readonly PublicLocation[];
  emptyMessage?: string;
}) {
  const approvedLocations = filterPublishableLocations(locations);

  if (approvedLocations.length === 0) {
    return emptyMessage ? (
      <p className="marketing-empty-state">{emptyMessage}</p>
    ) : null;
  }

  return (
    <div className="marketing-location-grid">
      {approvedLocations.map((location) => (
        <Card key={location.id} className="marketing-location-card">
          <CardHeader>
            <CardTitle>
              <h3>{location.label}</h3>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {location.address ? (
              <address>
                {location.address.street}
                <br />
                {location.address.locality}, {location.address.region}{" "}
                {location.address.postal}
              </address>
            ) : null}
            <p>{location.serviceAreaWording}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
