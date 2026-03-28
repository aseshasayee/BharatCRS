import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const PRIORITY_COLORS = {
  Critical: '#7C3AED',
  High: '#DC2626',
  Medium: '#D97706',
  Low: '#16A34A',
  high: '#DC2626',
  medium: '#D97706',
  low: '#16A34A',
  resolved: '#16A34A',
  submitted: '#6B7280',
  verified: '#6B7280',
};

function makePin(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:16px;height:16px;border-radius:50%;
      background:${color};border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

/** Extract lat/lon from either the real API schema or the mapComplaint-mapped schema */
function extractLatLon(c) {
  // Mapped schema (from mapComplaint helper): c.lat, c.lon
  if (typeof c.lat === 'number' && typeof c.lon === 'number') return [c.lat, c.lon];
  // Real API schema: c.spatio_temporal_core.location.latitude/longitude
  const spatioLoc = c.spatio_temporal_core?.location;
  if (spatioLoc && typeof spatioLoc.latitude === 'number' && typeof spatioLoc.longitude === 'number') {
    return [spatioLoc.latitude, spatioLoc.longitude];
  }
  // Legacy mockData schema: c.lat, c.lng
  if (typeof c.lat === 'number' && typeof c.lng === 'number') return [c.lat, c.lng];
  // spatio_temporal_core legacy schema
  const s = c.spatio_temporal_core?.gps;
  if (s && typeof s.latitude === 'number' && typeof s.longitude === 'number') {
    return [s.latitude, s.longitude];
  }
  return null;
}

/** Extract display fields from either schema */
function extractDisplay(c) {
  const id = c.id || c.common_metadata?.report_id || '—';
  const title = c.normalized_input?.raw_text || c.title || c.common_metadata?.raw_text || 'Complaint';
  const wardId = c.spatio_temporal_core?.administrative_unit?.ward_id;
  const ward = wardId ? `Ward ${wardId}` : '';
  const status = c.status || c.common_metadata?.status || 'submitted';
  const priority = c.priority || c.priority_assessment?.priority_class || 'Low';
  return { id, title, ward, status, priority };
}

// Chennai center — default when no explicit center given
const CHENNAI_CENTER = [13.0827, 80.2707];

export default function MapComponent({
  complaints = [],
  height = 400,
  onPinClick,
  center,
  zoom = 12,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Auto-detect a sensible center if not provided
  const resolvedCenter = center || CHENNAI_CENTER;

  useEffect(() => {
    if (mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { center: resolvedCenter, zoom, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    complaints.forEach(c => {
      const coords = extractLatLon(c);
      if (!coords) return; // skip complaints with no valid coordinates

      const { id, title, ward, status, priority } = extractDisplay(c);
      const color = status === 'resolved'
        ? PRIORITY_COLORS.resolved
        : (PRIORITY_COLORS[priority] || '#6B7280');

      try {
        const marker = L.marker(coords, { icon: makePin(color) })
          .addTo(mapInstanceRef.current)
          .bindPopup(`<strong style="font-size:12px">${id}</strong><br/><span style="font-size:12px">${title.substring(0, 80)}${title.length > 80 ? '…' : ''}</span><br/><small style="color:#6B7280">${ward}</small>`);
        if (onPinClick) marker.on('click', () => onPinClick(c));
        markersRef.current.push(marker);
      } catch (e) {
        // Silently skip invalid markers
      }
    });
  }, [complaints, onPinClick]);

  return (
    <div className="map-container" style={{ height }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
