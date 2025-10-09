// news_script.js - VERSION ACTUALIZADA CON SUPABASE

// ---------------------------------------------------------------------------------------------
// --- CONFIGURACIÓN DE SUPABASE ---
// Reutilizamos la configuración del proyecto original.
// Se asume que el SDK de Supabase está cargado en news.html
const SUPABASE_URL = "https://ekkaagqovdmcdexrjosh.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2FhZ3FvdmRtY2RleHJqb3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NjU2NTEsImV4cCI6MjA3NTQ0MTY1MX0.mmVl7C0Hkzrjoks7snvHWMYk-ksSXkUWzVexhtkozRA"; 
// ----------------------------------------------------

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// ---------------------------------------------------------------------------------------------


// --- VARIABLES GLOBALES y DOM ELEMENTS ---
let isAdminMode = false;
let newsData = []; // La data se cargará desde Supabase
const newsBannersContainer = document.getElementById('newsBannersContainer');
const toggleNewsAdminBtn = document.getElementById('toggleNewsAdminBtn');
const newsAdminPanel = document.getElementById('newsAdminPanel');
const bannerCreationSection = document.getElementById('bannerCreationSection');
const addBannerBtn = document.getElementById('addBannerBtn');
const publishBannerBtn = document.getElementById('publishBannerBtn');
const cancelBannerBtn = document.getElementById('cancelBannerBtn');


// ---------------------------------------------------------------------------------------------
// --- FUNCIONES AUXILIARES ---

/**
 * Genera un color de fondo pastel o vibrante aleatorio bonito.
 * @returns {string} Código de color hexadecimal.
 */
function getRandomColor() {
    const colors = [
        '#2ecc71', '#3498db', '#9b59b6', '#34495e', '#f1c40f',
        '#e67e22', '#e74c3c', '#1abc9c', '#f39c12', '#95a5a6'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Convierte el texto simple en HTML, detectando URLs y creando enlaces clickeables.
 * @param {string} text El texto original de la pancarta.
 * @returns {string} El texto formateado con enlaces.
 */
function linkify(text) {
    const urlRegex = /(\b(https?:\/\/[^\s]+|www\.[^\s]+)\b)/g;
    let linkedText = text.replace(urlRegex, function(url) {
        let fullURL = url;
        if (!url.match(/^https?:\/\//i)) {
            fullURL = 'http://' + url;
        }
        return `<a href="${fullURL}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
    return linkedText.replace(/\n/g, '<br>');
}

// ---------------------------------------------------------------------------------------------
// --- RENDERIZADO DE ELEMENTOS ---

/**
 * Crea el HTML para un comentario específico.
 * @param {object} comment - Objeto del comentario.
 * @param {string} bannerId - ID del banner al que pertenece.
 * @returns {string} HTML del comentario.
 */
function createCommentHtml(comment, bannerId) {
    // Usamos el ID del comentario para el like, ya que es único en Supabase
    const likeKey = `like_${comment.id}`; 
    const isLiked = localStorage.getItem(likeKey) === 'true';
    const likeClass = isLiked ? 'liked' : '';
    // Formato de fecha simplificado
    const date = new Date(comment.created_at).toLocaleDateString('es-ES'); 

    return `
        <div class="comment-item">
            <strong>${comment.commenter_name}</strong> (${date}): ${comment.comment_text}
            <div style="text-align: right; margin-top: 5px;">
                <button class="like-btn ${likeClass}" data-comment-id="${comment.id}" data-banner-id="${bannerId}">
                    ❤️ ${comment.likes || 0}
                </button>
            </div>
        </div>
    `;
}

/**
 * Crea el HTML completo para una pancarta de noticias.
 * @param {object} banner - Objeto del banner de noticias con sus comentarios.
 */
function createBannerHtml(banner) {
    // Usamos 'created_at' de Supabase
    const date = new Date(banner.created_at).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
    const formattedContent = linkify(banner.content);
    const comments = banner.comments || [];
    
    // Primer comentario visible (si existe)
    const firstComment = comments.length > 0 ? comments[0] : null;
    const initialCommentHtml = firstComment ? `<div class="comment-item first-comment"><strong>${firstComment.commenter_name}</strong>: ${firstComment.comment_text}</div>` : '';
    
    // El resto de los comentarios (incluyendo el primero para el despliegue)
    const otherCommentsHtml = comments.map(comment => createCommentHtml(comment, banner.id)).join('');

    const viewMoreButton = comments.length > 1 ? 
        `<button class="view-comments-btn" data-banner-id="${banner.id}" data-expanded="false">Ver ${comments.length - 1} comentarios más... </button>` :
        (comments.length === 1 ? 'Solo 1 comentario.' : 'Sé el primero en comentar.');


    const bannerElement = document.createElement('article');
    bannerElement.className = 'news-banner';
    bannerElement.dataset.id = banner.id;
    bannerElement.style.backgroundColor = banner.color;

    bannerElement.innerHTML = `
        <button class="delete-banner-btn" style="display:${isAdminMode ? 'block' : 'none'};" data-id="${banner.id}">×</button>
        <div class="banner-overlay"></div>
        <div class="banner-content-wrap">
            <h2 class="banner-title">${banner.title}</h2>
            <p class="banner-date">Publicado el: ${date}</p>
            <div class="banner-text">${formattedContent}</div>

            <div class="banner-footer">
                <div class="comment-controls">
                    ${viewMoreButton}
                </div>

                <div id="comments-list-${banner.id}" class="comments-list">
                    ${otherCommentsHtml}
                </div>
                ${initialCommentHtml}

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
        // Consultar news_banners, ordenando por fecha de creación descendente
        // y haciendo un join con banner_comments
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
            .order('created_at', { ascending: false }); // Ordenar pancartas por fecha

        if (error) throw error;
        
        // Ordenar los comentarios dentro de cada banner por su fecha de creación
        newsData = data.map(banner => {
            if (banner.comments) {
                banner.comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
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
    newsBannersContainer.innerHTML = ''; // Limpiar contenedor
    
    if (newsData.length === 0) {
        newsBannersContainer.innerHTML = '<p style="text-align: center; color: #777; margin: 30px;">Aún no hay noticias destacadas.</p>';
        return;
    }
    
    newsData.forEach(createBannerHtml);
}

// ---------------------------------------------------------------------------------------------
// --- HANDLERS DE EVENTOS (PERSISTENCIA CON SUPABASE) ---

/**
 * Alterna el modo edición de la página. (Manteniendo la lógica JS)
 */
function toggleAdminMode() {
    isAdminMode = !isAdminMode;
    
    newsAdminPanel.style.display = isAdminMode ? 'flex' : 'none';
    toggleNewsAdminBtn.textContent = isAdminMode ? '✅ MODO EDICIÓN ACTIVO' : '🛡️ MODO EDICIÓN DE NOTICIAS';
    toggleNewsAdminBtn.classList.toggle('active', isAdminMode);

    document.querySelectorAll('.delete-banner-btn').forEach(btn => {
        btn.style.display = isAdminMode ? 'block' : 'none';
    });
    
    if (!isAdminMode) {
        bannerCreationSection.style.display = 'none';
    }
}

/**
 * Muestra y oculta el formulario de creación de pancarta (Manteniendo la lógica JS)
 */
function showBannerCreationForm() {
    if (isAdminMode) {
        bannerCreationSection.style.display = 'block';
        document.getElementById('bannerTitle').value = '';
        document.getElementById('bannerContent').value = '';
    }
}
function hideBannerCreationForm() {
    bannerCreationSection.style.display = 'none';
}

/**
 * Publica una nueva pancarta de noticias en Supabase.
 */
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
    hideBannerCreationForm();
    await loadBannersAndComments(); // Recargar datos
}

/**
 * Elimina una pancarta de noticias de Supabase.
 * @param {string} bannerId - ID del banner a eliminar.
 */
async function deleteBanner(bannerId) {
    if (!isAdminMode || !confirm('¿Estás seguro de que deseas eliminar esta pancarta de forma permanente?')) {
        return;
    }

    const { error } = await supabase
        .from('news_banners')
        .delete()
        .eq('id', bannerId); // Donde el 'id' es igual al bannerId

    if (error) {
        console.error('Error al eliminar pancarta:', error);
        alert('Error al eliminar. Revisa la consola.');
        return;
    }

    alert('Pancarta eliminada.');
    await loadBannersAndComments(); // Recargar datos
}

/**
 * Maneja la publicación de un nuevo comentario en Supabase.
 */
async function publishComment(bannerId, name, text) {
    if (name.length < 2 || text.length < 5) {
        alert('Por favor, ingresa tu nombre y un comentario de al menos 5 caracteres.');
        return;
    }

    const newComment = {
        banner_id: bannerId,
        commenter_name: name,
        comment_text: text,
        likes: 0 // El default lo asigna el DB, pero lo enviamos por si acaso
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
    await loadBannersAndComments(); // Recargar datos para ver el nuevo comentario
}

/**
 * Maneja el evento de Like en un comentario (actualiza Supabase y localStorage).
 */
async function toggleCommentLike(commentId, btn) {
    const likeKey = `like_${commentId}`;
    const isLiked = localStorage.getItem(likeKey) === 'true';

    // 1. Determinar el cambio en likes
    const currentLikes = parseInt(btn.textContent.split(' ')[1]) || 0;
    let newLikes = currentLikes;

    if (isLiked) {
        newLikes = Math.max(0, currentLikes - 1);
    } else {
        newLikes = currentLikes + 1;
    }

    // 2. Actualizar el contador en Supabase
    const { error } = await supabase
        .from('banner_comments')
        .update({ likes: newLikes })
        .eq('id', commentId);

    if (error) {
        console.error('Error al actualizar like:', error);
        alert('Error al dar/quitar like. Intenta de nuevo.');
        return;
    }
    
    // 3. Actualizar localStorage y el DOM localmente
    if (isLiked) {
        localStorage.removeItem(likeKey);
        btn.classList.remove('liked');
    } else {
        localStorage.setItem(likeKey, 'true');
        btn.classList.add('liked');
    }
    btn.innerHTML = `❤️ ${newLikes}`;
}

/**
 * Alterna la visibilidad de todos los comentarios de un banner. (Manteniendo la lógica JS)
 */
function toggleCommentsList(bannerId, btn) {
    const list = document.getElementById(`comments-list-${bannerId}`);
    const isExpanded = btn.dataset.expanded === 'true';
    
    const banner = newsData.find(b => b.id === bannerId);

    if (isExpanded) {
        list.classList.remove('expanded');
        btn.dataset.expanded = 'false';
        btn.textContent = `Ver ${banner.comments.length - 1} comentarios más...`;
    } else {
        list.classList.add('expanded');
        btn.dataset.expanded = 'true';
        btn.textContent = 'Ocultar comentarios';
    }
}


// ---------------------------------------------------------------------------------------------
// --- INICIALIZACIÓN Y LISTENERS ---

document.addEventListener('DOMContentLoaded', () => {
    
    // Cargar los datos desde Supabase
    loadBannersAndComments();
    
    // Listeners para el Modo Edición y Creación
    toggleNewsAdminBtn.addEventListener('click', toggleAdminMode);
    addBannerBtn.addEventListener('click', showBannerCreationForm);
    cancelBannerBtn.addEventListener('click', hideBannerCreationForm);
    publishBannerBtn.addEventListener('click', publishNewBanner);
    
    // Listener General para interacciones dentro de las pancartas (delegación de eventos)
    newsBannersContainer.addEventListener('click', (e) => {
        // A. ELIMINAR PANCARTA
        if (e.target.classList.contains('delete-banner-btn')) {
            const bannerId = e.target.dataset.id;
            deleteBanner(bannerId);
        }
        
        // B. PUBLICAR COMENTARIO
        if (e.target.classList.contains('publish-comment-btn')) {
            const bannerId = e.target.dataset.bannerId;
            const container = e.target.closest('.comment-form');
            const nameInput = container.querySelector('.commenter-name-input');
            const textInput = container.querySelector('.comment-text-input');
            
            publishComment(bannerId, nameInput.value.trim(), textInput.value.trim());
            
            // Limpiar inputs
            nameInput.value = '';
            textInput.value = '';
        }
        
        // C. LIKE EN COMENTARIO
        if (e.target.classList.contains('like-btn')) {
            const commentId = e.target.dataset.commentId;
            toggleCommentLike(commentId, e.target);
        }
        
        // D. VER MÁS COMENTARIOS
        if (e.target.classList.contains('view-comments-btn')) {
            const bannerId = e.target.dataset.bannerId;
            toggleCommentsList(bannerId, e.target);
        }
    });

});
