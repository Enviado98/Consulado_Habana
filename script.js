// ----------------------------------------------------
// 🚨 CONFIGURACIÓN DE SUPABASE (POSTGRESQL BAAS) 🚨
// ----------------------------------------------------
// !!! NO IMPORTA QUE ESTÉ EN EL CÓDIGO DIRECTAMENTE (WEB DE PRUEBA) !!!
const SUPABASE_URL = "https://ekkaagqovdmcdexrjosh.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2FhZ3FvdmRtY2RleHJqb3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NjU2NTEsImV4cCI6MjA3NTQ0MTY1MX0.mmVl7C0Hkzrjoks7snvHWMYk-ksSXkUWzVexhtkozRA"; 
// ----------------------------------------------------

// 🚨 CREDENCIALES DE ADMINISTRADOR 🚨
// Eliminadas para el modo de edición público
// ----------------------------------------------------

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let admin = false;

// Variables y constantes de tiempo
const ONE_HOUR = 3600000;
const ONE_DAY = 24 * ONE_HOUR;
const RECENT_THRESHOLD_MS = ONE_DAY; 
const OLD_THRESHOLD_MS = 7 * ONE_DAY;
const NEWS_SCROLL_SPEED_PX_PER_SEC = 50; 
const TIME_PANEL_AUTOHIDE_MS = 2000; 

let currentData = [];
let currentNews = []; 
let currentStatus = {}; 
const timePanelTimeouts = new Map(); 

// 🔑 LÓGICA DE USUARIO WEB ÚNICO (Para persistir los Likes)
let userWebId = localStorage.getItem('userWebId');
if (!userWebId) {
    userWebId = crypto.randomUUID(); 
    localStorage.setItem('userWebId', userWebId);
}

// Elementos del DOM (Simplificado)
const DOMElements = {
    body: document.body,
    contenedor: document.getElementById('contenedor'),
    newsTicker: document.getElementById('newsTicker'),
    newsTickerContent: document.getElementById('newsTickerContent'),
    fixedLabel: document.querySelector('.news-ticker-fixed-label'),
    commentsContainer: document.getElementById('commentsContainer'),
    commenterName: document.getElementById('commenterName'),
    commentText: document.getElementById('commentText'),
    publishCommentBtn: document.getElementById('publishCommentBtn'),
    adminControlsPanel: document.getElementById('adminControlsPanel'),
    // NUEVO: Contenedor del botón de acceso público
    publicEditAccess: document.getElementById('publicEditAccess'),
    statusMessage: document.getElementById('statusMessage'),
    // NUEVO: Botón de acceso directo
    enableEditBtn: document.getElementById('enableEditBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    saveBtn: document.getElementById('saveBtn'),
    addNewsBtn: document.getElementById('addNewsBtn'),
    deleteNewsBtn: document.getElementById('deleteNewsBtn'),
    // Eliminados user y pass
    dynamicTickerStyles: document.getElementById('dynamicTickerStyles'),
    // ⭐ NUEVOS ELEMENTOS DEL PANEL DE ESTADO UNIFICADO ⭐
    statusPanel: document.getElementById('statusPanel'),
    statusDataContainer: document.getElementById('statusDataContainer'),
    lastEditedTime: document.getElementById('lastEditedTime')
};


// ----------------------------------------------------
// FUNCIÓN DE FORMATO DE TIEMPO
// ----------------------------------------------------

function timeAgo(timestamp) {
    if (!timestamp) return { text: 'Sin fecha de edición.', diff: -1, date: null };
    
    const then = new Date(timestamp).getTime();
    const now = Date.now();
    const diff = now - then;

    if (diff < 0) return { text: 'Ahora mismo', diff: 0, date: new Date(timestamp) }; 

    const SECONDS = Math.floor(diff / 1000);
    const MINUTES = Math.floor(SECONDS / 60);
    const HOURS = Math.floor(MINUTES / 60);
    const DAYS = Math.floor(HOURS / 24);

    let text;
    if (DAYS >= 30) {
        text = `hace ${Math.floor(DAYS / 30)} meses`;
    } else if (DAYS >= 7) {
        const weeks = Math.floor(DAYS / 7);
        text = `hace ${weeks} sem.`;
    } else if (DAYS >= 2) {
        text = `hace ${DAYS} días`;
    } else if (DAYS === 1) {
        text = 'hace 1 día';
    } else if (HOURS >= 2) {
        text = `hace ${HOURS} horas`;
    } else if (HOURS === 1) {
        text = 'hace 1 hora';
    } else if (MINUTES >= 1) {
        text = `hace ${MINUTES} min.`;
    } else {
        text = 'hace unos momentos';
    }
    
    return { text, diff, date: new Date(timestamp) };
}


// ----------------------------------------------------
// FUNCIONES DE UI Y EDICIÓN PÚBLICA (MODIFICADAS)
// ----------------------------------------------------

function updateAdminUI(isAdmin) {
    admin = isAdmin;
    if (isAdmin) {
        DOMElements.body.classList.add('admin-mode');
        // Ocultar el botón de acceso público
        DOMElements.publicEditAccess.style.display = "none";
        DOMElements.adminControlsPanel.style.display = "flex";
        DOMElements.statusMessage.textContent = "✅ Modo de Edición Activado";
        DOMElements.statusMessage.style.color = "#0d9488"; 
    } else {
        DOMElements.body.classList.remove('admin-mode');
        // Mostrar el botón de acceso público
        DOMElements.publicEditAccess.style.display = "block";
        DOMElements.adminControlsPanel.style.display = "none";
        DOMElements.statusMessage.textContent = "Pulsa el botón para activar el modo de edición.";
        DOMElements.statusMessage.style.color = "var(--color-texto-principal)"; 
    }
    
    // ⭐ ACTUALIZACIÓN DEL PANEL DE ESTADO EN MODO ADMIN ⭐
    if (isAdmin) {
        DOMElements.statusPanel.classList.add('admin-mode');
        renderStatusPanel(currentStatus, true); 
    } else {
        DOMElements.statusPanel.classList.remove('admin-mode');
        renderStatusPanel(currentStatus, false); 
    }
}

// NUEVA FUNCIÓN DE ACCESO DIRECTO
function enableEditMode(){
    updateAdminUI(true);
    alert("Modo edición activado. ¡No olvides guardar!");
    enableEditing(); 
}

async function logout(){
  updateAdminUI(false);
  disableEditing(); 
  alert("Sesión cerrada. Los cambios no guardados se perderán.");

  // Se eliminaron las líneas para limpiar user/pass
  
  await loadData(); 
  await loadStatusData(); 
}

function enableEditing() {
    toggleEditing(true);
}

function disableEditing() {
    toggleEditing(false);
}

// ----------------------------------------------------
// CREACIÓN DE CARD (Fusión y Edición Avanzada)
// ----------------------------------------------------

function createCardHTML(item, index) {
    let cardClass = '';
    let labelHTML = '';
    let panelStyle = ''; 
    let labelText = 'Sin fecha'; 
    let timeText = 'Sin editar';

    if (item.last_edited_timestamp) {
        const { text, diff } = timeAgo(item.last_edited_timestamp);
        timeText = text;
        
        if (diff >= 0 && diff < RECENT_THRESHOLD_MS) {
            cardClass = 'card-recent';
            labelHTML = '<div class="card-label" style="background-color: var(--acento-rojo); color: white; display: block;">!EDITADO RECIENTEMENTE¡</div>';
            panelStyle = `background: var(--tiempo-panel-rojo); color: var(--acento-rojo);`; 
            labelText = ''; 
        } else if (diff >= OLD_THRESHOLD_MS) {
            cardClass = 'card-old';
            labelHTML = '<div class="card-label" style="background-color: var(--acento-cian); color: var(--color-texto-principal); display: block;">Editado hace un tiempo</div>';
            panelStyle = `background: var(--tiempo-panel-cian); color: var(--acento-cian);`;
            labelText = '';
        } else {
            panelStyle = `background: white; color: var(--color-texto-principal);`;
            labelText = 'Actualizado';
        }
    }
    
    return `
    <div class="card ${cardClass}" data-index="${index}" data-id="${item.id}"> 
        ${labelHTML}
        
        <span class="emoji">${item.emoji}</span>
        <h3>${item.titulo}</h3>
        <div class="card-content">
            <p>${item.contenido}</p>
        </div>
        <div class="card-time-panel" style="${panelStyle}">
            <strong>${labelText}</strong> (${timeText})
        </div>
    </div>
    `;
}

function toggleEditing(enable) {
    const cards = document.querySelectorAll(".card");
    cards.forEach(card => {
        const index = card.getAttribute('data-index');
        const item = currentData[index];
        const contentDiv = card.querySelector('.card-content');
        
        // Elementos de Vista
        const emojiSpan = card.querySelector('.emoji');
        const titleH3 = card.querySelector('h3');
        const contentP = contentDiv.querySelector('p');
        
        // Elementos de Edición
        let editableEmoji = card.querySelector('.editable-emoji');
        let editableTitle = card.querySelector('.editable-title');
        let editableContent = card.querySelector('.editable-content');

        if (enable) {
            // Entrar en modo Admin
            card.removeEventListener('click', toggleTimePanel); 
            card.classList.remove('card-recent', 'card-old');
            card.style.background = 'white'; 
            card.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.3)'; 
            card.style.border = '1px solid #4f46e5'; 
            card.querySelector('.card-time-panel').style.display = 'none';
            const label = card.querySelector('.card-label');
            if (label) label.style.display = 'none';


            if (emojiSpan && titleH3 && contentP) {
                // 1. Emoji
                emojiSpan.remove();
                editableEmoji = document.createElement('input');
                editableEmoji.className = 'editable-emoji';
                editableEmoji.value = item.emoji;
                editableEmoji.defaultValue = item.emoji;
                editableEmoji.maxLength = 2;
                editableEmoji.title = "Emoji";
                card.insertBefore(editableEmoji, card.firstChild);
                
                // 2. Título
                titleH3.remove();
                editableTitle = document.createElement('input');
                editableTitle.className = 'editable-title';
                editableTitle.value = item.titulo;
                editableTitle.defaultValue = item.titulo;
                editableTitle.title = "Título";
                card.insertBefore(editableTitle, editableEmoji.nextSibling);

                // 3. Contenido
                contentP.remove();
                editableContent = document.createElement('textarea');
                editableContent.className = 'editable-content';
                editableContent.value = item.contenido;
                editableContent.defaultValue = item.contenido;
                editableContent.title = "Contenido";
                contentDiv.appendChild(editableContent);
            }
        } else {
            // Salir del modo Admin
            if (editableEmoji && editableTitle && editableContent) {
                // 1. Emoji
                editableEmoji.remove();
                const newEmojiSpan = document.createElement('span');
                newEmojiSpan.className = 'emoji';
                newEmojiSpan.textContent = editableEmoji.value;
                card.insertBefore(newEmojiSpan, card.firstChild);
                
                // 2. Título
                editableTitle.remove();
                const newTitleH3 = document.createElement('h3');
                newTitleH3.textContent = editableTitle.value;
                card.insertBefore(newTitleH3, newEmojiSpan.nextSibling);

                // 3. Contenido
                editableContent.remove();
                const newP = document.createElement('p');
                newP.textContent = editableContent.value;
                contentDiv.appendChild(newP);
                
                // Restaurar estilos de tarjeta (LoadData se encarga de la mayoría)
                card.style.background = '';
                card.style.boxShadow = '';
                card.style.border = '';
                card.querySelector('.card-time-panel').style.display = 'block';
                const label = card.querySelector('.card-label');
                if (label) label.style.display = 'block';
            }
        }
    });
}

function toggleTimePanel(event) {
    if (admin) return;
    
    const clickedCard = event.currentTarget;
    const cardId = clickedCard.getAttribute('data-id'); 
    
    const allCards = document.querySelectorAll('.card');
    allCards.forEach(card => {
        const id = card.getAttribute('data-id');
        if (id !== cardId) {
            card.classList.remove('show-time-panel');
        }
        
        if (timePanelTimeouts.has(id)) {
            clearTimeout(timePanelTimeouts.get(id));
            timePanelTimeouts.delete(id);
        }
    });

    const isShowing = clickedCard.classList.toggle('show-time-panel');

    if (isShowing) {
        const timeout = setTimeout(() => {
            clickedCard.classList.remove('show-time-panel');
            timePanelTimeouts.delete(cardId); 
        }, TIME_PANEL_AUTOHIDE_MS);
        
        timePanelTimeouts.set(cardId, timeout); 
    }
}


// ----------------------------------------------------
// LÓGICA DE NOTICIAS 
// ----------------------------------------------------

function linkify(text) {
    const urlPattern = /(\b(https?:\/\/|www\.)[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    
    return text.replace(urlPattern, (url) => {
        let fullUrl = url.startsWith('http') ? url : 'http://' + url;
        return `<a href="${fullUrl}" target="_blank">${url}</a>`;
    });
}

async function loadNews() {
    
    const { data: newsData, error } = await supabase
        .from('noticias')
        .select('id, text, timestamp')
        .order('timestamp', { ascending: false });

    if (error) {
        console.error("Error al cargar noticias de Supabase:", error);
        return;
    }

    const twentyFourHoursAgoTimestamp = Date.now() - RECENT_THRESHOLD_MS;
    const validNews = [];
    const deletePromises = [];

    newsData.forEach(n => {
        if (new Date(n.timestamp).getTime() < twentyFourHoursAgoTimestamp) {
            deletePromises.push(supabase.from('noticias').delete().eq('id', n.id));
        } else {
            validNews.push(n);
        }
    });
    if (deletePromises.length > 0) {
        Promise.all(deletePromises).catch(err => console.error("Error al limpiar noticias antiguas:", err));
    }


    currentNews = validNews;
    
    if (validNews.length > 0) {
        const newsHtml = validNews.map(n => {
            const { text: timeInfo } = timeAgo(n.timestamp);
            return `<span class="news-item">${linkify(n.text)} <small>(${timeInfo})</small></span>`;
        }).join('<span class="news-item"> | </span>');
        
        const contentToMeasure = `${newsHtml}<span class="news-item"> | </span>`;
        const repeatedContent = `${contentToMeasure}${newsHtml}`; 
        
        DOMElements.newsTicker.style.display = 'flex'; 
        DOMElements.fixedLabel.textContent = 'NOTICIAS'; 
        
        DOMElements.newsTickerContent.style.animation = 'none'; 
        DOMElements.newsTickerContent.style.transform = 'none';
        
        DOMElements.newsTickerContent.innerHTML = repeatedContent;

        DOMElements.newsTickerContent.offsetHeight; 

        window.requestAnimationFrame(() => {
            
            const totalContentWidth = DOMElements.newsTickerContent.scrollWidth; 
            const uniqueContentWidth = totalContentWidth / 2;
            
            if (uniqueContentWidth <= 0) return;

            const durationSeconds = uniqueContentWidth / NEWS_SCROLL_SPEED_PX_PER_SEC;

            DOMElements.dynamicTickerStyles.innerHTML = ''; 

            const keyframesRule = `@keyframes ticker-move-dynamic { 
                0% { transform: translateX(0); }
                100% { transform: translateX(-${uniqueContentWidth}px); } 
            }`;
            
            DOMElements.dynamicTickerStyles.innerHTML = keyframesRule;

            DOMElements.newsTickerContent.style.animationDuration = `${durationSeconds}s`;
            DOMElements.newsTickerContent.style.animationName = 'ticker-move-dynamic';
            DOMElements.newsTickerContent.style.animationPlayState = 'running';
            DOMElements.newsTickerContent.style.animationIterationCount = 'infinite';
            DOMElements.newsTickerContent.style.animationTimingFunction = 'linear';
        });

    
    } else {
        const avisoText = 'Sin noticias de última hora en estos momentos. Consulte el calendario para el estado general de los trámites.';
        const repeatedAviso = `<span class="news-item">${avisoText}</span><span class="news-item"> | </span><span class="news-item">${avisoText}</span>`;
        
        DOMElements.newsTicker.style.display = 'flex'; 
        DOMElements.fixedLabel.textContent = 'AVISO'; 
        DOMElements.newsTickerContent.style.animation = 'none'; 
        DOMElements.newsTickerContent.style.transform = 'none';
        
        DOMElements.newsTickerContent.innerHTML = repeatedAviso;

        DOMElements.newsTickerContent.style.animationDuration = `15s`; 
        DOMElements.newsTickerContent.style.animationName = 'ticker-move-static';
        DOMElements.newsTickerContent.style.animationPlayState = 'running';
        DOMElements.newsTickerContent.style.animationIterationCount = 'infinite';
        DOMElements.newsTickerContent.style.animationTimingFunction = 'linear';
    }
}

async function addQuickNews() {
    if (!admin) { alert("Acceso denegado."); return; }
    const newsText = window.prompt("Escribe el mensaje de última hora...");
    if (newsText === null || newsText.trim() === "") return;
    
    const confirmSave = confirm(`¿Confirmas que deseas publicar: \n\n"${newsText.trim()}"\n\n(Se borrará automáticamente en 24 horas)`);

    if (confirmSave) {
        try {
            const { error } = await supabase.from('noticias').insert([{ text: newsText.trim() }]);
            if (error) throw error;
            alert(`✅ Noticia publicada.`);
            loadNews(); 
        } catch (error) {
            console.error("Error al guardar la noticia:", error);
            alert("❌ Error al guardar la noticia. Revisa RLS.");
        }
    }
}

async function deleteNews() {
    if (!admin) { alert("Acceso denegado."); return; }
    if (currentNews.length === 0) {
        alert("No hay noticias activas para eliminar.");
        return;
    }

    const newsList = currentNews.map((n, index) => `${index + 1}. ${n.text}`).join('\n');
    const choice = window.prompt(`Selecciona el número de la noticia que deseas eliminar:\n\n${newsList}`);

    const indexToDelete = parseInt(choice) - 1;

    if (isNaN(indexToDelete) || indexToDelete < 0 || indexToDelete >= currentNews.length) {
        if (choice !== null) alert("Selección inválida.");
        return;
    }

    const newsItem = currentNews[indexToDelete];
    const confirmDelete = confirm(`¿Estás seguro de que quieres eliminar esta noticia?\n\n"${newsItem.text}"`);

    if (confirmDelete) {
        try {
            const { error } = await supabase.from('noticias').delete().eq('id', newsItem.id); 
            if (error) throw error;
            alert(`✅ Noticia eliminada.`);
            loadNews();
        } catch (error) {
            console.error("Error al eliminar la noticia:", error);
            alert("❌ Error al eliminar la noticia. Revisa RLS.");
        }
    }
}


// ----------------------------------------------------
// LÓGICA DEL PANEL DE ESTADO
// ----------------------------------------------------

async function loadStatusData() {
// ... (Se omite el detalle de esta función ya que no fue modificada)
}

function renderStatusPanel(status, isAdmin) {
// ... (Se omite el detalle de esta función ya que no fue modificada)
}

function getChangesToSaveStatus() {
// ... (Se omite el detalle de esta función ya que no fue modificada)
}

async function saveChanges() {
// ... (Se omite el detalle de esta función ya que no fue modificada)
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
// LÓGICA DE COMENTARIOS, HILOS Y LIKES
// ----------------------------------------------------

function generateColorByName(str) {
// ... (Se omite el detalle de esta función ya que no fue modificada)
}

function formatCommentDate(timestamp) {
// ... (Se omite el detalle de esta función ya que no fue modificada)
}

function createCommentHTML(comment, isLiked) {
// ... (Se omite el detalle de esta función ya que no fue modificada)
}

function drawReplies(container, replies, userLikesMap) {
// ... (Se omite el detalle de esta función ya que no fue modificada)
}

async function loadComments() {
// ... (Se omite el detalle de esta función ya que no fue modificada)
}

function toggleReplyForm(event) {
// ... (Se omite el detalle de esta función ya que no fue modificada)
}

async function publishComment() {
// ... (Se omite el detalle de esta función ya que no fue modificada)
}

async function handlePublishReply(event) {
// ... (Se omite el detalle de esta función ya que no fue modificada)
}

async function handleLikeToggle(event) {
// ... (Se omite el detalle de esta función ya que no fue modificada)
}

// ----------------------------------------------------
// MANEJO DE EVENTOS Y CARGA INICIAL
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    
    // CAMBIO DE EVENTO: DE loginBtn A enableEditBtn
    DOMElements.enableEditBtn.addEventListener('click', enableEditMode);
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
    
    window.addEventListener('resize', () => {
        if (window.resizeTimer) clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(() => {
            loadNews(); // Recalcula el ticker en resize si es necesario
        }, 200);
    });
});
