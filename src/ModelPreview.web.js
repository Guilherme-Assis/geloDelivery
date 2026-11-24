import { Asset } from 'expo-asset';
import { useEffect, useRef } from 'react';
import { mediaUrl } from './catalog';
import { bundledModels, modelViewerScript } from './modelAssets';

let loader;

function loadViewer() {
  if (customElements.get('model-viewer')) return Promise.resolve();
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = modelViewerScript;
      script.onload = () => customElements.whenDefined('model-viewer').then(resolve);
      script.onerror = () => {
        script.remove();
        loader = undefined;
        reject(new Error('Falha ao carregar o visualizador'));
      };
      document.head.append(script);
    });
  }
  return loader;
}

export default function ModelPreview({ flavor, height, onError }) {
  const container = useRef(null);

  useEffect(() => {
    let active = true;
    const target = container.current;
    loadViewer().then(() => {
      if (!active) return;
      const viewer = document.createElement('model-viewer');
      viewer.style.cssText = 'display:block;width:100%;height:100%;--poster-color:transparent';
      viewer.setAttribute('alt', 'Modelo 3D da embalagem de gelo sabor ' + flavor.name);
      viewer.setAttribute('camera-controls', '');
      viewer.setAttribute('touch-action', 'pan-y');
      viewer.setAttribute('camera-orbit', '13deg 84deg auto');
      viewer.setAttribute('interaction-prompt', 'none');
      if (flavor.imageUrl) viewer.setAttribute('poster', flavor.imageUrl);
      let triedLocal = false;
      viewer.addEventListener('error', () => {
        if (!active) return;
        const local = bundledModels[flavor.modelPath];
        if (triedLocal || !local) return onError();
        triedLocal = true;
        viewer.setAttribute('src', Asset.fromModule(local).uri);
      });
      viewer.setAttribute('src', mediaUrl + flavor.modelPath);
      target.append(viewer);
    }).catch(() => { if (active) onError(); });

    return () => {
      active = false;
      target.replaceChildren();
    };
  }, [flavor, onError]);

  return <div ref={container} style={{ height, width: '100%' }} />;
}
