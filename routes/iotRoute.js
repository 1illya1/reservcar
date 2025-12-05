const express = require("express");
const router = express.Router();
const IoTDevice = require("../models/iotDeviceModel");
const RoomReserv = require("../models/roomReservModel");

// Генерація випадкового 6-значного коду доступу
function generateAccessCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Отримати всі IoT пристрої
router.get("/devices", async (req, res) => {
    try {
        const devices = await IoTDevice.find().populate('room');
        res.send(devices);
    } catch (error) {
        return res.status(400).json(error);
    }
});

// Отримати пристрої для конкретного приміщення
router.get("/devices/room/:roomId", async (req, res) => {
    try {
        const devices = await IoTDevice.find({ room: req.params.roomId }).populate('room');
        res.send(devices);
    } catch (error) {
        return res.status(400).json(error);
    }
});

// Додати новий IoT пристрій
router.post("/devices/add", async (req, res) => {
    try {
        const newDevice = new IoTDevice(req.body);
        await newDevice.save();
        res.send("IoT device added successfully");
    } catch (error) {
        return res.status(400).json(error);
    }
});

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

// Активувати доступ для бронювання (генерує код)
router.post("/access/activate", async (req, res) => {
    const { bookingId } = req.body;

    try {
        const booking = await RoomReserv.findById(bookingId).populate('room');

        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }

        // Генерувати код доступу
        const accessCode = generateAccessCode();
        booking.accessCode = accessCode;
        booking.lockStatus = 'activated';
        booking.accessActivatedAt = new Date();

        await booking.save();

        // Знайти замок приміщення та активувати
        const device = await IoTDevice.findOne({ room: booking.room._id, deviceType: 'smart_lock' });

        if (device) {
            device.status = 'unlocked';
            device.lastActivity = new Date();
            await device.save();

            // Симуляція MQTT команди
            console.log(`MQTT: lock/${device.deviceId}/activate - Code: ${accessCode}`);
        }

        res.send({
            message: "Access activated successfully",
            accessCode: accessCode,
            booking: booking
        });
    } catch (error) {
        return res.status(400).json(error);
    }
});

// Деактивувати доступ після завершення бронювання
router.post("/access/deactivate", async (req, res) => {
    const { bookingId } = req.body;

    try {
        const booking = await RoomReserv.findById(bookingId).populate('room');

        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }

        booking.lockStatus = 'deactivated';
        booking.accessDeactivatedAt = new Date();

        await booking.save();

        // Знайти замок приміщення та деактивувати
        const device = await IoTDevice.findOne({ room: booking.room._id, deviceType: 'smart_lock' });

        if (device) {
            device.status = 'locked';
            device.lastActivity = new Date();
            await device.save();

            // Симуляція MQTT команди
            console.log(`MQTT: lock/${device.deviceId}/deactivate`);
        }

        res.send({
            message: "Access deactivated successfully",
            booking: booking
        });
    } catch (error) {
        return res.status(400).json(error);
    }
});

// Отримати статус пристрою
router.get("/device/status/:deviceId", async (req, res) => {
    try {
        const device = await IoTDevice.findOne({ deviceId: req.params.deviceId }).populate('room');

        if (!device) {
            return res.status(404).json({ error: "Device not found" });
        }

        res.send(device);
    } catch (error) {
        return res.status(400).json(error);
    }
});

module.exports = router;
