'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Исправление иконок Leaflet (по умолчанию пути к картинкам не работают в Next.js)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationSelect: (lat: number, lng: number) => void;
}

function LocationMarker({ latitude, longitude, onLocationSelect }: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    latitude && longitude ? [latitude, longitude] : null
  );

  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      onLocationSelect(lat, lng);
      map.flyTo([lat, lng], map.getZoom());
    },
  });

  return position ? <Marker position={position} /> : null;
}

export default function LocationPicker({ latitude, longitude, onLocationSelect }: LocationPickerProps) {
  const defaultCenter: [number, number] = latitude && longitude 
    ? [latitude, longitude] 
    : [55.7558, 37.6176]; // Москва по умолчанию

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Место на карте</label>
      <div className="h-[300px] w-full rounded-lg overflow-hidden border">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <LocationMarker
            latitude={latitude}
            longitude={longitude}
            onLocationSelect={onLocationSelect}
          />
        </MapContainer>
      </div>
      {latitude && longitude && (
        <p className="text-xs text-gray-500">
          Координаты: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      )}
    </div>
  );
}