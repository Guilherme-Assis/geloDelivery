const supabaseUrl = 'https://ziacmlaeuzsolillqkka.supabase.co';
const publishableKey = 'sb_publishable_BpvDosVttxtm5UPXepQ6lw_sKBKjXUj';
const mediaUrl = `${supabaseUrl}/storage/v1/object/public/produtos/`;
const backLink = '<a class="back" href="./#sabores">Todos os sabores</a>';
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const home = document.querySelector('#home');
const detail = document.querySelector('#detail');

function escapeHtml(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, character => entities[character]);
}

function encodePath(path) {
  if (!path) return '';
  const parts = path.split('/');
  if (parts.some(part => !part || part === '.' || part === '..')) return '';
  return parts.map(encodeURIComponent).join('/');
}

async function loadFlavors(slug) {
  const url = new URL('/rest/v1/produtos', supabaseUrl);
  url.searchParams.set('select', 'slug,nome,resumo,descricao,cor_destaque,sugestoes_drinks,imagem_path,modelo_3d_path,em_destaque');
  url.searchParams.set('ativo', 'eq.true');
  if (slug) url.searchParams.set('slug', `eq.${slug}`);
  else url.searchParams.set('order', 'ordem.asc,slug.asc');

  const response = await fetch(url, {
    headers: { apikey: publishableKey },
    cache: 'no-cache',
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Supabase respondeu com HTTP ${response.status}`);

  const records = await response.json();
  return records.map(record => {
    const image = encodePath(record.imagem_path);
    return {
      id: record.slug,
      name: record.nome,
      summary: record.resumo,
      description: record.descricao,
      color: /^#[0-9a-f]{6}$/i.test(record.cor_destaque) ? record.cor_destaque : '#049dd6',
      pairings: record.sugestoes_drinks.filter(pairing => typeof pairing === 'string' && pairing.trim()),
      imageUrl: image ? mediaUrl + image : '',
      modelPath: encodePath(record.modelo_3d_path),
      featured: record.em_destaque
    };
  });
}

function renderCatalog(flavors) {
  document.querySelector('#flavor-grid').innerHTML = flavors.map(flavor => `
    <a class="card" href="?sabor=${encodeURIComponent(flavor.id)}" style="--flavor:${flavor.color}">
      <div class="card-art">${flavor.imageUrl ? `<img src="${escapeHtml(flavor.imageUrl)}" alt="" decoding="async" loading="lazy">` : ''}</div>
      <div class="card-content"><h3>${escapeHtml(flavor.name)}</h3><p>${escapeHtml(flavor.summary)}</p>
        <span class="card-link">Ver detalhes <span aria-hidden="true">+</span></span></div>
    </a>`).join('');
}

function setupShowcase(featured) {
  if (!featured.length) return;
  const stage = document.querySelector('#showcase');
  const packageStage = stage.querySelector('.package-stage');
  const slideTemplate = stage.querySelector('#package-slide');
  const controls = stage.querySelector('.flavor-controls');
  const currentName = stage.querySelector('#current-name');
  const selectors = stage.querySelector('.selectors');
  const pause = stage.querySelector('.pause');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let selected = 0;
  let paused = reducedMotion.matches;
  let inView = true;
  let timer;

  const slides = featured.map((_, index) => {
    const slide = slideTemplate.content.firstElementChild.cloneNode(true);
    slide.querySelectorAll('img').forEach((image, offset) => {
      const flavor = featured[(index + offset) % featured.length];
      if (offset < featured.length && flavor.imageUrl) image.src = flavor.imageUrl;
      else image.remove();
    });
    packageStage.append(slide);
    return slide;
  });

  const buttons = featured.map((flavor, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.title = flavor.name;
    button.setAttribute('aria-label', `Destacar ${flavor.name}`);
    button.addEventListener('click', () => {
      selectFlavor(index);
      schedule();
    });
    selectors.append(button);
    return button;
  });

  function selectFlavor(index) {
    selected = index;
    const flavor = featured[index];
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
    if (paused || !inView || document.hidden) return;
    timer = setTimeout(() => {
      selectFlavor((selected + 1) % featured.length);
      schedule();
    }, 5300);
  }

  selectFlavor(0);
  controls.hidden = false;
  if (featured.length === 1) {
    selectors.hidden = true;
    pause.hidden = true;
    return;
  }

  updatePause();
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
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    schedule();
  }).observe(stage);
}

function renderDetail(flavor) {
  if (!flavor) {
    document.title = 'Sabor não encontrado — JogGelo';
    detail.innerHTML = `${backLink}<h1>Sabor não encontrado</h1>`;
    return;
  }

  document.title = `${flavor.name} — JogGelo`;
  const name = escapeHtml(flavor.name);
  const hasModel = flavor.modelPath && flavor.imageUrl;
  const pairings = flavor.pairings.map(pairing => `<li>${escapeHtml(pairing)}</li>`).join('');
  detail.innerHTML = `
    ${backLink}
    <div class="detail-layout" style="--flavor:${flavor.color}">
      <div class="detail-art">
        ${flavor.imageUrl ? `<img src="${escapeHtml(flavor.imageUrl)}" alt="Embalagem de gelo sabor ${name}">` : ''}
        ${hasModel ? `
          <div class="detail-model" id="detail-model" hidden></div>
          <button class="model-toggle" type="button" aria-controls="detail-model" aria-expanded="false">Ver em 3D</button>
          <p class="model-status" role="status" hidden></p>` : ''}
      </div>
      <div class="detail-copy">
        <p class="eyebrow"><span></span> GELO SABORIZADO</p>
        <h1>${name}</h1>
        <p>${escapeHtml(flavor.description)}</p>
        ${pairings ? `<div class="pairings"><h2>Experimente com</h2><ul>${pairings}</ul></div>` : ''}
      </div>
    </div>`;
  if (hasModel) setupModel(flavor);
}

async function start() {
  const requested = new URLSearchParams(location.search).get('sabor');
  if (requested) {
    home.hidden = true;
    detail.hidden = false;
    document.querySelector('#nav-flavors').setAttribute('aria-current', 'true');
    detail.innerHTML = `${backLink}<p role="status">Carregando sabor…</p>`;
    if (!slugPattern.test(requested)) {
      renderDetail();
      return;
    }
    try {
      const [flavor] = await loadFlavors(requested);
      renderDetail(flavor);
    } catch {
      detail.innerHTML = `${backLink}<p role="status">Não foi possível carregar este sabor. Atualize a página para tentar novamente.</p>`;
    }
    return;
  }

  const updateNav = () => {
    const onCatalog = location.hash === '#sabores';
    document.querySelector('#nav-home').toggleAttribute('aria-current', !onCatalog);
    document.querySelector('#nav-flavors').toggleAttribute('aria-current', onCatalog);
    document.querySelector(onCatalog ? '#nav-flavors' : '#nav-home').setAttribute('aria-current', onCatalog ? 'location' : 'page');
  };
  updateNav();
  addEventListener('hashchange', updateNav);
  const status = document.querySelector('#catalog-status');
  try {
    const flavors = await loadFlavors();
    status.hidden = flavors.length > 0;
    if (!flavors.length) status.textContent = 'Nenhum sabor disponível no momento.';
    renderCatalog(flavors);
    setupShowcase(flavors.filter(flavor => flavor.featured).slice(0, 5));
  } catch {
    status.hidden = false;
    status.textContent = 'Não foi possível carregar os sabores. Atualize a página para tentar novamente.';
  }
}

function setupModel(flavor) {
  const art = detail.querySelector('.detail-art');
  const poster = art.querySelector('img');
  const container = art.querySelector('.detail-model');
  const button = art.querySelector('.model-toggle');
  const status = art.querySelector('.model-status');
  let viewer;

  function showModel(show) {
    poster.hidden = show;
    container.hidden = !show;
    button.textContent = show ? 'Voltar à imagem' : 'Ver em 3D';
    button.setAttribute('aria-expanded', String(show));
  }

  function showError() {
    viewer?.remove();
    viewer = undefined;
    showModel(false);
    status.textContent = 'Não foi possível carregar a visualização 3D.';
    status.hidden = false;
  }

  button.addEventListener('click', async () => {
    if (viewer) {
      showModel(container.hidden);
      return;
    }
    status.hidden = true;
    button.disabled = true;
    button.textContent = 'Carregando 3D…';
    try {
      await import('https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js');
      viewer = document.createElement('model-viewer');
      viewer.setAttribute('alt', `Modelo 3D da embalagem de gelo sabor ${flavor.name}`);
      viewer.setAttribute('camera-controls', '');
      viewer.setAttribute('touch-action', 'pan-y');
      viewer.setAttribute('camera-orbit', '13deg 84deg auto');
      viewer.setAttribute('interaction-prompt', 'none');
      viewer.setAttribute('poster', flavor.imageUrl);
      let usingLocalModel = false;
      viewer.addEventListener('error', () => {
        if (usingLocalModel) {
          showError();
          return;
        }
        usingLocalModel = true;
        viewer.setAttribute('src', `assets/${flavor.modelPath}`);
      });
      viewer.setAttribute('src', mediaUrl + flavor.modelPath);
      container.append(viewer);
      showModel(true);
    } catch {
      showError();
    } finally {
      button.disabled = false;
    }
  });
}

start();
