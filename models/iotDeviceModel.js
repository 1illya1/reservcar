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
