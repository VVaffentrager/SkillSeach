/**
 * SkillSearch - Полный скрипт приложения
 * Обрабатывает авторизацию, регистрацию и управление профилем
 */
import { initSqlJs } from 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';

// Состояние приложения
const appState = {
    isAuthenticated: false,
    currentUser: null,
    skills: [],
    forumTopics: [],
    returnURL: null
};

// Инициализация базы данных
let db;

async function initDatabase() {
    try {
        const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}` });
        db = new SQL.Database();
        
        // Создаем таблицы
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                avatar TEXT,
                about TEXT
            );
        `);
        
        // Добавляем тестового пользователя
        const result = db.exec("SELECT COUNT(*) as count FROM users");
        if (result[0]?.values[0][0] === 0) {
            db.run(
                "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
                ["Yaeko", "yaekohoshiro@gmail.com", "AA528367_22qq"]
            );
        }
    } catch (error) {
        console.error('Ошибка инициализации базы данных:', error);
        showMessage('Не удалось загрузить базу данных', 'error');
    }
}

// ======================
// ФУНКЦИИ АВТОРИЗАЦИИ
// ======================

function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    // Валидация
    if (!validateEmail(email)) {
        showMessage('Введите корректный email', 'error', 'loginEmailError');
        return;
    }

    if (password.length < 6) {
        showMessage('Пароль должен содержать минимум 6 символов', 'error', 'loginPasswordError');
        return;
    }

    try {
        const result = db.exec(
            `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`
        );

        if (result[0]?.values.length > 0) {
            const user = result[0].values[0];
            loginUser({
                id: user[0],
                name: user[1],
                email: user[2],
                avatar: user[4],
                about: user[5]
            });
            
            // Перенаправление на главную
            window.location.href = 'index.html';
        } else {
            showMessage('Неверные email или пароль', 'error', 'loginFormError');
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        showMessage('Ошибка при входе в систему', 'error');
    }
}

function handleRegisterSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    // Валидация
    if (!name) {
        showMessage('Введите имя', 'error', 'registerNameError');
        return;
    }

    if (!validateEmail(email)) {
        showMessage('Введите корректный email', 'error', 'registerEmailError');
        return;
    }

    if (password.length < 6) {
        showMessage('Пароль должен содержать минимум 6 символов', 'error', 'registerPasswordError');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('Пароли не совпадают', 'error', 'registerConfirmError');
        return;
    }

    try {
        // Проверка существования пользователя
        const check = db.exec(`SELECT * FROM users WHERE email = '${email}'`);
        if (check[0]?.values.length > 0) {
            showMessage('Пользователь с таким email уже существует', 'error', 'registerEmailError');
            return;
        }

        // Регистрация
        db.run(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email, password]
        );
        
        // Перенаправление на страницу входа
        showMessage('Регистрация успешна! Теперь войдите в систему', 'success');
        setTimeout(() => {
            window.location.href = 'login.html?registered=true';
        }, 1500);
        
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showMessage('Ошибка при регистрации', 'error');
    }
}

function loginUser(user) {
    appState.currentUser = user;
    appState.isAuthenticated = true;
    updateAuthUI();
    saveSession();
}

function logoutUser() {
    appState.currentUser = null;
    appState.isAuthenticated = false;
    clearSession();
    window.location.href = 'login.html';
}

// ======================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ======================

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showMessage(message, type = 'info', elementId = null) {
    if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.className = `message ${type}`;
            element.style.display = 'block';
            return;
        }
    }
    
    // Создаем временное сообщение
    const msgElement = document.createElement('div');
    msgElement.className = `global-message ${type}`;
    msgElement.textContent = message;
    document.body.appendChild(msgElement);
    
    setTimeout(() => {
        msgElement.remove();
    }, 3000);
}

function saveSession() {
    if (appState.isAuthenticated && appState.currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(appState.currentUser));
    }
}

function clearSession() {
    localStorage.removeItem('currentUser');
}

function loadSession() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            loginUser(user);
        } catch (e) {
            clearSession();
        }
    }
}

function checkProtectedPages() {
    const protectedPages = ['profile.html', 'change-password.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage) && !appState.isAuthenticated) {
        window.location.href = 'login.html';
    }
}

function updateAuthUI() {
    const authBtn = document.getElementById('authBtn');
    const userProfile = document.getElementById('userProfileHeader');
    const logoutBtn = document.getElementById('logoutBtn');

    if (appState.isAuthenticated) {
        if (authBtn) authBtn.style.display = 'none';
        if (userProfile) userProfile.style.display = 'flex';
        if (logoutBtn) logoutBtn.style.display = 'block';
        
        // Обновляем данные пользователя в шапке
        if (appState.currentUser) {
            const userName = document.querySelector('.user-name');
            const avatarImg = document.querySelector('.user-avatar img');
            const avatarPlaceholder = document.querySelector('.avatar-placeholder');
            
            if (userName) userName.textContent = appState.currentUser.name || 'Профиль';
            if (appState.currentUser.avatar) {
                if (avatarImg) {
                    avatarImg.src = appState.currentUser.avatar;
                    avatarImg.style.display = 'block';
                }
                if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
            }
        }
    } else {
        if (authBtn) authBtn.style.display = 'block';
        if (userProfile) userProfile.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
}

// ======================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ======================

function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
    
    // Показываем сообщение об успешной регистрации, если есть параметр
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('registered')) {
        showMessage('Регистрация прошла успешно! Теперь войдите в систему', 'success');
    }
}

function initRegisterPage() {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }
}

function initProfilePage() {
    if (!appState.isAuthenticated) return;
    
    // Загрузка данных профиля
    loadProfileData();
    
    // Обработчики для профиля
    document.getElementById('avatarInput')?.addEventListener('change', handleAvatarUpload);
    document.getElementById('saveAboutBtn')?.addEventListener('click', saveAboutInfo);
    document.getElementById('logoutBtn')?.addEventListener('click', logoutUser);
}

function loadProfileData() {
    if (!appState.currentUser?.id) return;

    const result = db.exec(`SELECT * FROM users WHERE id = ${appState.currentUser.id}`);
    if (result[0]?.values.length > 0) {
        const [id, name, email, password, avatar, about] = result[0].values[0];
        appState.currentUser = { id, name, email, avatar, about };
        updateProfileUI();
    }
}

function updateProfileUI() {
    if (!appState.currentUser) return;
    
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const aboutText = document.getElementById('aboutText');
    const avatarImage = document.getElementById('avatarImage');
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
    
    if (profileName) profileName.textContent = appState.currentUser.name || 'Пользователь';
    if (profileEmail) profileEmail.textContent = appState.currentUser.email;
    if (aboutText && appState.currentUser.about) aboutText.value = appState.currentUser.about;
    
    if (appState.currentUser.avatar) {
        if (avatarImage) {
            avatarImage.src = appState.currentUser.avatar;
            avatarImage.style.display = 'block';
        }
        if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
    }
}

function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const avatarImage = document.getElementById('avatarImage');
        const avatarPlaceholder = document.getElementById('avatarPlaceholder');

        if (avatarImage) {
            avatarImage.src = event.target.result;
            avatarImage.style.display = 'block';
        }
        if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';

        // Сохраняем аватар в базе данных
        if (appState.currentUser) {
            db.run(
                "UPDATE users SET avatar = ? WHERE id = ?",
                [event.target.result, appState.currentUser.id]
            );
            appState.currentUser.avatar = event.target.result;
            updateAuthUI();
        }
    };
    reader.readAsDataURL(file);
}

function saveAboutInfo() {
    const aboutText = document.getElementById('aboutText').value;
    if (!appState.currentUser) return;

    db.run(
        "UPDATE users SET about = ? WHERE id = ?",
        [aboutText, appState.currentUser.id]
    );
    appState.currentUser.about = aboutText;
    showMessage('Информация сохранена', 'success');
}

// Основная инициализация
document.addEventListener('DOMContentLoaded', async function() {
    await initDatabase();
    loadSession();
    
    // Инициализация страниц
    if (document.getElementById('loginForm')) initLoginPage();
    if (document.getElementById('registerForm')) initRegisterPage();
    if (document.getElementById('profileName')) initProfilePage();
    
    checkProtectedPages();
    updateAuthUI();
    
    // Обработчик кнопки "Вход" в шапке
    document.getElementById('authBtn')?.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = 'login.html';
    });
});