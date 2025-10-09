import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Configuración de Supabase
// ** REEMPLAZAR CON TUS CLAVES REALES **
const SUPABASE_URL = 'TU_SUPABASE_URL'; 
const SUPABASE_ANON_KEY = 'TU_SUPABASE_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// IDs de elementos del DOM
const contenedor = document.getElementById('contenedor');
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const adminControlsPanel = document.getElementById('adminControlsPanel');
const saveBtn = document.getElementById('saveBtn');
const statusMessage = document.getElementById('statusMessage');
const fechaActualizacionSpan = document.getElementById('fecha-actualizacion');
const statusPanel = document.getElementById('statusPanel');
const statusDataContainer = document.getElementById('statusDataContainer');
const lastEditedTimeSpan = document.getElementById('lastEditedTime'); // 👈 Elemento a actualizar
const newsTickerContent = document.getElementById('newsTickerContent');
const addNewsBtn = document.getElementById('addNewsBtn');
const deleteNewsBtn = document.getElementById('deleteNewsBtn');

// Variables de estado
let isAdmin = false;
let userSession = null; 
let allCardsData = []; 
let newsData = [];

// --- UTILIDADES ---

/**
 * Calcula el tiempo transcurrido desde un timestamp y lo formatea.
 * @param {string} timestamp - El timestamp ISO 8601 de la última edición.
 * @returns {string} - Cadena de texto formateada (ej: "hace 5 minutos").
 */
function timeSince(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now - then) / 1000);
    
    // Si la fecha es inválida o demasiado lejana, retorna un mensaje por defecto
    if (isNaN(then.getTime()) || seconds < 0) {
        return "Desconocido";
    }

    if (seconds < 60) return `${seconds} seg.`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min.`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hrs.`;
    
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} días`;
    
    const months = Math.floor(days / 30);
    return `${months} meses`;
}

/**
 * Muestra el último tiempo de edición en el panel y en la cabecera.
 */
function updateTimestamps(lastEditedTimestamp) {
    const formattedDate = new Date(lastEditedTimestamp).toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    fechaActualizacionSpan.textContent = formattedDate;

    // ⭐ CAMBIO AQUÍ: Usamos el span con ID 'lastEditedTime' 
    lastEditedTimeSpan.textContent = `Editado hace: ${timeSince(lastEditedTimestamp)}`;
}


// --- LÓGICA DE TRÁMITES (CARDS) ---

/**
 * Renderiza el contenido de una card.
 * @param {object} card - Objeto con los datos del trámite.
 * @returns {string} HTML de la card.
 */
function renderCard(card) {
    const editableAttr = isAdmin ? 'contenteditable="true"' : '';
    
    // Función auxiliar para renderizar una sección
    const renderSection = (title, key) => `
        <div class="card-section">
            <h3>${title}</h3>
            <p id="${card.id}-${key}" data-key="${key}" class="editable-field" ${editableAttr}>
                ${card[key] || 'No definido'}
            </p>
        </div>
    `;

    return `
        <div class="card" data-id="${card.id}">
            <div class="card-title">${card.title}</div>
            ${renderSection("Plazo aproximado", "plazo")}
            ${renderSection("Próximo aviso", "proximo_aviso")}
            ${renderSection("Notas importantes", "notas")}
        </div>
    `;
}

/**
 * Construye y muestra todas las cards en el contenedor.
 */
async function displayCards() {
    // Si ya tenemos los datos, los usamos. Si no, los cargamos.
    if (allCardsData.length === 0) {
        await fetchCards();
    }
    
    contenedor.innerHTML = allCardsData.map(renderCard).join('');
    
    // Actualizar el estado de edición
    updateEditability();
}

/**
 * Carga los datos de las cards desde Supabase.
 */
async function fetchCards() {
    try {
        const { data, error } = await supabase
            .from('cards')
            .select('*')
            .order('id', { ascending: true }); // Ordenar por ID o algún criterio

        if (error) throw error;
        allCardsData = data;
        
    } catch (error) {
        console.error('Error al cargar cards:', error.message);
        contenedor.innerHTML = `<p style='grid-column: 1 / -1; text-align: center; color: red;'>Error al cargar los datos. Inténtelo más tarde.</p>`;
    }
}

// --- LÓGICA DEL PANEL DE ESTADO (Déficit, Dólar, etc.) ---

/**
 * Renderiza el panel de estado económico.
 * @param {object} status - Objeto con los datos de estado.
 */
function renderStatusPanel(status) {
    if (!status) {
        statusDataContainer.innerHTML = '<p>No hay datos de estado disponibles.</p>';
        return;
    }

    const editableAttr = isAdmin ? 'contenteditable="true"' : '';

    // Función auxiliar para renderizar un ítem del panel
    const renderStatusItem = (label, key, emoji) => `
        <div class="status-item">
            ${emoji} ${label}:
            <span id="status-${key}" data-key="${key}" class="editable-field status-value" ${editableAttr}>
                ${status[key] || 'N/A'}
            </span>
        </div>
    `;

    statusDataContainer.innerHTML = `
        ${renderStatusItem("Déficit Energético MW", "deficit_mw", "⚡")}
        ${renderStatusItem("Precio USD", "precio_usd", "💵")}
        ${renderStatusItem("Precio EUR", "precio_eur", "💶")}
    `;
    
    // Actualiza el texto del tiempo de edición
    updateTimestamps(status.updated_at);
}

/**
 * Carga los datos del panel de estado desde Supabase (solo el primer registro).
 */
async function fetchStatusPanel() {
    try {
        const { data, error } = await supabase
            .from('status_panel')
            .select('*')
            .limit(1); // Solo necesitamos el único registro

        if (error) throw error;
        
        if (data && data.length > 0) {
            renderStatusPanel(data[0]);
        }
        
    } catch (error) {
        console.error('Error al cargar el panel de estado:', error.message);
    }
}

// --- LÓGICA DEL NEWS TICKER ---

/**
 * Renderiza y anima el News Ticker.
 */
function renderNewsTicker() {
    if (newsData.length === 0) {
        newsTickerContent.textContent = "Cargando noticias...";
        // Intenta cargar si no hay datos
        fetchNews();
        return;
    }
    
    const separator = " 📢 ";
    // Une todas las noticias para el efecto de marquee
    const fullContent = newsData.map(n => n.content).join(separator) + separator;
    
    newsTickerContent.textContent = fullContent;
    
    // Ajustar la velocidad de la animación según la longitud del contenido
    const contentWidth = newsTickerContent.offsetWidth;
    const containerWidth = newsTickerContent.parentNode.offsetWidth;
    
    // Cálculo: 1 segundo por cada 150 píxeles de contenido
    const duration = Math.max(15, (contentWidth + containerWidth) / 100); 

    // Recrear la animación CSS con la duración calculada
    const styleSheet = document.getElementById('dynamicTickerStyles');
    styleSheet.innerHTML = `
        .news-ticker-content {
            animation: marquee ${duration}s linear infinite;
        }
    `;

    // Si está en modo admin, se ocultan los separadores y la animación se detiene 
    // para poder editar el texto directamente.
    if(isAdmin) {
        newsTickerContent.textContent = newsData.map(n => n.content).join(" | ");
        styleSheet.innerHTML = `.news-ticker-content { animation: none; padding-left: 0; }`;
    }
}

/**
 * Carga las noticias desde Supabase.
 */
async function fetchNews() {
    try {
        const { data, error } = await supabase
            .from('news')
            .select('id, content')
            .order('id', { ascending: false }); // Últimas noticias primero

        if (error) throw error;
        newsData = data;
        renderNewsTicker();
    } catch (error) {
        console.error('Error al cargar noticias:', error.message);
        newsTickerContent.textContent = "Error al cargar noticias.";
    }
}

// --- LÓGICA DE ADMINISTRACIÓN Y GUARDADO ---

/**
 * Habilita o deshabilita los campos de edición.
 */
function updateEditability() {
    const fields = document.querySelectorAll('.editable-field');
    fields.forEach(field => {
        field.contentEditable = isAdmin ? 'true' : 'false';
        field.style.cursor = isAdmin ? 'text' : 'default';
        field.style.border = isAdmin ? '1px solid var(--accent-red-intense)' : '1px solid #ccc';
    });
}

/**
 * Recolecta todos los datos editados del DOM.
 * @returns {object} { cards: [...], status: {...} }
 */
function collectEditedData() {
    const updatedCards = [];
    const updatedStatus = {};

    // 1. Recolectar datos de las cards
    const cardElements = contenedor.querySelectorAll('.card');
    cardElements.forEach(cardEl => {
        const id = cardEl.getAttribute('data-id');
        const updatedCard = { id };
        
        // Buscar campos editables dentro de la card
        const fields = cardEl.querySelectorAll('.editable-field');
        fields.forEach(field => {
            const key = field.getAttribute('data-key');
            updatedCard[key] = field.textContent.trim();
        });
        
        // Solo agregar si la data difiere del original (opcional, pero buena práctica)
        const originalCard = allCardsData.find(c => c.id == id);
        if (originalCard && (
            originalCard.plazo !== updatedCard.plazo ||
            originalCard.proximo_aviso !== updatedCard.proximo_aviso ||
            originalCard.notas !== updatedCard.notas
        )) {
            updatedCards.push(updatedCard);
        }
    });

    // 2. Recolectar datos del panel de estado
    const statusFields = statusDataContainer.querySelectorAll('.editable-field');
    statusFields.forEach(field => {
        const key = field.getAttribute('data-key');
        updatedStatus[key] = field.textContent.trim();
    });
    
    // Incluir el ID del único registro del panel de estado (asumimos que es 1)
    updatedStatus.id = 1; 

    return { cards: updatedCards, status: updatedStatus };
}

/**
 * Guarda los cambios en Supabase.
 */
async function saveChanges() {
    if (!isAdmin) {
        alert('No tienes permisos para guardar.');
        return;
    }

    const { cards, status } = collectEditedData();
    const savePromises = [];
    
    try {
        // 1. Guardar cambios en el panel de estado (actualiza el timestamp)
        // Se usa 'upsert' (insertar/actualizar) para actualizar el único registro.
        savePromises.push(supabase
            .from('status_panel')
            .upsert({ 
                id: status.id, 
                deficit_mw: status.deficit_mw,
                precio_usd: status.precio_usd,
                precio_eur: status.precio_eur
            })
            .select() // Pide los datos actualizados para el nuevo timestamp
        );
        
        // 2. Guardar cambios en las cards
        for (const card of cards) {
            savePromises.push(supabase
                .from('cards')
                .update(card)
                .match({ id: card.id })
            );
        }
        
        // Esperar a que todas las promesas se resuelvan
        const results = await Promise.all(savePromises);
        
        // Extraer el resultado del panel de estado para obtener el nuevo timestamp
        const statusResult = results.find(res => res.data && res.data[0] && res.data[0].id === status.id);
        if (statusResult && statusResult.data && statusResult.data.length > 0) {
            updateTimestamps(statusResult.data[0].updated_at);
        }

        alert('✅ Cambios guardados y publicados con éxito.');
        // Recargar solo los datos de las cards para que allCardsData esté fresco
        await fetchCards(); 
        displayCards(); // Renderiza de nuevo para limpiar cualquier estado de edición visual
        
    } catch (error) {
        console.error('Error al guardar cambios:', error.message);
        alert(`❌ Error al guardar: ${error.message}`);
    }
}

// --- LÓGICA DE AUTENTICACIÓN ---

/**
 * Maneja el login con Supabase.
 */
loginBtn.addEventListener('click', async () => {
    const user = document.getElementById('user').value;
    const pass = document.getElementById('pass').value;

    try {
        // Usa la autenticación por correo y contraseña de Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: user, 
            password: pass,
        });

        if (error) {
            throw error;
        }
        
        // Si el login fue exitoso, verifica si el usuario es administrador
        userSession = data.session;
        isAdmin = true; // Si el login es exitoso, asumimos que es un admin valido
        
        statusMessage.textContent = '✅ Modo de edición activado.';
        loginForm.style.display = 'none';
        adminControlsPanel.style.display = 'block';
        updateEditability();
        renderNewsTicker(); // Renderiza el ticker sin animación para editar
        
    } catch (error) {
        console.error('Error de autenticación:', error.message);
        statusMessage.textContent = '❌ Credenciales incorrectas.';
        isAdmin = false;
        updateEditability();
    }
});

/**
 * Maneja el logout.
 */
logoutBtn.addEventListener('click', async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        isAdmin = false;
        userSession = null;
        
        statusMessage.textContent = 'Accede como admin para editar';
        loginForm.style.display = 'block';
        adminControlsPanel.style.display = 'none';
        
        updateEditability();
        renderNewsTicker(); // Reactiva el marquee para el modo no-admin
        
    } catch (error) {
        console.error('Error al cerrar sesión:', error.message);
        alert('Error al cerrar sesión.');
    }
});

// --- LÓGICA DE EDICIÓN DE NOTICIAS ---

addNewsBtn.addEventListener('click', async () => {
    const newContent = prompt("Ingrese el texto de la nueva noticia (max 100 caracteres):");
    if (newContent && newContent.trim().length > 0) {
        try {
            const { data, error } = await supabase
                .from('news')
                .insert([{ content: newContent.trim().substring(0, 100) }])
                .select();

            if (error) throw error;
            
            // Añadir la nueva noticia al inicio del array local
            newsData.unshift(data[0]); 
            renderNewsTicker();
            alert('Noticia añadida con éxito.');

        } catch (error) {
            console.error('Error al añadir noticia:', error.message);
            alert(`Error al añadir noticia: ${error.message}`);
        }
    }
});

deleteNewsBtn.addEventListener('click', async () => {
    if (newsData.length === 0) {
        alert('No hay noticias para eliminar.');
        return;
    }

    // Crea la lista de opciones para el prompt
    const newsList = newsData.map((n, index) => 
        `${index + 1}: ${n.content.substring(0, 50)}...`
    ).join('\n');

    const selection = prompt(`Ingrese el número de la noticia a eliminar:\n\n${newsList}`);
    const indexToDelete = parseInt(selection) - 1;

    if (isNaN(indexToDelete) || indexToDelete < 0 || indexToDelete >= newsData.length) {
        if (selection !== null && selection !== '') {
            alert('Selección inválida.');
        }
        return;
    }

    const newsItem = newsData[indexToDelete];
    const confirmDelete = confirm(`¿Está seguro de eliminar la noticia: "${newsItem.content.substring(0, 50)}..."?`);

    if (confirmDelete) {
        try {
            const { error } = await supabase
                .from('news')
                .delete()
                .match({ id: newsItem.id });

            if (error) throw error;

            // Eliminar del array local y actualizar
            newsData.splice(indexToDelete, 1);
            renderNewsTicker();
            alert('Noticia eliminada con éxito.');

        } catch (error) {
            console.error('Error al eliminar noticia:', error.message);
            alert(`Error al eliminar noticia: ${error.message}`);
        }
    }
});


// --- INICIALIZACIÓN ---

/**
 * Función principal de inicialización.
 */
async function init() {
    saveBtn.addEventListener('click', saveChanges);
    
    // Cargar todos los datos al inicio
    await Promise.all([
        fetchCards(),
        fetchStatusPanel(),
        fetchNews()
    ]);
    
    displayCards();
}

// Iniciar la aplicación
init();
