const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    originalPrice: {
        type: Number,
        default: 0
    },
    imageUrl: {
        type: String
    },
    icon: {
        type: String,
        default: '📦'
    },
    purchaseType: {
        type: String,
        enum: ['direct', 'contact_admin'],
        default: 'direct'
    },
    stockCount: {
        type: Number,
        default: 0
    },
    // Schema động: chứa dữ liệu của sản phẩm. 
    // Nếu là Netflix: [{ email, password, profile_name, isSold: false }]
    // Nếu là Key: [{ key_code, isSold: false }]
    items: [{
        data: { type: mongoose.Schema.Types.Mixed, required: true },
        status: { type: String, enum: ['available', 'held', 'sold'], default: 'available' },
        heldUntil: { type: Date },
        soldTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        soldAt: { type: Date }
    }],
    description: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
