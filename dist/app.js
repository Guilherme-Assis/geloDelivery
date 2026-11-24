import { createIceRenderer } from './ice.js';

const flavors = [
  {
    id: 'lima', name: 'Limão & Hortelã', color: '#c4f18d',
    summary: 'Cítrico e refrescante, com um toque herbal.',
    description: 'O frescor da hortelã encontra a acidez do limão. A combinação deixa espaço para o sabor do drink e funciona especialmente bem com bebidas mais leves.',
    pairings: ['Mojito', 'Gin tônica', 'Soda de limão']
  },
  {
    id: 'mirtilo', name: 'Mirtilo', color: '#94bbff',
    summary: 'Frutado e delicado, com acidez suave.',
    description: 'O mirtilo traz um perfil de fruta madura com leve acidez. Combine com bebidas cítricas ou gaseificadas para dar contraste ao paladar.',
    pairings: ['Gin tônica', 'Vodca com soda', 'Limonada']
  },
  {
    id: 'morango', name: 'Morango', color: '#ff9fbf',
    summary: 'Frutado e levemente doce, com um toque ácido.',
    description: 'O morango traz um sabor familiar e levemente doce. A acidez da fruta combina com limão e dá equilíbrio a drinks borbulhantes.',
    pairings: ['Caipirinha', 'Spritz', 'Limonada com gás']
  },
  {
    id: 'maracuja', name: 'Maracujá', color: '#ffd081',
    summary: 'Tropical e aromático, com acidez marcante.',
    description: 'O aroma tropical e a acidez do maracujá dão personalidade ao drink. É uma boa combinação para bases suaves e bebidas de gengibre.',
    pairings: ['Moscow mule', 'Caipiroska', 'Soda de gengibre']
  }
];

const home = document.querySelector('#home');
const detail = document.querySelector('#detail');
const stage = document.querySelector('#showcase');
const images = [...document.querySelectorAll('.ice')];
const currentName = document.querySelector('#current-name');
const pause = document.querySelector('.pause');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const renderer = createIceRenderer(document.querySelector('#ice-canvas'));
const imagePath = flavor => `assets/${flavor.id}.webp`;
const detailPath = flavor => `?sabor=${flavor.id}`;

document.querySelector('#flavor-grid').innerHTML = flavors.map(flavor => `
  <a class="card" href="${detailPath(flavor)}" style="--flavor:${flavor.color}">
    <div class="card-art"><img src="${imagePath(flavor)}" alt="" decoding="async"></div>
    <div class="card-content"><h3>${flavor.name}</h3><p>${flavor.summary}</p>
      <span class="card-link">Ver detalhes <span aria-hidden="true">+</span></span></div>
  </a>`).join('');

let selected = 0;
let paused = reducedMotion.matches;
let elapsed = 0;
let lastFrame = 0;
let frame = 0;
let inView = true;
const hold = 3200;
const spin = 2100;
const cycle = hold + spin;

// Decode each image ahead of the first automatic change.
const preloadedImages = flavors.map(flavor => {
  const image = new Image();
  image.src = imagePath(flavor);
  image.decode().catch(() => {});
  return image;
});

const buttons = flavors.map((flavor, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.title = flavor.name;
  button.setAttribute('aria-label', `Destacar ${flavor.name}`);
  button.addEventListener('click', () => {
    selectFlavor(index);
    elapsed = 0;
    paint();
  });
  document.querySelector('.selectors').append(button);
  return button;
});

function selectFlavor(index) {
  selected = index;
  const flavor = flavors[index];
  stage.style.setProperty('--flavor', flavor.color);
  currentName.textContent = flavor.name.toLocaleUpperCase('pt-BR');
  images.forEach((image, offset) => {
    image.src = preloadedImages[(index + offset) % flavors.length].src;
  });
  buttons.forEach((button, position) => button.setAttribute('aria-pressed', String(index === position)));
}

function updatePause() {
  const label = paused ? 'Retomar rotação' : 'Pausar rotação';
  pause.dataset.paused = paused;
  pause.title = label;
  pause.setAttribute('aria-label', label);
}

function paint() {
  const phase = Math.max(0, Math.min(1, (elapsed - hold) / spin));
  const angle = 2 * Math.PI * phase;
  const opacity = Math.min(1, phase * 10, (1 - phase) * 10);
  const rendered = opacity > 0 && renderer?.draw(angle, selected);
  if (renderer) renderer.canvas.style.opacity = rendered ? opacity : 0;
  images.forEach((image, offset) => {
    image.style.opacity = rendered ? 1 - opacity : 1;
    image.style.setProperty('--turn', rendered ? '0deg' : `${phase * 360}deg`);
    image.style.setProperty('--lift', `${Math.sin(elapsed / 700 + offset * 2) * (offset === 0 ? 5 : 8)}px`);
  });
}

function tick(now) {
  if (lastFrame) elapsed += Math.min(now - lastFrame, 70);
  lastFrame = now;
  if (elapsed >= cycle) {
    if (renderer) renderer.draw(Math.PI * 2, selected);
    selectFlavor((selected + 1) % flavors.length);
    elapsed = 0;
  }
  paint();
  frame = requestAnimationFrame(tick);
}

function schedule() {
  cancelAnimationFrame(frame);
  lastFrame = 0;
  if (!paused && inView && !home.hidden && !document.hidden) frame = requestAnimationFrame(tick);
}

pause.addEventListener('click', () => {
  paused = !paused;
  updatePause();
  schedule();
});
reducedMotion.addEventListener('change', event => {
  paused = event.matches;
  if (paused) {
    elapsed = 0;
    paint();
  }
  updatePause();
  schedule();
});
document.addEventListener('visibilitychange', schedule);
new IntersectionObserver(([entry]) => {
  inView = entry.isIntersecting;
  schedule();
}).observe(stage);

const requested = new URLSearchParams(location.search).get('sabor');
const flavor = flavors.find(candidate => candidate.id === requested);
if (requested) {
  home.hidden = true;
  detail.hidden = false;
  document.querySelector('#nav-flavors').setAttribute('aria-current', 'true');
  if (flavor) {
    document.title = `${flavor.name} — BRAVIO®`;
    detail.innerHTML = `
      <a class="back" href="./#sabores">Todos os sabores</a>
      <div class="detail-layout" style="--flavor:${flavor.color}">
        <div class="detail-art"><img src="${imagePath(flavor)}" alt="Cubo de gelo sabor ${flavor.name}"></div>
        <div class="detail-copy">
          <p class="eyebrow"><span></span> GELO SABORIZADO</p>
          <h1>${flavor.name}</h1>
          <p>${flavor.description}</p>
          <div class="pairings"><h2>Experimente com</h2>
            <ul>${flavor.pairings.map(pairing => `<li>${pairing}</li>`).join('')}</ul>
          </div>
        </div>
      </div>`;
  } else {
    document.title = 'Sabor não encontrado — BRAVIO®';
    detail.innerHTML = '<a class="back" href="./#sabores">Todos os sabores</a><h1>Sabor não encontrado</h1>';
  }
} else {
  const updateNav = () => {
    const onCatalog = location.hash === '#sabores';
    document.querySelector('#nav-home').toggleAttribute('aria-current', !onCatalog);
    document.querySelector('#nav-flavors').toggleAttribute('aria-current', onCatalog);
    document.querySelector(onCatalog ? '#nav-flavors' : '#nav-home').setAttribute('aria-current', onCatalog ? 'location' : 'page');
  };
  updateNav();
  addEventListener('hashchange', updateNav);
  selectFlavor(0);
  updatePause();
}
