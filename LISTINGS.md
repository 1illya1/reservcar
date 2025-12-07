# Лістинги коду системи резервування приміщень

## Зміст
1. [Моделі даних (Backend)](#моделі-даних)
2. [API маршрути (Backend)](#api-маршрути)
3. [Frontend функції](#frontend-функції)
4. [Інтеграції](#інтеграції)

---

## Моделі даних

### Лістинг 1: Модель користувача (userModel.js)

**Призначення:** Зберігання даних користувачів системи для авторизації

```javascript
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
     username : {type:String , required: true},
     password : {type:String , required: true}
})

const userModel = mongoose.model('users' , userSchema)

module.exports = userModel
```

**Пояснення:**
- `username` - унікальне ім'я користувача
- `password` - пароль (в реальній системі має бути хешований)

---

### Лістинг 2: Модель приміщення (roomModel.js)

**Призначення:** Опис характеристик приміщень та їх доступності

```javascript
const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
    name : {type : String , required : true} ,
    img : {type : String , required : true} ,
    capacity : {type : Number , required : true},
    roomType : {type : String , required : true} ,
    bookedTimeSlots : [
        {
            from : {type : String , required : true},
            to : {type : String , required : true}
        }
    ] ,
    rentPerHour : {type : Number , required : true},
    amenities : {type : String},
    floor : {type : Number}
}, {timestamps : true})

const roomModel = mongoose.model('rooms' , roomSchema)
module.exports = roomModel
```

**Пояснення:**
- `name` - назва приміщення
- `roomType` - тип (Конференц-зала, Переговорна, Актова зала, Спортзал, Коворкінг)
- `capacity` - місткість у осіб
- `bookedTimeSlots` - масив заброньованих періодів
- `rentPerHour` - вартість оренди за годину (грн)
- `amenities` - зручності (WiFi, проектор, тощо)

---

### Лістинг 3: Модель бронювання з IoT доступом (roomReservModel.js)

**Призначення:** Зберігання інформації про бронювання з підтримкою IoT контролю доступу

```javascript
const mongoose = require("mongoose");

const roomBookingSchema = new mongoose.Schema({
    room : {type : mongoose.Schema.Types.ObjectID , ref:'rooms'},
    user : {type : mongoose.Schema.Types.ObjectID , ref:'users'},
    bookedTimeSlots : {
        from : {type : String} ,
        to : {type : String}
    } ,
    totalHours : {type : Number},
    totalAmount : {type : Number},
    transactionId : {type : String},
    userName : {type : String},
    userEmail : {type : String},
    accessCode : {type : String}, // Тимчасовий код доступу
    lockStatus : {type : String, enum: ['pending', 'activated', 'deactivated'], default: 'pending'},
    accessActivatedAt : {type : Date},
    accessDeactivatedAt : {type : Date}
}, {timestamps : true})

const roomReservModel = mongoose.model('roomreservs' , roomBookingSchema)
module.exports = roomReservModel
```

**Пояснення IoT полів:**
- `accessCode` - 6-значний код для відкриття замку приміщення
- `lockStatus` - статус доступу:
  - `pending` - код згенеровано, але не активовано
  - `activated` - код активовано, можна відкривати двері
  - `deactivated` - доступ завершено
- `accessActivatedAt` / `accessDeactivatedAt` - часові мітки активації

---

### Лістинг 4: Модель IoT пристрою (iotDeviceModel.js)

**Призначення:** Опис розумних замків та датчиків для контролю доступу

```javascript
const mongoose = require("mongoose");

const iotDeviceSchema = new mongoose.Schema({
    deviceId: { type: String, required: true, unique: true },
    deviceType: { type: String, required: true, enum: ['smart_lock', 'sensor', 'camera'] },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'rooms', required: true },
    status: { type: String, enum: ['locked', 'unlocked', 'offline'], default: 'locked' },
    manufacturer: { type: String }, // August, Yale, TTLock
    connectionType: { type: String, enum: ['wifi', 'bluetooth', 'mqtt'], default: 'wifi' },
    macAddress: { type: String },
    lastActivity: { type: Date, default: Date.now },
    batteryLevel: { type: Number, default: 100 }, // 0-100%
    firmware: { type: String },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const iotDeviceModel = mongoose.model('iotdevices', iotDeviceSchema);
module.exports = iotDeviceModel;
```

**Пояснення:**
- `deviceId` - унікальний ідентифікатор замку (напр. LOCK_001)
- `deviceType` - тип пристрою (розумний замок, датчик, камера)
- `status` - поточний стан (закрито, відкрито, офлайн)
- `manufacturer` - виробник (August Smart Lock, Yale Assure, TTLock)
- `connectionType` - спосіб з'єднання (WiFi, Bluetooth, MQTT)
- `batteryLevel` - рівень заряду батареї

---

## API маршрути

### Лістинг 5: API авторизації (usersRoute.js)

**Призначення:** Вхід та реєстрація користувачів

```javascript
const express = require("express");
const router = express.Router();
const User = require("../models/userModel")

// Вхід користувача
router.post("/login", async(req, res) => {
    const {username , password} = req.body

    try {
        const user = await User.findOne({username , password})
        if(user) {
            res.send(user)
        } else{
            return res.status(400).json({error: "Invalid credentials"});
        }
    } catch (error) {
        return res.status(400).json(error);
    }
});

// Реєстрація користувача
router.post("/register", async(req, res) => {
    try {
        const newuser = new User(req.body)
        await newuser.save()
        res.send('User registered successfully')
    } catch (error) {
        return res.status(400).json(error);
    }
});

module.exports = router
```

---

### Лістинг 6: API бронювання з інтеграцією Stripe (roomsRoute.js - фрагмент)

**Призначення:** Створення бронювання з оплатою та генерацією коду доступу

```javascript
const stripe = require("stripe")("sk_test_...");
const { v4: uuidv4 } = require("uuid");
const RoomReserv = require("../models/roomReservModel");
const Room = require("../models/roomModel");

router.post("/reservroom", async(req, res) => {
    const { token } = req.body;
    try {
      // Створення клієнта Stripe
      const customer = await stripe.customers.create({
        email: token.email,
        source: token.id,
      });

      // Обробка платежу
      const payment = await stripe.charges.create(
        {
          amount: req.body.totalAmount * 100,
          currency: "uah",
          customer: customer.id,
          receipt_email: token.email
        },
        {
          idempotencyKey: uuidv4(),
        }
      );

      if (payment) {
        req.body.transactionId = payment.source.id;

        // Генерація 6-значного коду доступу
        const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
        req.body.accessCode = accessCode;
        req.body.lockStatus = 'pending';

        // Збереження бронювання
        const newbooking = new RoomReserv(req.body);
        await newbooking.save();

        // Додавання часового слоту до приміщення
        const room = await Room.findOne({ _id: req.body.room });
        room.bookedTimeSlots.push(req.body.bookedTimeSlots);
        await room.save();

        res.send({
          message: "Your booking is successfull",
          accessCode: accessCode
        });
      } else {
        return res.status(400).json({error: "Payment failed"});
      }
    } catch (error) {
      console.log(error);
      return res.status(400).json(error);
    }
});
```

**Пояснення процесу:**
1. Отримання токену від Stripe Checkout
2. Створення клієнта в Stripe
3. Обробка платежу (сума у копійках)
4. **Генерація унікального 6-значного коду доступу**
5. Збереження бронювання зі статусом `pending`
6. Блокування часового слоту в приміщенні
7. Відправка коду доступу користувачу

---

### Лістинг 7: API IoT - Активація коду доступу (iotRoute.js - фрагмент)

**Призначення:** Активація коду доступу та відправка MQTT команди до замку

```javascript
const IoTDevice = require("../models/iotDeviceModel");
const RoomReserv = require("../models/roomReservModel");

// Активувати доступ для бронювання
router.post("/access/activate", async (req, res) => {
    const { bookingId } = req.body;

    try {
        const booking = await RoomReserv.findById(bookingId).populate('room');

        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }

        // Генерувати код доступу (якщо ще не згенеровано)
        if (!booking.accessCode) {
            booking.accessCode = Math.floor(100000 + Math.random() * 900000).toString();
        }

        booking.lockStatus = 'activated';
        booking.accessActivatedAt = new Date();
        await booking.save();

        // Знайти замок приміщення та активувати
        const device = await IoTDevice.findOne({
            room: booking.room._id,
            deviceType: 'smart_lock'
        });

        if (device) {
            device.status = 'unlocked';
            device.lastActivity = new Date();
            await device.save();

            // Симуляція MQTT команди
            console.log(`MQTT: lock/${device.deviceId}/activate - Code: ${booking.accessCode}`);
        }

        res.send({
            message: "Access activated successfully",
            accessCode: booking.accessCode,
            booking: booking
        });
    } catch (error) {
        return res.status(400).json(error);
    }
});
```

**Пояснення MQTT логіки:**
- В реальній системі замість `console.log` тут буде MQTT publish
- Формат команди: `lock/{deviceId}/activate`
- Код передається до замку для додавання в список дозволених
- Замок налаштований приймати коди тільки в активному стані

---

### Лістинг 8: API IoT - Керування замком (iotRoute.js - фрагмент)

**Призначення:** Ручне відкриття/закриття замку адміністратором

```javascript
// Керування замком (відкрити/закрити)
router.post("/lock/control", async (req, res) => {
    const { deviceId, action } = req.body; // action: 'lock' or 'unlock'

    try {
        const device = await IoTDevice.findOne({ deviceId });

        if (!device) {
            return res.status(404).json({ error: "Device not found" });
        }

        // Симуляція MQTT команди до замку
        const newStatus = action === 'unlock' ? 'unlocked' : 'locked';
        device.status = newStatus;
        device.lastActivity = new Date();
        await device.save();

        // Логування команди (в реальності тут буде MQTT publish)
        console.log(`MQTT: lock/${device.deviceId}/${action}`);

        res.send({
            message: `Lock ${action}ed successfully`,
            device: device,
            mqttTopic: `lock/${device.deviceId}/${action}`
        });
    } catch (error) {
        return res.status(400).json(error);
    }
});
```

**Пояснення:**
- Це ручне керування для адміністраторів
- Не залежить від бронювань
- Використовується для тестування або екстрених випадків

---

## Frontend функції

### Лістинг 9: Обробка бронювання з Stripe Checkout (rooms.js - фрагмент)

**Призначення:** Відкриття форми оплати та отримання коду доступу

```javascript
function handleBooking() {
    if (!selectedRoom) return;

    const from = document.getElementById('bookingFrom').value;
    const to = document.getElementById('bookingTo').value;
    const userName = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;

    if (!from || !to || !userName || !email) {
        alert('Будь ласка, заповніть всі поля');
        return;
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const hours = Math.ceil((toDate - fromDate) / (1000 * 60 * 60));
    const totalAmount = hours * selectedRoom.rentPerHour;

    // Відкрити Stripe Checkout
    const handler = StripeCheckout.configure({
        key: 'pk_test_...',
        locale: 'auto',
        token: async function(token) {
            // Підготувати дані для бронювання
            const bookingData = {
                room: selectedRoom._id,
                user: currentUser._id,
                userName: userName,
                userEmail: email,
                bookedTimeSlots: { from: from, to: to },
                totalHours: hours,
                totalAmount: totalAmount,
                token: token
            };

            try {
                const response = await fetch(`${API_URL}/rooms/reservroom`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookingData)
                });

                if (response.ok) {
                    const result = await response.json();
                    const accessCode = result.accessCode;

                    alert(`✅ Бронювання успішне!\n\n🔑 Ваш код доступу: ${accessCode}\n\nКод буде активовано за 15 хвилин до початку.`);
                    closeModal();
                    loadRooms();
                }
            } catch (error) {
                console.error('Помилка:', error);
                alert('❌ Помилка з\'єднання з сервером');
            }
        }
    });

    // Відкрити модальне вікно оплати
    handler.open({
        name: 'ReservCar - Бронювання',
        description: `${selectedRoom.name} (${hours} год)`,
        amount: totalAmount * 100,
        currency: 'UAH',
        email: email
    });
}
```

---

### Лістинг 10: Відображення IoT пристроїв (rooms.js - фрагмент)

**Призначення:** Завантаження та відображення списку розумних замків

```javascript
async function loadIoTDevices() {
    const devicesList = document.getElementById('devicesList');
    devicesList.innerHTML = '<div class="loading">Завантаження пристроїв...</div>';

    try {
        const response = await fetch(`${API_URL}/iot/devices`);
        const devices = await response.json();

        if (devices.length === 0) {
            devicesList.innerHTML = '<p class="no-data">Немає підключених пристроїв</p>';
            return;
        }

        let html = '';
        devices.forEach(device => {
            const statusColor = device.status === 'locked' ? '#28a745' :
                              device.status === 'unlocked' ? '#ffc107' : '#6c757d';
            const statusIcon = device.status === 'locked' ? '🔒' :
                             device.status === 'unlocked' ? '🔓' : '⚠️';

            html += `
                <div class="device-card">
                    <div class="device-header">
                        <div>
                            <h4>${device.room?.name || 'Приміщення'}</h4>
                            <p class="device-id">ID: ${device.deviceId}</p>
                        </div>
                        <span class="device-status" style="background: ${statusColor}20; color: ${statusColor}">
                            ${statusIcon} ${device.status === 'locked' ? 'Закрито' :
                                          device.status === 'unlocked' ? 'Відкрито' : 'Офлайн'}
                        </span>
                    </div>
                    <div class="device-info">
                        <p><strong>Тип:</strong> ${device.manufacturer || 'Smart Lock'}</p>
                        <p><strong>Батарея:</strong> ${device.batteryLevel}%</p>
                    </div>
                    <div class="device-controls">
                        <button class="control-btn lock-btn"
                                onclick="controlLock('${device.deviceId}', 'lock')">🔒 Закрити</button>
                        <button class="control-btn unlock-btn"
                                onclick="controlLock('${device.deviceId}', 'unlock')">🔓 Відкрити</button>
                    </div>
                </div>
            `;
        });

        devicesList.innerHTML = html;
    } catch (error) {
        console.error('Помилка:', error);
        devicesList.innerHTML = '<p class="error">Не вдалося завантажити пристрої</p>';
    }
}
```

---

### Лістинг 11: Активація коду доступу (rooms.js - фрагмент)

**Призначення:** Активація коду доступу для бронювання

```javascript
async function activateAccess(bookingId) {
    try {
        const response = await fetch(`${API_URL}/iot/access/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId })
        });

        if (response.ok) {
            const result = await response.json();
            alert(`✅ Доступ активовано!\n\nКод: ${result.accessCode}`);
            loadActiveAccess();
            loadIoTDevices();
        } else {
            alert('❌ Помилка активації доступу');
        }
    } catch (error) {
        console.error('Помилка:', error);
        alert('❌ Помилка з\'єднання з сервером');
    }
}
```

---

## Інтеграції

### Лістинг 12: Інтеграція Stripe для оплати

**Налаштування на backend:**
```javascript
const stripe = require("stripe")("sk_test_51OrgaHLC2ODdkCFk...");
```

**Налаштування на frontend:**
```javascript
const handler = StripeCheckout.configure({
    key: 'pk_test_51OrgaHLC2ODdkCFk...',
    locale: 'auto',
    token: function(token) {
        // Обробка токену оплати
    }
});
```

**Процес оплати:**
1. Користувач заповнює форму бронювання
2. Натискає "Оплатити через Stripe"
3. Відкривається Stripe Checkout модальне вікно
4. Вводить дані картки
5. Stripe генерує токен
6. Токен відправляється на сервер
7. Сервер обробляє платіж
8. При успіху генерується код доступу

---

### Лістинг 13: Симуляція MQTT протоколу

**Концепція:**
У реальній системі використовується MQTT брокер для комунікації з IoT пристроями.

**Формат повідомлень:**
- `lock/{deviceId}/activate` - активувати код доступу
- `lock/{deviceId}/deactivate` - деактивувати код
- `lock/{deviceId}/lock` - закрити замок
- `lock/{deviceId}/unlock` - відкрити замок

**Приклад реалізації (для продакшену):**
```javascript
const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://broker.hivemq.com');

client.on('connect', () => {
    console.log('Connected to MQTT broker');
});

function sendLockCommand(deviceId, command, code = null) {
    const topic = `lock/${deviceId}/${command}`;
    const message = code ? JSON.stringify({ code }) : '';

    client.publish(topic, message);
    console.log(`MQTT: ${topic} ${message}`);
}

// Використання:
sendLockCommand('LOCK_001', 'activate', '123456');
```

---

## Конфігурація сервера

### Лістинг 14: Головний файл сервера (server.js)

**Призначення:** Налаштування Express сервера та маршрутів

```javascript
const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const dbConnection = require('./db')
const path = require('path')

// Middleware
app.use(express.json())
app.use(express.static(path.join(__dirname, 'client')))

// API маршрути
app.use('/api/cars/' , require('./routes/carsRoute'))
app.use('/api/users/' , require('./routes/usersRoute'))
app.use('/api/reservs/' , require('./routes/reservsRoute'))
app.use('/api/rooms/' , require('./routes/roomsRoute'))
app.use('/api/iot/' , require('./routes/iotRoute'))

// Головна сторінка
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'client', 'login.html')))

// Запуск сервера
app.listen(port, () => console.log(`Node JS Server Started in Port ${port}`))
```

---

## Підсумок

### Ключові технології:
- **Backend:** Node.js + Express
- **Database:** MongoDB + Mongoose
- **Payment:** Stripe API
- **IoT Protocol:** MQTT (симуляція через console.log)
- **Frontend:** Vanilla JavaScript + HTML/CSS

### Архітектура:
- **MVC pattern:** Models, Routes, Views
- **REST API:** JSON endpoints
- **Real-time:** MQTT для IoT комунікації
- **Security:** Тимчасові коди доступу, статуси активації

### Основні функції:
1. ✅ Авторизація користувачів
2. ✅ Перегляд доступних приміщень
3. ✅ Бронювання з оплатою через Stripe
4. ✅ Генерація кодів доступу (6-значні)
5. ✅ Керування розумними замками
6. ✅ Активація/деактивація доступу
7. ✅ Моніторинг IoT пристроїв
