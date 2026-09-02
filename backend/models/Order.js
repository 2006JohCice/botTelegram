const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    telegramId: { type: String, required: true },
    orderCode: { type: String, required: true, unique: true }, // VD: ORDER469EC5F71787542498
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    items: [{ type: mongoose.Schema.Types.ObjectId }], // Mảng các ID của item trong Product
    quantity: { type: Number, required: true, default: 1 },
    totalPrice: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending' },
    expiresAt: { type: Date, required: true },
    paidAt: { type: Date },
    isDelivered: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
