/* ============================================================
   999NERTAjs   ARCADE EDITION (app.js)
   - PL content embedded (no external translation files)
   - Data from data/ folder (3d.json, vfx.json, modele.json, collab.json)
   - 3D & VFX cards open YouTube directly
   - Models open image modal
   - Pagination: 6 items per page
   ============================================================ */

const ITEMS_PER_PAGE = 6;

class ArcadePortfolio {
  constructor() {
    this.currentMainView = null;
    this.currentSubtab   = 'home';
    this.data   = { '3d': [], 'vfx': [], 'modele': [], 'collabs': [] };
    this.reglamin = null;
    this.pages  = { '3d': 1, 'vfx': 1, 'modele': 1 };
    this.loaded = new Set();
    this.init();
  }

  async init() {
    try {
      await this.loadAllData();
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }

    // Dodaj event listeners dla przycisków
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-main]');
      if (el) {
        const view = el.getAttribute('data-main');
        this.switchMainViewWithUrl(view);
      }
    });

    document.querySelectorAll('.proj-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sub = btn.getAttribute('data-subtab');
        if (sub) {
          this.switchSubtab(sub);
          this.updateUrl('projekty', sub);
        }
      });
    });

    const ov = document.getElementById('modalOverlay');
    const mc = document.getElementById('modalClose');
    if (ov) ov.addEventListener('click', () => this.closeModal());
    if (mc) mc.addEventListener('click', () => this.closeModal());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closeModal(); });

    // Nasłuchuj zmiany historii (back/forward)
    window.addEventListener('popstate', () => this.handleUrlRoute());

    // Ustaw początkowy widok
    const pathname = window.location.pathname;
    const segments = pathname.split('/').filter(s => s);
    const lastSegment = segments[segments.length - 1] || '';
    
    const urlMap = {
      'portfolio': 'projekty',
      'o-mnie': 'ustawienia',
      'about': 'ustawienia',
      'kontakt': 'kontakt',
      'contact': 'kontakt',
      'regulamin': 'regulamin',
      'terms': 'regulamin'
    };
    
    const initialView = urlMap[lastSegment] || 'landing';
    this.switchMainViewWithUrl(initialView);

    // Schowaj preloader po wszystkim
    setTimeout(() => {
      const pre = document.getElementById('preloader');
      if (pre) {
        pre.style.opacity = '0';
        pre.style.pointerEvents = 'none';
        setTimeout(() => {
          if (pre && pre.parentNode) {
            try {
              pre.parentNode.removeChild(pre);
            } catch (e) {
              // Ignore if already removed
            }
          }
        }, 500);
      }
    }, 1000);

    // Przenieś WROC obok 01 HOME tylko na mobile
    this.setupMobileTabBar();
  }

  /* ---- MOBILE: WROC obok 01 HOME ---- */
  setupMobileTabBar() {
    if (window.innerWidth > 768) return;
    const tabsCenter = document.querySelector('.tab-btns-center');
    const backBtn    = document.querySelector('.projekty-tab-bar > .back-tab-btn');
    if (!tabsCenter || !backBtn) return;
    tabsCenter.insertBefore(backBtn, tabsCenter.firstChild);
  }

  /* ---- ROUTING ---- */
  handleUrlRoute() {
    const pathname = window.location.pathname;
    const segments = pathname.split('/').filter(s => s);
    const lastSegment = segments[segments.length - 1] || '';
    const parentSegment = segments[segments.length - 2] || '';
    
    // Map URL to view names + subtabs
    const urlMap = {
      'portfolio': 'projekty',
      'o-mnie': 'ustawienia',
      'about': 'ustawienia',
      'kontakt': 'kontakt',
      'contact': 'kontakt',
      'regulamin': 'regulamin',
      'terms': 'regulamin'
    };
    
    // Check if it's a nested route like /portfolio/3d
    let view = 'landing';
    let subtab = null;
    
    if (parentSegment === 'portfolio' && lastSegment) {
      view = 'projekty';
      subtab = lastSegment; // 3d, vfx, modele, collabs
    } else {
      view = urlMap[lastSegment] || 'landing';
    }
    
    this.switchMainView(view);
    if (subtab && view === 'projekty') {
      this.switchSubtab(subtab);
    }
  }

  switchMainViewWithUrl(view, subtab = null) {
    this.switchMainView(view);
    this.updateUrl(view, subtab);
  }

  updateUrl(view, subtab = null) {
    const urlMap = {
      'projekty': '/portfolio',
      'ustawienia': '/o-mnie',
      'kontakt': '/kontakt',
      'regulamin': '/regulamin',
      'landing': '/'
    };
    
    let path = urlMap[view] || '/';
    if (subtab && view === 'projekty') {
      path = `/portfolio/${subtab}`;
    }
    
    if (window.location.pathname !== path) {
      window.history.pushState({ view, subtab }, '', path);
    }
  }

  /* ---- I18N ---- */
  renderRegulaminView() {
    const panel = document.getElementById('regulamin-content');
    if (!panel || !this.reglamin) return;
    
    const reg = this.reglamin;
    const sectionsHtml = reg.sections.map(section => {
      let content = '';
      if (section.items) {
        content = `<ul class="reg-list">${section.items.map(item => `<li>${this.esc(item)}</li>`).join('')}</ul>`;
      } else {
        content = `<p class="reg-text">${this.esc(section.content).replace(/\n/g, '<br>')}</p>`;
      }
      return `
        <div class="reg-section">
          <h4 class="reg-title">${this.esc(section.title)}</h4>
          ${content}
        </div>`;
    }).join('');

    panel.innerHTML = `
      <div class="reg-wrapper">
        <h2 class="reg-main-title">${this.esc(reg.title)}</h2>
        <div class="reg-meta">Last updated: ${this.esc(reg.lastUpdated)}</div>
        ${sectionsHtml}
        <div class="reg-footer">
          <p>${this.esc(reg.footer)}</p>
        </div>
      </div>`;
  }

  /* ---- DATA ---- */
  async loadAllData() {
    const files  = ['3d', 'vfx', 'modele', 'collab', 'reglamin'];
    const keyMap = { '3d': '3d', 'vfx': 'vfx', 'modele': 'modele', 'collab': 'collabs', 'reglamin': 'reglamin' };
    await Promise.allSettled(files.map(async (f) => {
      try {
        const res = await fetch(`data/${f}.json`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (f === 'reglamin') {
          this.reglamin = json;
        } else {
          this.data[keyMap[f]] = json;
        }
      } catch (err) {
        console.warn(`Failed to load data/${f}.json:`, err);
      }
    }));
  }

  /* ---- VIEWS ---- */
  switchMainView(view) {
    if (view === this.currentMainView) return;
    const outEl = document.getElementById(`view-${this.currentMainView}`);

    const activate = () => this._activateView(view);

    if (outEl && outEl.classList.contains('active-view')) {
      outEl.classList.add('view-exiting');
      outEl.classList.remove('active-view');

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        outEl.classList.remove('view-exiting');
        activate();
      };
      outEl.addEventListener('animationend', finish, { once: true });
      setTimeout(finish, 350); // fallback
    } else {
      activate();
    }
  }

  _activateView(view) {
    this.currentMainView = view;
    document.querySelectorAll('.main-view').forEach(s => {
      if (!s.classList.contains('view-exiting')) s.classList.remove('active-view');
    });
    const v = document.getElementById(`view-${view}`);
    if (v) v.classList.add('active-view');
    if (view === 'projekty') { this.renderSubtab(this.currentSubtab); this.updateTabBtns(); }
    if (view === 'regulamin') this.renderRegulaminView();
    window.scrollTo(0, 0);
  }

  switchSubtab(sub) {
    this.currentSubtab = sub;
    this.updateTabBtns();
    this.renderSubtab(sub);
  }

  updateTabBtns() {
    document.querySelectorAll('.proj-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-subtab') === this.currentSubtab);
    });
  }

  renderSubtab(sub) {
    const container = document.getElementById('projekty-content-container');
    if (!container) return;
    if (sub === 'home')    { container.innerHTML = this.buildHome(); this.attachHomeEvents(container); }
    else if (sub === '3d')      { this.buildGrid(container, this.data['3d'],     '3d'); }
    else if (sub === 'vfx')     { this.buildGrid(container, this.data['vfx'],    'vfx'); }
    else if (sub === 'modele')  { this.buildGrid(container, this.data['modele'], 'modele'); }
    else if (sub === 'collabs') { container.innerHTML = this.buildCollabs(); }
  }

  /* ---- HOME TAB ---- */
  buildHome() {
    const tag         = '[ ARTIST PROFILE ]';
    const role        = '3D / CGI Artist & VFX Specialist. Full pipeline from environment design and cloth simulation to VFX and final cinematics. Based in Poland.';
    const swLabel     = '// SOFTWARE';
    const stats       = { projects:'PROJECTS', collabs:'COLLABS', years:'YEARS' };
    const recentLabel = 'RECENT WORK';

    const parseDate = (s) => {
      if (!s) return 0;
      const p = s.split('.');
      if (p.length !== 3) return 0;
      return new Date(+p[2], +p[1]-1, +p[0]).getTime();
    };
    const recent = [...this.data['3d'], ...this.data['vfx']]
      .sort((a, b) => parseDate(b.date) - parseDate(a.date))
      .slice(0, window.innerWidth <= 768 ? 3 : 12);

    return `
      <div class="portfolio-home-inner">
        <div class="hero-arcade">
          <p class="hero-tag-arcade">${this.esc(tag)}</p>
          <h2 class="hero-name-arcade">999<em>NERTA</em>js</h2>
          <p class="hero-role-arcade">${this.esc(role)}</p>
          <div class="home-chips-bar">
            <span class="home-chips-label">${this.esc(swLabel)}</span>
            <div class="home-chips-row">
              ${this.buildSoftwareChips('Unreal Engine 5, Blender, CLO3D/MARVERLOUS, Substance 3D, After Effects, Premiere Pro, Photoshop', 'home')}
            </div>
          </div>
        </div>
        <div class="stats-row-arcade">
          <div class="stat-box-arcade">
            <div class="stat-num-arcade">${this.data['3d'].length + this.data['vfx'].length}</div>
            <div class="stat-lbl-arcade">${this.esc(stats.projects)}</div>
          </div>
          <div class="stat-box-arcade">
            <div class="stat-num-arcade">${this.data['collabs'].length}</div>
            <div class="stat-lbl-arcade">${this.esc(stats.collabs)}</div>
          </div>
          <div class="stat-box-arcade">
            <div class="stat-num-arcade">3+</div>
            <div class="stat-lbl-arcade">${this.esc(stats.years)}</div>
          </div>
        </div>
        ${recent.length ? `
        <div class="section-arcade section-arcade--recent">
          <h3>${this.esc(recentLabel)}</h3>
          <div class="recent-slider-shell">
            <div class="recent-carousel" id="recentCarousel">
              ${recent.map(p => {
                const thumb = this.getThumb(p);
                return `
                  <div class="recent-card" data-url="${this.esc(p.videoUrl || '')}">
                    <div class="recent-thumb"><img src="${this.esc(thumb)}" alt="${this.esc(p.title)}" loading="lazy"></div>
                    <div class="recent-info">
                      <div class="recent-title">${this.esc(p.title)}</div>
                      <div class="recent-meta">${this.esc(p.date || '')}</div>
                    </div>
                  </div>`;
              }).join('')}
            </div>
          </div>
        </div>` : ''}
      </div>`;
  }

  attachHomeEvents(container) {
    
    container.querySelectorAll('.recent-card').forEach(card => {
      card.addEventListener('click', () => {
        const url = card.dataset.url;
        if (url) window.open(url, '_blank', 'noopener');
      });
    });
    const carousel = container.querySelector('.recent-carousel');
    if (carousel) {
      let isDown = false, startX = 0, scrollLeft = 0;
      carousel.addEventListener('mousedown', e => {
        isDown = true;
        carousel.classList.add('dragging');
        startX = e.pageX - carousel.offsetLeft;
        scrollLeft = carousel.scrollLeft;
        e.preventDefault();
      });
      carousel.addEventListener('mouseleave', () => { isDown = false; carousel.classList.remove('dragging'); });
      carousel.addEventListener('mouseup', () => { isDown = false; carousel.classList.remove('dragging'); });
      carousel.addEventListener('mousemove', e => {
        if (!isDown) return;
        const walk = (e.pageX - carousel.offsetLeft - startX) * 1.25;
        carousel.scrollLeft = scrollLeft - walk;
      });
      let touchX = 0, touchScroll = 0;
      carousel.addEventListener('touchstart', e => { touchX = e.touches[0].pageX; touchScroll = carousel.scrollLeft; }, { passive: true });
      carousel.addEventListener('touchmove', e => { carousel.scrollLeft = touchScroll - (e.touches[0].pageX - touchX) * 1.25; }, { passive: true });

      // --- MOBILE: 1 projekt na raz, strzałki ‹ 1/9 › ---
      if (window.innerWidth <= 768) {
        const cards = carousel.querySelectorAll('.recent-card');
        const total = cards.length;
        if (total > 0) {
          let idx = 0;
          const shell = carousel.parentElement;

          // Wyłącz touch-scroll — zastępujemy strzałkami
          carousel.removeEventListener('touchmove', () => {});
          carousel.style.overflowX = 'hidden';

          // Ustaw dokładną szerokość każdej karty = szerokość kontenera (px)
          const fitCards = () => {
            const w = shell.offsetWidth + 'px';
            cards.forEach(c => {
              c.style.minWidth  = w;
              c.style.maxWidth  = w;
              c.style.flexBasis = w;
            });
          };
          fitCards();
          window.addEventListener('resize', () => { fitCards(); slide(); }, { passive: true });

          // Nawigacja: ‹  1 / 9  › w jednej linii pod okienkiem
          const navRow      = document.createElement('div');
          navRow.className  = 'recent-nav-row';

          const prevBtn     = document.createElement('button');
          prevBtn.className = 'recent-nav-btn';
          prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';

          const counter     = document.createElement('span');
          counter.className = 'recent-nav-counter';

          const nextBtn     = document.createElement('button');
          nextBtn.className = 'recent-nav-btn';
          nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';

          navRow.appendChild(prevBtn);
          navRow.appendChild(counter);
          navRow.appendChild(nextBtn);
          shell.appendChild(navRow);

          const slide = () => {
            carousel.style.transform = `translateX(-${idx * shell.offsetWidth}px)`;
            counter.textContent = `${idx + 1} / ${total}`;
            prevBtn.disabled = idx === 0;
            nextBtn.disabled = idx === total - 1;
          };

          prevBtn.addEventListener('click', () => { if (idx > 0) { idx--; slide(); } });
          nextBtn.addEventListener('click', () => { if (idx < total - 1) { idx++; slide(); } });

          // Swipe palcem
          let swipeStartX = 0;
          carousel.addEventListener('touchstart', e => { swipeStartX = e.touches[0].pageX; }, { passive: true });
          carousel.addEventListener('touchend', e => {
            const dx = swipeStartX - e.changedTouches[0].pageX;
            if (Math.abs(dx) > 40) {
              if (dx > 0 && idx < total - 1) idx++;
              else if (dx < 0 && idx > 0) idx--;
              slide();
            }
          });

          slide();
        }
      }
    }
  }

  /* ---- GRID (3D / VFX / MODELS) ---- */
  buildGrid(container, items, key) {
    const noItemsMsg = 'NO ITEMS FOUND';
    const prevLabel  = 'PREVIOUS';
    const nextLabel  = 'NEXT';

    if (!items || !items.length) {
      container.innerHTML = `<div class="loading-state">${noItemsMsg}</div>`;
      return;
    }
    const page       = this.pages[key] || 1;
    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
    const pageItems  = items.slice((page-1)*ITEMS_PER_PAGE, page*ITEMS_PER_PAGE);
    const isModel    = key === 'modele';

    const fmtDuration = (d) => {
      if (!d) return '';
      return d.trim()
        .replace(/\btyg\.\s*/gi,   'WEEKS ')
        .replace(/\btygodni\b/gi,  'WEEKS')
        .replace(/\btydzien\b/gi,  'WEEK')
        .replace(/\btydzien\b/gi,  'WEEK')
        .replace(/\bweeks?\b/gi,   m => m.toUpperCase())
        .replace(/\bmies\.\s*/gi,  'MONTHS ')
        .replace(/\bmonths?\b/gi,  m => m.toUpperCase())
        .trim();
    };

    const cards = pageItems.map(p => {
      const isModel    = key === 'modele';
      const images     = Array.isArray(p.images) ? p.images : [];
      const thumb      = isModel
        ? (p.thumbnail || (images.length && images[0].src ? images[0].src : ''))
        : this.getThumb(p);
      const newBadge   = this.isNew(p.date) ? '<span class="badge-new">NEW</span>' : '';
      const tools      = this.buildSoftwareChips(p.software || '', 'chip');
      const icon       = isModel ? 'fa-expand' : 'fa-play';
      const imagesJson = isModel ? this.esc(JSON.stringify(images)) : '';

      const metaDuration = p.duration ? `<span class="meta-dur"><i class="fas fa-stopwatch"></i>${this.esc(fmtDuration(p.duration))}</span>` : '';
      const metaDate     = p.date     ? `<span class="meta-date"><i class="far fa-calendar-alt"></i>${this.esc(p.date)}</span>` : '';
      const metaClient   = p.client   ? `<span class="meta-client"><i class="fas fa-user-circle"></i>${this.esc(p.client)}</span>` : '';

      const thumbHtml = isModel
        ? (thumb
            ? `<img src="${this.esc(thumb)}" alt="${this.esc(p.title)}" loading="lazy" onerror="this.parentElement.classList.add('model-thumb--error');this.style.display='none';">`
            : '')
        : `<img src="${this.esc(thumb)}" alt="${this.esc(p.title)}" loading="lazy">`;

      return `
        <div class="${isModel ? 'model-card' : 'proj-card'}"
             data-title="${this.esc(p.title)}"
             data-url="${isModel ? '' : this.esc(p.videoUrl||'')}"
             data-link="${isModel ? this.esc(p.link || '') : ''}"
             data-images="${imagesJson}">
          <div class="proj-meta-bar">${metaDuration}${metaDate}${metaClient}</div>
          <div class="${isModel ? 'model-thumb' : 'proj-thumb'}${isModel && !thumb ? ' model-thumb--error' : ''}">
            ${thumbHtml}
            ${newBadge}
          </div>
          <div class="proj-chips">${tools}</div>
          <div class="${isModel ? 'model-hover-overlay' : 'proj-hover-overlay'}">
            ${isModel
              ? ''
              : `<img class="proj-hover-avatar" src="/images/main_avatar.png" alt="" loading="lazy" onerror="this.style.display='none'">`
            }
            <div class="proj-title-hover">${this.esc(p.title)}</div>
          </div>
        </div>`;
    }).join('');

    const pagination = totalPages > 1 ? `
      <div class="pagination-row">
        <button class="page-btn" data-dir="prev" data-key="${key}" ${page<=1?'disabled':''}>${prevLabel}</button>
        <span class="page-indicator">${page}/${totalPages}</span>
        <button class="page-btn" data-dir="next" data-key="${key}" ${page>=totalPages?'disabled':''}>${nextLabel}</button>
      </div>` : '';

    container.innerHTML = `<div class="${isModel ? 'models-grid' : 'projects-grid'}">${cards}</div>${pagination}`;

    container.querySelectorAll(isModel ? '.model-card' : '.proj-card').forEach(card => {
      card.addEventListener('click', () => {
        if (isModel) {
          const link = card.dataset.link || '';
          if (link) window.open(link, '_blank', 'noopener');
        }
        else { const url = card.dataset.url; if (url) window.open(url,'_blank','noopener'); }
      });
    });
    container.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const k = btn.dataset.key, dir = btn.dataset.dir;
        if (dir==='prev') this.pages[k] = Math.max(1, (this.pages[k]||1)-1);
        else              this.pages[k] = Math.min(Math.ceil(this.data[k].length/ITEMS_PER_PAGE), (this.pages[k]||1)+1);
        this.buildGrid(container, this.data[k], k);
      });
    });
  }

  /* ---- COLLABS ---- */
  buildCollabs() {
    const noMsg = 'NO COLLABS FOUND';
    if (!this.data.collabs.length) return `<div class="loading-state">${noMsg}</div>`;

    return `<div class="collabs-list">${this.data.collabs.map(p => {
      const active = p.status === 'active';

      const links = (p.links || []).map(l => {
        const label = l.label || '';
        const isShorts  = label.toLowerCase() === 'shorts';
        const isYT      = l.icon.includes('fa-youtube') && !isShorts;
        const isTikTok  = l.icon.includes('fa-tiktok');
        const cls = isShorts ? 'collab-link collab-link--shorts'
                  : isYT     ? 'collab-link collab-link--yt'
                  : isTikTok ? 'collab-link collab-link--tiktok'
                  :            'collab-link';
        return `<a href="${this.esc(l.url)}" target="_blank" rel="noopener" class="${cls}">
          <i class="${this.esc(l.icon)}"></i><span>${this.esc(label)}</span>
        </a>`;
      }).join('');

      // Status badge   inline next to name
      // Status badge -- styled via CSS classes
      const statusBadge = active
        ? `<span class="collab-status status-active"><span class="pulse-dot"></span>${this.esc(p.statusLabel || p.status)}</span>`
        : `<span class="collab-status status-ended"><i class="fas fa-circle" style="font-size:0.35rem;opacity:0.4"></i>${this.esc(p.statusLabel || p.status)}</span>`;

      return `
        <div class="collab-card ${active ? 'collab-card--active' : 'collab-card--ended'}">
          <div class="collab-left">
            <div class="collab-avatar">
              <img src="${this.esc(p.thumbnail)}" alt="${this.esc(p.title)}" loading="lazy">
            </div>
          </div>
          <div class="collab-right">
            <div class="collab-name-row">
              <h3 class="collab-name">${this.esc(p.title)}</h3>
              ${statusBadge}
            </div>
            <p class="collab-date"><i class="far fa-calendar-alt"></i>${this.esc(p.date)}</p>
            <div class="collab-links">${links}</div>
          </div>
        </div>`;
    }).join('')}</div>`;
  }

  /* ---- HELPERS ---- */
  extractYouTubeId(url) {
    if (!url) return null;
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&\n?#]+)/);
    return m ? m[1] : null;
  }
  getThumb(p) {
    if (p.thumbnail && (p.thumbnail.startsWith('http://') || p.thumbnail.startsWith('https://'))) return p.thumbnail;
    const ytId = this.extractYouTubeId(p.videoUrl);
    if (ytId) return `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
    return p.thumbnail || '';
  }
  isNew(dateStr) {
    if (!dateStr) return false;
    const parts = dateStr.split('.');
    if (parts.length !== 3) return false;
    const d = new Date(+parts[2], +parts[1]-1, +parts[0]);
    return !isNaN(d) && (Date.now()-d.getTime())/86400000 <= 30;
  }
  normalizeSoftware(name) {
    const n = name.trim();
    const map = {
      'ue5':'UNREAL ENGINE 5','ue 5':'UNREAL ENGINE 5','unreal engine 5':'UNREAL ENGINE 5',
      'after effects':'AFTER EFFECTS','premiere pro':'PREMIERE PRO','blender':'BLENDER',
      'substance 3d painter':'SUBSTANCE 3D PAINTER','substance 3d':'SUBSTANCE 3D',
      'clo3d':'CLO3D/MARVERLOUS','clo 3d':'CLO3D/MARVERLOUS',
      'clo3d/marverlous':'CLO3D/MARVERLOUS','marverlous':'CLO3D/MARVERLOUS',
      'marvelous designer':'CLO3D/MARVERLOUS','photoshop':'PHOTOSHOP',
    };
    return map[n.toLowerCase()] || n.toUpperCase();
  }

  blenderLogoSvg() {
    return `<svg class="tool-chip-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
      <path d="M11 35.5c7.5-11 18.6-16.8 30.7-16.8 6.9 0 13.2 1.9 18.3 5.7l-9.4 1.2c-4.3.5-7.5 2.6-9.4 6.1l-1.9 3.6 2.1 3.3c2.1 3.1 5.4 4.8 9.5 4.8h9.3C54.6 51.4 46 55 34.7 55 21.8 55 11 46.6 11 35.5Z" fill="#F38C1A"/>
      <circle cx="41.8" cy="31.8" r="4.8" fill="#ffffff"/>
      <circle cx="41.8" cy="31.8" r="2.2" fill="#F38C1A"/>
      <path d="M18 33.5c4.2-8.6 12.8-14.2 22.6-14.2 3.8 0 7.4.7 10.5 2l-6.4.8c-2.8.3-4.9 1.7-6.1 4.1l-1.2 2.3 1.3 2c1.3 1.9 3.2 3 5.6 3h5.7" stroke="#FFBC6E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>
    </svg>`;
  }

  unrealLogoSvg() {
    return `<svg class="tool-chip-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="28" fill="none" stroke="#ffffff" stroke-opacity="0.92" stroke-width="3.2"/>
      <path d="M18 18v17c0 10 7.8 17 18 17s18-7 18-17V18" fill="none" stroke="#ffffff" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M27 31c0-2.8 2.3-5 5-5s5 2.2 5 5-2.3 5-5 5-5-2.2-5-5Z" fill="#ffffff" fill-opacity="0.95"/>
    </svg>`;
  }

  buildSoftwareChips(softwareStr, type = 'chip') {
    const isHome = type === 'home';
    return (softwareStr||'').split(',').map(t => {
      const raw = t.trim(); if (!raw) return '';
      const name = this.normalizeSoftware(raw);
      return `<span class="sw-chip${isHome ? ' sw-chip--home' : ''}" data-tool="${this.esc(name)}">${this.esc(name)}</span>`;
    }).join('');
  }

  esc(t) {
    if (!t) return '';
    return t.toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.arcadePortfolio = new ArcadePortfolio();
});