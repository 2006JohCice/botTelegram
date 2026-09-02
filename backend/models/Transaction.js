const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['deposit', 'purchase'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    // Dành cho giao dịch mua hàng
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    itemIndex: {
        type: Number
    },
    // Dành cho nạp tiền Auto-Bank
    bankCode: String,
    paymentReference: {
        type: String,
        unique: true,
        sparse: true // Allows null/undefined without conflicting
    },
    description: String,
    isNotified: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

transactionSchema.index({ userId: 1 });
transactionSchema.index({ type: 1, status: 1, isNotified: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
