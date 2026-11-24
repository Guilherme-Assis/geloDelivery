import { useEffect, useState } from 'react';
import { BackHandler, Platform } from 'react-native';

const web = Platform.OS === 'web';

function readWebRoute() {
  const params = new URLSearchParams(window.location.search);
  const admin = params.get('admin') === '1';
  const cart = !admin && params.get('carrinho') === '1';
  return {
    admin, cart,
    slug: admin || cart ? null : params.get('sabor'),
    catalog: !admin && !cart && window.location.hash === '#sabores'
  };
}

export const cartHref = '?carrinho=1';
export const productHref = slug => '?sabor=' + encodeURIComponent(slug);

export function useRoute() {
  const [route, setRoute] = useState(() => web ? readWebRoute() : { slug: null, catalog: false, admin: false, cart: false });

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
      if (!route.slug && !route.admin && !route.cart) return false;
      setRoute({ slug: null, catalog: Boolean(route.slug || route.cart), admin: false, cart: false });
      return true;
    });
    return () => subscription.remove();
  }, [route.slug, route.admin, route.cart]);

  function navigate(slug, catalog = false, admin = false, cart = false) {
    if (web) {
      const suffix = admin ? '?admin=1' : cart ? cartHref : slug ? productHref(slug) : catalog ? '#sabores' : '';
      const url = window.location.pathname + suffix;
      if (url !== window.location.pathname + window.location.search + window.location.hash) {
        window.history.pushState(null, '', url);
      }
    }
    setRoute({ slug, catalog, admin, cart });
  }

  return { route, navigate };
}
