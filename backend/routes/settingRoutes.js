const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');

// Lấy tất cả cài đặt
router.get('/', async (req, res) => {
    try {
        const settings = await Setting.find();
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Lấy cài đặt theo key
router.get('/:key', async (req, res) => {
    try {
        const setting = await Setting.findOne({ key: req.params.key });
        if (!setting) return res.status(404).json({ message: 'Không tìm thấy cài đặt' });
        res.json(setting);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Tạo hoặc cập nhật cài đặt
router.post('/', async (req, res) => {
    try {
        const { key, value, description } = req.body;
        
        let setting = await Setting.findOne({ key });
        if (setting) {
            setting.value = value;
            if (description) setting.description = description;
        } else {
            setting = new Setting({ key, value, description });
        }
        
        await setting.save();
        res.json(setting);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
