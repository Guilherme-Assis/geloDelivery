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
const currentName = document.querySelector('#current-name');
const pause = document.querySelector('.pause');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
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
let timer;
let inView = true;
const displayDuration = 5300;

const iceStage = stage.querySelector('.ice-stage');
const firstSlide = iceStage.querySelector('.ice-set');
const slides = flavors.map((_, index) => {
  if (index === 0) return firstSlide;
  const slide = firstSlide.cloneNode(true);
  slide.classList.remove('is-active');
  slide.querySelectorAll('img').forEach((image, offset) => {
    image.src = imagePath(flavors[(index + offset) % flavors.length]);
  });
  iceStage.append(slide);
  return slide;
});

const buttons = flavors.map((flavor, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.title = flavor.name;
  button.setAttribute('aria-label', `Destacar ${flavor.name}`);
  button.addEventListener('click', () => {
    selectFlavor(index);
    schedule();
  });
  document.querySelector('.selectors').append(button);
  return button;
});

function selectFlavor(index) {
  selected = index;
  const flavor = flavors[index];
  stage.style.setProperty('--flavor', flavor.color);
  currentName.textContent = flavor.name.toLocaleUpperCase('pt-BR');
  slides.forEach((slide, position) => slide.classList.toggle('is-active', index === position));
  buttons.forEach((button, position) => button.setAttribute('aria-pressed', String(index === position)));
}

function updatePause() {
  const label = paused ? 'Retomar troca de sabores' : 'Pausar troca de sabores';
  pause.dataset.paused = paused;
  pause.title = label;
  pause.setAttribute('aria-label', label);
}

function schedule() {
  clearTimeout(timer);
  if (paused || !inView || home.hidden || document.hidden) return;
  timer = setTimeout(() => {
    selectFlavor((selected + 1) % flavors.length);
    schedule();
  }, displayDuration);
}

pause.addEventListener('click', () => {
  paused = !paused;
  updatePause();
  schedule();
});
reducedMotion.addEventListener('change', event => {
  paused = event.matches;
  updatePause();
  schedule();
});
document.addEventListener('visibilitychange', schedule);

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
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    schedule();
  }).observe(stage);
}
