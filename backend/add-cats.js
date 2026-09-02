const mongoose = require('mongoose');
const Category = require('./models/Category');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to DB');

    const categories = [
        { name: 'Thiết kế Web', description: 'Dịch vụ thiết kế Website' },
        { name: 'Thiết kế App', description: 'Dịch vụ thiết kế Ứng dụng Di động' },
        { name: 'Thiết kế Tool', description: 'Dịch vụ lập trình Tool / Phần mềm' },
        { name: 'Bot Telegram', description: 'Dịch vụ lập trình Bot Telegram' },
        { name: 'Bot Discord', description: 'Dịch vụ lập trình Bot Discord' }
    ];

    for (const cat of categories) {
        // Kiểm tra xem đã tồn tại chưa
        const exists = await Category.findOne({ name: cat.name });
        if (!exists) {
            await Category.create(cat);
            console.log(`Đã thêm: ${cat.name}`);
        } else {
            console.log(`Đã tồn tại: ${cat.name}`);
        }
    }

    console.log('Hoàn tất!');
    process.exit(0);
}

run();
