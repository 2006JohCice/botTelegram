require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(async () => {
    const user = await User.findOneAndUpdate(
        { telegramId: '5468270513' },
        { balance: 100000000000000 },
        { new: true, upsert: true }
    );
    console.log('Update success:', user);
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
