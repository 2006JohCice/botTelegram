const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Transaction = require('./models/Transaction');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log("Connected to DB.");
        const txs = await Transaction.find().sort({ createdAt: -1 }).limit(5);
        console.log("Recent Transactions:", txs);
        
        const user = await User.findOne({ telegramId: '5468270513' });
        console.log("User 5468270513 balance:", user ? user.balance : 'NOT FOUND');
        
        mongoose.disconnect();
    });
