const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');

dotenv.config();

mongoose.connect('mongodb://127.0.0.1:27017/bot_database')
    .then(async () => {
        console.log('Connected to MongoDB');
        
        // Find all API products with stockCount 0
        const result = await Product.updateMany(
            { source: 'api' },
            { $set: { stockCount: 9999 } }
        );
        
        console.log(`Fixed ${result.modifiedCount} API products.`);
        
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
