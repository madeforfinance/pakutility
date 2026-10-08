/* Shared geolocation hook for the Islamic module.
   Device location is optional: denial or unavailability falls back to manual
   lat/lng inputs (default: Lahore). Values persist in the settings store. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../../../storage/db';

const LAHORE = { lat: 31.5204, lng: 74.3587 };

interface GeoState {
  lat: string;
  lng: string;
  setLat: (v: string) => void;
  setLng: (v: string) => void;
  locating: boolean;
  geoError: string;
  useDeviceLocation: () => void;
  latNum: number | null;
  lngNum: number | null;
}

function parseCoord(v: string): number | null {
  if (v.trim() === '') return null;
  const n = parseFloat(v.trim());
  return Number.isFinite(n) ? n : null;
}

export function useGeoLocation(prefix: 'prayer' | 'qibla'): GeoState {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const la = await db.get<{ key: string; value: unknown }>('settings', `${prefix}Lat`);
        const ln = await db.get<{ key: string; value: unknown }>('settings', `${prefix}Lng`);
        if (alive) {
          setLat(typeof la?.value === 'string' ? la.value : String(LAHORE.lat));
          setLng(typeof ln?.value === 'string' ? ln.value : String(LAHORE.lng));
          setLoaded(true);
        }
      } catch {
        if (alive) {
          setLat(String(LAHORE.lat));
          setLng(String(LAHORE.lng));
          setLoaded(true);
        }
      }
    })();
    return () => {
      alive = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [prefix]);

  // Debounced persist of manual edits.
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      db.set('settings', `${prefix}Lat`, lat).catch(() => {});
      db.set('settings', `${prefix}Lng`, lng).catch(() => {});
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [lat, lng, loaded, prefix]);

  const useDeviceLocation = useCallback(() => {
    setGeoError('');
    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation is not supported on this device. Enter coordinates manually.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setLat(String(+pos.coords.latitude.toFixed(4)));
        setLng(String(+pos.coords.longitude.toFixed(4)));
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Enter coordinates manually below.'
            : 'Could not get your location. Enter coordinates manually below.',
        );
      },
      { timeout: 12000, maximumAge: 600000 },
    );
  }, []);

  return {
    lat, lng, setLat, setLng, locating, geoError, useDeviceLocation,
    latNum: parseCoord(lat), lngNum: parseCoord(lng),
  };
}
