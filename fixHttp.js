const mongoose = require('mongoose');
const ApiProvider = require('./backend/models/ApiProvider');

async function fixHttp() {
    await mongoose.connect('mongodb://127.0.0.1:27017/bot_database');
    const providers = await ApiProvider.find();
    for (let p of providers) {
        if (p.apiUrl.startsWith('http://api-tgbot.testflighty.com')) {
            p.apiUrl = p.apiUrl.replace('http://', 'https://');
            p.purchaseUrl = p.purchaseUrl.replace('http://', 'https://');
            await p.save();
            console.log(`Updated provider ${p.name} to https`);
        }
    }
    process.exit(0);
}
fixHttp();
