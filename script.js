// ----------------------------------------------------
// 🚨 CONFIGURACIÓN DE SUPABASE (POSTGRESQL BAAS) 🚨
// ----------------------------------------------------
// !!! NO IMPORTA QUE ESTÉ EN EL CÓDIGO DIRECTAMENTE (WEB DE PRUEBA) !!!
const SUPABASE_URL = "https://ekkaagqovdmcdexrjosh.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2FhZ3FvdmRtY2RleHJqb3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NjU2NTEsImV4cCI6MjA3NTQ0MTY1MX0.mmVl7C0Hkzrjoks7snvHWMYk-ksSXkUWzVexhtkozRA"; 
// ----------------------------------------------------

// 🚨 CREDENCIALES DE ADMINISTRADOR 🚨
// ELIMINADAS: const ADMIN_USER = "Admin"; 
// ELIMINADAS: const ADMIN_PASS = "54321"; 
// ----------------------------------------------------

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let admin = false; // Estado global para el modo de edición

// Variables y constantes de tiempo
const ONE_HOUR = 3600000; 

// Selectores de Elementos DOM
const DOMElements = {
    // Panel de Estado y Controles
    statusPanel: document.getElementById('statusPanel'),
    statusDataContainer: document.getElementById('statusDataContainer'),
    lastEditedTime: document.getElementById('lastEditedTime'),
    
    // Controles de Administración
    toggleAdminBtn: document.getElementById('toggleAdminBtn'),
    adminControlsPanel: document.getElementById('adminControlsPanel'),
    saveBtn: document.getElementById('saveBtn'),
    addNewsBtn: document.getElementById('addNewsBtn'),
    deleteNewsBtn: document.getElementById('deleteNewsBtn'),
    
    // Contenido Principal
    contenedor: document.getElementById('contenedor'), // Contenedor de items (trámites)
    
    // Noticias (Rodillo)
    newsTickerContent: document.getElementById('newsTickerContent'),
    
    // Comentarios
    commentsContainer: document.getElementById('commentsContainer'),
    publishCommentBtn: document.getElementById('publishCommentBtn'),
    commenterName: document.getElementById('commenterName'),
    commentText: document.getElementById('commentText'),
    
    // Header
    fechaActualizacion: document.getElementById('fecha-actualizacion')
};


// ==========================================================
// ⭐ AÑADIDO: LÓGICA DE VISTAS (Supabase) ⭐
// ==========================================================

/**
 * 1. Registra la visita actual en la tabla 'page_views'
 */
async function recordPageView() {
    try {
        const { error } = await supabase
            .from('page_views')
            .insert([
                { timestamp: new Date().toISOString() }
            ]);

        if (error) {
            console.error('Error registrando la visita:', error.message);
        }
    } catch (e) {
        console.error('Excepción al intentar registrar la visita:', e);
    }
}

/**
 * 2. Obtiene el número de vistas en los últimos 7 días.
 */
async function fetchWeeklyViews() {
    // Calcula la fecha de hace 7 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    try {
        // Contamos las filas donde el timestamp es mayor o igual a hace 7 días
        const { count, error } = await supabase
            .from('page_views')
            .select('*', { count: 'exact', head: true }) 
            .gte('timestamp', sevenDaysAgoISO); 

        if (error) {
            console.error('Error obteniendo vistas semanales:', error.message);
            return 0;
        }
        // Devuelve el conteo, o 0 si es nulo
        return count || 0;

    } catch (e) {
        console.error('Excepción al obtener vistas semanales:', e);
        return 0;
    }
}

/**
 * 3. Actualiza el contador en el DOM
 */
async function updateViewsCounter() {
    const viewsCount = await fetchWeeklyViews();
    const counterElement = document.getElementById('viewsCount');
    if (counterElement) {
        counterElement.textContent = viewsCount;
    }
}


// ==========================================================
// ⭐ FIN AÑADIDO: LÓGICA DE VISTAS ⭐
// ==========================================================


// ----------------------------------------------------
// FUNCIONES DE CARGA DE DATOS PRINCIPALES
// ----------------------------------------------------

// Carga el estado principal
async function loadStatusData() {
    const { data, error } = await supabase
        .from('status')
        .select('content, last_edited')
        .eq('id', 1)
        .single();
    
    if (error) {
        console.error("Error al cargar status:", error);
        DOMElements.statusDataContainer.innerHTML = '<p>Error cargando el estado.</p>';
    } else if (data) {
        DOMElements.statusDataContainer.innerHTML = data.content;
        updateLastEditedTime(data.last_edited);
    }
}

// Carga todos los items (trámites)
async function loadData() {
    const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('order', { ascending: true }); 

    if (error) {
        console.error("Error al cargar items:", error);
        DOMElements.contenedor.innerHTML = '<p>Error cargando trámites.</p>';
        return;
    }

    renderItems(data);
}

// Carga las noticias del rodillo
async function loadNews() {
    const { data, error } = await supabase
        .from('news_ticker')
        .select('*')
        .order('id', { ascending: false });

    const newsTicker = document.getElementById('newsTicker');
    
    if (error || !data || data.length === 0) {
        if (newsTicker) newsTicker.style.display = 'none';
        return;
    }

    if (newsTicker) newsTicker.style.display = 'flex'; 

    const newsItems = data.map(item => 
        `<span class="news-item" data-id="${item.id}">${item.content}</span>`
    ).join('<span class="news-item-sep">|</span>');
    
    // Duplicar el contenido para un desplazamiento infinito
    DOMElements.newsTickerContent.innerHTML = newsItems + '<span class="news-item-sep">|</span>' + newsItems;
}

// Carga los comentarios
async function loadComments() {
    const { data: comments, error } = await supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        DOMElements.commentsContainer.innerHTML = '<p style="text-align: center; color: var(--acento-rojo);">Error cargando comentarios.</p>';
        return;
    }

    if (comments.length === 0) {
        DOMElements.commentsContainer.innerHTML = '<p style="text-align: center; color: var(--color-texto-secundario); margin: 15px;">Aún no hay comentarios. Sé el primero en publicar.</p>';
        return;
    }

    DOMElements.commentsContainer.innerHTML = comments.map(comment => {
        const date = new Date(comment.created_at).toLocaleDateString('es-ES', { 
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
        return `
            <div class="comment-item">
                <div class="comment-meta">
                    <strong>${comment.name || 'Anónimo'}</strong> 
                    <span>${date}</span>
                </div>
                <p class="comment-content">${comment.content}</p>
            </div>
        `;
    }).join('');
}


// ----------------------------------------------------
// FUNCIONES DE RENDERIZADO Y UTILIDAD
// ----------------------------------------------------

// Renderiza los items en el contenedor
function renderItems(items) {
    DOMElements.contenedor.innerHTML = items.map(item => {
        const statusClass = `status-${item.status.toLowerCase().replace(/\s/g, '-')}`;
        
        let contentHtml;
        let titleHtml;
        let statusHtml;

        if (admin) {
            // Modo Edición
            titleHtml = `<input type="text" id="title-${item.id}" value="${item.title}" class="item-editable-title" />`;
            contentHtml = `<div id="content-${item.id}" contenteditable="true" class="item-editable-content">${item.content}</div>`;
            statusHtml = `<select id="status-${item.id}" class="item-editable-status ${statusClass}">
                            <option value="Urgente" ${item.status === 'Urgente' ? 'selected' : ''}>Urgente</option>
                            <option value="Pendiente" ${item.status === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="En trámite" ${item.status === 'En trámite' ? 'selected' : ''}>En trámite</option>
                        </select>`;
        } else {
            // Modo Normal
            titleHtml = `<h2 class="item-title">${item.title}</h2>`;
            contentHtml = `<div class="item-details">${item.content}</div>`;
            statusHtml = `<span class="item-status ${statusClass}">${item.status}</span>`;
        }

        return `
            <div class="item-container" data-id="${item.id}">
                <div class="item-header">
                    ${titleHtml}
                    ${statusHtml}
                </div>
                ${contentHtml}
            </div>
        `;
    }).join('');
}

// Actualiza el texto de "Última Edición"
function updateLastEditedTime(timestamp) {
    if (!timestamp) return;

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.round(diffMs / (1000 * 60));

    let timeString;
    if (diffMinutes < 5) {
        timeString = 'Hace un momento';
    } else if (diffMinutes < 60) {
        timeString = `Hace ${diffMinutes} minutos`;
    } else if (diffHours < 24) {
        timeString = `Hace ${diffHours} horas`;
    } else {
        const formattedDate = date.toLocaleDateString('es-ES', { 
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
        timeString = formattedDate;
    }
    
    DOMElements.lastEditedTime.textContent = timeString;
}

// Actualiza la hora del header
function updateHeaderTime() {
    const options = {
        timeZone: 'America/Havana', 
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    };
    const formattedDate = new Intl.DateTimeFormat('es-ES', options).format(new Date());

    DOMElements.fechaActualizacion.textContent = `${formattedDate} (CUBA)`;
}


// ----------------------------------------------------
// FUNCIONES DE ACCIÓN (ADMIN Y COMENTARIOS)
// ----------------------------------------------------

// Alternar Modo Admin
function toggleAdminMode() {
    admin = !admin;
    document.body.classList.toggle('edit-mode', admin);
    
    if (admin) {
        DOMElements.toggleAdminBtn.textContent = '🔒 DESACTIVAR EL MODO EDICIÓN';
        DOMElements.adminControlsPanel.style.display = 'flex';
        DOMElements.statusDataContainer.setAttribute('contenteditable', 'true');
        DOMElements.statusDataContainer.classList.add('editable-content');
        
    } else {
        DOMElements.toggleAdminBtn.textContent = '🛡️ ACTIVAR EL MODO EDICIÓN';
        DOMElements.adminControlsPanel.style.display = 'none';
        DOMElements.statusDataContainer.setAttribute('contenteditable', 'false');
        DOMElements.statusDataContainer.classList.remove('editable-content');
    }
    
    loadData(); // Recarga los items para aplicar el modo edición/visualización
}

// Guardar Cambios (Status y Items)
async function saveChanges() {
    const items = await supabase.from('items').select('*').order('order', { ascending: true });
    
    // 1. Guardar el estado
    const statusText = DOMElements.statusDataContainer.innerHTML.trim();
    const { error: statusError } = await supabase
        .from('status')
        .update({ content: statusText, last_edited: new Date().toISOString() })
        .eq('id', 1);

    if (statusError) {
        alert('Error al guardar el estado: ' + statusError.message);
        return;
    }

    // 2. Guardar los items
    const updatePromises = items.data.map(item => {
        const titleElement = document.getElementById(`title-${item.id}`);
        const statusElement = document.getElementById(`status-${item.id}`);
        const contentElement = document.getElementById(`content-${item.id}`);

        return supabase
            .from('items')
            .update({ 
                title: titleElement.value.trim(), 
                status: statusElement.value, 
                content: contentElement.innerHTML.trim() 
            })
            .eq('id', item.id);
    });

    const results = await Promise.all(updatePromises);
    const itemError = results.find(res => res.error);

    if (itemError) {
        alert('Error al guardar algunos ítems: ' + itemError.error.message);
    } else {
        alert('✅ Cambios guardados con éxito!');
        loadStatusData();
        loadData();
    }
}

// Añadir Noticia (Rodillo)
async function addQuickNews() {
    const newContent = prompt('Introduce la nueva noticia para el rodillo:');
    if (newContent && newContent.trim()) {
        const { error } = await supabase
            .from('news_ticker')
            .insert([{ content: newContent.trim() }]);

        if (error) {
            alert('Error al añadir la noticia: ' + error.message);
        } else {
            alert('Noticia añadida con éxito.');
            loadNews(); 
        }
    }
}

// Eliminar Noticia (Rodillo)
async function deleteNews() {
    const { data: news, error } = await supabase
        .from('news_ticker')
        .select('*')
        .order('id', { ascending: false });

    if (error || news.length === 0) {
        alert('Error cargando o no hay noticias para eliminar.');
        return;
    }

    const list = news.map(n => `ID: ${n.id} - "${n.content}"`).join('\n');
    const idToDelete = prompt('Noticias actuales:\n' + list + '\n\nIntroduce el ID de la noticia que deseas eliminar:');
    
    const id = parseInt(idToDelete, 10);
    if (!id || isNaN(id)) {
        if (idToDelete) alert('ID inválido.');
        return;
    }

    const { error: deleteError } = await supabase
        .from('news_ticker')
        .delete()
        .eq('id', id);

    if (deleteError) {
        alert('Error al eliminar la noticia: ' + deleteError.message);
    } else {
        alert('Noticia eliminada con éxito.');
        loadNews(); 
    }
}

// Publicar Comentario
async function publishComment() {
    const name = DOMElements.commenterName.value.trim();
    const content = DOMElements.commentText.value.trim();

    if (!content) {
        alert('Por favor, escribe un comentario.');
        return;
    }

    DOMElements.publishCommentBtn.disabled = true;
    DOMElements.publishCommentBtn.textContent = 'Publicando...';

    const { error } = await supabase
        .from('comments')
        .insert([
            { name: name || null, content: content }
        ]);

    DOMElements.publishCommentBtn.disabled = false;
    DOMElements.publishCommentBtn.textContent = 'Publicar Comentario';

    if (error) {
        alert('Error al publicar comentario: ' + error.message);
    } else {
        alert('Comentario publicado con éxito!');
        DOMElements.commenterName.value = '';
        DOMElements.commentText.value = '';
        loadComments(); 
    }
}


// ----------------------------------------------------
// MANEJO DE EVENTOS Y CARGA INICIAL
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    
    // ⭐ AÑADIDO: Llama a las funciones de vistas al cargar la página
    recordPageView();
    updateViewsCounter();

    // MODIFICADO: Sustitución de loginBtn/logoutBtn por toggleAdminBtn
    DOMElements.toggleAdminBtn.addEventListener('click', toggleAdminMode);
    
    // Otros Listeners
    DOMElements.saveBtn.addEventListener('click', saveChanges);
    DOMElements.addNewsBtn.addEventListener('click', addQuickNews);
    DOMElements.deleteNewsBtn.addEventListener('click', deleteNews);
    DOMElements.publishCommentBtn.addEventListener('click', publishComment); 
    
    updateHeaderTime(); 
    loadData();
    loadNews();
    loadComments(); 
    loadStatusData(); 
    
    // Intervalos de actualización
    setInterval(updateHeaderTime, 1000); 
    setInterval(() => { loadStatusData(); loadData(); loadComments(); }, 300000); // Recargar datos principales cada 5 mins
    setInterval(updateViewsCounter, 60000); // Recargar el contador de vistas cada 60 segundos
    
    window.addEventListener('resize', () => {
        if (window.resizeTimer) clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(loadData, 50); // Ajustar renderizado de items al cambiar tamaño
    });
});
