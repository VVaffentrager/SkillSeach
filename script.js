import { initSqlJs } from 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';

// Состояние приложения
const appState = {
    isAuthenticated: false,
    currentUser: null,
    db: null,
};

// Инициализация базы данных
async function initDatabase() {
    try {
        const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}` });
        const savedDb = localStorage.getItem('database');
        let db;

        if (savedDb) {
            const uint8Array = new Uint8Array(JSON.parse(savedDb));
            db = new SQL.Database(uint8Array);
        } else {
            db = new SQL.Database();
        }

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

        // Добавляем тестового пользователя
        const result = db.exec("SELECT COUNT(*) as count FROM users");
        if (result[0]?.values[0][0] === 0) {
            db.run(
                "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
                ["Yaeko", "yaekohoshiro@gmail.com", "AA528367_22qq"]
            );
        }

        appState.db = db;
        console.log('База данных инициализирована.');
    } catch (error) {
        console.error('Ошибка инициализации базы данных:', error);
        alert('Не удалось загрузить базу данных.');
    }
}

// Сохранение базы данных в localStorage
function saveDatabase() {
    if (!appState.db) return;
    try {
        const data = appState.db.export();
        const stringData = JSON.stringify(Array.from(data));
        localStorage.setItem('database', stringData);
        console.log('База данных сохранена.');
    } catch (error) {
        console.error('Ошибка при сохранении базы данных:', error);
        alert('Не удалось сохранить базу данных.');
    }
}

// ЛОГИКА АВТОРИЗАЦИИ
function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) {
        showMessage('Заполните все поля', 'error');
        return;
    }

    try {
        const result = appState.db.exec(
            `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`
        );

        if (result[0]?.values.length > 0) {
            const [id, name, email, password, avatar, about] = result[0].values[0];
            appState.currentUser = { id, name, email, avatar, about };
            appState.isAuthenticated = true;
            updateAuthUI();
            saveSession();
            window.location.href = 'index.html';
        } else {
            showMessage('Неверные email или пароль', 'error');
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

    if (!name || !email || !password || !confirmPassword) {
        showMessage('Заполните все поля', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('Пароли не совпадают', 'error');
        return;
    }

    try {
        const check = appState.db.exec(`SELECT * FROM users WHERE email = '${email}'`);
        if (check[0]?.values.length > 0) {
            showMessage('Пользователь с таким email уже существует', 'error');
            return;
        }

        appState.db.run(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email, password]
        );

        showMessage('Регистрация успешна! Теперь войдите в систему', 'success');
        setTimeout(() => {
            window.location.href = 'login.html?registered=true';
        }, 1500);
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showMessage('Ошибка при регистрации', 'error');
    }
}

// УПРАВЛЕНИЕ ПРОФИЛЕМ
function loadProfileData() {
    if (!appState.isAuthenticated || !appState.currentUser?.id) return;

    const result = appState.db.exec(`SELECT * FROM users WHERE id = ${appState.currentUser.id}`);
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
    reader.onload = function (event) {
        const avatarImage = document.getElementById('avatarImage');
        const avatarPlaceholder = document.getElementById('avatarPlaceholder');

        if (avatarImage) {
            avatarImage.src = event.target.result;
            avatarImage.style.display = 'block';
        }
        if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';

        if (appState.currentUser) {
            appState.db.run(
                "UPDATE users SET avatar = ? WHERE id = ?",
                [event.target.result, appState.currentUser.id]
            );
            appState.currentUser.avatar = event.target.result;
            updateAuthUI();
        }

        saveDatabase();
    };

    reader.readAsDataURL(file);
}

function saveAboutInfo() {
    const aboutText = document.getElementById('aboutText')?.value;
    if (!appState.currentUser || !aboutText) return;

    appState.db.run(
        "UPDATE users SET about = ? WHERE id = ?",
        [aboutText, appState.currentUser.id]
    );

    appState.currentUser.about = aboutText;
    showMessage('Информация сохранена', 'success');
    saveDatabase();
}

// ФОРУМ
function createForumTopic(title, category, content) {
    if (!appState.isAuthenticated) {
        showMessage('Для создания темы необходимо войти', 'error');
        return;
    }

    try {
        appState.db.run(
            "INSERT INTO forum_topics (title, author_id, category, content) VALUES (?, ?, ?, ?)",
            [title, appState.currentUser.id, category, content]
        );

        showMessage('Тема успешно создана', 'success');
        saveDatabase();
    } catch (error) {
        console.error('Ошибка создания темы:', error);
        showMessage('Не удалось создать тему', 'error');
    }
}

function getForumTopics() {
    try {
        const result = appState.db.exec("SELECT * FROM forum_topics ORDER BY created_at DESC");
        return result[0]?.values.map(row => ({
            id: row[0],
            title: row[1],
            authorId: row[2],
            category: row[3],
            content: row[4],
            createdAt: row[5],
        })) || [];
    } catch (error) {
        console.error('Ошибка получения тем форума:', error);
        showMessage('Не удалось загрузить темы форума', 'error');
        return [];
    }
}

// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
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

function updateAuthUI() {
    const authBtn = document.getElementById('authBtn');
    const userProfile = document.querySelector('.user-profile');
    const logoutBtn = document.getElementById('logoutBtn');

    if (appState.isAuthenticated) {
        if (authBtn) authBtn.style.display = 'none';
        if (userProfile) userProfile.style.display = 'flex';
        if (logoutBtn) logoutBtn.style.display = 'block';

        const userName = document.querySelector('.user-name');
        const avatarImg = document.querySelector('.user-avatar img');
        const avatarPlaceholder = document.querySelector('.avatar-placeholder');

        if (userName) userName.textContent = appState.currentUser?.name || 'Профиль';
        if (appState.currentUser?.avatar) {
            if (avatarImg) {
                avatarImg.src = appState.currentUser.avatar;
                avatarImg.style.display = 'block';
            }
            if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
        }
    } else {
        if (authBtn) authBtn.style.display = 'block';
        if (userProfile) userProfile.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
}

// ОСНОВНАЯ ИНИЦИАЛИЗАЦИЯ
document.addEventListener('DOMContentLoaded', async () => {
    await initDatabase();
    loadSession();

    if (document.getElementById('loginForm')) {
        document.getElementById('loginForm').addEventListener('submit', handleLoginSubmit);
    }

    if (document.getElementById('registerForm')) {
        document.getElementById('registerForm').addEventListener('submit', handleRegisterSubmit);
    }

    if (document.getElementById('createTopicForm')) {
        document.getElementById('createTopicForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('topicTitle').value.trim();
            const category = document.getElementById('topicCategory').value;
            const content = document.getElementById('topicContent').value.trim();
            createForumTopic(title, category, content);
        });
    }

    if (document.getElementById('avatarInput')) {
        document.getElementById('avatarInput').addEventListener('change', handleAvatarUpload);
    }

    if (document.getElementById('saveAboutBtn')) {
        document.getElementById('saveAboutBtn').addEventListener('click', saveAboutInfo);
    }

    if (document.getElementById('logoutBtn')) {
        document.getElementById('logoutBtn').addEventListener('click', () => {
            appState.isAuthenticated = false;
            appState.currentUser = null;
            clearSession();
            window.location.href = 'login.html';
        });
    }

    updateAuthUI();
});