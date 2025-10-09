// news_script.js

// --- CONFIGURACIÓN DE FIREBASE (Simulación - DEBES REEMPLAZAR CON TUS CREDENCIALES REALES) ---
// Atención: Por ser un proyecto de código libre, las credenciales se dejan aquí.
const firebaseConfig = {
    apiKey: "TU_API_KEY_DE_FIREBASE", // <<--- REEMPLAZAR
    authDomain: "TU_PROJECT_ID.firebaseapp.com", // <<--- REEMPLAZAR
    databaseURL: "https://TU_PROJECT_ID.firebaseio.com", // <<--- REEMPLAZAR
    projectId: "TU_PROJECT_ID", // <<--- REEMPLAZAR
    storageBucket: "TU_PROJECT_ID.appspot.com", // <<--- REEMPLAZAR
    messagingSenderId: "TU_MESSAGING_SENDER_ID", // <<--- REEMPLAZAR
    appId: "TU_APP_ID" // <<--- REEMPLAZAR
};

// Inicializar Firebase (Asegúrate de incluir los SDKs en news.html o usa módulos si prefieres)
// Para que este código funcione, DEBES incluir los scripts de Firebase en news.html antes de news_script.js:
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>

// firebase.initializeApp(firebaseConfig);
// const db = firebase.database();
// const newsRef = db.ref('news_banners');

// ---------------------------------------------------------------------------------------------

// --- VARIABLES GLOBALES y DOM ELEMENTS ---
let isAdminMode = false;
const newsBannersContainer = document.getElementById('newsBannersContainer');
const toggleNewsAdminBtn = document.getElementById('toggleNewsAdminBtn');
const newsAdminPanel = document.getElementById('newsAdminPanel');
const bannerCreationSection = document.getElementById('bannerCreationSection');
const addBannerBtn = document.getElementById('addBannerBtn');
const publishBannerBtn = document.getElementById('publishBannerBtn');
const cancelBannerBtn = document.getElementById('cancelBannerBtn');

// Simulación de la base de datos si Firebase no está configurado
let newsData = JSON.parse(localStorage.getItem('news_banners_data')) || [
    {
        id: 'mock1',
        title: '¡Importante! Nuevo Sistema de Citas para Pasaportes 🛂',
        content: 'A partir del 15 de Octubre, todas las solicitudes de pasaporte y renovación deberán gestionarse exclusivamente a través del nuevo portal online. Los correos electrónicos ya no serán válidos para este trámite.\n\nMás información en la web oficial: https://www.exteriores.gob.es/',
        timestamp: Date.now() - 86400000, // Hace 1 día
        color: '#2980b9', // Azul
        comments: [
            { name: 'Elena R.', text: '¡Por fin un sistema más organizado!', likes: 5, timestamp: Date.now() - 70000000 },
            { name: 'Pedro M.', text: 'Espero que funcione bien, la web anterior era terrible.', likes: 2, timestamp: Date.now() - 60000000 }
        ]
    },
    {
        id: 'mock2',
        title: 'Apertura de Convocatoria de Becas MAEC-AECID 🎓',
        content: 'Se abre el plazo para la solicitud de becas para ciudadanos cubanos para el curso académico 2025-2026. Revisar requisitos y documentación necesaria en el enlace adjunto.\n\nDocumentación: https://www.aecid.es/es/convocatorias/',
        timestamp: Date.now() - (86400000 * 3), // Hace 3 días
        color: '#27ae60', // Verde
        comments: [
            { name: 'Laura F.', text: 'Excelente noticia, ¡gracias por compartir!', likes: 10, timestamp: Date.now() - (86400000 * 2) }
        ]
    }
];

// ---------------------------------------------------------------------------------------------

// --- FUNCIONES AUXILIARES ---

/**
 * Guarda los datos en el localStorage (simulando una escritura en la DB).
 */
function saveNewsData() {
    // Si usas Firebase, aquí se haría la escritura a 'newsRef'
    localStorage.setItem('news_banners_data', JSON.stringify(newsData));
}

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
    // Expresión regular para detectar URLs que comienzan con http:// o https:// o www.
    const urlRegex = /(\b(https?:\/\/[^\s]+|www\.[^\s]+)\b)/g;
    
    // Primero, reemplaza URLs por tags <a>
    let linkedText = text.replace(urlRegex, function(url) {
        // Asegurarse de que el protocolo esté presente
        let fullURL = url;
        if (!url.match(/^https?:\/\//i)) {
            fullURL = 'http://' + url;
        }
        return `<a href="${fullURL}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });

    // Luego, convierte saltos de línea (\n) en <br> para el formato
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
    const isLiked = localStorage.getItem(`like_${bannerId}_${comment.timestamp}`) === 'true';
    const likeClass = isLiked ? 'liked' : '';
    const date = new Date(comment.timestamp).toLocaleDateString('es-ES');

    return `
        <div class="comment-item">
            <strong>${comment.name}</strong> (${date}): ${comment.text}
            <div style="text-align: right; margin-top: 5px;">
                <button class="like-btn ${likeClass}" data-comment-ts="${comment.timestamp}" data-banner-id="${bannerId}">
                    ❤️ ${comment.likes || 0}
                </button>
            </div>
        </div>
    `;
}

/**
 * Crea el HTML completo para una pancarta de noticias.
 * @param {object} banner - Objeto del banner de noticias.
 */
function createBannerHtml(banner) {
    const date = new Date(banner.timestamp).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
    const formattedContent = linkify(banner.content);
    
    // El primer comentario visible, o un mensaje si no hay comentarios
    const firstComment = banner.comments && banner.comments.length > 0 ? banner.comments[0] : null;
    const initialCommentHtml = firstComment ? `<div class="comment-item first-comment"><strong>${firstComment.name}</strong>: ${firstComment.text}</div>` : '';
    
    // El resto de los comentarios (incluyendo el primero si hay más de 1, para el despliegue)
    const otherCommentsHtml = (banner.comments || []).map(comment => createCommentHtml(comment, banner.id)).join('');

    const viewMoreButton = banner.comments && banner.comments.length > 1 ? 
        `<button class="view-comments-btn" data-banner-id="${banner.id}" data-expanded="false">Ver ${banner.comments.length - 1} comentarios más... </button>` :
        (banner.comments && banner.comments.length === 1 ? 'Solo 1 comentario.' : 'Sé el primero en comentar.');


    const bannerElement = document.createElement('article');
    bannerElement.className = 'news-banner';
    bannerElement.dataset.id = banner.id;
    bannerElement.style.backgroundColor = banner.color;

    bannerElement.innerHTML = `
        <button class="delete-banner-btn" style="display:${isAdminMode ? 'block' : 'none'};">×</button>
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
 * Carga y renderiza todas las pancartas desde la fuente de datos.
 */
function renderAllBanners() {
    // Simula una consulta a la DB (ordenamos por timestamp descendente)
    const sortedData = newsData.sort((a, b) => b.timestamp - a.timestamp);
    
    newsBannersContainer.innerHTML = ''; // Limpiar contenedor
    
    if (sortedData.length === 0) {
        newsBannersContainer.innerHTML = '<p style="text-align: center; color: #777; margin: 30px;">Aún no hay noticias destacadas. ¡El administrador puede crear la primera!</p>';
        return;
    }
    
    sortedData.forEach(createBannerHtml);
}

// ---------------------------------------------------------------------------------------------

// --- HANDLERS DE EVENTOS ---

/**
 * Alterna el modo edición de la página.
 */
function toggleAdminMode() {
    isAdminMode = !isAdminMode;
    
    // 1. Mostrar/Ocultar el panel de administración de noticias
    newsAdminPanel.style.display = isAdminMode ? 'flex' : 'none';
    
    // 2. Cambiar el texto del botón principal
    toggleNewsAdminBtn.textContent = isAdminMode ? '✅ MODO EDICIÓN ACTIVO' : '🛡️ MODO EDICIÓN DE NOTICIAS';
    toggleNewsAdminBtn.classList.toggle('active', isAdminMode);

    // 3. Mostrar/Ocultar los botones de eliminar en las pancartas
    document.querySelectorAll('.delete-banner-btn').forEach(btn => {
        btn.style.display = isAdminMode ? 'block' : 'none';
    });
    
    // Ocultar siempre el formulario de creación al desactivar el modo.
    if (!isAdminMode) {
        bannerCreationSection.style.display = 'none';
    }
}

/**
 * Muestra el formulario de creación de pancarta.
 */
function showBannerCreationForm() {
    if (isAdminMode) {
        bannerCreationSection.style.display = 'block';
        document.getElementById('bannerTitle').value = '';
        document.getElementById('bannerContent').value = '';
    }
}

/**
 * Oculta el formulario de creación de pancarta.
 */
function hideBannerCreationForm() {
    bannerCreationSection.style.display = 'none';
}

/**
 * Publica una nueva pancarta de noticias.
 */
function publishNewBanner() {
    const title = document.getElementById('bannerTitle').value.trim();
    const content = document.getElementById('bannerContent').value.trim();

    if (title.length < 5 || content.length < 10) {
        alert('El título debe tener al menos 5 caracteres y el contenido al menos 10.');
        return;
    }

    const newBanner = {
        id: 'id_' + Date.now(), // ID único
        title: title,
        content: content,
        timestamp: Date.now(),
        color: getRandomColor(),
        comments: []
    };

    // Agregar a la data y guardar (simulación de DB)
    newsData.push(newBanner);
    saveNewsData();

    // Re-renderizar para mostrar la nueva pancarta
    renderAllBanners();
    hideBannerCreationForm();
    alert('Pancarta publicada con éxito!');
}

/**
 * Elimina una pancarta de noticias.
 * @param {string} bannerId - ID del banner a eliminar.
 */
function deleteBanner(bannerId) {
    if (!isAdminMode || !confirm('¿Estás seguro de que deseas eliminar esta pancarta de forma permanente?')) {
        return;
    }

    // Filtrar la data (simulación de eliminación en DB)
    newsData = newsData.filter(b => b.id !== bannerId);
    saveNewsData();
    
    // Re-renderizar
    renderAllBanners();
    alert('Pancarta eliminada.');
}

/**
 * Maneja la publicación de un nuevo comentario.
 * @param {string} bannerId - ID del banner.
 * @param {string} name - Nombre del comentarista.
 * @param {string} text - Contenido del comentario.
 */
function publishComment(bannerId, name, text) {
    if (name.length < 2 || text.length < 5) {
        alert('Por favor, ingresa tu nombre y un comentario de al menos 5 caracteres.');
        return;
    }

    const newComment = {
        name: name,
        text: text,
        likes: 0,
        timestamp: Date.now()
    };

    const bannerIndex = newsData.findIndex(b => b.id === bannerId);

    if (bannerIndex !== -1) {
        newsData[bannerIndex].comments.push(newComment);
        saveNewsData();
        renderAllBanners();
        alert('Comentario publicado.');
    }
}

/**
 * Maneja el evento de Like en un comentario.
 * @param {string} bannerId - ID del banner.
 * @param {number} commentTimestamp - Timestamp del comentario (usado como ID único).
 * @param {HTMLElement} btn - El botón de like.
 */
function toggleCommentLike(bannerId, commentTimestamp, btn) {
    const likeKey = `like_${bannerId}_${commentTimestamp}`;
    const isLiked = localStorage.getItem(likeKey) === 'true';

    // 1. Encontrar y actualizar el comentario en la data
    const banner = newsData.find(b => b.id === bannerId);
    if (banner) {
        const comment = banner.comments.find(c => c.timestamp == commentTimestamp);
        if (comment) {
            if (isLiked) {
                // Quitar Like
                comment.likes = Math.max(0, comment.likes - 1);
                localStorage.removeItem(likeKey);
            } else {
                // Dar Like
                comment.likes += 1;
                localStorage.setItem(likeKey, 'true');
            }
            saveNewsData();
            
            // 2. Actualizar el DOM (por simplicidad, re-renderizamos todo o solo el texto del botón)
            // Aquí solo actualizamos el botón por eficiencia
            btn.classList.toggle('liked', !isLiked);
            btn.innerHTML = `❤️ ${comment.likes}`;
        }
    }
}

/**
 * Alterna la visibilidad de todos los comentarios de un banner.
 * @param {string} bannerId - ID del banner.
 * @param {HTMLElement} btn - El botón "Ver comentarios".
 */
function toggleCommentsList(bannerId, btn) {
    const list = document.getElementById(`comments-list-${bannerId}`);
    const isExpanded = btn.dataset.expanded === 'true';
    
    if (isExpanded) {
        list.classList.remove('expanded');
        btn.dataset.expanded = 'false';
        btn.textContent = `Ver ${newsData.find(b => b.id === bannerId).comments.length - 1} comentarios más...`;
    } else {
        list.classList.add('expanded');
        btn.dataset.expanded = 'true';
        btn.textContent = 'Ocultar comentarios';
    }
}


// ---------------------------------------------------------------------------------------------

// --- INICIALIZACIÓN Y LISTENERS ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar y renderizar las noticias
    renderAllBanners();
    
    // 2. Listeners para el Modo Edición y Creación
    toggleNewsAdminBtn.addEventListener('click', toggleAdminMode);
    addBannerBtn.addEventListener('click', showBannerCreationForm);
    cancelBannerBtn.addEventListener('click', hideBannerCreationForm);
    publishBannerBtn.addEventListener('click', publishNewBanner);
    
    // 3. Listener General para interacciones dentro de las pancartas (delegación de eventos)
    newsBannersContainer.addEventListener('click', (e) => {
        // A. ELIMINAR PANCARTA
        if (e.target.classList.contains('delete-banner-btn')) {
            const bannerElement = e.target.closest('.news-banner');
            if (bannerElement) {
                deleteBanner(bannerElement.dataset.id);
            }
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
            const bannerId = e.target.dataset.bannerId;
            const commentTimestamp = e.target.dataset.commentTs;
            toggleCommentLike(bannerId, commentTimestamp, e.target);
        }
        
        // D. VER MÁS COMENTARIOS
        if (e.target.classList.contains('view-comments-btn')) {
            const bannerId = e.target.dataset.bannerId;
            toggleCommentsList(bannerId, e.target);
        }
    });

});

