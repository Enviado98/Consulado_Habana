// news_script.js - VERSIÓN FINAL Y LIMPIA: LÓGICA DE TIEMPO Y COMENTARIOS RECIENTES

// ---------------------------------------------------------------------------------------------
// --- CONFIGURACIÓN DE SUPABASE (POSTGRESQL BAAS) ---
// POR FAVOR, REEMPLAZA ESTAS CLAVES CON LAS TUYAS REALES DE SUPABASE
const SUPABASE_URL = "https://ekkaagqovdmcdexrjosh.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2FhZ3FvdmRtY2RleHJqb3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NjU2NTEsImV4cCI6MjA3NTQ0MTY1MX0.mmVl7C0Hkzrjoks7snvHWMYk-ksSXkUWzVexhtkozRA"; 
// ----------------------------------------------------

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// ---------------------------------------------------------------------------------------------


// --- VARIABLES GLOBALES y DOM ELEMENTS ---
let isAdminMode = false;
let newsData = []; 

const newsBannersContainer = document.getElementById('newsBannersContainer');
const toggleNewsAdminBtn = document.getElementById('toggleNewsAdminBtn');
const newsAdminPanel = document.getElementById('newsAdminPanel');
const bannerCreationSection = document.getElementById('bannerCreationSection');
const addBannerBtn = document.getElementById('addBannerBtn');
const publishBannerBtn = document.getElementById('publishBannerBtn');
const cancelBannerBtn = document.getElementById('cancelBannerBtn');
const exitAdminBtn = document.getElementById('exitAdminBtn'); 


// ---------------------------------------------------------------------------------------------
// --- FUNCIONES AUXILIARES DE ESTILO Y TIEMPO ---

/**
 * Genera un color de fondo aleatorio bonito.
 */
function getRandomColor() {
    const colors = [
        '#2ecc71', '#3498db', '#9b59b6', '#34495e', '#e67e22', '#e74c3c', '#1abc9c', '#f39c12'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Genera un color de texto determinista basado en el nombre (siempre el mismo color para el mismo nombre).
 */
function getRandomNameColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
        '#00bcd4', '#4caf50', '#ff9800', '#2196f3', '#9c27b0', '#f44336'
    ];
    return colors[Math.abs(hash) % colors.length];
}

/**
 * Calcula el tiempo transcurrido en formato "hace X tiempo".
 */
function timeSince(dateString) {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return `hace ${interval} años`;

    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return `hace ${interval} meses`;

    interval = Math.floor(seconds / 86400);
    if (interval > 1) return `hace ${interval} días`;

    interval = Math.floor(seconds / 3600);
    if (interval > 1) return `hace ${interval} horas`;

    interval = Math.floor(seconds / 60);
    if (interval > 1) return `hace ${interval} minutos`;

    return `hace ${Math.floor(seconds)} segundos`;
}

/**
 * Convierte el texto simple en HTML, detectando URLs y creando enlaces clickeables.
 */
function linkify(text) {
    const urlRegex = /(\b(https?:\/\/[^\s]+|www\.[^\s]+)\b)/g;
    let linkedText = text.replace(urlRegex, function(url) {
        let fullURL = url.match(/^https?:\/\//i) ? url : 'http://' + url;
        return `<a href="${fullURL}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
    return linkedText.replace(/\n/g, '<br>');
}

// ---------------------------------------------------------------------------------------------
// --- RENDERIZADO DE ELEMENTOS ---

/**
 * Crea el HTML para un comentario específico con el nuevo formato.
 */
function createCommentHtml(comment, bannerId) {
    const likeKey = `like_${comment.id}`; 
    const isLiked = localStorage.getItem(likeKey) === 'true';
    const likeClass = isLiked ? 'liked' : '';
    const nameColor = getRandomNameColor(comment.commenter_name);
    const timeText = timeSince(comment.created_at);

    return `
        <div class="comment-item" data-comment-id="${comment.id}">
            <p style="margin: 0;">
                <strong style="color: ${nameColor};">${comment.commenter_name} dijo:</strong>
                <span style="font-size: 0.75em; color: #888; float: right;">
                    ${timeText}
                </span>
            </p>
            <div class="comment-text-wrap">
                ${comment.comment_text}
            </div>
            <div style="text-align: right;">
                <button class="like-btn ${likeClass}" data-comment-id="${comment.id}" data-banner-id="${bannerId}">
                    ❤️ ${comment.likes || 0}
                </button>
            </div>
        </div>
    `;
}

/**
 * Crea el HTML completo para una pancarta de noticias.
 */
function createBannerHtml(banner) {
    const formattedContent = linkify(banner.content);
    const comments = banner.comments || [];
    
    // El comentario más reciente es el primero (ordenado DESC en loadBanners)
    const mostRecentCommentHtml = comments.length > 0 ? createCommentHtml(comments[0], banner.id) : '';
    
    // Los comentarios a desplegar son todos menos el más reciente
    const commentsToExpand = comments.slice(1); 
    const otherCommentsHtml = commentsToExpand.map(comment => createCommentHtml(comment, banner.id)).join('');

    // Tag de tiempo de la pancarta (color aleatorio)
    const bannerTime = timeSince(banner.created_at);
    const timeTagColor = getRandomColor();

    // Calculamos cuántos comentarios "más" se mostrarían al hacer clic
    const commentsToExpandCount = comments.length > 1 ? comments.length - 1 : 0;
    
    let viewMoreButton;
    if (commentsToExpandCount > 0) {
        viewMoreButton = `<button class="view-comments-btn" data-banner-id="${banner.id}" data-expanded="false">Ver ${commentsToExpandCount} comentarios más... </button>`;
    } else if (comments.length === 1) {
        viewMoreButton = `Último comentario.`;
    } else {
        viewMoreButton = `Sé el primero en comentar.`;
    }

    const bannerElement = document.createElement('article');
    bannerElement.className = 'news-banner';
    bannerElement.dataset.id = banner.id;
    bannerElement.style.backgroundColor = banner.color;

    bannerElement.innerHTML = `
        <button class="delete-banner-btn" style="display:${isAdminMode ? 'block' : 'none'};" data-id="${banner.id}">×</button>
        
        <div class="banner-content-wrap">
            <h2 class="banner-title">${banner.title}</h2>
            <div class="banner-text">${formattedContent}</div>

            <div class="time-elapsed-tag" style="background-color: ${timeTagColor};">
                ${bannerTime}
            </div>

            <div class="banner-footer">
                <div class="comment-controls">
                    ${viewMoreButton}
                </div>

                <div id="comments-list-${banner.id}" class="comments-list">
                    ${otherCommentsHtml}
                </div>
                
                ${mostRecentCommentHtml} 

                <div class="comment-form">
                    <input type="text" placeholder="Tu Nombre" required maxlength="30" class="commenter-name-input" data-banner-id="${banner.id}">
                    <textarea placeholder="Comentario (máx. 250)" required maxlength="250" class="comment-text-input" data-banner-id="${banner.id}"></textarea>
                    <button class="publish-comment-btn" data-banner-id="${banner.id}">Comentar</button>
                </div>
            </div>
        </div>
    `;

    newsBannersContainer.appendChild(bannerElement);
}

/**
 * Carga todas las pancartas y sus comentarios desde Supabase.
 */
async function loadBannersAndComments() {
    try {
        newsBannersContainer.innerHTML = '<p style="text-align: center; color: var(--color-texto-secundario); margin: 30px;">Cargando noticias destacadas...</p>';

        let { data, error } = await supabase
            .from('news_banners')
            .select(`
                id,
                title,
                content,
                color,
                created_at,
                comments:banner_comments (
                    id,
                    commenter_name,
                    comment_text,
                    likes,
                    created_at
                )
            `)
            .order('created_at', { ascending: false }); 

        if (error) throw error;
        
        // CRÍTICO: Ordenar los comentarios dentro de cada banner por su fecha de creación (DESCENDENTE: MÁS RECIENTE PRIMERO)
        newsData = data.map(banner => {
            if (banner.comments) {
                banner.comments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }
            return banner;
        });

        renderAllBanners();

    } catch (e) {
        console.error('Error al cargar datos desde Supabase:', e);
        newsBannersContainer.innerHTML = '<p style="text-align: center; color: red; margin: 30px;">Error al conectar con la base de datos.</p>';
    }
}

/**
 * Renderiza todas las pancartas cargadas en newsData.
 */
function renderAllBanners() {
    newsBannersContainer.innerHTML = ''; 
    
    if (newsData.length === 0) {
        newsBannersContainer.innerHTML = '<p style="text-align: center; color: #777; margin: 30px;">Aún no hay noticias destacadas.</p>';
        return;
    }
    
    newsData.forEach(createBannerHtml);
}

// ---------------------------------------------------------------------------------------------
// --- HANDLERS DE EVENTOS (PERSISTENCIA Y LÓGICA DE BOTONES) ---

function toggleAdminMode(forceExit = false) {
    if (forceExit) {
        isAdminMode = false;
    } else {
        isAdminMode = !isAdminMode;
    }
    
    newsAdminPanel.style.display = isAdminMode ? 'flex' : 'none';
    
    if (!isAdminMode) {
        toggleNewsAdminBtn.style.display = 'block';
        toggleNewsAdminBtn.textContent = '🛡️ ACTIVAR EDICIÓN';
        toggleNewsAdminBtn.classList.remove('active');
    } else {
        toggleNewsAdminBtn.style.display = 'none';
        toggleNewsAdminBtn.classList.add('active');
    }

    document.querySelectorAll('.delete-banner-btn').forEach(btn => {
        btn.style.display = isAdminMode ? 'block' : 'none';
    });
    
    if (!isAdminMode) {
        bannerCreationSection.style.display = 'none';
    }
}

function toggleCommentsList(bannerId, btn) {
    const list = document.getElementById(`comments-list-${bannerId}`);
    const isExpanded = btn.dataset.expanded === 'true';
    
    const banner = newsData.find(b => b.id === bannerId);
    const totalComments = banner.comments ? banner.comments.length : 0;
    const commentsToExpandCount = totalComments > 1 ? totalComments - 1 : 0;

    if (isExpanded) {
        list.classList.remove('expanded');
        btn.dataset.expanded = 'false';
        if (commentsToExpandCount > 0) {
            btn.textContent = `Ver ${commentsToExpandCount} comentarios más... `;
        }
    } else {
        list.classList.add('expanded');
        btn.dataset.expanded = 'true';
        btn.textContent = 'Ocultar comentarios';
    }
}


async function publishNewBanner() {
    const title = document.getElementById('bannerTitle').value.trim();
    const content = document.getElementById('bannerContent').value.trim();

    if (title.length < 5 || content.length < 10) {
        alert('El título debe tener al menos 5 caracteres y el contenido al menos 10.');
        return;
    }

    const newBanner = {
        title: title,
        content: content,
        color: getRandomColor(),
    };

    const { error } = await supabase
        .from('news_banners')
        .insert([newBanner]);

    if (error) {
        console.error('Error al insertar pancarta:', error);
        alert('Error al publicar la pancarta. Revisa la consola.');
        return;
    }

    alert('Pancarta publicada con éxito!');
    document.getElementById('bannerTitle').value = '';
    document.getElementById('bannerContent').value = '';
    bannerCreationSection.style.display = 'none';
    
    await loadBannersAndComments(); 
}

async function deleteBanner(bannerId) {
    if (!isAdminMode || !confirm('¿Estás seguro de que deseas eliminar esta pancarta de forma permanente? Esto eliminará todos los comentarios asociados.')) {
        return;
    }

    const { error } = await supabase
        .from('news_banners')
        .delete()
        .eq('id', bannerId); 

    if (error) {
        console.error('Error al eliminar pancarta:', error);
        alert('Error al eliminar. Revisa la consola.');
        return;
    }

    alert('Pancarta eliminada.');
    await loadBannersAndComments(); 
}

async function publishComment(bannerId, name, text, nameInput, textInput) {
    if (name.length < 2 || text.length < 5) {
        alert('Por favor, ingresa tu nombre y un comentario de al menos 5 caracteres.');
        return;
    }

    const newComment = {
        banner_id: bannerId,
        commenter_name: name,
        comment_text: text,
    };

    const { error } = await supabase
        .from('banner_comments')
        .insert([newComment]);

    if (error) {
        console.error('Error al insertar comentario:', error);
        alert('Error al comentar. Revisa la consola.');
        return;
    }

    alert('Comentario publicado.');
    nameInput.value = '';
    textInput.value = '';
    
    await loadBannersAndComments(); 
}

async function toggleCommentLike(commentId, btn) {
    const likeKey = `like_${commentId}`;
    const isLiked = localStorage.getItem(likeKey) === 'true';

    const currentLikesText = btn.textContent.split(' ')[1];
    const currentLikes = parseInt(currentLikesText) || 0;
    let newLikes = currentLikes;

    if (isLiked) {
        newLikes = Math.max(0, currentLikes - 1);
        localStorage.removeItem(likeKey);
    } else {
        newLikes = currentLikes + 1;
        localStorage.setItem(likeKey, 'true');
    }

    const { error } = await supabase
        .from('banner_comments')
        .update({ likes: newLikes })
        .eq('id', commentId);

    if (error) {
        if (isLiked) {
             localStorage.setItem(likeKey, 'true');
        } else {
             localStorage.removeItem(likeKey);
        }
        console.error('Error al actualizar like:', error);
        alert('Error al dar/quitar like. Intenta de nuevo.');
        return;
    }
    
    btn.classList.toggle('liked', !isLiked);
    btn.innerHTML = `❤️ ${newLikes}`;
}

// ---------------------------------------------------------------------------------------------
// --- INICIALIZACIÓN Y LISTENERS ---

document.addEventListener('DOMContentLoaded', () => {
    
    loadBannersAndComments();
    
    toggleNewsAdminBtn.addEventListener('click', () => toggleAdminMode());
    
    if (exitAdminBtn) {
        exitAdminBtn.addEventListener('click', () => toggleAdminMode(true));
    }

    addBannerBtn.addEventListener('click', () => {
        document.getElementById('bannerTitle').value = '';
        document.getElementById('bannerContent').value = '';
        bannerCreationSection.style.display = 'block';
    });
    cancelBannerBtn.addEventListener('click', () => {
        bannerCreationSection.style.display = 'none';
    });
    publishBannerBtn.addEventListener('click', publishNewBanner);
    
    newsBannersContainer.addEventListener('click', (e) => {
        
        if (e.target.classList.contains('delete-banner-btn')) {
            const bannerId = e.target.dataset.id;
            deleteBanner(bannerId);
        }
        
        if (e.target.classList.contains('publish-comment-btn')) {
            const bannerId = e.target.dataset.bannerId;
            const container = e.target.closest('.comment-form');
            const nameInput = container.querySelector('.commenter-name-input');
            const textInput = container.querySelector('.comment-text-input');
            
            publishComment(bannerId, nameInput.value.trim(), textInput.value.trim(), nameInput, textInput);
        }
        
        if (e.target.classList.contains('like-btn')) {
            const commentId = e.target.dataset.commentId;
            toggleCommentLike(commentId, e.target);
        }
        
        if (e.target.classList.contains('view-comments-btn')) {
            const bannerId = e.target.dataset.bannerId;
            toggleCommentsList(bannerId, e.target);
        }
    });
});
