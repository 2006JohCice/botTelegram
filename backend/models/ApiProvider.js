const mongoose = require('mongoose');

const apiProviderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // ---- FETCH PRODUCTS CONFIG ----
    apiUrl: {
        type: String,
        required: true
    },
    apiMethod: {
        type: String,
        enum: ['GET', 'POST'],
        default: 'GET'
    },
    headers: {
        type: String, // JSON string for headers (e.g., {"Authorization": "Bearer xxx"})
        default: '{}'
    },
    body: {
        type: String, // JSON string for body if POST
        default: ''
    },
    
    // ---- JSON MAPPING CONFIG (FETCH) ----
    mappingArrayPath: {
        type: String, // Path to array in JSON (e.g. "data.products"). Empty means root is array
        default: ''
    },
    mappingIdField: {
        type: String,
        default: '_id'
    },
    mappingNameField: {
        type: String,
        default: 'product_name'
    },
    mappingPriceField: {
        type: String,
        default: 'pricing'
    },
    mappingStockField: {
        type: String,
        default: 'stats.available'
    },

    // ---- PURCHASE CONFIG ----
    purchaseUrl: {
        type: String,
        required: true
    },
    purchaseMethod: {
        type: String,
        enum: ['GET', 'POST'],
        default: 'POST'
    },
    purchaseHeaders: {
        type: String, // JSON string for purchase headers
        default: '{}'
    },
    purchaseBodyTemplate: {
        type: String, // Template (e.g. {"product_id": "{{id}}", "quantity": {{qty}}})
        default: '{"product_id": "{{id}}", "quantity": {{qty}}}'
    },
    
    // ---- JSON MAPPING CONFIG (PURCHASE) ----
    purchaseAccountListPath: {
        type: String, // Path to accounts array in response (e.g. "deliveredAccounts")
        default: 'deliveredAccounts'
    },
    purchaseAccountFormat: {
        type: String, // Format string (e.g. "{{raw}}" or "{{username}}|{{password}}")
        default: '{{raw}}'
    }
}, { timestamps: true });

module.exports = mongoose.model('ApiProvider', apiProviderSchema);
