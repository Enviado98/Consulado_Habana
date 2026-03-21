/* ================================================================
   CONSULADO HABANA — Sistema de Anuncios para Gestores/Abogados
   Popup de bienvenida + botón flotante + panel de anuncios
   ================================================================ */

(function() {
  'use strict';

  const STORAGE_KEY = 'ch_ads_dismissed_v1';
  const WHATSAPP_NUMBER = '5350172941';

  // ── Ads data (editable by site owner) ──────────────────────────
  const ADS = [
    {
      id: 'welcome',
      type: 'welcome',
      badge: 'Anunciante Destacado',
      badgeColor: 'violet',
      title: '¿Gestor o Abogado?',
      subtitle: 'Llega a miles de cubanos que buscan ayuda con trámites consulares',
      body: 'Esta web recibe visitas diarias de personas interesadas en citas consulares, LMD y legalizaciones en La Habana. Anúnciate aquí y conecta directamente con tus clientes.',
      cta: 'Contactar por WhatsApp',
      ctaColor: 'green',
      footer: 'Espacios publicitarios disponibles · Comunidad ConsulHabana',
    },
  ];

  // ── Helper: localStorage ────────────────────────────────────────
  function isDismissed() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch(e) { return false; }
  }
  function setDismissed() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch(e) {}
  }

  // ── Inject CSS ──────────────────────────────────────────────────
  const css = `
    /* ── Overlay backdrop ── */
    #ch-ads-overlay {
      position: fixed; inset: 0; z-index: 9000;
      background: rgba(0,0,0,0.25);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
      animation: chOverlayIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
    }
    #ch-ads-overlay.ch-closing {
      animation: chOverlayOut 0.38s cubic-bezier(0.4,0,0.2,1) both;
    }

    /* ── Card ── */
    #ch-ads-card {
      width: 100%; max-width: 370px;
      background: #eaeaf0;
      border: 1px solid rgba(255,255,255,0.65);
      box-shadow: 8px 8px 20px rgba(0,0,0,0.15), -5px -5px 14px rgba(255,255,255,0.85);
      border-radius: 26px;
      overflow: hidden;
      position: relative;
      animation: chCardIn 0.42s cubic-bezier(0.34,1.56,0.64,1) both;
    }
    #ch-ads-overlay.ch-closing #ch-ads-card {
      animation: chCardOut 0.38s cubic-bezier(0.4,0,0.2,1) both;
    }

    /* ── Close button ── */
    #ch-ads-close {
      position: absolute; top: 14px; right: 14px;
      width: 30px; height: 30px;
      background: #e8e8ed;
      border: none; cursor: pointer;
      border-radius: 50%;
      box-shadow: 3px 3px 8px rgba(0,0,0,0.12), -2px -2px 6px rgba(255,255,255,0.82);
      display: flex; align-items: center; justify-content: center;
      color: #8e8e93;
      transition: box-shadow 0.15s, color 0.15s, transform 0.15s;
      z-index: 2;
    }
    #ch-ads-close:active {
      box-shadow: inset 2px 2px 5px rgba(0,0,0,0.13), inset -2px -2px 5px rgba(255,255,255,0.72);
      transform: scale(0.94);
    }
    #ch-ads-close svg { pointer-events: none; }

    /* ── Card header band ── */
    .ch-card-header {
      background: linear-gradient(135deg, #5040b8 0%, #2060c8 100%);
      padding: 28px 24px 22px;
      position: relative;
      overflow: hidden;
    }
    .ch-card-header::before {
      content: '';
      position: absolute; top: -30px; right: -30px;
      width: 110px; height: 110px;
      background: rgba(255,255,255,0.07);
      border-radius: 50%;
    }
    .ch-card-header::after {
      content: '';
      position: absolute; bottom: -20px; left: 20px;
      width: 70px; height: 70px;
      background: rgba(255,255,255,0.05);
      border-radius: 50%;
    }
    .ch-badge {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 0.58rem; font-weight: 700; letter-spacing: 0.09em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.85);
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.25);
      padding: 4px 10px; border-radius: 20px;
      margin-bottom: 12px;
    }
    .ch-badge::before {
      content: ''; width: 5px; height: 5px;
      background: #a8f0c0; border-radius: 50%;
      box-shadow: 0 0 6px rgba(168,240,192,0.8);
      animation: chPulse 2s ease-in-out infinite;
    }
    .ch-card-title {
      font-family: 'DM Serif Display', Georgia, serif;
      font-size: 1.55rem; color: #fff;
      line-height: 1.2; letter-spacing: -0.02em;
      margin-bottom: 5px;
    }
    .ch-card-subtitle {
      font-size: 0.72rem; color: rgba(255,255,255,0.72);
      font-weight: 400; line-height: 1.4;
    }

    /* ── Card body ── */
    .ch-card-body {
      padding: 20px 24px 22px;
    }
    .ch-card-text {
      font-size: 0.82rem; color: #3a3a3c;
      line-height: 1.55; margin-bottom: 20px;
    }
    .ch-stats-row {
      display: flex; gap: 8px; margin-bottom: 20px;
    }
    .ch-stat {
      flex: 1;
      background: #e8e8ed;
      box-shadow: 3px 3px 8px rgba(0,0,0,0.10), -2px -2px 6px rgba(255,255,255,0.80);
      border-radius: 14px;
      padding: 10px 10px 8px;
      text-align: center;
    }
    .ch-stat-num {
      font-size: 1.1rem; font-weight: 700; color: #1c1c1e;
      letter-spacing: -0.03em; line-height: 1;
    }
    .ch-stat-label {
      font-size: 0.58rem; color: #8e8e93; font-weight: 500;
      margin-top: 3px; letter-spacing: 0.04em;
    }

    /* ── WhatsApp button ── */
    #ch-ads-wa {
      width: 100%;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      background: #25d366;
      color: #fff; font-family: 'DM Sans', sans-serif;
      font-size: 0.88rem; font-weight: 700;
      border: none; cursor: pointer;
      border-radius: 16px;
      padding: 14px 20px;
      box-shadow: 0 4px 14px rgba(37,211,102,0.38), 3px 3px 10px rgba(0,0,0,0.10);
      transition: transform 0.15s, box-shadow 0.15s;
      margin-bottom: 14px;
      text-decoration: none;
      letter-spacing: -0.01em;
    }
    #ch-ads-wa:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(37,211,102,0.44), 3px 3px 10px rgba(0,0,0,0.10); }
    #ch-ads-wa:active { transform: scale(0.97); }
    #ch-ads-wa svg { flex-shrink: 0; }

    /* ── No-show checkbox ── */
    .ch-noshowrow {
      display: flex; align-items: center; gap: 8px;
      cursor: pointer;
    }
    .ch-noshowrow input[type=checkbox] { display: none; }
    .ch-check-custom {
      width: 18px; height: 18px; flex-shrink: 0;
      background: #e8e8ed;
      box-shadow: inset 2px 2px 5px rgba(0,0,0,0.12), inset -2px -2px 5px rgba(255,255,255,0.75);
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    .ch-noshowrow input:checked + .ch-check-custom {
      background: #5040b8;
      box-shadow: 0 2px 6px rgba(80,64,184,0.4);
    }
    .ch-noshowrow input:checked + .ch-check-custom::after {
      content: '';
      width: 9px; height: 5px;
      border-left: 2px solid #fff; border-bottom: 2px solid #fff;
      transform: rotate(-45deg) translateY(-1px);
      display: block;
    }
    .ch-noshow-label {
      font-size: 0.72rem; color: #8e8e93; font-weight: 400;
      user-select: none;
    }
    .ch-card-footer {
      font-size: 0.6rem; color: #aeaeb2; text-align: center;
      padding: 0 24px 18px;
    }

    /* ── Ads icon button — square neumorphic ── */
    /* ── Ads icon button — square neumorphic, always visible ── */
    #ch-ads-btn {
      position: relative;
      width: 26px; height: 26px;
      flex-shrink: 0;
      background: #e8e8ed;
      box-shadow: 3px 3px 8px rgba(0,0,0,0.12), -2px -2px 6px rgba(255,255,255,0.82);
      border: none; cursor: pointer;
      border-radius: 7px;
      display: inline-flex; align-items: center; justify-content: center;
      opacity: 1;
      pointer-events: auto;
      transition: box-shadow 0.15s;
    }
    #ch-ads-btn:active {
      box-shadow: inset 2px 2px 5px rgba(0,0,0,0.13), inset -2px -2px 5px rgba(255,255,255,0.72);
    }

    /* ── Pure CSS bell icon ── */
    .ch-bell {
      position: relative;
      width: 12px; height: 13px;
      display: flex; flex-direction: column;
      align-items: center; justify-content: flex-end;
      pointer-events: none;
    }
    /* Bell body */
    .ch-bell-body {
      width: 10px; height: 9px;
      background: #5040b8;
      border-radius: 5px 5px 0 0;
      position: relative;
    }
    /* Bell body sides flare */
    .ch-bell-body::before {
      content: '';
      position: absolute;
      bottom: 0; left: -1px; right: -1px;
      height: 3px;
      background: #5040b8;
      border-radius: 1px 1px 0 0;
    }
    /* Bell top stem */
    .ch-bell-body::after {
      content: '';
      position: absolute;
      top: -3px; left: 50%; transform: translateX(-50%);
      width: 2px; height: 3px;
      background: #5040b8;
      border-radius: 2px 2px 0 0;
    }
    /* Bell clapper */
    .ch-bell-clapper {
      width: 4px; height: 2px;
      background: #5040b8;
      border-radius: 0 0 3px 3px;
      margin-top: 0;
      flex-shrink: 0;
    }

    /* Red notification dot — top-right corner of button */
    #ch-ads-btn::after {
      content: '';
      position: absolute;
      top: -3px; right: -3px;
      width: 7px; height: 7px;
      background: #e03030;
      border-radius: 50%;
      border: 1.5px solid #e8e8ed;
      animation: chRedPulse 1.8s ease-in-out infinite;
    }

    /* Tooltip */
    #ch-ads-btn::before {
      content: 'Anuncios';
      position: absolute;
      bottom: calc(100% + 7px);
      left: 50%; transform: translateX(-50%);
      background: #1c1c1e;
      color: #fff;
      font-size: 0.58rem; font-weight: 600;
      letter-spacing: 0.04em;
      padding: 4px 8px;
      border-radius: 8px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.18s;
      font-family: var(--f, 'DM Sans', sans-serif);
      z-index: 10;
    }
    #ch-ads-btn:hover::before { opacity: 1; }

    /* tooltip z-index */

    /* ── Keyframes ── */
    @keyframes chOverlayIn  { from { opacity:0; } to { opacity:1; } }
    @keyframes chOverlayOut { from { opacity:1; } to { opacity:0; } }
    @keyframes chCardIn {
      from { opacity:0; transform: scale(0.82) translateY(24px); }
      to   { opacity:1; transform: scale(1) translateY(0); }
    }
    @keyframes chCardOut {
      from { opacity:1; transform: scale(1) translateY(0); }
      to   { opacity:0; transform: scale(0.1) translateY(60px) translateX(80px); }
    }
    @keyframes chRedPulse {
      0%,100% { opacity:1; transform:scale(1); box-shadow: 0 0 0 0 rgba(224,48,48,0.5); }
      50%      { opacity:0.8; transform:scale(1.2); box-shadow: 0 0 0 3px rgba(224,48,48,0); }
    }
    @keyframes chBtnAppear {
      from { opacity:0; transform: scale(0.4) translateX(30px); pointer-events:none; }
      to   { opacity:1; transform: scale(1) translateX(0); pointer-events:auto; }
    }
    @keyframes chPulse {
      0%,100% { opacity:1; transform:scale(1); }
      50%      { opacity:0.35; transform:scale(0.75); }
    }
    @keyframes chBtnCollapse {
      from { opacity:1; transform: scale(1); }
      to   { opacity:0; transform: scale(0.1) translateX(50px); }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── Bell icon on the RIGHT of status-panel-header ──────────────
  function injectAdsButton() {
    const header = document.querySelector('.status-panel-header');
    if (!header) return;

    const btn = document.createElement('button');
    btn.id = 'ch-ads-btn';
    btn.innerHTML = `<span class="ch-bell"><span class="ch-bell-body"></span><span class="ch-bell-clapper"></span></span>`;
    btn.setAttribute('aria-label', 'Ver anuncios');
    btn.addEventListener('click', openAdsPanel);

    // Append to the right of the header
    header.appendChild(btn);
    return btn;
  }

  // ── Build popup HTML ────────────────────────────────────────────
  function buildPopup() {
    const ad = ADS[0];
    const waMsg = encodeURIComponent('Hola, me interesa anunciarme en ConsulHabana para ofrecer mis servicios de gestoría/asesoría legal a cubanos con trámites consulares.');
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`;

    const overlay = document.createElement('div');
    overlay.id = 'ch-ads-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div id="ch-ads-card">
        <button id="ch-ads-close" aria-label="Cerrar">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>

        <div class="ch-card-header">
          <div class="ch-badge">Anunciante Destacado</div>
          <div class="ch-card-title">${ad.title}</div>
          <div class="ch-card-subtitle">${ad.subtitle}</div>
        </div>

        <div class="ch-card-body">
          <p class="ch-card-text">${ad.body}</p>

          <div class="ch-stats-row">
            <div class="ch-stat">
              <div class="ch-stat-num">10,200+</div>
              <div class="ch-stat-label">Visitas mensuales</div>
            </div>
            <div class="ch-stat">
              <div class="ch-stat-num">LMD</div>
              <div class="ch-stat-label">Público objetivo</div>
            </div>
            <div class="ch-stat">
              <div class="ch-stat-num">Precio</div>
              <div class="ch-stat-label">Negociable</div>
            </div>
          </div>

          <a id="ch-ads-wa" href="${waUrl}" target="_blank" rel="noopener">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.534 5.857L.057 23.776a.5.5 0 0 0 .612.612l5.968-1.488A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 0 1-5.073-1.383l-.361-.214-3.742.934.951-3.696-.235-.38A9.956 9.956 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            Contactar por WhatsApp
          </a>

          <label class="ch-noshowrow">
            <input type="checkbox" id="ch-noshow-chk">
            <span class="ch-check-custom"></span>
            <span class="ch-noshow-label">No mostrar más este anuncio</span>
          </label>
        </div>

        <div class="ch-card-footer">${ad.footer}</div>
      </div>
    `;

    return overlay;
  }

  // ── Close with animation then reveal button ─────────────────────
  function closePopup(overlay, noShow) {
    if (noShow) setDismissed();

    // Restaurar scroll del body
    document.body.style.overflow = '';
    document.body.style.touchAction = '';

    overlay.classList.add('ch-closing');
    overlay.addEventListener('animationend', () => {
      overlay.remove();
      const adsBtn = document.getElementById('ch-ads-btn');
      if (adsBtn) adsBtn.style.pointerEvents = 'auto';
    }, { once: true });
  }

  // ── Bloquear scroll del fondo ────────────────────────────────────
  function lockScroll() {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }

  // ── Open ads panel (from button) ────────────────────────────────
  function openAdsPanel() {
    if (document.getElementById('ch-ads-overlay')) return;
    const overlay = buildPopup();
    document.body.appendChild(overlay);
    lockScroll();

    overlay.querySelector('#ch-ads-close').addEventListener('click', () => {
      const noShow = overlay.querySelector('#ch-noshow-chk').checked;
      closePopup(overlay, noShow);
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePopup(overlay, false);
    });
  }

  // ── Init ────────────────────────────────────────────────────────
  function init() {
    injectAdsButton();

    // If user dismissed forever, just show button immediately
    if (isDismissed()) {
      const btn = document.getElementById('ch-ads-btn');
      if (btn) {
        setTimeout(() => {
          btn.style.pointerEvents = 'auto';
          btn.style.pointerEvents = 'auto';
        }, 800);
      }
      return;
    }

    // Show popup after a short delay for better UX
    setTimeout(() => {
      const overlay = buildPopup();
      document.body.appendChild(overlay);
      lockScroll();

      overlay.querySelector('#ch-ads-close').addEventListener('click', () => {
        const noShow = overlay.querySelector('#ch-noshow-chk').checked;
        closePopup(overlay, noShow);
      });
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePopup(overlay, false);
      });
    }, 1800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

