// API Base URL
const API_URL = 'http://localhost:5000/api';

let allRooms = [];
let selectedRoom = null;
let currentUser = null;

// Завантаження приміщень при відкритті сторінки
document.addEventListener('DOMContentLoaded', () => {
    // Перевірка авторизації
    checkAuth();
    loadRooms();
    setupEventListeners();
});

// Налаштування обробників подій
function setupEventListeners() {
    // Навігація
    document.getElementById('allRoomsBtn').addEventListener('click', () => showSection('roomsSection'));
    document.getElementById('myBookingsBtn').addEventListener('click', () => showSection('bookingsSection'));
    document.getElementById('addRoomBtn').addEventListener('click', () => showSection('addRoomSection'));

    // Фільтри
    document.getElementById('applyFilters').addEventListener('click', applyFilters);

    // Форма додавання приміщення
    document.getElementById('addRoomForm').addEventListener('submit', handleAddRoom);

    // Модальне вікно
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('roomModal');
        if (e.target === modal) {
            closeModal();
        }
    });

    // Розрахунок вартості при зміні дат
    document.getElementById('bookingFrom').addEventListener('change', calculateTotalCost);
    document.getElementById('bookingTo').addEventListener('change', calculateTotalCost);

    // Підтвердження бронювання
    document.getElementById('confirmBooking').addEventListener('click', handleBooking);

    // Вихід з системи
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

// Показати розділ
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(sectionId).classList.add('active');

    if (sectionId === 'roomsSection') {
        document.getElementById('allRoomsBtn').classList.add('active');
    } else if (sectionId === 'bookingsSection') {
        document.getElementById('myBookingsBtn').classList.add('active');
        loadBookings();
    } else if (sectionId === 'addRoomSection') {
        document.getElementById('addRoomBtn').classList.add('active');
    }
}

// Завантаження приміщень з сервера
async function loadRooms() {
    try {
        const response = await fetch(`${API_URL}/rooms/getallrooms`);
        if (!response.ok) throw new Error('Помилка завантаження приміщень');

        allRooms = await response.json();
        displayRooms(allRooms);
    } catch (error) {
        console.error('Помилка:', error);
        alert('Не вдалося завантажити приміщення');
    }
}

// Відображення приміщень
function displayRooms(rooms) {
    const roomsList = document.getElementById('roomsList');
    roomsList.innerHTML = '';

    if (rooms.length === 0) {
        roomsList.innerHTML = '<p class="no-data">Приміщення не знайдено</p>';
        return;
    }

    rooms.forEach(room => {
        const roomCard = createRoomCard(room);
        roomsList.appendChild(roomCard);
    });
}

// Створення картки приміщення
function createRoomCard(room) {
    const card = document.createElement('div');
    card.className = 'room-card';
    card.innerHTML = `
        <img src="${room.img}" alt="${room.name}" onerror="this.src='https://via.placeholder.com/300x200?text=Приміщення'">
        <div class="room-info">
            <h3>${room.name}</h3>
            <p class="room-type">${room.roomType}</p>
            <div class="room-details">
                <span class="capacity">👥 ${room.capacity} осіб</span>
                <span class="floor">🏢 ${room.floor} поверх</span>
            </div>
            <div class="room-amenities">
                ${room.amenities || 'Базові зручності'}
            </div>
            <div class="room-price">
                <span class="price">${room.rentPerHour} грн/год</span>
                <button class="book-btn" onclick="openRoomDetails('${room._id}')">Детальніше</button>
            </div>
        </div>
    `;
    return card;
}

// Відкрити деталі приміщення
function openRoomDetails(roomId) {
    selectedRoom = allRooms.find(r => r._id === roomId);
    if (!selectedRoom) return;

    const detailsDiv = document.getElementById('roomDetails');
    detailsDiv.innerHTML = `
        <img src="${selectedRoom.img}" alt="${selectedRoom.name}" style="width: 100%; border-radius: 8px; margin-bottom: 20px;" onerror="this.src='https://via.placeholder.com/600x400?text=Приміщення'">
        <h2>${selectedRoom.name}</h2>
        <p class="room-type-large">${selectedRoom.roomType}</p>
        <div class="details-grid">
            <div class="detail-item">
                <strong>Місткість:</strong> ${selectedRoom.capacity} осіб
            </div>
            <div class="detail-item">
                <strong>Поверх:</strong> ${selectedRoom.floor}
            </div>
            <div class="detail-item">
                <strong>Ціна:</strong> ${selectedRoom.rentPerHour} грн/год
            </div>
            <div class="detail-item full-width">
                <strong>Зручності:</strong> ${selectedRoom.amenities || 'Базові зручності'}
            </div>
        </div>
        ${displayBookedSlots(selectedRoom.bookedTimeSlots)}
    `;

    document.getElementById('roomModal').style.display = 'block';
}

// Відображення заброньованих слотів
function displayBookedSlots(slots) {
    if (!slots || slots.length === 0) {
        return '<p class="available">✅ Приміщення вільне для бронювання</p>';
    }

    let html = '<div class="booked-slots"><h4>Заброньовані періоди:</h4><ul>';
    slots.forEach(slot => {
        html += `<li>📅 ${formatDateTime(slot.from)} - ${formatDateTime(slot.to)}</li>`;
    });
    html += '</ul></div>';
    return html;
}

// Форматування дати і часу
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Закрити модальне вікно
function closeModal() {
    document.getElementById('roomModal').style.display = 'none';
    selectedRoom = null;
    document.getElementById('bookingFrom').value = '';
    document.getElementById('bookingTo').value = '';
    document.getElementById('userEmail').value = '';
    document.getElementById('totalCost').innerHTML = '';
}

// Розрахунок загальної вартості
function calculateTotalCost() {
    if (!selectedRoom) return;

    const from = document.getElementById('bookingFrom').value;
    const to = document.getElementById('bookingTo').value;

    if (!from || !to) return;

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const hours = Math.ceil((toDate - fromDate) / (1000 * 60 * 60));

    if (hours <= 0) {
        document.getElementById('totalCost').innerHTML = '<p class="error">Некоректні дати</p>';
        return;
    }

    const totalAmount = hours * selectedRoom.rentPerHour;
    document.getElementById('totalCost').innerHTML = `
        <p><strong>Кількість годин:</strong> ${hours}</p>
        <p class="total"><strong>Загальна вартість:</strong> ${totalAmount} грн</p>
    `;
}

// Обробка бронювання
async function handleBooking() {
    if (!selectedRoom) return;

    const from = document.getElementById('bookingFrom').value;
    const to = document.getElementById('bookingTo').value;
    const email = document.getElementById('userEmail').value;

    if (!from || !to || !email) {
        alert('Будь ласка, заповніть всі поля');
        return;
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const hours = Math.ceil((toDate - fromDate) / (1000 * 60 * 60));
    const totalAmount = hours * selectedRoom.rentPerHour;

    // Тут має бути інтеграція з платіжною системою
    // Поки що просто показуємо повідомлення
    if (confirm(`Підтвердити бронювання на суму ${totalAmount} грн?`)) {
        alert('Бронювання підтверджено! В реальній системі тут буде інтеграція з платіжною системою.');
        closeModal();
        // В реальному додатку тут буде виклик API для створення бронювання
    }
}

// Застосування фільтрів
function applyFilters() {
    const roomType = document.getElementById('roomTypeFilter').value;
    const capacity = parseInt(document.getElementById('capacityFilter').value) || 0;

    let filtered = allRooms.filter(room => {
        let matches = true;

        if (roomType && room.roomType !== roomType) {
            matches = false;
        }

        if (capacity && room.capacity < capacity) {
            matches = false;
        }

        return matches;
    });

    displayRooms(filtered);
}

// Додавання нового приміщення
async function handleAddRoom(e) {
    e.preventDefault();

    const roomData = {
        name: document.getElementById('roomName').value,
        img: document.getElementById('roomImg').value,
        roomType: document.getElementById('roomType').value,
        capacity: parseInt(document.getElementById('roomCapacity').value),
        floor: parseInt(document.getElementById('roomFloor').value),
        rentPerHour: parseInt(document.getElementById('roomRent').value),
        amenities: document.getElementById('roomAmenities').value,
        bookedTimeSlots: []
    };

    try {
        const response = await fetch(`${API_URL}/rooms/addroom`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(roomData)
        });

        if (!response.ok) throw new Error('Помилка додавання приміщення');

        alert('Приміщення успішно додано!');
        document.getElementById('addRoomForm').reset();
        loadRooms();
        showSection('roomsSection');
    } catch (error) {
        console.error('Помилка:', error);
        alert('Не вдалося додати приміщення');
    }
}

// Завантаження бронювань
async function loadBookings() {
    const bookingsList = document.getElementById('bookingsList');
    bookingsList.innerHTML = '<p class="no-data">Функціонал відображення бронювань буде додано після інтеграції з системою резервацій</p>';
}

// Перевірка авторизації
function checkAuth() {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        // Перенаправити на сторінку логіну
        window.location.href = '/login.html';
        return;
    }

    currentUser = user;

    // Відобразити ім'я користувача
    document.getElementById('username').textContent = user.username;
}

// Вихід з системи
function handleLogout() {
    if (confirm('Ви впевнені, що хочете вийти?')) {
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }
}

// Зробити функцію доступною глобально
window.openRoomDetails = openRoomDetails;
