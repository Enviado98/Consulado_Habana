// ----------------------------------------------------
// 🚨 CONFIGURACIÓN DE SUPABASE (POSTGRESQL BAAS) 🚨
// ----------------------------------------------------
// !!! NO IMPORTA QUE ESTÉ EN EL CÓDIGO DIRECTAMENTE (WEB DE PRUEBA) !!!
const SUPABASE_URL = "https://ekkaagqovdmcdexrjosh.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2FhZ3FvdmRtY2RleHJqb3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NjU2NTEsImV4cCI6MjA3NTQ0MTY1MX0.mmVl7C0Hkzrjoks7snvHWMYk-ksSXkUWzVexhtkozRA"; 
// ----------------------------------------------------

// 🚨 CREDENCIALES DE ADMINISTRADOR 🚨
const ADMIN_USER = "Admin"; 
const ADMIN_PASS = "54321"; 
// ----------------------------------------------------

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let admin = false;

// Variables y constantes de tiempo
const ONE_HOUR = 3600000;
const ONE_DAY = 24 * ONE_HOUR;
const RECENT_THRESHOLD = 5 * ONE_HOUR; // Tiempo para considerarse "Reciente" (Rojo)
let resizeTimer;

// Elementos del DOM
const DOMElements = {
    contenedor: document.getElementById('contenedor'),
    statusDataContainer: document.getElementById('statusDataContainer'),
    lastEditedTime: document.getElementById('lastEditedTime'),
    loginForm: document.getElementById('loginForm'),
    adminControlsPanel: document.getElementById('adminControlsPanel'),
    loginBtn: document.getElementById('loginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    saveBtn: document.getElementById('saveBtn'),
    addNewsBtn: document.getElementById('addNewsBtn'),
    deleteNewsBtn: document.getElementById('deleteNewsBtn'),
    newsTicker: document.getElementById('newsTicker'),
    newsText: document.getElementById('newsText'),
    commenterName: document.getElementById('commenterName'),
    commentText: document.getElementById('commentText'),
    publishCommentBtn: document.getElementById('publishCommentBtn'),
    commentsContainer: document.getElementById('commentsContainer')
};

// ----------------------------------------------------
// UTILS
// ----------------------------------------------------

/**
 * Genera un ID web único y lo guarda en localStorage.
 * Se usa para rastrear los likes del usuario sin necesidad de autenticación.
 */
function getUserWebId() {
    let id = localStorage.getItem('userWebId');
    if (!id) {
        id = 'web-' + Date.now() + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('userWebId', id);
    }
    return id;
}

/**
 * Calcula el tiempo transcurrido de forma amigable.
 */
function timeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const diff = now - past; // Milisegundos

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (diff < 0) return 'en el futuro';
    if (seconds < 60) return `hace ${seconds} seg.`;
    if (minutes < 60) return `hace ${minutes} min.`;
    if (hours < 24) return `hace ${hours} hr.`;
    if (days < 30) return `hace ${days} d.`;
    if (months < 12) return `hace ${months} m.`;
    return `hace ${years} a.`;
}

/**
 * Convierte URLs en texto plano a hipervínculos.
 */
function linkify(text) {
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlRegex, function(url) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url.length > 30 ? url.substring(0, 27) + '...' : url}</a>`;
    });
}

/**
 * Genera un color HSL consistente basado en un string (nombre).
 */
function generateColorByName(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    // Saturación y luminosidad fija para un color pastel agradable
    return `hsl(${h}, 70%, 50%)`; 
}


// ----------------------------------------------------
// MANEJO DE AUTENTICACIÓN Y MODO ADMIN
// ----------------------------------------------------

function login() {
    const user = document.getElementById('user').value;
    const pass = document.getElementById('pass').value;

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        admin = true;
        localStorage.setItem('isAdmin', 'true');
        alert('🎉 ¡Modo Admin Activado!');
        DOMElements.loginForm.style.display = 'none';
        DOMElements.adminControlsPanel.style.display = 'flex';
        enableEditing();
    } else {
        alert('❌ Credenciales incorrectas.');
    }
}

function logout() {
    admin = false;
    localStorage.removeItem('isAdmin');
    alert('✅ Modo Admin Desactivado.');
    DOMElements.loginForm.style.display = 'flex';
    DOMElements.adminControlsPanel.style.display = 'none';
    location.reload(); // Recargar para limpiar los formularios de edición
}

/**
 * Habilita la edición de tarjetas y panel de estado en Modo Admin.
 */
function enableEditing() {
    if (!admin) return;

    // 1. Edición de tarjetas
    const cards = DOMElements.contenedor.querySelectorAll('.card');
    cards.forEach(card => {
        card.classList.add('editing');

        const titleElement = card.querySelector('h3');
        const contentElement = card.querySelector('.card-content p');
        const id = card.dataset.id;
        const emoji = card.querySelector('.emoji').textContent;

        titleElement.innerHTML = `<input type="text" id="title-${id}" value="${titleElement.textContent.trim()}" aria-label="Título de la tarjeta">`;
        contentElement.innerHTML = `<textarea id="content-${id}" aria-label="Contenido de la tarjeta">${contentElement.textContent.trim()}</textarea>`;
    });

    // 2. Edición del panel de estado
    const dataItems = DOMElements.statusDataContainer.querySelectorAll('.status-data-item');
    dataItems.forEach(item => {
        const valueElement = item.querySelector('span:last-child');
        const type = valueElement.dataset.type;
        const value = valueElement.textContent.trim().replace(/[^0-9.]/g, ''); // Limpiar unidades
        
        valueElement.innerHTML = `<input type="number" id="status-${type}" value="${value}" data-type="${type}" aria-label="${type} Value">`;
    });
}


// ----------------------------------------------------
// MANEJO DE NOTICIAS (TICKER)
// ----------------------------------------------------

/**
 * Carga las noticias, elimina las antiguas (>24h) y anima el ticker.
 */
async function loadNews() {
    const { data: noticias, error } = await supabase
        .from('noticias')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading news:', error);
        return;
    }

    if (!noticias || noticias.length === 0) {
        DOMElements.newsTicker.style.display = 'none';
        return;
    }

    // Limpieza de noticias viejas (> 24 horas)
    const now = new Date();
    const oldNewsIds = noticias
        .filter(n => now - new Date(n.created_at) > ONE_DAY)
        .map(n => n.id);

    if (oldNewsIds.length > 0) {
        await supabase
            .from('noticias')
            .delete()
            .in('id', oldNewsIds);
    }
    
    const currentNews = noticias.filter(n => !oldNewsIds.includes(n.id));

    if (currentNews.length === 0) {
        DOMElements.newsTicker.style.display = 'none';
        return;
    }

    // Renderizado y animación
    DOMElements.newsTicker.style.display = 'flex';
    const newsText = currentNews.map(n => `[${timeAgo(n.created_at).toUpperCase()}] ⚡️ ${linkify(n.mensaje)}`).join(' | ');
    DOMElements.newsText.innerHTML = newsText;

    animateNewsTicker(newsText.length);
}

function animateNewsTicker(textLength) {
    // Calculo dinámico del tiempo de animación basado en la longitud del texto
    const charsPerSecond = 15;
    const animationDuration = Math.max(10, textLength / charsPerSecond); 

    const styleSheet = document.getElementById('dynamicTickerStyles');
    styleSheet.textContent = `
        @keyframes ticker-move-dynamic {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-${textLength * 8}px); } /* Aproximación del ancho */
        }
        .news-ticker-content span {
            animation: ticker-move-dynamic ${animationDuration}s linear infinite;
        }
    `;

    DOMElements.newsText.style.animationPlayState = 'running';

    // Manejar pausa al hover (para escritorio)
    DOMElements.newsTicker.addEventListener('mouseenter', () => {
        DOMElements.newsText.style.animationPlayState = 'paused';
    });
    DOMElements.newsTicker.addEventListener('mouseleave', () => {
        DOMElements.newsText.style.animationPlayState = 'running';
    });
}


async function addQuickNews() {
    if (!admin) return;
    const message = prompt("Escribe el mensaje de última hora (máx 150 caracteres). Se borrará en 24h.");
    if (message && message.length <= 150) {
        const { error } = await supabase
            .from('noticias')
            .insert({ mensaje: message.trim() });
        
        if (error) {
            alert('❌ Error al añadir noticia:', error.message);
        } else {
            alert('✅ Noticia publicada.');
            loadNews();
        }
    } else if (message) {
        alert('❌ Mensaje demasiado largo.');
    }
}

async function deleteNews() {
    if (!admin) return;
    const confirmed = confirm("⚠️ ¿Estás seguro de que quieres borrar TODAS las noticias actuales?");
    if (confirmed) {
        const { error } = await supabase
            .from('noticias')
            .delete()
            .neq('id', 0); // Borra todos los que no tengan id=0 (básicamente todos)

        if (error) {
            alert('❌ Error al borrar noticias:', error.message);
        } else {
            alert('✅ Todas las noticias borradas.');
            loadNews();
        }
    }
}


// ----------------------------------------------------
// MANEJO DE DATOS DEL CALENDARIO (CARDS)
// ----------------------------------------------------

/**
 * Renderiza una única tarjeta (card) en el DOM.
 */
function renderCard(item) {
    const card = document.createElement('div');
    const lastEdited = new Date(item.last_edited);
    const isRecent = new Date() - lastEdited < RECENT_THRESHOLD;
    const className = isRecent ? 'card-recent' : 'card-old';

    card.className = `card ${className}`;
    card.dataset.id = item.id;

    card.innerHTML = `
        <div class="card-header">
            <h3>${item.titulo}</h3>
            <span class="emoji">${item.emoji}</span>
        </div>
        <div class="card-content">
            <p>${item.contenido}</p>
        </div>
        <button class="time-btn" aria-label="Mostrar información de tiempo">
            Editado: ${timeAgo(lastEdited)}
        </button>
        
        <div class="card-time-panel">
            <button class="time-close-btn" aria-label="Cerrar panel de tiempo">×</button>
            <p>Última edición:</p>
            <span>${lastEdited.toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'medium' })}</span>
            <p>Fecha de creación:</p>
            <span>${new Date(item.created_at).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'medium' })}</span>
        </div>
    `;

    // Event listeners para el panel de tiempo
    const timeBtn = card.querySelector('.time-btn');
    const timePanel = card.querySelector('.card-time-panel');
    const timeCloseBtn = card.querySelector('.time-close-btn');

    timeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        timePanel.classList.add('show');
    });

    timeCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        timePanel.classList.remove('show');
    });

    // Cierra el panel si se hace clic fuera de él (en la tarjeta, pero no en el botón)
    card.addEventListener('click', (e) => {
        if (timePanel.classList.contains('show') && e.target !== timeBtn) {
            timePanel.classList.remove('show');
        }
    });

    return card;
}

/**
 * Carga los datos de las tarjetas desde Supabase y los renderiza.
 */
async function loadData() {
    const { data: items, error } = await supabase
        .from('items')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error('Error loading items:', error);
        DOMElements.contenedor.innerHTML = '<p>Error al cargar el calendario.</p>';
        return;
    }

    DOMElements.contenedor.innerHTML = '';
    items.forEach(item => {
        DOMElements.contenedor.appendChild(renderCard(item));
    });

    // Si está en modo admin, se re-habilita la edición
    if (admin) {
        enableEditing();
    }
}

/**
 * Carga los datos del panel de estado desde Supabase y los renderiza.
 */
async function loadStatusData() {
    const { data: status_data, error } = await supabase
        .from('status_data')
        .select('*')
        .order('id', { ascending: true })
        .limit(1);

    if (error || !status_data || status_data.length === 0) {
        console.error('Error loading status data:', error);
        DOMElements.statusDataContainer.innerHTML = 'Error al cargar datos de estado.';
        return;
    }

    const data = status_data[0];
    const lastEdited = new Date(data.last_edited);

    DOMElements.statusDataContainer.innerHTML = `
        <div class="status-data-item">
            <span>🔌 Déficit Estimado:</span>
            <span data-type="deficit">${data.deficit} MW</span>
        </div>
        <div class="status-data-item">
            <span>💵 Dólar (CUP):</span>
            <span data-type="usd">${data.usd}</span>
        </div>
        <div class="status-data-item">
            <span>💶 Euro (CUP):</span>
            <span data-type="eur">${data.eur}</span>
        </div>
    `;

    DOMElements.lastEditedTime.textContent = `Última edición: ${timeAgo(lastEdited)}`;

    if (admin) {
        // Habilitar edición después de renderizar
        const statusItems = DOMElements.statusDataContainer.querySelectorAll('.status-data-item');
        statusItems.forEach(item => {
            const valueElement = item.querySelector('span:last-child');
            const type = valueElement.dataset.type;
            const value = valueElement.textContent.trim().replace(/[^0-9.]/g, ''); 
            
            valueElement.innerHTML = `<input type="number" id="status-${type}" value="${value}" data-type="${type}" aria-label="${type} Value">`;
        });
    }
}

/**
 * Guarda los cambios realizados en modo Admin.
 */
async function saveChanges() {
    if (!admin) {
        alert('No estás en modo administrador.');
        return;
    }

    const confirmed = confirm("⚠️ ¿Estás seguro de que deseas guardar TODOS los cambios (Cards y Estado)?");
    if (!confirmed) return;

    DOMElements.saveBtn.textContent = 'Guardando...';
    DOMElements.saveBtn.disabled = true;

    const updates = [];
    const statusUpdates = {};
    const now = new Date().toISOString();

    // 1. Recopilar cambios de Tarjetas (Cards)
    const cards = DOMElements.contenedor.querySelectorAll('.card.editing');
    cards.forEach(card => {
        const id = card.dataset.id;
        const titleInput = document.getElementById(`title-${id}`);
        const contentInput = document.getElementById(`content-${id}`);
        
        updates.push({
            id: id,
            titulo: titleInput.value.trim(),
            contenido: contentInput.value.trim(),
            last_edited: now // Actualiza el timestamp de edición
        });
    });

    // 2. Recopilar cambios del Panel de Estado
    const statusInputs = DOMElements.statusDataContainer.querySelectorAll('input[data-type]');
    statusInputs.forEach(input => {
        statusUpdates[input.dataset.type] = parseFloat(input.value);
    });
    statusUpdates.last_edited = now;

    let hasError = false;
    let errorMessage = '';

    // A. Guardar Tarjetas
    const { error: cardError } = await supabase
        .from('items')
        .upsert(updates);

    if (cardError) {
        hasError = true;
        errorMessage += `\n- Cards: ${cardError.message}`;
    }

    // B. Guardar Estado
    // Supabase requiere un WHERE o LIMIT para actualizar sin ID si no está configurado para UPDATE.
    // Asumimos que la tabla 'status_data' siempre tiene ID 1 para el único registro.
    const { error: statusError } = await supabase
        .from('status_data')
        .update(statusUpdates)
        .eq('id', 1);

    if (statusError) {
        hasError = true;
        errorMessage += `\n- Estado: ${statusError.message}`;
    }
    
    DOMElements.saveBtn.textContent = '💾 Guardar Cambios';
    DOMElements.saveBtn.disabled = false;

    if (!hasError) {
        alert('✅ Todos los cambios se han guardado exitosamente.');
    } else {
        alert(`❌ Error al guardar. Detalle: ${errorMessage}`);
    }

    await loadData(); // Recarga las tarjetas
    await loadStatusData(); // Recarga el panel de estado
    if (admin) {
        setTimeout(enableEditing, 500); // Re-habilita la edición por si acaso
    }
}

// ----------------------------------------------------
// MANEJO DE COMENTARIOS
// ----------------------------------------------------

/**
 * Renderiza la lista de comentarios y sus hilos de respuesta.
 */
async function loadComments() {
    DOMElements.commentsContainer.innerHTML = '<p style="text-align: center; color: var(--color-texto-secundario); margin: 15px;">Cargando comentarios...</p>';
    
    // Obtener comentarios principales y respuestas en una sola consulta para eficiencia
    const { data: comments, error } = await supabase
        .from('comentarios')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al cargar comentarios:', error);
        DOMEElements.commentsContainer.innerHTML = '<p>Error al cargar los comentarios.</p>';
        return;
    }

    // Separar comentarios principales (parent_id es null) de las respuestas
    const mainComments = comments.filter(c => c.parent_id === null);
    const repliesMap = comments.filter(c => c.parent_id !== null).reduce((acc, reply) => {
        if (!acc[reply.parent_id]) acc[reply.parent_id] = [];
        acc[reply.parent_id].push(reply);
        return acc;
    }, {});
    
    const userWebId = getUserWebId();
    const { data: userLikes } = await supabase
        .from('likes')
        .select('comment_id')
        .eq('user_web_id', userWebId);

    const likedCommentIds = new Set(userLikes ? userLikes.map(l => l.comment_id) : []);

    DOMElements.commentsContainer.innerHTML = '';
    
    if (mainComments.length === 0) {
        DOMElements.commentsContainer.innerHTML = '<p style="text-align: center; color: var(--color-texto-secundario); margin: 15px;">¡Sé el primero en comentar!</p>';
        return;
    }

    mainComments.forEach(comment => {
        const commentElement = createCommentElement(comment, likedCommentIds.has(comment.id));
        DOMElements.commentsContainer.appendChild(commentElement);
        
        // Renderizar respuestas
        if (repliesMap[comment.id]) {
            const repliesContainer = document.createElement('div');
            repliesContainer.className = 'replies-container';
            repliesMap[comment.id].forEach(reply => {
                const replyElement = createCommentElement(reply, likedCommentIds.has(reply.id), true);
                repliesContainer.appendChild(replyElement);
            });
            commentElement.appendChild(repliesContainer);
        }
    });
}

/**
 * Crea un elemento de comentario o respuesta.
 */
function createCommentElement(comment, isLiked, isReply = false) {
    const item = document.createElement('li');
    item.className = isReply ? 'reply-item' : 'comment-item';
    item.dataset.id = comment.id;

    const authorColor = generateColorByName(comment.autor);
    
    item.innerHTML = `
        <div class="comment-header">
            <span class="comment-author" style="color: ${authorColor};">${comment.autor}</span>
            <span class="comment-date">${timeAgo(comment.created_at)}</span>
        </div>
        <p class="comment-text">${linkify(comment.mensaje)}</p>
        <div class="comment-actions">
            <button class="like-btn ${isLiked ? 'liked' : ''}" data-id="${comment.id}">
                ${isLiked ? '❤️' : '🤍'} Me Gusta 
                <span class="like-count">${comment.likes_count || 0}</span>
            </button>
            ${!isReply ? `<button class="reply-toggle-btn" data-id="${comment.id}">↪️ Responder</button>` : ''}
        </div>
        ${!isReply ? `<div id="reply-form-container-${comment.id}"></div>` : ''}
    `;
    
    // Asignar listeners
    item.querySelector(`.like-btn`).addEventListener('click', () => handleLike(comment.id, item.querySelector(`.like-btn`)));
    
    if (!isReply) {
        item.querySelector(`.reply-toggle-btn`).addEventListener('click', () => toggleReplyForm(comment.id, comment.autor));
    }

    return item;
}

/**
 * Publica un comentario principal.
 */
async function publishComment() {
    const name = DOMElements.commenterName.value.trim();
    const text = DOMElements.commentText.value.trim();
    
    if (name.length < 2 || text.length < 5) {
        alert("Por favor, introduce un nombre (mín. 2) y un comentario (mín. 5).");
        return;
    }

    DOMElements.publishCommentBtn.disabled = true;

    const { error } = await supabase
        .from('comentarios')
        .insert({ autor: name, mensaje: text, likes_count: 0, parent_id: null });

    DOMElements.publishCommentBtn.disabled = false;

    if (error) {
        alert('❌ Error al publicar: ' + error.message);
    } else {
        DOMElements.commenterName.value = name; // Mantener el nombre
        DOMElements.commentText.value = '';
        await loadComments();
    }
}

/**
 * Muestra/oculta el formulario de respuesta para un comentario.
 */
function toggleReplyForm(parentId, parentAuthor) {
    const container = document.getElementById(`reply-form-container-${parentId}`);
    
    // Si ya existe, lo ocultamos
    if (container.querySelector('.reply-form')) {
        container.innerHTML = '';
        return;
    }

    // Crear el formulario de respuesta
    container.innerHTML = `
        <div class="reply-form">
            <input type="text" id="reply-name-${parentId}" placeholder="Tu Nombre" required maxlength="30" aria-label="Tu Nombre">
            <textarea id="reply-text-${parentId}" placeholder="Respuesta a ${parentAuthor} (máx. 250)" required maxlength="250" aria-label="Tu Respuesta"></textarea>
            <button id="reply-btn-${parentId}">Enviar Respuesta</button>
        </div>
    `;
    
    // Asignar listener al botón de respuesta
    document.getElementById(`reply-btn-${parentId}`).addEventListener('click', () => publishReply(parentId));
}

/**
 * Publica una respuesta a un comentario.
 */
async function publishReply(parentId) {
    const nameInput = document.getElementById(`reply-name-${parentId}`);
    const textInput = document.getElementById(`reply-text-${parentId}`);
    const name = nameInput.value.trim();
    const text = textInput.value.trim();

    if (name.length < 2 || text.length < 5) {
        alert("Por favor, introduce un nombre (mín. 2) y una respuesta (mín. 5).");
        return;
    }

    const replyBtn = document.getElementById(`reply-btn-${parentId}`);
    replyBtn.disabled = true;

    const { error } = await supabase
        .from('comentarios')
        .insert({ autor: name, mensaje: text, likes_count: 0, parent_id: parentId });

    replyBtn.disabled = false;

    if (error) {
        alert('❌ Error al publicar respuesta: ' + error.message);
    } else {
        document.getElementById(`reply-form-container-${parentId}`).innerHTML = ''; // Limpiar y ocultar
        await loadComments();
    }
}


/**
 * Maneja la lógica de dar/quitar un Like.
 */
async function handleLike(commentId, buttonElement) {
    const userWebId = getUserWebId();
    const isLiked = buttonElement.classList.contains('liked');
    let newLikeCount = parseInt(buttonElement.querySelector('.like-count').textContent);

    buttonElement.disabled = true;

    if (!isLiked) {
        // 1. Añadir Like en la tabla 'likes'
        const { error: likeError } = await supabase
            .from('likes')
            .insert({ comment_id: commentId, user_web_id: userWebId });

        if (!likeError || likeError.code === '23505') { // 23505 es error de duplicado (ya le dio like)
            // 2. Incrementar el contador en la tabla 'comentarios'
            const { data: updatedComment, error: counterError } = await supabase.rpc('increment_likes', { comment_row_id: commentId });
            
            if (!counterError) {
                // Éxito: Actualizar el DOM
                newLikeCount = updatedComment[0].likes_count;
                buttonElement.classList.add('liked');
                buttonElement.innerHTML = `❤️ Me Gusta <span class="like-count">${newLikeCount}</span>`;
            } else {
                console.error('Error al incrementar contador:', counterError);
                alert('Error al dar Me Gusta.');
            }
        } else {
            console.error('Error al registrar like:', likeError);
            alert('Error al registrar Me Gusta.');
        }

    } else {
        // 1. Eliminar Like de la tabla 'likes'
        const { error: deleteError } = await supabase
            .from('likes')
            .delete()
            .eq('comment_id', commentId)
            .eq('user_web_id', userWebId);
            
        if (!deleteError) {
            // 2. Decrementar el contador en la tabla 'comentarios'
            const { data: updatedComment, error: counterError } = await supabase.rpc('decrement_likes', { comment_row_id: commentId });

            if (!counterError) {
                // Éxito: Actualizar el DOM
                newLikeCount = updatedComment[0].likes_count;
                buttonElement.classList.remove('liked');
                buttonElement.innerHTML = `🤍 Me Gusta <span class="like-count">${newLikeCount}</span>`;
            } else {
                console.error('Error al decrementar contador:', counterError);
                alert('Error al quitar Me Gusta.');
            }
        } else {
            console.error('Error al eliminar like:', deleteError);
            alert('Error al quitar Me Gusta.');
        }
    }
    
    buttonElement.disabled = false;
}


// ----------------------------------------------------
// CARGA INICIAL Y LISTENERS
// ----------------------------------------------------

/**
 * Actualiza la hora del header a la hora de Cuba.
 */
function updateHeaderTime() {
    const options = {
        timeZone: 'America/Havana', 
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    };
    const formattedDate = new Intl.DateTimeFormat('es-ES', options).format(new Date());

    document.getElementById('fecha-actualizacion').textContent = `${formattedDate} (CUBA)`;
}


// ----------------------------------------------------
// MANEJO DE EVENTOS Y CARGA INICIAL
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    
    // Comprobar si el modo admin estaba activo
    if (localStorage.getItem('isAdmin') === 'true') {
        admin = true;
        DOMElements.loginForm.style.display = 'none';
        DOMElements.adminControlsPanel.style.display = 'flex';
    }

    DOMElements.loginBtn.addEventListener('click', login);
    DOMElements.logoutBtn.addEventListener('click', logout);
    DOMElements.saveBtn.addEventListener('click', saveChanges);
    DOMElements.addNewsBtn.addEventListener('click', addQuickNews);
    DOMElements.deleteNewsBtn.addEventListener('click', deleteNews);
    DOMElements.publishCommentBtn.addEventListener('click', publishComment); 
    
    // Carga de datos inicial
    updateHeaderTime(); 
    loadData();
    loadNews();
    loadComments(); 
    loadStatusData(); 
    
    // Actualización de la hora cada 5 segundos
    setInterval(updateHeaderTime, 5000);

    // Re-habilitar la edición si la página es redimensionada y se está en modo admin
    window.addEventListener('resize', () => {
        if (window.resizeTimer) clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(() => {
            if (admin) enableEditing();
        }, 300);
    });
});
