import { useEffect, useState } from 'react';
import { BackHandler, Platform } from 'react-native';

const web = Platform.OS === 'web';

function readWebRoute() {
  const params = new URLSearchParams(window.location.search);
  return {
    admin: params.get('admin') === '1',
    slug: params.get('sabor'),
    catalog: window.location.hash === '#sabores'
  };
}

export const productHref = slug => '?sabor=' + encodeURIComponent(slug);

export function useRoute() {
  const [route, setRoute] = useState(() => web ? readWebRoute() : { slug: null, catalog: false, admin: false });

  useEffect(() => {
    if (web) {
      const onLocationChange = () => setRoute(readWebRoute());
      window.addEventListener('popstate', onLocationChange);
      window.addEventListener('hashchange', onLocationChange);
      return () => {
        window.removeEventListener('popstate', onLocationChange);
        window.removeEventListener('hashchange', onLocationChange);
      };
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!route.slug && !route.admin) return false;
      setRoute({ slug: null, catalog: Boolean(route.slug), admin: false });
      return true;
    });
    return () => subscription.remove();
  }, [route.slug, route.admin]);

  function navigate(slug, catalog = false, admin = false) {
    if (web) {
      const suffix = admin ? '?admin=1' : slug ? productHref(slug) : catalog ? '#sabores' : '';
      const url = window.location.pathname + suffix;
      if (url !== window.location.pathname + window.location.search + window.location.hash) {
        window.history.pushState(null, '', url);
      }
    }
    setRoute({ slug, catalog, admin });
  }

  return { route, navigate };
}
