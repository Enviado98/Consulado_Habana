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
const ONE_DAY = 24 * ONE_HOUR;
const TIKKER_UPDATE_INTERVAL = 3000; // 3 segundos

// Referencias a elementos del DOM
const DOMElements = {
    contenedor: document.getElementById('contenedor'),
    statusPanel: document.getElementById('statusPanel'),
    statusDataContainer: document.getElementById('statusDataContainer'),
    lastEditedTime: document.getElementById('lastEditedTime'),
    toggleAdminBtn: document.getElementById('toggleAdminBtn'),
    adminControlsPanel: document.getElementById('adminControlsPanel'),
    saveBtn: document.getElementById('saveBtn'),
    addNewsBtn: document.getElementById('addNewsBtn'),
    deleteNewsBtn: document.getElementById('deleteNewsBtn'),
    commenterName: document.getElementById('commenterName'),
    commentText: document.getElementById('commentText'),
    publishCommentBtn: document.getElementById('publishCommentBtn'),
    commentsContainer: document.getElementById('commentsContainer')
};

// ----------------------------------------------------
// LÓGICA DE ADMINISTRACIÓN (EDITAR / GUARDAR / LOGIN)
// ----------------------------------------------------

function setAdminMode(enable) {
    admin = enable;
    if (admin) {
        DOMElements.toggleAdminBtn.textContent = "🔒 SALIR DEL MODO EDICIÓN";
        DOMElements.toggleAdminBtn.classList.add('admin-active');
        DOMElements.adminControlsPanel.style.display = 'block';
        enableEditing();
    } else {
        DOMElements.toggleAdminBtn.textContent = "🛡️ ACTIVAR EL MODO EDICIÓN ";
        DOMElements.toggleAdminBtn.classList.remove('admin-active');
        DOMElements.adminControlsPanel.style.display = 'none';
        disableEditing();
    }
}

async function toggleAdminMode() {
    if (admin) {
        // Salir del modo admin
        setAdminMode(false);
    } else {
        // Pedir credenciales
        const user = prompt("Ingrese el nombre de usuario (Admin):");
        const pass = prompt("Ingrese la contraseña (54321):");
        
        // Simulación de credenciales
        const ADMIN_USER = "Admin"; 
        const ADMIN_PASS = "54321"; 

        if (user === ADMIN_USER && pass === ADMIN_PASS) {
            alert("Acceso de administrador concedido.");
            setAdminMode(true);
        } else {
            alert("Credenciales incorrectas.");
        }
    }
}

function enableEditing() {
    document.querySelectorAll('.editable').forEach(el => {
        el.contentEditable = 'true';
        el.style.border = '1px dashed red';
        el.classList.add('editing');
    });
}

function disableEditing() {
    document.querySelectorAll('.editable').forEach(el => {
        el.contentEditable = 'false';
        el.style.border = 'none';
        el.classList.remove('editing');
    });
}

async function saveChanges() {
    if (!admin) return alert("Error: No estás en modo administrador.");

    try {
        // 1. Guardar la Información de Trámites
        const newTrameData = Array.from(DOMElements.contenedor.querySelectorAll('.tramite-card')).map(card => {
            return {
                titulo: card.querySelector('.editable[data-field="titulo"]').textContent.trim(),
                fecha: card.querySelector('.editable[data-field="fecha"]').textContent.trim(),
                periodo: card.querySelector('.editable[data-field="periodo"]').textContent.trim(),
                color: card.querySelector('.tramite-color').style.backgroundColor || 'var(--acento-cian)' // Usa el color actual o un default
            };
        });

        const { error: errorTramites } = await supabase
            .from('tramites')
            .upsert(newTrameData, { onConflict: 'titulo' }); // Asume que el título es único

        if (errorTramites) throw errorTramites;

        // 2. Guardar el estado económico
        const newStatusData = {
            titulo: DOMElements.statusDataContainer.querySelector('.editable[data-field="status-titulo"]').textContent.trim(),
            descripcion: DOMElements.statusDataContainer.querySelector('.editable[data-field="status-descripcion"]').textContent.trim(),
            estado_color: DOMElements.statusDataContainer.querySelector('.status-tag').style.backgroundColor || 'var(--acento-rojo)'
        };

        const { error: errorStatus } = await supabase
            .from('status_general')
            .update(newStatusData)
            .eq('id', 1); // Asume que solo hay una fila de estado

        if (errorStatus) throw errorStatus;

        // 3. Actualizar la hora de última edición (en la tabla de status)
        const { error: errorTime } = await supabase
            .from('status_general')
            .update({ last_edited: new Date().toISOString() })
            .eq('id', 1);

        if (errorTime) throw errorTime;


        alert("✅ Cambios guardados y publicados correctamente!");

        // Recargar datos y re-habilitar edición
        await loadData();
        await loadStatusData();
        enableEditing();

    } catch (error) {
        console.error("Error al guardar cambios:", error);
        alert(`❌ Error al guardar cambios. Por favor, revisa la consola. Detalle: ${error.message}`);
    }
}


// ----------------------------------------------------
// LÓGICA DE NOTICIAS EN EL RODILLO (TICKER)
// ----------------------------------------------------

// Función de renderizado del ticker
function renderTicker(newsArray) {
    const tickerContainer = document.getElementById('statusPanel');
    const tickerBar = document.getElementById('statusDataContainer');
    
    // Si no hay noticias, no creamos el ticker (se deja solo el panel de estado)
    if (!newsArray || newsArray.length === 0) {
        // Aseguramos que el ticker dinámico esté vacío/oculto
        document.getElementById('dynamicTickerStyles').textContent = '';
        tickerBar.style.width = '100%';
        // Volvemos a cargar el estado general para asegurarnos de que se muestre correctamente
        loadStatusData();
        return;
    }
    
    // Crear el contenido del ticker: 🚨 TITULO_ESTADO | NOTICIA 1 | NOTICIA 2 | ... | NOTICIA N | NOTICIA 1 (para loop)
    const newsContent = newsArray.map(n => 
        `<span class="ticker-item ${n.urgente ? 'urgente' : ''}">${n.emoji} ${n.texto}</span>`
    ).join(' ');

    // El contenido del ticker se concatena para asegurar un loop continuo
    tickerBar.innerHTML = `<span id="statusTickerContent">${newsContent} ${newsContent}</span>`;
    
    // 1. Medir el ancho del contenido (oculto temporalmente o en memoria)
    // Usamos un elemento temporal para medir.
    const tempEl = document.createElement('div');
    tempEl.style.position = 'absolute';
    tempEl.style.whiteSpace = 'nowrap';
    tempEl.style.fontSize = '1em'; // Debe coincidir con el tamaño de fuente
    tempEl.style.visibility = 'hidden';
    tempEl.innerHTML = newsContent; // Solo necesitamos medir un set
    document.body.appendChild(tempEl);
    const contentWidth = tempEl.offsetWidth;
    document.body.removeChild(tempEl);

    const fullTickerContent = document.getElementById('statusTickerContent');
    const fullContentWidth = fullTickerContent.offsetWidth;

    // 2. Crear las reglas de animación dinámicamente
    // La animación debe mover el doble del ancho del contenido, ya que se duplica.
    const animationDuration = Math.max(20, fullContentWidth / 50) * 2; // Duración basada en el ancho para velocidad constante
    const animationName = 'scrollTicker';
    
    const styles = `
    @keyframes ${animationName} {
        0% { transform: translateX(0); }
        100% { transform: translateX(-${contentWidth}px); } /* Solo se mueve el ancho del contenido simple */
    }

    #statusTickerContent {
        display: inline-block;
        white-space: nowrap;
        animation: ${animationName} ${animationDuration}s linear infinite;
        padding-left: 100%; /* Inicia el contenido fuera del panel */
    }
    
    .ticker-item {
        padding-right: 25px; 
    }
    
    .ticker-item.urgente {
        font-weight: 800;
        color: var(--acento-rojo);
    }
    
    /* Aseguramos que el contenedor de datos sea solo el ancho del panel */
    .status-panel-data {
        overflow: hidden;
        width: 100%;
        display: block; 
    }
    
    /* Ocultamos el título del estado general cuando hay ticker para no duplicar */
    .status-panel-data .status-panel-item {
        display: none !important;
    }
    `;
    
    // Aplicar los estilos
    document.getElementById('dynamicTickerStyles').textContent = styles;
}


async function loadNews() {
    const { data, error } = await supabase
        .from('news')
        .select('id, texto, emoji, urgente')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error al cargar noticias del ticker:", error);
        return;
    }
    
    renderTicker(data);
}

// Lógica de administrador para añadir noticias (simple)
async function addQuickNews() {
    if (!admin) return alert("Acceso denegado.");

    const texto = prompt("Ingrese el texto de la noticia (máx. 150 caracteres):");
    if (!texto || texto.trim().length === 0) return;

    const emoji = prompt("Ingrese el emoji para la noticia (ej: ⚠️, ⭐, 📰):") || '📰';
    const urgente = confirm("¿Es una noticia urgente (S/N)?");

    try {
        const { error } = await supabase
            .from('news')
            .insert({ texto: texto.substring(0, 150), emoji, urgente });

        if (error) throw error;

        alert("✅ Noticia añadida al rodillo con éxito.");
        await loadNews();
    } catch (error) {
        console.error("Error al añadir noticia:", error);
        alert("❌ Error al añadir noticia.");
    }
}

// Lógica de administrador para eliminar noticias
async function deleteNews() {
    if (!admin) return alert("Acceso denegado.");

    const { data: newsData, error: fetchError } = await supabase
        .from('news')
        .select('id, texto')
        .order('created_at', { ascending: false });

    if (fetchError) {
        console.error("Error al obtener noticias para eliminar:", fetchError);
        return alert("❌ No se pudieron cargar las noticias para eliminar.");
    }

    if (newsData.length === 0) {
        return alert("No hay noticias para eliminar.");
    }

    let newsList = "Seleccione el ID de la noticia a eliminar:\n\n";
    newsData.forEach(n => {
        newsList += `ID: ${n.id} - Texto: ${n.texto.substring(0, 50)}...\n`;
    });

    const idToDelete = prompt(newsList);

    if (!idToDelete) return;

    try {
        const { error } = await supabase
            .from('news')
            .delete()
            .eq('id', idToDelete);

        if (error) throw error;

        alert(`✅ Noticia con ID ${idToDelete} eliminada.`);
        await loadNews();
    } catch (error) {
        console.error("Error al eliminar noticia:", error);
        alert("❌ Error al eliminar noticia.");
    }
}

// ----------------------------------------------------
// LÓGICA DE TRÁMITES
// ----------------------------------------------------

function renderTramites(data) {
    if (!data || data.length === 0) {
        DOMElements.contenedor.innerHTML = '<p class="info-message">No se encontraron trámites consulares.</p>';
        return;
    }

    // Ordenar los trámites por fecha (aproximada) más reciente
    data.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));


    DOMElements.contenedor.innerHTML = data.map(item => `
        <div class="tramite-card" data-id="${item.id}">
            <div class="tramite-color" style="background-color: ${item.color || 'var(--acento-cian)'};"></div>
            <div class="tramite-content">
                <h2 class="editable" data-field="titulo">${item.titulo}</h2>
                <div class="periodo-container">
                    <span class="label">Periodo:</span> 
                    <p class="editable" data-field="periodo">${item.periodo}</p>
                </div>
                <div class="fecha-container">
                    <span class="label">Fecha aprox.:</span> 
                    <time class="editable" data-field="fecha">${item.fecha}</time>
                </div>
            </div>
        </div>
    `).join('');

    // Si el modo admin está activo, re-habilitar la edición
    if (admin) {
        enableEditing();
    }
}

async function loadData() {
    const { data, error } = await supabase
        .from('tramites')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error("Error al cargar datos de trámites:", error);
        DOMElements.contenedor.innerHTML = '<p class="error-message">❌ Error al cargar la información. Intente recargar la página.</p>';
        return;
    }

    renderTramites(data);
}

// ----------------------------------------------------
// LÓGICA DE COMENTARIOS
// ----------------------------------------------------

async function publishComment() {
    const name = DOMElements.commenterName.value.trim();
    const text = DOMElements.commentText.value.trim();

    if (!name || !text) {
        alert("Por favor, ingrese su nombre y su comentario.");
        return;
    }
    
    if (text.length > 250) {
        alert("El comentario es demasiado largo (máx. 250 caracteres).");
        return;
    }

    try {
        const { error } = await supabase
            .from('comments')
            .insert({ 
                commenter_name: name.substring(0, 30), 
                comment_text: text, 
                approved: false // Debe ser aprobado por el admin antes de mostrarse
            });

        if (error) throw error;

        alert("✅ Comentario enviado. Se publicará una vez sea revisado y aprobado por un administrador.");
        
        // Limpiar formulario
        DOMElements.commenterName.value = '';
        DOMElements.commentText.value = '';
        
        // No recargamos loadComments porque el comentario está pendiente de aprobación.

    } catch (error) {
        console.error("Error al publicar comentario:", error);
        alert(`❌ Error al publicar comentario. Detalle: ${error.message}`);
    }
}

function renderComments(data) {
    if (!data || data.length === 0) {
        DOMElements.commentsContainer.innerHTML = '<p class="info-message">Aún no hay comentarios aprobados.</p>';
        return;
    }

    DOMElements.commentsContainer.innerHTML = data.map(item => `
        <div class="comment-item">
            <div class="comment-header">
                <span class="comment-name">👤 ${item.commenter_name}</span>
                <span class="comment-date">${new Date(item.created_at).toLocaleDateString('es-ES')}</span>
            </div>
            <p class="comment-text">${item.comment_text}</p>
        </div>
    `).join('');
}

async function loadComments() {
    // Solo cargamos los comentarios que han sido aprobados
    const { data, error } = await supabase
        .from('comments')
        .select('commenter_name, comment_text, created_at')
        .eq('approved', true) // Solo los aprobados
        .order('created_at', { ascending: false })
        .limit(10); // Limitar a los 10 más recientes

    if (error) {
        console.error("Error al cargar comentarios:", error);
        DOMElements.commentsContainer.innerHTML = '<p class="error-message">❌ Error al cargar los comentarios.</p>';
        return;
    }
    
    renderComments(data);
}

// ----------------------------------------------------
// LÓGICA DE ESTADO GENERAL
// ----------------------------------------------------

function renderStatus(data) {
    if (!data || data.length === 0) return;

    const status = data[0]; // Solo esperamos un resultado

    // Actualiza la hora de la última edición
    if (status.last_edited) {
        const timeAgo = getTimeAgo(status.last_edited);
        DOMElements.lastEditedTime.textContent = `Última edición: ${timeAgo}`;
    }

    // Si hay noticias, el ticker sobrescribe este panel (manejo en loadNews/renderTicker)
    // Si no hay ticker, mostramos el estado general.
    if (document.getElementById('dynamicTickerStyles').textContent.length === 0) {
        DOMElements.statusDataContainer.innerHTML = `
            <div class="status-panel-item">
                <h3 class="editable" data-field="status-titulo">${status.titulo || 'Cargando título...'}</h3>
                <span class="status-tag" style="background-color: ${status.estado_color || 'var(--acento-rojo)'};">
                    ${status.descripcion || 'Cargando descripción...'}
                </span>
            </div>
        `;
        // Si el modo admin está activo, re-habilitar la edición
        if (admin) {
            enableEditing();
        }
    }
}

async function loadStatusData() {
    const { data, error } = await supabase
        .from('status_general')
        .select('*')
        .eq('id', 1) // Obtener la única fila
        .single(); 

    if (error) {
        console.error("Error al cargar estado general:", error);
        // Si hay error, no hacemos nada y dejamos el mensaje de carga o error
        return;
    }
    
    renderStatus([data]); // Enviamos el objeto single como array para la función renderStatus
}

// ----------------------------------------------------
// UTILIDADES
// ----------------------------------------------------

function getTimeAgo(isoDate) {
    const now = new Date();
    const past = new Date(isoDate);
    const diff = now.getTime() - past.getTime();

    if (diff < 60000) return "hace unos segundos";
    if (diff < ONE_HOUR) return `hace ${Math.floor(diff / 60000)} minutos`;
    if (diff < ONE_DAY) return `hace ${Math.floor(diff / ONE_HOUR)} horas`;
    return `el ${past.toLocaleDateString('es-ES')}`;
}


// ----------------------------------------------------
// LÓGICA DE CONTADOR DE VISITAS (REAL con Supabase)
// ----------------------------------------------------

/**
 * Registra la visita actual e inmediatamente cuenta las visitas de los últimos 7 días usando Supabase.
 * Para que esto funcione, DEBES crear la tabla 'page_views' en Supabase y sus políticas RLS.
 */
async function updateViewCounter() {
    const viewCountElement = document.getElementById('viewCount');
    
    // 1. REGISTRAR la visita actual (INSERT)
    // Esto lo hacemos en segundo plano.
    const { error: insertError } = await supabase
        .from('page_views')
        .insert({}); 

    if (insertError) {
        console.error("Error al registrar la visita:", insertError);
        // Continuamos de todas formas
    }

    // 2. CONTAR las visitas de los últimos 7 días (SELECT COUNT)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { count, error: countError } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true }) 
        .gt('created_at', sevenDaysAgo); // Filtra por las que son MÁS RECIENTES (gt) que hace 7 días

    if (countError) {
        console.error("Error al contar las vistas:", countError);
        viewCountElement.textContent = 'ERROR';
        return;
    }
    
    // 3. ACTUALIZAR el DOM con el conteo real
    const formattedViews = new Intl.NumberFormat('es-ES').format(count);
    
    if (viewCountElement) {
        viewCountElement.textContent = formattedViews;
    }
}


// ----------------------------------------------------
// FUNCIÓN DE FORMATO DE TIEMPO
// ----------------------------------------------------

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
    
    // MODIFICADO: Sustitución de loginBtn/logoutBtn por toggleAdminBtn
    DOMElements.toggleAdminBtn.addEventListener('click', toggleAdminMode);
    
    DOMElements.saveBtn.addEventListener('click', saveChanges);
    DOMElements.addNewsBtn.addEventListener('click', addQuickNews);
    DOMElements.deleteNewsBtn.addEventListener('click', deleteNews);
    DOMElements.publishCommentBtn.addEventListener('click', publishComment); 
    
    updateHeaderTime(); 
    updateViewCounter(); // LLAMADA A LA NUEVA FUNCIÓN DEL CONTADOR
    loadData();
    loadNews();
    loadComments(); 
    loadStatusData(); 
    
    // Actualizar la hora en la cabecera cada minuto
    setInterval(updateHeaderTime, 60000); 

    // Ajustes responsive para el rodillo si aplica
    window.addEventListener('resize', () => {
        if (window.resizeTimer) clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(() => {
            // Se debe volver a cargar el ticker para recalcular su ancho y velocidad si cambia el tamaño
            loadNews();
        }, 300);
    });

    // Cargar los datos periódicamente (cada 5 minutos)
    setInterval(() => {
        loadData();
        loadNews();
        loadComments();
        loadStatusData();
    }, 300000); 
});
