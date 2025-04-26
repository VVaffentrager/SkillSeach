/**
 * SkillSearch - Основной скрипт приложения
 * Обрабатывает авторизацию, навигацию и функционал профиля
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
        const SQL = await initSqlJs({ locateFile: file => `https://sql.js.org/dist/${file}` });
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
        alert('Не удалось загрузить базу данных. Проверьте консоль.');
    }
}

// ======================
// АВТОРИЗАЦИЯ И РЕГИСТРАЦИЯ
// ======================

function initAuthForms() {
    // Переключение между вкладками
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    
    if (loginTab && registerTab) {
        loginTab.addEventListener('click', function(e) {
            e.preventDefault();
            showLoginForm();
        });
        
        registerTab.addEventListener('click', function(e) {
            e.preventDefault();
            showRegisterForm();
        });
    }

    // Обработка входа
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            if (!email || !password) {
                alert('Пожалуйста, заполните все поля');
                return;
            }

            try {
                const result = db.exec(`
                    SELECT * FROM users WHERE email = '${email}' AND password = '${password}'
                `);

                if (result[0]?.values.length > 0) {
                    const [id, name, email, password, avatar, about] = result[0].values[0];
                    appState.currentUser = { id, name, email, avatar, about };
                    appState.isAuthenticated = true;

                    // Перенаправление на главную после входа
                    window.location.href = 'index.html';
                } else {
                    alert('Неверный email или пароль');
                }
            } catch (error) {
                console.error('Ошибка входа:', error);
                alert('Произошла ошибка при входе');
            }
        });
    }

    // Обработка регистрации
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;

            // Валидация
            if (!name || !email || !password || !confirmPassword) {
                alert('Пожалуйста, заполните все поля');
                return;
            }

            if (password !== confirmPassword) {
                alert('Пароли не совпадают');
                return;
            }

            if (password.length < 6) {
                alert('Пароль должен содержать минимум 6 символов');
                return;
            }

            try {
                // Проверяем, есть ли уже пользователь с таким email
                const checkResult = db.exec(`SELECT * FROM users WHERE email = '${email}'`);
                if (checkResult[0]?.values.length > 0) {
                    alert('Пользователь с таким email уже существует');
                    return;
                }

                // Регистрация нового пользователя
                db.run(
                    "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
                    [name, email, password]
                );

                // Перенаправление на страницу входа после регистрации
                alert('Вы успешно зарегистрировались! Теперь войдите в систему');
                window.location.href = 'auth.html';
                
            } catch (error) {
                console.error('Ошибка регистрации:', error);
                alert('Произошла ошибка при регистрации');
            }
        });
    }
}

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('registerTab').classList.remove('active');
}

function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('registerTab').classList.add('active');
}

// ======================
// ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ
// ======================

function loadUserProfile() {
    if (!appState.currentUser?.id) return;

    const result = db.exec(`
        SELECT * FROM users WHERE id = ${appState.currentUser.id}
    `);

    if (result[0]?.values.length > 0) {
        const [id, name, email, password, avatar, about] = result[0].values[0];
        appState.currentUser = { id, name, email, avatar, about };
        appState.isAuthenticated = true;

        updateProfileUI();
        updateHeaderUI();
    }
}

function updateProfileUI() {
    const user = appState.currentUser;
    if (!user) return;

    if (document.getElementById('profileName')) {
        document.getElementById('profileName').textContent = user.name || 'Пользователь';
    }
    if (document.getElementById('profileEmail')) {
        document.getElementById('profileEmail').textContent = user.email;
    }
    if (document.getElementById('aboutText') && user.about) {
        document.getElementById('aboutText').value = user.about;
    }

    // Обновляем аватар
    if (user.avatar) {
        const avatarImage = document.getElementById('avatarImage');
        const avatarPlaceholder = document.getElementById('avatarPlaceholder');

        if (avatarImage) {
            avatarImage.src = user.avatar;
            avatarImage.style.display = 'block';
        }
        if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
    }
}

function updateHeaderUI() {
    const user = appState.currentUser;
    if (!user) return;

    const userProfile = document.getElementById('userProfileHeader');
    if (!userProfile) return;

    const avatarImg = userProfile.querySelector('.user-avatar img');
    const avatarPlaceholder = userProfile.querySelector('.avatar-placeholder');
    const userName = userProfile.querySelector('.user-name');

    if (user.avatar) {
        if (avatarImg) {
            avatarImg.src = user.avatar;
            avatarImg.style.display = 'block';
        }
        if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
    } else {
        if (avatarImg) avatarImg.style.display = 'none';
        if (avatarPlaceholder) avatarPlaceholder.style.display = 'block';
    }

    if (userName) {
        userName.textContent = user.name || 'Профиль';
    }
}

// ======================
// УПРАВЛЕНИЕ АВТОРИЗАЦИЕЙ
// ======================

function updateAuthUI() {
    const authBtn = document.getElementById('authBtn');
    const userProfile = document.getElementById('userProfileHeader');

    if (appState.isAuthenticated) {
        if (authBtn) authBtn.style.display = 'none';
        if (userProfile) userProfile.style.display = 'flex';
    } else {
        if (authBtn) authBtn.style.display = 'block';
        if (userProfile) userProfile.style.display = 'none';
    }
}

function checkAuth() {
    const protectedPages = ['profile.html', 'change-password.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage)) {
        if (!appState.isAuthenticated) {
            window.location.href = 'auth.html';
        }
    }
}

// ======================
// ОСНОВНАЯ ИНИЦИАЛИЗАЦИЯ
// ======================

document.addEventListener('DOMContentLoaded', async function() {
    await initDatabase();
    
    // Инициализация форм авторизации
    initAuthForms();
    
    // Проверка авторизации
    checkAuth();
    
    // Если пользователь авторизован, загружаем его данные
    if (appState.isAuthenticated) {
        loadUserProfile();
    }
    
    // Обновляем UI
    updateAuthUI();
    
    // Обработчик кнопки "Вход"
    const authBtn = document.getElementById('authBtn');
    if (authBtn) {
        authBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'auth.html';
        });
    }
});