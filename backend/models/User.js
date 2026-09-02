const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    telegramId: {
        type: String,
        required: true,
        unique: true
    },
    firstName: String,
    lastName: String,
    username: String,
    balance: {
        type: Number,
        default: 0
    },
    role: {
        type: String,
        enum: ['user', 'staff', 'superadmin'],
        default: 'user'
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
