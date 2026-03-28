import { useEffect, useRef, useState, useMemo } from 'react';
import {
  APIProvider,
  Map,
  useMap,
  useMapsLibrary,
  InfoWindow
} from '@vis.gl/react-google-maps';

// ── Constants ─────────────────────────────────────────────────────────────────

const CHENNAI_CENTER = { lat: 13.0827, lng: 80.2707 };

const PRIORITY_COLORS = {
  Critical: '#7C3AED',
  High:     '#DC2626',
  Medium:   '#D97706',
  Low:      '#16A34A',
  resolved: '#16A34A',
};

// ── Robust Coordinate Extraction ──────────────────────────────────────────────

function extractLatLon(c) {
  if (!c) return null;
  let lat = c.lat ?? c.latitude ?? c.common_metadata?.location?.latitude;
  let lon = c.lon ?? c.lng ?? c.longitude ?? c.common_metadata?.location?.longitude;

  if (lat == null || lon == null) {
      const loc = c.spatio_temporal_core?.location || c.spatio_temporal_core?.gps;
      if (loc) {
          lat = loc.latitude ?? loc.lat;
          lon = loc.longitude ?? loc.lon;
      }
  }

  if (lat != null && lon != null) {
    const plat = parseFloat(lat);
    const plon = parseFloat(lon);
    if (!isNaN(plat) && !isNaN(plon)) return { lat: plat, lng: plon };
  }
  return null;
}

function extractDisplay(c) {
  return {
    id: c.id || c.common_metadata?.report_id || '—',
    title: c.title || c.common_metadata?.raw_text || 'Issue',
    status: c.status || c.common_metadata?.status || 'submitted',
    priority: c.priority || c.priority_assessment?.priority_class || 'Low',
    ward: c.ward || c.common_metadata?.location?.ward_name || '',
  };
}

// ── Low-level Marker Component (Using google.maps.Marker directly) ───────────

function DirectMarker({ complaint, onClick }) {
  const map = useMap();
  const markerRef = useRef(null);
  const pos = extractLatLon(complaint);

  useEffect(() => {
    if (!map || !pos) return;

    const { priority, status } = extractDisplay(complaint);
    const color = status === 'resolved' ? PRIORITY_COLORS.resolved : (PRIORITY_COLORS[priority] || '#64748b');

    // Create the marker using the global google object
    markerRef.current = new google.maps.Marker({
      position: pos,
      map: map,
      title: extractDisplay(complaint).id,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        scale: 8
      }
    });

    const listener = markerRef.current.addListener('click', () => {
      onClick?.(complaint);
    });

    return () => {
      if (markerRef.current) {
        google.maps.event.removeListener(listener);
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    };
  }, [map, pos]); // Re-run if map or position change

  return null;
}

// ── Heatmap Layer ─────────────────────────────────────────────────────────────

function HeatmapLayer({ complaints }) {
  const map = useMap();
  const visualization = useMapsLibrary('visualization');
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !visualization || !complaints.length) return;

    const points = complaints.map(c => {
      const p = extractLatLon(c);
      if (!p) return null;
      return { location: new google.maps.LatLng(p.lat, p.lng), weight: 2 };
    }).filter(Boolean);

    if (!layerRef.current) {
      layerRef.current = new visualization.HeatmapLayer({
        radius: 30,
        opacity: 0.8,
      });
    }
    layerRef.current.setData(points);
    layerRef.current.setMap(map);

    return () => {
      if (layerRef.current) layerRef.current.setMap(null);
    };
  }, [map, visualization, complaints]);

  return null;
}

// ── Main Map Component ────────────────────────────────────────────────────────

export default function MapComponent({
  complaints = [],
  height = 400,
  onPinClick,
  center,
  zoom = 12,
  mode = 'markers',
}) {
  const apiKey = import.meta.env.VITE_MAPS_API_KEY;
  const [selected, setSelected] = useState(null);

  const resolvedCenter = useMemo(() => {
    if (center && Array.isArray(center)) return { lat: center[0], lng: center[1] };
    return CHENNAI_CENTER;
  }, [center]);

  if (!apiKey) return <div style={{ height, background: '#eee' }}>API Key Missing</div>;

  return (
    <div style={{ width: '100%', height: height === '100%' ? '100%' : height, position: 'relative' }}>
      <APIProvider apiKey={apiKey} libraries={['visualization', 'marker']}>
        <Map
          defaultCenter={resolvedCenter}
          defaultZoom={zoom}
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          {/* Heatmap */}
          {(mode === 'heatmap' || mode === 'both' || mode === 'all') && <HeatmapLayer complaints={complaints} />}

          {/* Markers */}
          {mode !== 'heatmap_only' && (complaints || []).map((c, i) => (
            <DirectMarker 
              key={`${extractDisplay(c).id}-${i}`} 
              complaint={c} 
              onClick={(comp) => {
                setSelected(comp);
                onPinClick?.(comp);
              }} 
            />
          ))}

          {/* Info Window */}
          {selected && (
            <InfoWindow position={extractLatLon(selected)} onCloseClick={() => setSelected(null)}>
              <div style={{ padding: 4 }}>
                <p style={{ fontWeight: 700 }}>{extractDisplay(selected).id}</p>
                <p style={{ fontSize: 12 }}>{extractDisplay(selected).title}</p>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
