/**
 * SkillSearch - Основной скрипт приложения
 * Обрабатывает авторизацию, навигацию и функционал профиля
 */
import initSqlJs from 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';

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
    const authBtn = document.querySelector('.auth-btn');
    const profileBtn = document.querySelector('.profile-btn');

    if (appState.isAuthenticated) {
        if (profileBtn) profileBtn.style.display = 'block';
        if (authBtn) authBtn.style.display = 'none';
    } else {
        if (profileBtn) profileBtn.style.display = 'none';
        if (authBtn) authBtn.style.display = 'block';
    }
}

// Перенаправление на страницу входа
function redirectToAuthPage() {
    if (!window.location.href.includes('auth.html')) {
        appState.returnURL = window.location.href;
    }
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

// Обработка регистрации
function handleRegisterSubmit(e) {
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

        // Регистрируем нового пользователя
        db.run(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email, password]
        );

        // Получаем ID нового пользователя
        const result = db.exec("SELECT last_insert_rowid() as id");
        const userId = result[0]?.values[0][0];

        if (userId) {
            appState.currentUser = { id: userId, name, email };
            appState.isAuthenticated = true;
            alert('Вы успешно зарегистрировались!');
            const returnURL = appState.returnURL || 'index.html';
            window.location.href = returnURL;
        } else {
            throw new Error('Не удалось получить ID нового пользователя');
        }
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
function checkAuthStatus() {
    if (!appState.currentUser?.id) {
        appState.isAuthenticated = false;
        appState.currentUser = null;
        updateAuthUI();
        return;
    }

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
}

// Основная функция при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    await initDatabase();
    
    // Инициализация форм авторизации
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginTab && registerTab) {
        loginTab.addEventListener('click', showLoginForm);
        registerTab.addEventListener('click', showRegisterForm);
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }

    // Инициализация кнопки входа в других местах
    const showAuthFormBtn = document.getElementById('showAuthForm');
    if (showAuthFormBtn) {
        showAuthFormBtn.addEventListener('click', function(e) {
            e.preventDefault();
            redirectToAuthPage();
        });
    }

    // Инициализация профиля
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', handleAvatarUpload);
    }

    const saveAboutBtn = document.getElementById('saveAboutBtn');
    if (saveAboutBtn) {
        saveAboutBtn.addEventListener('click', saveAboutInfo);
    }

    const addSkillBtn = document.getElementById('addSkillBtn');
    if (addSkillBtn) {
        addSkillBtn.addEventListener('click', addUserSkill);
    }

    const newSkillInput = document.getElementById('newSkillInput');
    if (newSkillInput) {
        newSkillInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addUserSkill();
        });
    }

    // Проверяем статус авторизации
    checkAuthStatus();
    loadUserProfile();
    loadUserSkills();
});