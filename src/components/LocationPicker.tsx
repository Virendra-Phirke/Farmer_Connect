import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const defaultCenter = {
    lat: 20.5937,
    lng: 78.9629,
};

interface LocationPickerProps {
    onLocationSelected: (lat: number, lng: number) => void;
    initialLocation?: { lat: number; lng: number };
}

function LocationMarker({ position, setPosition, onLocationSelected }: any) {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
            onLocationSelected(e.latlng.lat, e.latlng.lng);
        },
    });

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
}

export function LocationPicker({ onLocationSelected, initialLocation }: LocationPickerProps) {
    const [markerPosition, setMarkerPosition] = useState<{ lat: number, lng: number } | null>(initialLocation || null);

    const center = initialLocation || defaultCenter;
    const zoom = initialLocation ? 12 : 5;

    return (
        <div className="w-full relative border border-border rounded-lg overflow-hidden h-[400px]">
            <MapContainer
                center={[center.lat, center.lng]}
                zoom={zoom}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker
                    position={markerPosition}
                    setPosition={setMarkerPosition}
                    onLocationSelected={onLocationSelected}
                />
            </MapContainer>
        </div>
    );
}
