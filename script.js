// ----------------------------------------------------
// 🚨 CONFIGURACIÓN DE SUPABASE (POSTGRESQL BAAS) 🚨
// ----------------------------------------------------
// !!! NO IMPORTA QUE ESTÉ EN EL CÓDIGO DIRECTAMENTE (WEB DE PRUEBA) !!!
const SUPABASE_URL = "https://ekkaagqovdmcdexrjosh.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2FhZ3FvdmRtY2RleHJqb3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NjU2NTEsImV4cCI6MjA3NTQ0MTY1MX0.mmVl7C0Hkzrjoks7snvHWMYk-ksSXkUWzVexhtkozRA"; 
// ----------------------------------------------------

// 🚨 CREDENCIALES DE ADMINISTRADOR ELIMINADAS: MODO EDICIÓN PÚBLICA ACTIVADO 🚨
// ----------------------------------------------------

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let admin = false;

// Variables y constantes de tiempo
const ONE_HOUR = 3600000;
const ONE_DAY = 24 * ONE_HOUR;
const RECENT_THRESHOLD = 7 * ONE_DAY; // Una semana en milisegundos
let currentStatus = {};
let latestNews = [];

// Elementos del DOM (Simplificado)
const DOMElements = {
    body: document.body,
    contenedor: document.getElementById('contenedor'),
    newsTicker: document.getElementById('newsTicker'),
    newsContent: document.getElementById('newsContent'),
    fechaActualizacion: document.getElementById('fecha-actualizacion'),
    statusPanel: document.getElementById('statusPanel'),
    statusDataContainer: document.getElementById('statusDataContainer'),
    lastEditedTime: document.getElementById('lastEditedTime'),
    commentsContainer: document.getElementById('commentsContainer'),
    commenterName: document.getElementById('commenterName'),
    commentText: document.getElementById('commentText'),
    publishCommentBtn: document.getElementById('publishCommentBtn'),
    // ⭐ NUEVOS ELEMENTOS DE CONTROL DE EDICIÓN ⭐
    adminControlsPanel: document.getElementById('adminControlsPanel'),
    statusMessage: document.getElementById('statusMessage'),
    toggleEditModeBtn: document.getElementById('toggleEditModeBtn'), // ✅ NUEVO BOTÓN
    logoutBtn: document.getElementById('logoutBtn'),
    saveBtn: document.getElementById('saveBtn'),
    addNewsBtn: document.getElementById('addNewsBtn'),
    deleteNewsBtn: document.getElementById('deleteNewsBtn'),
    dynamicTickerStyles: document.getElementById('dynamicTickerStyles'),
};

// ----------------------------------------------------
// MANEJO DE ESTADO DE LA APLICACIÓN (UI y EDICIÓN)
// ----------------------------------------------------

function updateAdminUI(isAdmin) {
    admin = isAdmin;
    if (isAdmin) {
        DOMElements.body.classList.add('admin-mode');
        // ⭐ Mostrar panel de edición y ocultar botón de activación:
        DOMElements.toggleEditModeBtn.style.display = "none";
        DOMElements.adminControlsPanel.style.display = "flex";
        DOMElements.statusMessage.textContent = "✅ MODO DE EDICIÓN PÚBLICA ACTIVADO";
        DOMElements.statusMessage.style.color = "#0d9488"; 
    } else {
        DOMElements.body.classList.remove('admin-mode');
        // ⭐ Ocultar panel de edición y mostrar botón de activación:
        DOMElements.toggleEditModeBtn.style.display = "block";
        DOMElements.adminControlsPanel.style.display = "none";
        DOMElements.statusMessage.textContent = "Activar Edición para modificar contenidos";
        DOMElements.statusMessage.style.color = "var(--color-texto-principal)"; 
    }
    
    // ACTUALIZACIÓN DEL PANEL DE ESTADO
    if (isAdmin) {
        DOMElements.statusPanel.classList.add('admin-mode');
        renderStatusPanel(currentStatus, true); 
    } else {
        DOMElements.statusPanel.classList.remove('admin-mode');
        renderStatusPanel(currentStatus, false); 
    }
}

// ⭐ NUEVA FUNCIÓN PARA ACTIVAR EDICIÓN (REEMPLAZA LA FUNCIÓN login ORIGINAL)
function toggleEditionMode() {
    if (admin) {
        logout(); // Si ya está activo, desactivar
    } else {
        admin = true; // Activa el modo edición sin contraseña
        updateAdminUI(true);
        alert("Modo edición activado. ¡Recuerda que los cambios serán públicos! No olvides guardar.");
        enableEditing(); 
    }
}

// FUNCIÓN LOGOUT (AJUSTADA)
async function logout(){
  updateAdminUI(false);
  disableEditing(); 
  alert("🛑 Modo de Edición Desactivado. La página se ha recargado con los datos guardados.");

  await loadData(); 
  await loadStatusData(); 
}

function enableEditing() {
    document.querySelectorAll('.editable').forEach(el => {
        el.contentEditable = 'true';
        el.classList.add('editing');
    });
}

function disableEditing() {
    document.querySelectorAll('.editable').forEach(el => {
        el.contentEditable = 'false';
        el.classList.remove('editing');
    });
}

// ----------------------------------------------------
// MANEJO DE DATOS (CARDS Y STATUS)
// ----------------------------------------------------

function renderCards(data) {
    DOMElements.contenedor.innerHTML = '';
    data.sort((a, b) => a.orden - b.orden);

    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('data-id', item.id);

        const lastUpdate = new Date(item.ultima_actualizacion).getTime();
        const now = Date.now();
        const age = now - lastUpdate;
        const isRecent = age < RECENT_THRESHOLD;

        let statusClass = 'status-old';
        let statusText = 'Antiguo';

        if (isRecent) {
            statusClass = 'status-new';
            statusText = 'Reciente';
        } else if (age < 2 * RECENT_THRESHOLD) {
            statusClass = 'status-medium';
            statusText = 'Medio';
        }

        // Determinar el color del estado
        let colorStatus = 'var(--acento-rojo)';
        if (statusClass === 'status-new') {
            colorStatus = 'var(--acento-verde)';
        } else if (statusClass === 'status-medium') {
            colorStatus = 'var(--acento-cian)';
        }

        card.innerHTML = `
            <div class="card-header">
                <span class="emoji">${item.emoji}</span>
                <h3 class="editable" data-field="nombre">${item.nombre}</h3>
            </div>
            <div class="card-content">
                <p class="editable" data-field="contenido">${item.contenido}</p>
            </div>
            <div class="card-footer">
                <span class="status-label ${statusClass}" style="background-color: ${colorStatus};">${statusText}</span>
            </div>
        `;
        DOMElements.contenedor.appendChild(card);
    });

    if (admin) {
        enableEditing();
    }
}

function renderStatusPanel(status, isAdmin) {
    if (!status || Object.keys(status).length === 0) {
        DOMElements.statusDataContainer.innerHTML = '<p style="margin: 0;">Datos de estado no disponibles.</p>';
        return;
    }

    currentStatus = status;

    // Convertir el objeto de datos en un array de pares [clave, valor]
    const dataEntries = Object.entries(status.data);

    // Renderizar los datos de estado
    DOMElements.statusDataContainer.innerHTML = dataEntries.map(([key, value]) => {
        const keyDisplay = key.charAt(0).toUpperCase() + key.slice(1);
        
        let displayValue = value;
        let valueClass = 'status-value';
        
        // Formateo simple basado en el contenido
        if (typeof value === 'number') {
            displayValue = value.toLocaleString('es-ES');
        } else if (typeof value === 'string' && value.endsWith('%')) {
            valueClass += ' percent-value';
        }

        return `
            <div class="status-item">
                <span class="status-key">${keyDisplay}:</span>
                <span class="${valueClass} ${isAdmin ? 'editable-status' : ''}" 
                      data-key="${key}"
                      ${isAdmin ? 'contenteditable="true"' : ''}>${displayValue}</span>
            </div>
        `;
    }).join('');

    // Actualizar el tiempo de última edición
    const lastUpdateDate = new Date(status.ultima_actualizacion);
    const options = {
        timeZone: 'America/Havana',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
    };
    const formattedTime = new Intl.DateTimeFormat('es-ES', options).format(lastUpdateDate);
    
    DOMElements.lastEditedTime.textContent = `Última edición: ${formattedTime} (CUBA)`;
}

// ----------------------------------------------------
// MANEJO DE NOTICIAS (TICKER)
// ----------------------------------------------------

function renderNews(news) {
    if (!news || news.length === 0) {
        DOMElements.newsTicker.style.display = 'none';
        return;
    }

    latestNews = news.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    DOMElements.newsTicker.style.display = 'flex'; 

    const newsText = latestNews.map(n => `[${new Date(n.created_at).toLocaleDateString('es-ES')}] ${n.noticia}`).join(' | ');
    DOMElements.newsContent.textContent = newsText;

    // Crear estilos dinámicos para la animación del marquee
    const textWidth = DOMElements.newsContent.offsetWidth; 
    const containerWidth = DOMElements.newsTicker.offsetWidth; 
    const duration = Math.max(20, (textWidth / 50) * 1.5); // Duración basada en el largo del texto
    
    // Si el texto es más largo que el contenedor, aplicar animación
    if (textWidth > containerWidth * 0.9) {
        DOMElements.newsContent.style.whiteSpace = 'nowrap';
        const css = `
            @keyframes marquee {
                0%   { transform: translateX(${containerWidth}px); }
                100% { transform: translateX(-${textWidth}px); }
            }
            .news-content {
                animation: marquee ${duration}s linear infinite;
            }
        `;
        DOMElements.dynamicTickerStyles.textContent = css;
    } else {
        DOMElements.dynamicTickerStyles.textContent = '';
        DOMElements.newsContent.style.whiteSpace = 'normal';
    }
}

// ----------------------------------------------------
// MANEJO DE COMENTARIOS
// ----------------------------------------------------

function renderComments(comments) {
    DOMElements.commentsContainer.innerHTML = '';
    
    if (!comments || comments.length === 0) {
        DOMElements.commentsContainer.innerHTML = '<p style="text-align: center; color: var(--color-texto-secundario); margin: 15px;">Sé el primero en comentar.</p>';
        return;
    }

    // Filtrar y ordenar solo los comentarios principales
    const mainComments = comments.filter(c => c.parent_id === null).sort((a, b) => b.votes - a.votes);

    mainComments.forEach(comment => {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-item';
        commentDiv.setAttribute('data-id', comment.id);

        const timeAgo = getTimeAgo(comment.created_at);
        const replies = comments.filter(c => c.parent_id === comment.id).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        commentDiv.innerHTML = `
            <div class="comment-header">
                <strong>${comment.author}</strong>
                <span class="comment-meta">hace ${timeAgo}</span>
            </div>
            <p class="comment-text">${comment.comment}</p>
            <div class="comment-actions">
                <button class="vote-btn" data-type="up" data-id="${comment.id}">👍 ${comment.votes}</button>
                <button class="reply-toggle-btn" data-id="${comment.id}">Responder</button>
            </div>
            <div class="reply-form-container" id="reply-form-${comment.id}" style="display: none;">
                <input type="text" placeholder="Tu Nombre" class="reply-name" maxlength="30">
                <textarea placeholder="Tu Respuesta (máx. 150 caracteres)" class="reply-text" maxlength="150"></textarea>
                <button class="publish-reply-btn" data-parent-id="${comment.id}">Publicar Respuesta</button>
            </div>
            <div class="replies-container" id="replies-for-${comment.id}">
                ${replies.map(reply => `
                    <div class="reply-item">
                        <div class="comment-header">
                            <strong>${reply.author}</strong>
                            <span class="comment-meta">hace ${getTimeAgo(reply.created_at)}</span>
                        </div>
                        <p class="comment-text">${reply.comment}</p>
                    </div>
                `).join('')}
            </div>
        `;

        DOMElements.commentsContainer.appendChild(commentDiv);
    });

    // Añadir listeners para los botones de votos y respuestas
    document.querySelectorAll('.vote-btn').forEach(btn => {
        btn.addEventListener('click', handleVote);
    });
    document.querySelectorAll('.reply-toggle-btn').forEach(btn => {
        btn.addEventListener('click', toggleReplyForm);
    });
    document.querySelectorAll('.publish-reply-btn').forEach(btn => {
        btn.addEventListener('click', publishReply);
    });
}

function getTimeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} segundos`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minutos`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} horas`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} días`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths} meses`;
    return `${Math.floor(diffInMonths / 12)} años`;
}

async function handleVote(e) {
    const btn = e.target.closest('.vote-btn');
    const commentId = btn.getAttribute('data-id');

    const { data: currentComment, error: fetchError } = await supabase
        .from('comments')
        .select('votes')
        .eq('id', commentId)
        .single();

    if (fetchError || !currentComment) {
        console.error('Error fetching comment for vote:', fetchError);
        return;
    }

    const newVotes = currentComment.votes + 1;

    const { error: updateError } = await supabase
        .from('comments')
        .update({ votes: newVotes })
        .eq('id', commentId);

    if (updateError) {
        console.error('Error updating vote:', updateError);
    } else {
        btn.textContent = `👍 ${newVotes}`;
    }
}

function toggleReplyForm(e) {
    const commentId = e.target.getAttribute('data-id');
    const form = document.getElementById(`reply-form-${commentId}`);
    if (form.style.display === 'none' || form.style.display === '') {
        form.style.display = 'flex';
    } else {
        form.style.display = 'none';
    }
}

async function publishComment() {
    const author = DOMElements.commenterName.value.trim() || 'Anónimo';
    const commentText = DOMElements.commentText.value.trim();

    if (commentText.length < 5) {
        alert('El comentario debe tener al menos 5 caracteres.');
        return;
    }

    const { error } = await supabase
        .from('comments')
        .insert([{ 
            author: author, 
            comment: commentText, 
            votes: 0, 
            parent_id: null 
        }]);

    if (error) {
        console.error('Error publishing comment:', error);
        alert('Error al publicar el comentario.');
    } else {
        DOMElements.commenterName.value = '';
        DOMElements.commentText.value = '';
        await loadComments();
    }
}

async function publishReply(e) {
    const parentId = e.target.getAttribute('data-parent-id');
    const form = document.getElementById(`reply-form-${parentId}`);
    const author = form.querySelector('.reply-name').value.trim() || 'Anónimo';
    const replyText = form.querySelector('.reply-text').value.trim();

    if (replyText.length < 5) {
        alert('La respuesta debe tener al menos 5 caracteres.');
        return;
    }

    const { error } = await supabase
        .from('comments')
        .insert([{ 
            author: author, 
            comment: replyText, 
            votes: 0, 
            parent_id: parentId 
        }]);

    if (error) {
        console.error('Error publishing reply:', error);
        alert('Error al publicar la respuesta.');
    } else {
        form.querySelector('.reply-name').value = '';
        form.querySelector('.reply-text').value = '';
        form.style.display = 'none';
        await loadComments();
    }
}


// ----------------------------------------------------
// MANEJO DE DATOS (CRUD y persistencia)
// ----------------------------------------------------

async function loadData() {
    const { data, error } = await supabase
        .from('cards')
        .select('*');

    if (error) {
        console.error('Error cargando datos:', error);
        DOMElements.contenedor.innerHTML = '<p style="text-align: center; color: var(--acento-rojo);">Error al cargar los datos de las tarjetas.</p>';
    } else {
        renderCards(data);
    }
}

async function loadStatusData() {
    const { data, error } = await supabase
        .from('status')
        .select('*')
        .limit(1)
        .single();

    if (error) {
        console.error('Error cargando datos de estado:', error);
    } else {
        renderStatusPanel(data, admin);
    }
}

async function loadNews() {
    const { data, error } = await supabase
        .from('news')
        .select('*');

    if (error) {
        console.error('Error cargando noticias:', error);
    } else {
        renderNews(data);
    }
}

async function loadComments() {
    const { data, error } = await supabase
        .from('comments')
        .select('*'); 

    if (error) {
        console.error('Error cargando comentarios:', error);
        DOMElements.commentsContainer.innerHTML = '<p style="text-align: center; color: var(--acento-rojo); margin: 15px;">Error al cargar los comentarios.</p>';
    } else {
        renderComments(data);
    }
}

async function saveChanges() {
    const cards = document.querySelectorAll('.card');
    const updates = [];
    let errorMessage = '';

    // 1. Recoger cambios de las Cards
    cards.forEach(card => {
        const id = card.getAttribute('data-id');
        const nombre = card.querySelector('[data-field="nombre"]').textContent;
        const contenido = card.querySelector('[data-field="contenido"]').textContent;
        
        updates.push({
            id: id,
            updates: {
                nombre: nombre,
                contenido: contenido,
                ultima_actualizacion: new Date().toISOString()
            }
        });
    });

    // 2. Recoger cambios del Panel de Estado
    const statusUpdates = {};
    const statusFields = document.querySelectorAll('.editable-status');
    statusFields.forEach(field => {
        statusUpdates[field.getAttribute('data-key')] = field.textContent;
    });

    // 3. Ejecutar las actualizaciones de las Cards
    for (const item of updates) {
        const { error } = await supabase
            .from('cards')
            .update(item.updates)
            .eq('id', item.id);
        
        if (error) {
            errorMessage += `Error en Card ID ${item.id}: ${error.message}. `;
        }
    }

    // 4. Ejecutar la actualización del Status
    if (Object.keys(statusUpdates).length > 0) {
        const { error: statusError } = await supabase
            .from('status')
            .update({
                data: statusUpdates,
                ultima_actualizacion: new Date().toISOString()
            })
            .limit(1);

        if (statusError) {
            errorMessage += `Error en Status Panel: ${statusError.message}.`;
        }
    }


    if (errorMessage) {
        alert(`❌ Error al guardar. Detalle: ${errorMessage}`);
    } else {
        alert("✅ ¡Cambios guardados con éxito!");
    }

    await loadData(); 
    await loadStatusData(); 
    if (admin) {
        setTimeout(enableEditing, 500); 
    }
}

async function addQuickNews() {
    const newText = prompt("Escribe el texto de la nueva noticia (máx. 100 caracteres):");
    if (newText && newText.length > 0) {
        const { error } = await supabase
            .from('news')
            .insert([{ noticia: newText.substring(0, 100) }]);

        if (error) {
            alert('❌ Error al añadir la noticia.');
            console.error(error);
        } else {
            alert('✅ Noticia añadida. Guarda los cambios para que persista.');
            await loadNews(); 
        }
    }
}

async function deleteNews() {
    if (latestNews.length === 0) {
        alert("No hay noticias para eliminar.");
        return;
    }

    // Mostrar las últimas noticias para que el usuario elija
    const newsList = latestNews.map((n, index) => `${index + 1}: ${n.noticia}`).join('\n');
    const indexToDelete = prompt(`Escribe el número de la noticia que deseas eliminar:\n\n${newsList}`);

    const index = parseInt(indexToDelete) - 1;

    if (index >= 0 && index < latestNews.length) {
        const idToDelete = latestNews[index].id;
        
        const { error } = await supabase
            .from('news')
            .delete()
            .eq('id', idToDelete);

        if (error) {
            alert('❌ Error al eliminar la noticia.');
            console.error(error);
        } else {
            alert('✅ Noticia eliminada. Guarda los cambios para que persista.');
            await loadNews(); 
        }
    } else if (indexToDelete !== null) {
        alert("Número no válido.");
    }
}

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
    
    // ⭐ NUEVO MANEJADOR DE EVENTOS (REEMPLAZA EL LOGIN):
    DOMElements.toggleEditModeBtn.addEventListener('click', toggleEditionMode);
    
    DOMElements.logoutBtn.addEventListener('click', logout);
    DOMElements.saveBtn.addEventListener('click', saveChanges);
    DOMElements.addNewsBtn.addEventListener('click', addQuickNews);
    DOMElements.deleteNewsBtn.addEventListener('click', deleteNews);
    DOMElements.publishCommentBtn.addEventListener('click', publishComment); 
    
    updateHeaderTime(); 
    loadData();
    loadNews();
    loadComments(); 
    loadStatusData(); 
    
    // Recalcular el ticker en caso de redimensionamiento
    window.addEventListener('resize', () => {
        if (window.resizeTimer) clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(() => {
            renderNews(latestNews); 
        }, 300);
    });
    
    // Mantener la hora actualizada
    setInterval(updateHeaderTime, 1000); 
    
});

