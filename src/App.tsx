import { FC, useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  useMapEvents,
  Marker,
  Popup,
  Circle,
} from "react-leaflet";
import L, { LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { useToast } from "./hooks/use-toast";
import { StoreIcon } from "lucide-react";

// Define the custom icon
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Coordinates {
  lat: number;
  lng: number;
}

const defaultCoordinates: Coordinates = { lat: 51.4998819, lng: -0.0992492 };

const App: FC = () => {
  const { toast } = useToast();

  const [storeName, setStoreName] = useState<string>("Terrys Cafe London");
  const [center, setCenter] = useState<Coordinates>(defaultCoordinates);
  const [polygonCoordinates, setPolygonCoordinates] = useState<LatLngTuple[]>(
    []
  );
  const [radiusLimit, setRadiusLimit] = useState<number>(5000);

  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const geoLocation = window.navigator && window.navigator.geolocation;

    if (geoLocation) {
      geoLocation.getCurrentPosition((position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCenter(coords);

        if (mapRef.current) {
          mapRef.current.flyTo(coords, 13, {
            animate: true,
            duration: 1.5, // Adjust the duration to control animation speed
          });
        }
      });
    }

    return () => {
      setCenter(defaultCoordinates);
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo(center, 13, {
        animate: true,
        duration: 1.5, // Adjust the duration to control animation speed
      });
    }
  }, [center]);

  // Handler for drawing polygon
  const MapClickHandler = () => {
    useMapEvents({
      click(event) {
        // Check if the click is within the circle radius
        const distance = L.latLng(event.latlng).distanceTo(center);
        if (polygonCoordinates.length < 5 && distance <= radiusLimit) {
          setPolygonCoordinates([
            ...polygonCoordinates,
            [event.latlng.lat, event.latlng.lng],
          ]);
        } else if (polygonCoordinates.length >= 5) {
          toast({
            variant: "destructive",
            title:
              'Polygon can only have 5 points. Click "Undo Last Point" to adjust.',
          });
        } else {
          toast({
            variant: "destructive",
            title: "Point is outside the allowed boundary.",
          });
        }
      },
    });
    return null;
  };

  // Validate if center is inside the polygon
  const isCenterInsidePolygon = () => {
    if (polygonCoordinates.length < 3) {
      return false; // A polygon needs at least 3 points
    }

    const polygonLayer = L.polygon(polygonCoordinates);
    const centerPoint = L.latLng(center.lat, center.lng);

    const isCenter = polygonLayer.getBounds().contains(centerPoint);
    return isCenter;
  };

  // Send the polygon data to the backend
  const handleSavePolygon = async () => {
    if (polygonCoordinates.length !== 5) {
      toast({
        variant: "destructive",
        title: "Set polygon with 5 points",
      });
      return;
    }

    // Check if the store center is inside the polygon
    if (!isCenterInsidePolygon()) {
      toast({
        variant: "destructive",
        title:
          "The store location must be inside the polygon boundary. Please adjust the points.",
      });
      return;
    }

    const boundary = polygonCoordinates.map(([lat, lng]) => ({
      latitude: lat,
      longitude: lng,
    }));

    try {
      console.log("🚀 ~ hanleSavePolygon ~ boundry:", boundary);
      toast({
        title: "Success! Store saved.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding store",
        description: error,
      });
    }
  };
  // Undo the last added point
  const handleUndoLastPoint = () => {
    setPolygonCoordinates(polygonCoordinates.slice(0, -1));
  };

  // Clear all points
  const handleClearAllPoints = () => {
    setPolygonCoordinates([]);
  };

  const handleCenterChange =
    (key: "lat" | "lng") => (e: React.ChangeEvent<HTMLInputElement>) => {
      setCenter((prev) => ({
        ...prev,
        [key]: e.target.value ? parseFloat(e.target.value) : 0,
      }));
    };

  return (
    <>
      <header className="sticky top-0 w-full border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-[100000]">
        <div className="container mx-auto flex h-14 items-center justify-between">
          <div className="font-medium flex gap-1">
            <StoreIcon /> Store Boundry Setter
          </div>
        </div>
      </header>
      <div className="container mx-auto">
        <MapContainer
          center={center}
          zoom={13}
          ref={mapRef}
          style={{ height: "600px", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <MapClickHandler />

          {/* Store center marker with popup for store name */}
          <Marker position={center} icon={customIcon}>
            <Popup>{storeName}</Popup>
          </Marker>

          {/* Boundary circle */}
          <Circle center={center} radius={radiusLimit} color="red" />

          {/* Draw polygon with selected coordinates */}
          {polygonCoordinates.length > 0 && (
            <Polygon positions={polygonCoordinates} color="blue" />
          )}
        </MapContainer>
        <div className="flex gap-2 w-full my-3">
          <Button onClick={handleSavePolygon}>Save Store with Boundary</Button>
          <Button
            onClick={handleUndoLastPoint}
            disabled={polygonCoordinates.length === 0}
          >
            Undo Last Point
          </Button>
          <Button
            onClick={handleClearAllPoints}
            disabled={polygonCoordinates.length === 0}
          >
            Clear All Points
          </Button>
        </div>
        <div className="grid grid-cols-8 w-full items-start gap-1.5">
          <div className="max-w-sm">
            <Label htmlFor="storeName">Store Name:</Label>
            <Input
              id="storeName"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
          </div>
          <div className="max-w-sm">
            <Label htmlFor="radius">Store Name:</Label>
            <Input
              id="radius"
              type="number"
              value={radiusLimit}
              onChange={(e) => setRadiusLimit(Number(e.target.value))}
            />
          </div>
          <div className="max-w-sm">
            <Label htmlFor="lat">Latitude:</Label>
            <Input
              type="number"
              id="lat"
              value={center.lat}
              onChange={handleCenterChange("lat")}
            />
          </div>
          <div className="max-w-sm">
            <Label htmlFor="long">Longitude:</Label>
            <Input
              type="number"
              id="long"
              value={center.lng}
              onChange={handleCenterChange("lng")}
            />
          </div>
        </div>
        <p className="mt-3">
          Click on the map to select up to 5 points for the polygon boundary
          within {radiusLimit / 1000} km of the store center.
        </p>
      </div>
    </>
  );
};

export default App;
