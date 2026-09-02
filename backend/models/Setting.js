const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true }, // Ví dụ: 'SEPAY_API_KEY', 'WELCOME_MESSAGE', 'WARRANTY_GUIDE'
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
