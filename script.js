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
        db.run(`
            CREATE TABLE IF NOT EXISTS skills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS forum_topics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                author_id INTEGER,
                category TEXT,
                content TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (author_id) REFERENCES users(id)
            );
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS forum_replies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                topic_id INTEGER,
                author_id INTEGER,
                content TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (topic_id) REFERENCES forum_topics(id),
                FOREIGN KEY (author_id) REFERENCES users(id)
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

// Сохранение изменений в базе данных
function saveDatabase() {
    try {
        const data = db.export();
        const blob = new Blob([data], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        // В реальном приложении здесь бы сохраняли на сервер
        console.log('База данных обновлена (в реальном приложении здесь было бы сохранение)');
    } catch (error) {
        console.error('Ошибка сохранения базы данных:', error);
    }
}

// Загрузка данных пользователя
function loadUserProfile() {
    if (!appState.currentUser?.id) return;

    const result = db.exec(`
        SELECT * FROM users WHERE id = ${appState.currentUser.id}
    `);

    if (result[0]?.values.length > 0) {
        const [id, name, email, password, avatar, about] = result[0].values[0];
        appState.currentUser = { id, name, email, avatar, about };
        appState.isAuthenticated = true;

        updateProfileUI(appState.currentUser);
        updateHeaderAvatar(appState.currentUser);
    } else {
        appState.isAuthenticated = false;
        appState.currentUser = null;
    }
    updateAuthUI();
}

// Обновление UI профиля
function updateProfileUI(user) {
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

// Обновление аватара в шапке
function updateHeaderAvatar(user) {
    const userProfile = document.querySelector('.user-profile');
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

// Обновление UI в зависимости от статуса авторизации
function updateAuthUI() {
    const authBtn = document.getElementById('authBtn');
    const userProfile = document.getElementById('userProfileHeader');

    if (appState.isAuthenticated) {
        if (authBtn) authBtn.style.display = 'none'; // Скрываем кнопку "Вход"
        if (userProfile) userProfile.style.display = 'flex';
    } else {
        if (authBtn) authBtn.style.display = 'block'; // Показываем кнопку "Вход"
        if (userProfile) userProfile.style.display = 'none';
    }
}

// Перенаправление на страницу входа
function redirectToAuthPage() {
    window.location.href = 'auth.html';
}

// Обработка входа
function handleLoginSubmit(e) {
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

            alert('Вы успешно вошли!');
            const returnURL = appState.returnURL || 'index.html';
            window.location.href = returnURL;
        } else {
            alert('Неверный email или пароль');
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        alert('Произошла ошибка при входе');
    }
}

// Обработка входа
function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const result = db.exec(`
            SELECT * FROM users WHERE email = '${email}' AND password = '${password}'
        `);

        if (result[0]?.values.length > 0) {
            const [id, name, email, password, avatar, about] = result[0].values[0];
            appState.currentUser = { id, name, email, avatar, about };
            appState.isAuthenticated = true;
            
            // Перенаправление на index.html после успешного входа
            window.location.href = 'index.html';
        } else {
            alert('Неверный email или пароль');
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        alert('Произошла ошибка при входе');
    }
}

// Обработка регистрации
function handleRegisterSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    // Валидация
    if (password !== confirmPassword) {
        alert('Пароли не совпадают');
        return;
    }

    try {
        // Регистрация пользователя
        db.run(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email, password]
        );

        // Перенаправление на страницу входа после регистрации
        alert('Регистрация успешна! Теперь войдите в систему');
        window.location.href = 'auth.html';
        
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        alert('Произошла ошибка при регистрации');
    }
}

// Показать форму входа
function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('registerTab').classList.remove('active');
}

// Показать форму регистрации
function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('registerTab').classList.add('active');
}

// Обработка загрузки аватара
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
        const user = appState.currentUser;
        if (user) {
            db.run(
                "UPDATE users SET avatar = ? WHERE id = ?",
                [event.target.result, user.id]
            );
            saveDatabase();
        }
    };
    reader.readAsDataURL(file);
}

// Сохранение информации "О себе"
function saveAboutInfo() {
    const aboutText = document.getElementById('aboutText').value;
    const user = appState.currentUser;
    if (!user) return;

    db.run(
        "UPDATE users SET about = ? WHERE id = ?",
        [aboutText, user.id]
    );
    saveDatabase();
    alert('Информация сохранена!');
}

// Добавление навыка пользователя
function addUserSkill() {
    const input = document.getElementById('newSkillInput');
    const skillName = input.value.trim();
    if (!skillName) {
        alert('Пожалуйста, введите название навыка');
        return;
    }

    const user = appState.currentUser;
    if (!user) return;

    db.run(
        "INSERT INTO skills (user_id, title) VALUES (?, ?)",
        [user.id, skillName]
    );
    saveDatabase();
    alert('Навык добавлен!');
    input.value = '';
    loadUserSkills();
}

// Удаление навыка пользователя
function removeUserSkill(skillId) {
    const user = appState.currentUser;
    if (!user) return;

    db.run(
        "DELETE FROM skills WHERE id = ?",
        [skillId]
    );
    saveDatabase();
    alert('Навык удален!');
    loadUserSkills();
}

// Загрузка навыков пользователя
function loadUserSkills() {
    const user = appState.currentUser;
    if (!user) return;

    const result = db.exec(
        "SELECT * FROM skills WHERE user_id = ?",
        [user.id]
    );

    const skills = result[0]?.values.map(row => ({
        id: row[0],
        title: row[2]
    })) || [];

    renderUserSkills(skills);
}

// Отрисовка навыков пользователя
function renderUserSkills(skills) {
    const skillsList = document.getElementById('mySkillsList');
    if (!skillsList) return;

    skillsList.innerHTML = '';
    if (skills.length === 0) {
        skillsList.innerHTML = '<p class="no-skills">У вас пока нет добавленных навыков</p>';
        return;
    }

    skills.forEach(skill => {
        const skillItem = document.createElement('div');
        skillItem.className = 'skill-item';
        skillItem.innerHTML = `
            <span>${skill.title}</span>
            <button class="remove-skill" data-skill-id="${skill.id}">×</button>
        `;
        skillsList.appendChild(skillItem);

        skillItem.querySelector('.remove-skill').addEventListener('click', function() {
            removeUserSkill(this.dataset.skillId);
        });
    });
}

// Проверка статуса авторизации
function checkAuth() {
    if (!appState.isAuthenticated && window.location.pathname.includes('profile.html')) {
        window.location.href = 'auth.html';
    }
}

// Вызывать при загрузке каждой страницы
document.addEventListener('DOMContentLoaded', checkAuth);

    const result = db.exec(
        "SELECT * FROM users WHERE id = ?",
        [appState.currentUser.id]
    );

    if (result[0]?.values.length > 0) {
        const [id, name, email, password, avatar, about] = result[0].values[0];
        appState.currentUser = { id, name, email, avatar, about };
        appState.isAuthenticated = true;
    } else {
        appState.isAuthenticated = false;
        appState.currentUser = null;
    }
    updateAuthUI();


function checkProtectedPages() {
    const protectedPages = ['profile.html', 'change-password.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage)) {
        checkAuthStatus();
        if (!appState.isAuthenticated) {
            redirectToAuthPage();
        }
    }
}

// Основная функция при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    await initDatabase();
    checkProtectedPages();

    // Переключение между вкладками
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginTab && registerTab) {
        loginTab.addEventListener('click', function(e) {
            e.preventDefault();
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        });

        registerTab.addEventListener('click', function(e) {
            e.preventDefault();
            registerTab.classList.add('active');
            loginTab.classList.remove('active');
            registerForm.style.display = 'block';
            loginForm.style.display = 'none';
        });
    }


    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }

    
    // Проверяем статус авторизации
    checkAuthStatus();

    // Если пользователь авторизован, загружаем его данные
    if (appState.isAuthenticated) {
        loadUserProfile();
        loadUserSkills();

        // Отображаем элементы управления
        document.getElementById('avatarInput').style.display = 'block';
        document.getElementById('avatarUploadBtn').style.display = 'block';
        document.getElementById('saveAboutBtn').style.display = 'block';
        document.getElementById('newSkillInput').style.display = 'block';
        document.getElementById('addSkillBtn').style.display = 'block';
        document.getElementById('changePasswordBtn').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'block';
    }
    // Обработчик кнопки "Вход"
    const authBtn = document.getElementById('authBtn');
    if (authBtn) {
        authBtn.addEventListener('click', function(e) {
            e.preventDefault(); // Отменяем переход по ссылке
            redirectToAuthPage(); // Перенаправляем на страницу входа
        });
    }
});