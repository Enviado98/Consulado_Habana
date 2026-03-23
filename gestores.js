/* ================================================================
   GESTORES — script público
   Carga perfiles aprobados desde Supabase.
   Si no hay ninguno, muestra tarjeta molde + formulario de solicitud.
   ================================================================ */

const SUPABASE_URL  = 'https://fgxhubohavfvhadqzwbe.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZneGh1Ym9oYXZmdmhhZHF6d2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjU2NzQsImV4cCI6MjA4ODE0MTY3NH0.Pu_rV5UU2Do2dcsT71Gi1aBhmlmD5JQUkB3ZYQyZplo';
const BUCKET        = 'logos-gestores';

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function gcToggleDesc(btn) {
  const p = document.getElementById(btn.dataset.target);
  if (!p) return;
  const expanded = p.classList.toggle('expanded');
  btn.textContent = expanded ? 'Ver menos' : 'Ver más';
  btn.dataset.expanded = expanded ? 'true' : 'false';
}

const WA_ICON = `<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.534 5.857L.057 23.776a.5.5 0 0 0 .612.612l5.968-1.488A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 0 1-5.073-1.383l-.361-.214-3.742.934.951-3.696-.235-.38A9.956 9.956 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>`;

let sb;
function initSB() {
  const { createClient } = window.supabase;
  sb = createClient(SUPABASE_URL, SUPABASE_ANON);
}

// ── Paleta de colores premium (estilo tarjetas de presentación) ─────
const PREMIUM_PALETTE = [
  { color: '#7B6CF6', light: 'rgba(123,108,246,0.09)' },  // Violeta suave
  { color: '#5B8AF5', light: 'rgba(91,138,245,0.09)'  },  // Azul índigo
  { color: '#E06B8B', light: 'rgba(224,107,139,0.09)' },  // Rosa frambuesa
  { color: '#4AACCA', light: 'rgba(74,172,202,0.09)'  },  // Teal sereno
  { color: '#9B6EC8', light: 'rgba(155,110,200,0.09)' },  // Púrpura medio
  { color: '#4AAF82', light: 'rgba(74,175,130,0.09)'  },  // Verde esmeralda
  { color: '#D4875A', light: 'rgba(212,135,90,0.09)'  },  // Terracota cálido
  { color: '#5A7FC4', light: 'rgba(90,127,196,0.09)'  },  // Azul cobalto
];

// Paleta placeholder
const PLACEHOLDER_COLOR = { color: '#8878C8', light: 'rgba(136,120,200,0.09)' };

function pickCardColor(index) {
  return PREMIUM_PALETTE[index % PREMIUM_PALETTE.length];
}

// ── Build a profile card ────────────────────────────────────────────
let cardIndex = 0;

function buildCard(g, isPlaceholder = false) {
  const cardIdx = cardIndex;
  const card = document.createElement('div');
  card.className = 'gc-card' + (isPlaceholder ? ' gc-card-placeholder' : '');

  const palette = isPlaceholder ? PLACEHOLDER_COLOR : pickCardColor(cardIndex++);

  // Darkened version of color for contact strip
  const colorDark = `color-mix(in srgb, ${palette.color} 80%, black 20%)`;

  const logoHtml = (isPlaceholder || !g.logo_url)
    ? `<div class="gc-avatar-icon"><svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="42" height="42"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>`
    : `<img src="${g.logo_url}" alt="${g.nombre}" loading="lazy">`;

  const nombre = isPlaceholder ? 'Nombre del Gestor'            : g.nombre;
  const rol    = isPlaceholder ? 'Especialidad · Área de servicio' : (g.rol || 'Profesional verificado');
  const desc   = isPlaceholder
    ? 'Aquí aparecerá la descripción de los servicios que ofrece este profesional. Citas consulares, LMD, legalizaciones, asesoría jurídica y mucho más.'
    : g.descripcion;

  const wa       = isPlaceholder ? null : g.whatsapp?.replace(/\D/g,'');
  const email    = g?.email    || null;
  const prov     = g?.provincia || null;
  const pais     = g?.pais      || null;
  const waUrl    = wa ? `https://wa.me/${wa}?text=${encodeURIComponent('Hola, te contacto desde ConsulHabana')}` : null;
  const location = [prov, pais].filter(Boolean).join(', ');

  // Contact strip rows (texto completo igual que la imagen de referencia)
  let contactRows = '';
  if (!isPlaceholder) {
    if (wa) contactRows += `
      <div class="gc-contact-item">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.534 5.857L.057 23.776a.5.5 0 0 0 .612.612l5.968-1.488A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 0 1-5.073-1.383l-.361-.214-3.742.934.951-3.696-.235-.38A9.956 9.956 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
        WhatsApp: +${wa}
      </div>`;
    if (location) contactRows += `
      <div class="gc-contact-item">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
        ${location}
      </div>`;
    if (email) contactRows += `
      <div class="gc-contact-item">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        ${email}
      </div>`;
  }

  const verifiedBadge = `<div class="gc-verified-badge">
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    Verificado</div>`;

  card.style.setProperty('--gc-color', palette.color);

  card.innerHTML = `
    <div class="gc-card-inner">
      <div class="gc-card-top">
        <div class="gc-avatar-float">${logoHtml}</div>
        <div class="gc-card-info">
          <div class="gc-name${isPlaceholder ? ' gc-name-muted' : ''}">${nombre}</div>
          <div class="gc-rol${isPlaceholder ? ' gc-name-muted' : ''}">${rol}</div>
          ${contactRows ? `<div class="gc-contact-strip">${contactRows}</div>` : ''}
        </div>
        ${isPlaceholder ? '<div class="gc-placeholder-label">Ejemplo de perfil</div>' : verifiedBadge}
      </div>
      <div class="gc-card-body">
        ${isPlaceholder
          ? `<p class="gc-desc gc-desc-muted">${desc}</p>`
          : `<p class="gc-desc" id="gc-desc-${cardIdx}">${escapeHtml(desc)}</p>
             <button class="gc-ver-mas-btn" data-target="gc-desc-${cardIdx}" onclick="gcToggleDesc(this)">Ver más</button>`
        }
        ${isPlaceholder
          ? `<button class="gc-add-cta-btn" id="gc-open-form-btn">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
               Publicar mi perfil aquí
             </button>`
          : `<a class="gc-wa-btn" href="${waUrl}" target="_blank" rel="noopener">
               ${WA_ICON} Contactar por WhatsApp
             </a>`
        }
      </div>
    </div>
  `;
  if (isPlaceholder) {
    card.querySelector('#gc-open-form-btn')
        .addEventListener('click', () => document.getElementById('gc-form-overlay').classList.add('active'));
  }
  return card;
}

// ── Caché en memoria: 3 minutos ─────────────────────────────────────
const CACHE_TTL = 3 * 60 * 1000;
let gestoresCache = null;
let gestoresCacheTime = 0;

function renderGestoresSkeleton(grid) {
  const skCard = () => `
    <div class="gc-card-skeleton">
      <div class="sk-top"><div class="sk-avatar-circle"></div><div class="sk-name-dk"></div><div class="sk-rol-dk"></div></div>
      <div class="sk-body"><div class="sk-line skeleton"></div><div class="sk-line skeleton" style="width:85%"></div><div class="sk-line skeleton" style="width:70%"></div><div class="sk-btn skeleton"></div></div>
    </div>`;
  grid.innerHTML = skCard() + skCard();
}

// ── Load & render profiles ──────────────────────────────────────────
async function loadGestores() {
  const grid = document.getElementById('gc-grid');
  if (!grid) return;

  // Devolver caché si es reciente (menos de 3 min)
  if (gestoresCache && (Date.now() - gestoresCacheTime) < CACHE_TTL) return;

  renderGestoresSkeleton(grid);

  const { data, error } = await sb
    .from('gestores')
    .select('*')
    .eq('estado', 'aprobado')
    .order('created_at', { ascending: true });

  grid.innerHTML = '';
  cardIndex = 0; // reset color counter

  const list = (!error && data && data.length > 0) ? data : [];

  // Guardar en caché
  gestoresCache = list;
  gestoresCacheTime = Date.now();

  if (list.length === 0) {
    grid.appendChild(buildCard(null, true));
  } else {
    list.forEach(g => grid.appendChild(buildCard(g, false)));
    // Botón al final del scroll, fluye con las tarjetas
    const cta = document.createElement('div');
    cta.className = 'gc-add-cta';
    cta.innerHTML = `<button class="gc-add-cta-btn" id="gc-open-form-btn2">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Publicar mi perfil aquí
    </button>`;
    cta.querySelector('#gc-open-form-btn2')
       .addEventListener('click', () => { resetForm(); document.getElementById('gc-form-overlay').classList.add('active'); });
    grid.appendChild(cta);
  }
}

// ── Upload image (graceful fallback if bucket missing) ──────────────
// ── Upload blob comprimido a Supabase Storage ───────────────────────
async function uploadLogo(blob) {
  if (!blob) return null;
  const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const { data, error } = await sb.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
  if (error) {
    const msg = error.message || '';
    if (msg.includes('Bucket not found') || msg.includes('bucket'))
      throw new Error('El bucket "logos-gestores" no está configurado en Supabase Storage.');
    if (msg.includes('row-level') || msg.includes('policy') || msg.includes('403'))
      throw new Error('Sin permisos para subir imágenes. Revisa las políticas del bucket.');
    throw new Error('Error subiendo imagen: ' + msg);
  }
  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}

// ══════════════════════════════════════════════════════
//  COMPRESIÓN DE IMAGEN CON CANVAS → ~60 KB
// ══════════════════════════════════════════════════════
function compressImageTo60KB(file) {
  return new Promise((resolve, reject) => {
    const MAX_BYTES = 60 * 1024;
    const MAX_DIM   = 400;
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > height) {
        if (width > MAX_DIM) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM; }
      } else {
        if (height > MAX_DIM) { width = Math.round(width * MAX_DIM / height); height = MAX_DIM; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      let quality = 0.82;
      const tryCompress = () => {
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error('No se pudo comprimir la imagen.')); return; }
          if (blob.size <= MAX_BYTES || quality <= 0.1) { resolve(blob); }
          else { quality = Math.max(0.1, quality - 0.08); tryCompress(); }
        }, 'image/jpeg', quality);
      };
      tryCompress();
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')); };
    img.src = url;
  });
}

// ══════════════════════════════════════════════════════
//  FORMULARIO 3 PASOS
// ══════════════════════════════════════════════════════
let currentStep   = 1;
let compressedBlob = null;

function goToStep(next, direction = 'forward') {
  const cur = document.getElementById(`gc-step-${currentStep}`);
  const tgt = document.getElementById(`gc-step-${next}`);
  if (!cur || !tgt) return;
  cur.classList.remove('active');
  tgt.classList.remove('back-anim');
  if (direction === 'back') tgt.classList.add('back-anim');
  tgt.classList.add('active');
  currentStep = next;
  document.querySelectorAll('.gc-step-item').forEach(el => {
    const n = parseInt(el.dataset.step);
    el.classList.toggle('active', n === next);
    el.classList.toggle('done',   n < next);
  });
  document.getElementById('gc-form-sheet')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function setStepStatus(step, msg) {
  const el = document.getElementById(`gc-status-${step}`);
  if (!el) return;
  el.textContent = msg;
  el.className = 'gc-form-status' + (msg ? ' error' : '');
}

function validateStep1() {
  if (!document.getElementById('gc-f-nombre').value.trim()) { setStepStatus(1, 'El nombre es obligatorio.'); return false; }
  if (!document.getElementById('gc-f-desc').value.trim())   { setStepStatus(1, 'La descripción es obligatoria.'); return false; }
  setStepStatus(1, ''); return true;
}

function validateStep2() {
  const wa = document.getElementById('gc-f-wa').value.trim().replace(/\D/g,'');
  if (!wa || wa.length < 7) { setStepStatus(2, 'Introduce un número de WhatsApp válido.'); return false; }
  setStepStatus(2, ''); return true;
}

async function submitGestor() {
  const btn = document.getElementById('gc-submit-btn');
  setStepStatus(3, '');
  const nombre    = document.getElementById('gc-f-nombre').value.trim();
  const desc      = document.getElementById('gc-f-desc').value.trim();
  const wa        = document.getElementById('gc-f-wa').value.trim().replace(/\D/g,'');
  const rol       = document.getElementById('gc-f-rol').value.trim();
  const email     = document.getElementById('gc-f-email').value.trim();
  const provincia = document.getElementById('gc-f-provincia').value.trim();
  const pais      = document.getElementById('gc-f-pais').value.trim();

  btn.disabled = true;
  let logo_url = null;

  if (compressedBlob) {
    try {
      btn.textContent = 'Subiendo imagen…';
      logo_url = await uploadLogo(compressedBlob);
    } catch (err) {
      const cont = confirm(err.message + '\n\n¿Deseas enviar la solicitud sin imagen?');
      if (!cont) {
        btn.disabled = false;
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Enviar solicitud`;
        setStepStatus(3, err.message);
        return;
      }
    }
  }

  btn.textContent = 'Guardando…';
  const { error } = await sb.from('gestores').insert([{
    nombre, descripcion: desc, whatsapp: wa, rol,
    email: email || null, provincia: provincia || null, pais: pais || null,
    logo_url, estado: 'pendiente'
  }]);

  if (error) {
    btn.disabled = false;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Enviar solicitud`;
    setStepStatus(3, 'Error: ' + (error.message || 'Intenta de nuevo.'));
    return;
  }

  // Éxito
  document.getElementById('gc-form-inner').innerHTML = `
    <div class="gc-form-success">
      <div class="gc-success-icon">✓</div>
      <h3>¡Solicitud enviada!</h3>
      <p>Revisaremos tu perfil y lo publicaremos pronto.<br>Te contactaremos por WhatsApp al <strong>+${wa}</strong>.</p>
      <button class="gc-btn-submit" style="margin-top:22px;max-width:220px;margin-inline:auto"
        onclick="document.getElementById('gc-form-overlay').classList.remove('active')">
        Cerrar
      </button>
    </div>`;
}

function resetForm() {
  currentStep = 1; compressedBlob = null;
  ['gc-f-nombre','gc-f-rol','gc-f-desc','gc-f-wa','gc-f-email','gc-f-provincia','gc-f-pais']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const preview = document.getElementById('gc-logo-preview');
  if (preview) preview.src = '';
  document.getElementById('gc-preview-wrap')?.classList.remove('show');
  const zone = document.getElementById('gc-img-zone');
  if (zone) zone.style.display = '';
  const cnt = document.getElementById('gc-desc-count');
  if (cnt) cnt.textContent = '0';
  [1,2,3].forEach(n => setStepStatus(n, ''));
  document.querySelectorAll('.gc-step-panel').forEach((p, i) => {
    p.classList.toggle('active', i === 0); p.classList.remove('back-anim');
  });
  document.querySelectorAll('.gc-step-item').forEach((el, i) => {
    el.classList.toggle('active', i === 0); el.classList.remove('done');
  });
  const btn = document.getElementById('gc-submit-btn');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Enviar solicitud`;
  }
}

// ── Init ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSB();

  // Abrir overlay → reset (botón dentro de la tarjeta placeholder)
  document.querySelectorAll('#gc-open-form-btn').forEach(b =>
    b?.addEventListener('click', resetForm)
  );

  // Cerrar overlay
  document.getElementById('gc-form-close')?.addEventListener('click', () =>
    document.getElementById('gc-form-overlay').classList.remove('active')
  );
  document.getElementById('gc-form-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
  });

  // Paso 1 → 2
  document.getElementById('gc-btn-1-next')?.addEventListener('click', () => {
    if (validateStep1()) goToStep(2);
  });
  // Paso 2 ← → 3
  document.getElementById('gc-btn-2-back')?.addEventListener('click', () => goToStep(1, 'back'));
  document.getElementById('gc-btn-2-next')?.addEventListener('click', () => {
    if (validateStep2()) goToStep(3);
  });
  // Paso 3 ←  Enviar
  document.getElementById('gc-btn-3-back')?.addEventListener('click', () => goToStep(2, 'back'));
  document.getElementById('gc-submit-btn')?.addEventListener('click', submitGestor);

  // Contador descripción
  document.getElementById('gc-f-desc')?.addEventListener('input', e => {
    const cnt = document.getElementById('gc-desc-count');
    if (cnt) { const len = e.target.value.length; cnt.textContent = len; cnt.style.color = len > 1800 ? "var(--red)" : ""; }
  });

  // Selección + compresión de imagen
  document.getElementById('gc-f-logo')?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const zone    = document.getElementById('gc-img-zone');
    const preview = document.getElementById('gc-logo-preview');
    const wrap    = document.getElementById('gc-preview-wrap');
    const info    = document.getElementById('gc-img-info');
    zone.style.display = 'none';
    wrap.classList.add('show');
    info.innerHTML = 'Comprimiendo imagen…';
    compressedBlob = null;
    try {
      const blob = await compressImageTo60KB(file);
      compressedBlob = blob;
      const reader = new FileReader();
      reader.onload = ev => { preview.src = ev.target.result; };
      reader.readAsDataURL(blob);
      info.innerHTML = `Imagen lista · <strong>${(blob.size/1024).toFixed(1)} KB ✓</strong>`;
    } catch (err) {
      info.innerHTML = `<span style="color:var(--red)">${err.message}</span>`;
    }
  });

  // Cargar perfiles al activar tab
  document.querySelector('[data-tab="view-expertos"]')
    ?.addEventListener('click', () => loadGestores());
});

