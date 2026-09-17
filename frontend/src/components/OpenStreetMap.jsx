import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix default leaflet marker icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons
const truckIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #0284c7; color: white; padding: 6px; border-radius: 50%; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border: 2px solid white; display: flex; align-items: center; justify-content: center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-4l-3-4h-5v8h2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const getComplaintIcon = (status) => {
  let color = '#eab308'; // Pending (Yellow)
  if (status === 'Assigned' || status === 'In Progress') color = '#2563eb'; // Blue
  if (status === 'Resolved') color = '#16a34a'; // Green

  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const binIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #16a34a; color: white; padding: 5px; border-radius: 8px; border: 2px solid white; font-weight: bold; font-size: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">BIN</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

// Map event handler for pin location picking
const LocationPicker = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

const OpenStreetMap = ({
  center = [12.9716, 77.5946],
  zoom = 13,
  vehicles = [],
  complaints = [],
  communityBins = [],
  selectedLocation = null,
  onLocationSelect = null,
  height = "450px"
}) => {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-lg border border-slate-200" style={{ height }}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {onLocationSelect && <LocationPicker onLocationSelect={onLocationSelect} />}

        {/* Selected Pin for reporting complaints */}
        {selectedLocation && (
          <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
            <Popup>
              <div className="text-sm font-semibold text-emerald-800">
                Selected Complaint Location
                <p className="text-xs text-slate-600">Lat: {selectedLocation.lat.toFixed(4)}, Lng: {selectedLocation.lng.toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Moving Municipal Vehicles */}
        {vehicles.map((v) => (
          <Marker key={v.vehicle_id} position={[v.latitude, v.longitude]} icon={truckIcon}>
            <Popup>
              <div className="p-1 max-w-xs">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                  <span>🚛 {v.vehicle_id}</span>
                </div>
                <p className="text-xs font-semibold text-slate-600 mt-1">Driver: {v.driver_name} ({v.driver_phone})</p>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ward:</span>
                    <span className="font-semibold text-slate-800">{v.ward_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-semibold text-emerald-700">{v.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Speed / Fuel:</span>
                    <span className="font-semibold">{v.speed_kmh} km/h | {v.fuel_percent}%</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Citizen Complaints Pins */}
        {complaints.map((c) => {
          const lat = c.location?.coordinates?.[1] || c.latitude;
          const lng = c.location?.coordinates?.[0] || c.longitude;
          if (!lat || !lng) return null;

          return (
            <Marker key={c.id || c._id} position={[lat, lng]} icon={getComplaintIcon(c.status)}>
              <Popup>
                <div className="p-1 max-w-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{c.ward_no}</span>
                    <span className="text-xs px-2 py-0.5 rounded font-bold uppercase bg-slate-100 text-slate-700">
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium mt-1">📍 {c.landmark}</p>
                  {c.ai_classification && (
                    <div className="mt-2 text-xs p-1.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                      <strong>AI Category:</strong> {c.ai_classification.primary_category} ({c.ai_classification.bin_color} Bin)
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Community Bins */}
        {communityBins.map((bin) => (
          <Marker key={bin.bin_id} position={[bin.latitude, bin.longitude]} icon={binIcon}>
            <Popup>
              <div className="p-1 max-w-xs">
                <h4 className="font-bold text-slate-900 text-sm">♻️ Swachh Public Bin</h4>
                <p className="text-xs text-slate-600">{bin.landmark} ({bin.ward_no})</p>
                <div className="mt-2 space-y-1">
                  {bin.bin_types.map((b, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span>{b.category} ({b.color}):</span>
                      <span className="font-bold">{b.fill_level}% Full</span>
                    </div>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default OpenStreetMap;
