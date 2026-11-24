import { useEffect, useState } from 'react';
import { BackHandler, Platform } from 'react-native';

const web = Platform.OS === 'web';
export const cartHref = '?carrinho=1';
export const checkoutHref = '?checkout=1';
export const ordersHref = '?admin=1&secao=pedidos';
export const productHref = slug => '?sabor=' + encodeURIComponent(slug);

const paths = {
  home: '', catalog: '#sabores', cart: cartHref,
  checkout: checkoutHref, admin: '?admin=1', orders: ordersHref
};

function page(view, slug = null) {
  return {
    view, slug: view === 'product' ? slug : null, catalog: view === 'catalog',
    admin: view === 'admin' || view === 'orders', cart: view === 'cart',
    checkout: view === 'checkout', orders: view === 'orders'
  };
}

function readWebRoute() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('admin') === '1') return page(params.get('secao') === 'pedidos' ? 'orders' : 'admin');
  if (params.get('checkout') === '1') return page('checkout');
  if (params.get('carrinho') === '1') return page('cart');
  const slug = params.get('sabor');
  if (slug) return page('product', slug);
  return page(window.location.hash === '#sabores' ? 'catalog' : 'home');
}

export function useRoute() {
  const [route, setRoute] = useState(() => web ? readWebRoute() : page('home'));

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
    const previous = { product: 'catalog', cart: 'catalog', checkout: 'cart', orders: 'admin', admin: 'home' };
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const target = previous[route.view];
      if (!target) return false;
      setRoute(page(target));
      return true;
    });
    return () => subscription.remove();
  }, [route.view]);

  function navigate(view, slug) {
    if (web) {
      const suffix = view === 'product' ? productHref(slug) : paths[view];
      const url = window.location.pathname + suffix;
      if (url !== window.location.pathname + window.location.search + window.location.hash) {
        window.history.pushState(null, '', url);
      }
    }
    setRoute(page(view, slug));
  }

  return { route, navigate };
}
