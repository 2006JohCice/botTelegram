const mongoose = require('mongoose');

const scheduledMessageSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true
    },
    sendAt: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending'
    }
}, { timestamps: true });

module.exports = mongoose.model('ScheduledMessage', scheduledMessageSchema);
