import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { mediaUrl, slugPattern } from '../catalog';

const storageKey = '@joggelo/cart/v1';
const web = Platform.OS === 'web';

function readItems(value) {
  try {
    const entries = JSON.parse(value);
    if (!Array.isArray(entries)) return [];
    const items = new Map();
    for (const item of entries) {
      if (!item || typeof item.id !== 'string' || !item.id || typeof item.name !== 'string' ||
        typeof item.slug !== 'string' || !slugPattern.test(item.slug) ||
        !Number.isSafeInteger(item.quantity) || item.quantity < 1) continue;
      items.set(item.id, {
        id: item.id, slug: item.slug, name: item.name, quantity: item.quantity,
        imageUrl: typeof item.imageUrl === 'string' && item.imageUrl.startsWith(mediaUrl) ? item.imageUrl : ''
      });
    }
    return [...items.values()];
  } catch {
    return [];
  }
}

export function useCart() {
  const [items, setItems] = useState(null);
  const [storageError, setStorageError] = useState(false);
  const latest = useRef([]);
  const queue = useRef(Promise.resolve());
  const storageAvailable = useRef(true);
  const mounted = useRef(false);

  function updateItems(next) {
    latest.current = next;
    if (mounted.current) setItems(next);
  }

  function reportStorageError() {
    storageAvailable.current = false;
    if (mounted.current) setStorageError(true);
  }

  useEffect(() => {
    mounted.current = true;
    AsyncStorage.getItem(storageKey)
      .then(value => { if (mounted.current) updateItems(readItems(value)); })
      .catch(() => {
        if (!mounted.current) return;
        reportStorageError();
        updateItems([]);
      });
    const sync = event => {
      if (storageAvailable.current && (event.key === storageKey || event.key === null)) {
        updateItems(readItems(event.newValue));
      }
    };
    if (web) window.addEventListener('storage', sync);
    return () => {
      mounted.current = false;
      if (web) window.removeEventListener('storage', sync);
    };
  }, []);

  function change(transform) {
    const apply = async () => {
      let base = latest.current;
      if (web && storageAvailable.current) {
        try {
          base = readItems(await AsyncStorage.getItem(storageKey));
        } catch {
          reportStorageError();
        }
      }
      const next = transform(base);
      updateItems(next);
      if (!storageAvailable.current) return;
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        reportStorageError();
      }
    };
    queue.current = queue.current.then(() => web && navigator.locks
      ? navigator.locks.request(storageKey, apply)
      : apply()).catch(reportStorageError);
  }

  function add(flavor) {
    if (items === null || !flavor.productId) return;
    change(current => {
      const existing = current.find(item => item.id === flavor.productId);
      const item = {
        id: flavor.productId, slug: flavor.id, name: flavor.name, imageUrl: flavor.imageUrl,
        quantity: Math.min((existing?.quantity || 0) + 1, Number.MAX_SAFE_INTEGER)
      };
      return existing ? current.map(saved => saved.id === item.id ? item : saved) : [...current, item];
    });
  }

  function adjust(id, delta) {
    change(current => current.map(item => item.id === id
      ? { ...item, quantity: Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, item.quantity + delta)) }
      : item));
  }

  function remove(id) {
    change(current => current.filter(item => item.id !== id));
  }

  function complete(ordered) {
    const quantities = new Map(ordered.map(item => [item.id, item.quantity]));
    change(current => current.map(item => ({
      ...item, quantity: item.quantity - (quantities.get(item.id) || 0)
    })).filter(item => item.quantity > 0));
  }

  const total = items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  return { items, total, storageError, add, adjust, remove, complete };
}
