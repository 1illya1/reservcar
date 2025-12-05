// API Base URL
const API_URL = 'http://localhost:5000/api';

// Перевірка чи користувач вже залогінений
window.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        // Перенаправити на головну сторінку
        window.location.href = '/rooms.html';
    }
});

// Переключення між вкладками
function switchTab(tab) {
    // Очистити повідомлення
    hideMessages();

    // Оновити активні вкладки
    document.querySelectorAll('.auth-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });

    if (tab === 'login') {
        document.querySelectorAll('.auth-tab')[0].classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        document.querySelectorAll('.auth-tab')[1].classList.add('active');
        document.getElementById('registerForm').classList.add('active');
    }
}

// Обробка входу
async function handleLogin(e) {
    e.preventDefault();
    hideMessages();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        showLoading(true);
        const response = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        showLoading(false);

        if (response.ok) {
            const user = await response.json();

            // Зберегти користувача в localStorage
            localStorage.setItem('user', JSON.stringify(user));

            showSuccess('Успішний вхід! Перенаправлення...');

            // Перенаправити на головну сторінку
            setTimeout(() => {
                window.location.href = '/rooms.html';
            }, 1000);
        } else {
            showError('Невірне ім\'я користувача або пароль');
        }
    } catch (error) {
        showLoading(false);
        console.error('Помилка:', error);
        showError('Помилка з\'єднання з сервером');
    }
}

// Обробка реєстрації
async function handleRegister(e) {
    e.preventDefault();
    hideMessages();

    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    // Перевірка паролів
    if (password !== passwordConfirm) {
        showError('Паролі не співпадають');
        return;
    }

    if (password.length < 4) {
        showError('Пароль має бути не менше 4 символів');
        return;
    }

    try {
        showLoading(true);
        const response = await fetch(`${API_URL}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        showLoading(false);

        if (response.ok) {
            showSuccess('Реєстрація успішна! Тепер ви можете увійти');

            // Очистити форму
            document.getElementById('registerForm').reset();

            // Переключити на вкладку входу
            setTimeout(() => {
                switchTab('login');
                // Автоматично заповнити username
                document.getElementById('loginUsername').value = username;
            }, 1500);
        } else {
            const error = await response.json();
            showError('Помилка реєстрації. Можливо, таке ім\'я вже існує');
        }
    } catch (error) {
        showLoading(false);
        console.error('Помилка:', error);
        showError('Помилка з\'єднання з сервером');
    }
}

// Допоміжні функції
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
}

function hideMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

// Зробити функції доступними глобально
window.switchTab = switchTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
