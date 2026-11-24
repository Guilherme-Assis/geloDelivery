import { useEffect, useState } from 'react';
import { BackHandler, Platform } from 'react-native';

const web = Platform.OS === 'web';

function readWebRoute() {
  return {
    slug: new URLSearchParams(window.location.search).get('sabor'),
    catalog: window.location.hash === '#sabores'
  };
}

export const productHref = slug => '?sabor=' + encodeURIComponent(slug);

export function useRoute() {
  const [route, setRoute] = useState(() => web ? readWebRoute() : { slug: null, catalog: false });

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
      if (!route.slug) return false;
      setRoute({ slug: null, catalog: true });
      return true;
    });
    return () => subscription.remove();
  }, [route.slug]);

  function navigate(slug, catalog = false) {
    if (web) {
      const suffix = slug ? productHref(slug) : catalog ? '#sabores' : '';
      const url = window.location.pathname + suffix;
      if (url !== window.location.pathname + window.location.search + window.location.hash) {
        window.history.pushState(null, '', url);
      }
    }
    setRoute({ slug, catalog });
  }

  return { route, navigate };
}
