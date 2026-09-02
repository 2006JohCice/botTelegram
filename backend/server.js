require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ Đã kết nối thành công tới MongoDB'))
.catch((err) => console.error('❌ Lỗi kết nối MongoDB:', err));

// Routes
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);
app.use('/api/settings', require('./routes/settingRoutes'));
app.use('/api/sepay', require('./routes/sepay'));

// Test API
app.get('/api', (req, res) => {
    res.json({ message: 'API Backend hoạt động bình thường!' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
