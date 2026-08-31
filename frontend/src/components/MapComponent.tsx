'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet default icon bug in Webpack/Next.js environments
// We delete the internal icon url resolver and replace with unpkg URLs
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

interface MapComponentProps {
  coordinates: [number, number] | null;
  destinationName: string | null;
}

// A helper sub-component to handle map centering and panning smoothly
function ChangeMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom, { animate: true, duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function MapComponent({ coordinates, destinationName }: MapComponentProps) {
  // Default to center of India if no coordinates provided yet
  const defaultCenter: [number, number] = [20.5937, 78.9629];
  const centerToUse = coordinates || defaultCenter;
  const zoomLevel = coordinates ? 11 : 4;

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-[#8B4513]/20 shadow-xl bg-white">
      <MapContainer
        center={centerToUse}
        zoom={zoomLevel}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeMapView center={centerToUse} zoom={zoomLevel} />
        {coordinates && (
          <Marker position={coordinates}>
            <Popup>
              <div className="text-sm font-[Arial] text-[#4A2F1D]">
                <p className="font-bold text-[#8B4513]">{destinationName || 'Destination'}</p>
                <p className="text-xs">Your custom travel itinerary destination!</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
