// news_script.js - VERSIÓN FINAL CORREGIDA (LIKES PERSISTENTES)
// ----------------------------------------------------------------
const SUPABASE_URL = "https://mkvpjsvqjqeuniabjjwr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rdnBqc3ZxanFldW5pYWJqandyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTI0MzU0OCwiZXhwIjoyMDgwODE5NTQ4fQ.No4ZOo0sawF6KYJnIrSD2CVQd1lHzNlLSplQgfuHBcg";

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ----------------------------------------------------
// 🎨 PALETA DE COLORES NEÓN
// ----------------------------------------------------
const NEON_PALETTE = ['#00ffff', '#ff00ff', '#00ff00', '#ffff00', '#ff0099', '#9D00FF', '#FF4D00', '#00E5FF', '#76ff03', '#ff1744'];

function getBannerColor(id) {
    let hash = 0;
    const str = String(id);
    for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
    return NEON_PALETTE[Math.abs(hash) % NEON_PALETTE.length];
}

// ----------------------------------------------------------------
// ⚡ ESTADO Y DOM
// ----------------------------------------------------------------
let isAdmin = false;
const DOM = {
    container: document.getElementById('newsBannersContainer'),
    adminPanel: document.getElementById('newsAdminPanel'),
    toggleBtn: document.getElementById('toggleNewsAdminBtn'),
    formSection: document.getElementById('bannerCreationSection'),
    titleInput: document.getElementById('bannerTitle'),
    contentInput: document.getElementById('bannerContent'),
    exitBtn: document.getElementById('exitAdminBtn')
};

function formatTimestamp(timestamp) {
    if (!timestamp) return "Fecha desconocida";
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('es-ES', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit'
    }).format(date) + ' h';
}

function linkify(text) {
    return text.replace(/(\b(https?:\/\/|www\.)[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig, (url) => {
        let fullUrl = url.startsWith('http') ? url : 'http://' + url;
        return `<a href="${fullUrl}" target="_blank">${url}</a>`;
    });
}

// ----------------------------------------------------------------
// ⚙️ RENDERIZADO
// ----------------------------------------------------------------

function createBannerHTML(banner) {
    const neonColor = getBannerColor(banner.id);
    const isAdminDisplay = isAdmin ? '' : 'style="display:none;"';
    const commentsList = banner.comments || []; 
    const commentsCount = commentsList.length;
    const commentsHTML = createCommentsListHTML(commentsList);

    return `
    <div class="news-banner" data-id="${banner.id}">
        <div class="banner-header">
            <h3 class="banner-title" style="color: ${neonColor}; text-shadow: 0 0 10px ${neonColor}70">${banner.title}</h3>
            <p class="banner-date">Publicado: ${formatTimestamp(banner.created_at)}</p>
            <button class="delete-banner-btn" data-id="${banner.id}" ${isAdminDisplay}>X</button>
        </div>
        <div class="banner-text">${linkify(banner.content)}</div>
        
        <div class="banner-footer">
            <div class="comment-controls">
                <button class="toggle-comments-btn" data-id="${banner.id}" data-expanded="false">
                    💬 Ver ${commentsCount} Comentarios
                </button>
            </div>
            
            <div class="comments-list" id="comments-list-${banner.id}">
                ${commentsHTML}
            </div>

            <div class="comment-form">
                <input type="text" placeholder="Tu Nombre" class="commenter-name" data-id="${banner.id}" maxlength="30">
                <textarea placeholder="Escribe tu comentario..." class="comment-content" data-id="${banner.id}" maxlength="250"></textarea>
                <button class="pub-btn" data-id="${banner.id}">Publicar</button>
            </div>
        </div>
    </div>`;
}

function createCommentsListHTML(comments) {
    if (!comments || comments.length === 0) return `<p style="text-align: center; opacity: 0.8; margin: 10px;">Sé el primero en comentar.</p>`;
    const sorted = comments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return sorted.map((c, index) => {
        const isLiked = localStorage.getItem(`like_${c.id}`) === 'true';
        const likeClass = isLiked ? 'liked' : '';
        return `
            <div class="comment-item" style="display: ${index === 0 ? 'block' : 'none'};">
                <small>${formatTimestamp(c.created_at)}</small>
                <strong>${c.commenter_name}</strong>
                <p>${c.comment_text}</p>
                <button class="like-btn ${likeClass}" data-comment-id="${c.id}" ${isLiked ? 'disabled' : ''}>
                    <span class="heart">♥</span> <span class="like-count">${c.likes || 0}</span>
                </button>
            </div>`;
    }).join('');
}

// ----------------------------------------------------------------
// ⚡ LÓGICA DE BASE DE DATOS
// ----------------------------------------------------------------

async function loadBanners() {
    const { data, error } = await supabase
        .from('news_banners')
        .select(`
            *,
            comments:banner_comments(*)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error cargando datos:", error);
        return;
    }
    DOM.container.innerHTML = data.map(createBannerHTML).join('');
}

async function handleLike(btn) {
    const commentId = btn.dataset.commentId;
    
    // Si ya tiene el like guardado localmente, no hacemos nada
    if (localStorage.getItem(`like_${commentId}`)) return;

    // 1. Feedback visual inmediato
    const counter = btn.querySelector('.like-count');
    let currentLikes = parseInt(counter.textContent) || 0;
    counter.textContent = currentLikes + 1;
    btn.classList.add('liked');
    btn.disabled = true;

    // 2. Persistencia en navegador
    localStorage.setItem(`like_${commentId}`, 'true');

    // 3. Incremento REAL en la base de datos mediante función RPC
    const { error } = await supabase.rpc('increment_comment_likes', { comment_id: commentId });

    if (error) {
        console.error("Error al sincronizar like:", error);
        // Revertir en caso de error crítico de red
        btn.disabled = false;
        btn.classList.remove('liked');
        counter.textContent = currentLikes;
        localStorage.removeItem(`like_${commentId}`);
    }
}

async function handlePublish() {
    const title = DOM.titleInput.value.trim();
    const content = DOM.contentInput.value.trim();
    if (!title || !content || !isAdmin) return alert("Rellena los campos.");

    const btn = document.getElementById('publishBannerBtn');
    btn.disabled = true;

    const { error } = await supabase.from('news_banners').insert([{ title, content, color: '#000000' }]);
    
    btn.disabled = false;
    if (error) {
        console.error(error);
        alert("Error al publicar.");
    } else {
        DOM.titleInput.value = ''; DOM.contentInput.value = '';
        DOM.formSection.style.display = 'none';
        loadBanners();
    }
}

async function handleDelete(id) {
    if (!isAdmin || !confirm("¿Eliminar noticia?")) return;
    const { error } = await supabase.from('news_banners').delete().eq('id', id);
    if (!error) loadBanners();
}

async function handleComment(btn) {
    const bannerId = btn.dataset.id;
    const nameInput = document.querySelector(`.commenter-name[data-id="${bannerId}"]`);
    const contentInput = document.querySelector(`.comment-content[data-id="${bannerId}"]`);
    
    if (nameInput.value.length < 2 || contentInput.value.length < 2) return alert("Comentario muy corto.");

    btn.disabled = true;
    const { error } = await supabase.from('banner_comments').insert([{ 
        banner_id: bannerId, 
        commenter_name: nameInput.value, 
        comment_text: contentInput.value,
        likes: 0
    }]);
    
    if (error) {
        console.error(error);
        alert("Error al comentar.");
    } else {
        nameInput.value = ''; contentInput.value = '';
        loadBanners();
    }
    btn.disabled = false;
}

// ----------------------------------------------------------------
// 🛡️ INTERFAZ Y EVENTOS
// ----------------------------------------------------------------

function toggleComments(btn) {
    const list = document.getElementById(`comments-list-${btn.dataset.id}`);
    const isExpanded = btn.dataset.expanded === 'true';
    const items = list.querySelectorAll('.comment-item');
    list.classList.toggle('expanded', !isExpanded);
    btn.dataset.expanded = !isExpanded;
    items.forEach((item, index) => item.style.display = (!isExpanded || index === 0) ? 'block' : 'none');
    btn.textContent = !isExpanded ? `▲ Ocultar Comentarios` : `💬 Ver ${items.length} Comentarios`;
}

function toggleAdmin(forceExit = false) {
    isAdmin = forceExit ? false : !isAdmin;
    DOM.adminPanel.style.display = isAdmin ? 'flex' : 'none';
    DOM.toggleBtn.style.display = isAdmin ? 'none' : 'block';
    document.querySelectorAll('.delete-banner-btn').forEach(b => b.style.display = isAdmin ? 'flex' : 'none');
}

document.addEventListener('DOMContentLoaded', () => {
    loadBanners();
    DOM.toggleBtn.onclick = () => toggleAdmin();
    if (DOM.exitBtn) DOM.exitBtn.onclick = () => toggleAdmin(true);
    document.getElementById('addBannerBtn').onclick = () => DOM.formSection.style.display = 'block';
    document.getElementById('cancelBannerBtn').onclick = () => DOM.formSection.style.display = 'none';
    document.getElementById('publishBannerBtn').onclick = handlePublish;

    DOM.container.onclick = (e) => {
        const t = e.target.closest('button'); 
        if (!t) return;
        if (t.classList.contains('delete-banner-btn')) handleDelete(t.dataset.id);
        if (t.classList.contains('pub-btn')) handleComment(t);
        if (t.classList.contains('like-btn')) handleLike(t);
        if (t.classList.contains('toggle-comments-btn')) toggleComments(t);
    };
});
