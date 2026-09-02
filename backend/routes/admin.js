const express = require('express');
const router = express.Router();
const https = require('https');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const ScheduledMessage = require('../models/ScheduledMessage');

// ==========================================
// THỐNG KÊ DASHBOARD
// ==========================================

router.get('/dashboard', async (req, res) => {
    try {
        // 1. Tổng doanh thu (Các đơn đã thanh toán)
        const orders = await Order.find({ status: 'paid' });
        const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);

        // 2. Tổng số đơn hàng mới (đã thanh toán)
        const totalOrders = orders.length;

        // 3. Số sản phẩm hết hàng
        const outOfStockProducts = await Product.countDocuments({ stockCount: { $lte: 0 } });
        
        // 4. Tổng số lượng truy cập (số users)
        const totalUsers = await User.countDocuments();
        
        // 5. Danh sách người dùng gần đây
        const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('telegramId firstName lastName username balance');
        
        // 6. Sản phẩm bán chạy
        const products = await Product.find().populate('categoryId', 'name');
        let topProducts = products.map(p => {
            const soldCount = p.items.filter(i => i.status === 'sold').length;
            return {
                _id: p._id,
                name: p.name,
                category: p.categoryId ? p.categoryId.name : 'Không xác định',
                price: p.price,
                soldCount: soldCount,
                icon: p.icon
            };
        }).sort((a, b) => b.soldCount - a.soldCount).slice(0, 5);

        res.json({
            totalRevenue,
            totalOrders,
            outOfStockProducts,
            totalUsers,
            recentUsers,
            topProducts
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// QUẢN LÝ DANH MỤC (CATEGORY)
// ==========================================

// Lấy danh sách danh mục
router.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Thêm danh mục mới
router.post('/categories', async (req, res) => {
    try {
        const { name, description, icon } = req.body;
        const newCategory = new Category({ name, description, icon: icon || '📁' });
        await newCategory.save();
        res.status(201).json(newCategory);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Sửa danh mục
router.put('/categories/:id', async (req, res) => {
    try {
        const { name, description, icon } = req.body;
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ error: 'Không tìm thấy danh mục' });
        
        if (name) category.name = name;
        if (description !== undefined) category.description = description;
        if (icon !== undefined) category.icon = icon;
        
        await category.save();
        res.json(category);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Xóa danh mục
router.delete('/categories/:id', async (req, res) => {
    try {
        const deletedCategory = await Category.findByIdAndDelete(req.params.id);
        if (!deletedCategory) return res.status(404).json({ error: 'Không tìm thấy danh mục' });
        res.json({ message: 'Đã xóa danh mục' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// QUẢN LÝ SẢN PHẨM (PRODUCT)
// ==========================================

// Lấy danh sách sản phẩm
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find().populate('categoryId', 'name');
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Thêm sản phẩm mới
router.post('/products', async (req, res) => {
    try {
        const { categoryId, name, price, description, items, imageUrl, icon, purchaseType } = req.body;
        
        // items là một mảng dữ liệu động: [ { data: { email: 'a@a.com', pass: '123' } }, ... ]
        const newProduct = new Product({
            categoryId,
            name,
            price,
            description,
            imageUrl,
            icon,
            purchaseType,
            items: items || [],
            stockCount: items ? items.length : 0
        });
        
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Cập nhật sản phẩm (Nạp thêm kho hàng)
router.put('/products/:id', async (req, res) => {
    try {
        const { name, price, description, items, isActive, icon, purchaseType, imageUrl, categoryId } = req.body;
        
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });

        if (name) product.name = name;
        if (categoryId) product.categoryId = categoryId;
        if (price !== undefined) product.price = price;
        if (description !== undefined) product.description = description;
        if (isActive !== undefined) product.isActive = isActive;
        if (icon !== undefined) product.icon = icon;
        if (purchaseType !== undefined) product.purchaseType = purchaseType;
        if (imageUrl !== undefined) product.imageUrl = imageUrl;
        
        // Nạp thêm kho
        if (items && items.length > 0) {
            product.items.push(...items);
        }
        
        // Tính lại số lượng tồn kho (chỉ đếm các item available)
        product.stockCount = product.items.filter(i => i.status === 'available').length;
        
        await product.save();
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Cập nhật 1 item trong kho
router.put('/products/:id/items/:itemId', async (req, res) => {
    try {
        const { data } = req.body;
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });

        const item = product.items.id(req.params.itemId);
        if (!item) return res.status(404).json({ error: 'Không tìm thấy item' });

        item.data = data;
        await product.save();
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Xóa 1 item trong kho
router.delete('/products/:id/items/:itemId', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });

        product.items = product.items.filter(i => i._id.toString() !== req.params.itemId);
        product.stockCount = product.items.filter(i => i.status === 'available').length;
        
        await product.save();
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Xóa sản phẩm
router.delete('/products/:id', async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
        res.json({ message: 'Đã xóa sản phẩm' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// TOOLS (BROADCAST & BUFF)
// ==========================================

// Gửi thông báo (Broadcast)
router.post('/broadcast', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Thiếu nội dung' });

        const allUsers = await User.find({});
        let successCount = 0;
        
        // Thử lấy BOT_TOKEN từ backend .env, nếu không có thì thử từ Setting (nếu có lưu)
        let BOT_TOKEN = process.env.BOT_TOKEN;
        
        if (!BOT_TOKEN) {
            // Đọc file .env của bot nếu có
            try {
                const fs = require('fs');
                const path = require('path');
                const botEnvPath = path.join(__dirname, '../../bot/.env');
                if (fs.existsSync(botEnvPath)) {
                    const envContent = fs.readFileSync(botEnvPath, 'utf8');
                    const match = envContent.match(/BOT_TOKEN=(.+)/);
                    if (match) BOT_TOKEN = match[1].trim();
                }
            } catch (e) {
                console.error("Lỗi đọc bot/.env:", e);
            }
        }

        if (!BOT_TOKEN) {
            return res.status(500).json({ error: 'Chưa cấu hình BOT_TOKEN' });
        }

        // Hàm gửi tin nhắn qua https
        const sendMessage = (chatId, text) => {
            return new Promise((resolve, reject) => {
                const data = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' });
                const reqOptions = {
                    hostname: 'api.telegram.org',
                    port: 443,
                    path: `/bot${BOT_TOKEN}/sendMessage`,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data, 'utf8') }
                };
                const request = https.request(reqOptions, (response) => {
                    let responseBody = '';
                    response.on('data', chunk => responseBody += chunk);
                    response.on('end', () => {
                        if (response.statusCode === 200) {
                            resolve(JSON.parse(responseBody));
                        } else {
                            reject(new Error(`API Error ${response.statusCode}: ${responseBody}`));
                        }
                    });
                });
                request.on('error', (e) => reject(e));
                request.write(data);
                request.end();
            });
        };

        for (const u of allUsers) {
            try {
                await sendMessage(u.telegramId, `📢 <b>THÔNG BÁO TỪ ADMIN</b>\n\n${message}`);
                successCount++;
            } catch (err) {
                console.error(`Lỗi gửi tới ${u.telegramId}:`, err.message);
            }
        }
        res.json({ successCount, total: allUsers.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Lấy danh sách thông báo đã lên lịch
router.get('/broadcast/schedule', async (req, res) => {
    try {
        const messages = await ScheduledMessage.find().sort({ sendAt: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Lên lịch gửi thông báo
router.post('/broadcast/schedule', async (req, res) => {
    try {
        const { message, sendAt } = req.body;
        if (!message || !sendAt) return res.status(400).json({ error: 'Thiếu nội dung hoặc thời gian' });

        const date = new Date(sendAt);
        if (date < new Date()) return res.status(400).json({ error: 'Thời gian gửi phải ở tương lai' });

        const newSchedule = new ScheduledMessage({ message, sendAt: date });
        await newSchedule.save();
        res.status(201).json(newSchedule);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Xóa lịch gửi thông báo
router.delete('/broadcast/schedule/:id', async (req, res) => {
    try {
        const msg = await ScheduledMessage.findById(req.params.id);
        if (!msg) return res.status(404).json({ error: 'Không tìm thấy' });
        
        if (msg.status === 'sent') return res.status(400).json({ error: 'Thông báo đã được gửi, không thể xóa' });

        await ScheduledMessage.findByIdAndDelete(req.params.id);
        res.json({ message: 'Đã hủy lịch gửi thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Giảm giá hàng loạt
router.post('/products/batch-discount', async (req, res) => {
    try {
        const { productIds, discountPercent, sendNotification, notificationMessage } = req.body;
        
        if (!productIds || !productIds.length || !discountPercent) {
            return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
        }
        
        const percent = parseFloat(discountPercent);
        if (isNaN(percent) || percent <= 0 || percent >= 100) {
            return res.status(400).json({ error: '% giảm giá không hợp lệ' });
        }

        const products = await Product.find({ _id: { $in: productIds } });
        
        for (const p of products) {
            if (!p.originalPrice || p.originalPrice === 0) {
                p.originalPrice = p.price;
            } else if (p.price === p.originalPrice) {
                // If it was already reset somehow
            }
            // Update price
            const newPrice = p.originalPrice * (1 - percent / 100);
            p.price = Math.round(newPrice);
            await p.save();
        }

        // Send Notification if requested
        if (sendNotification && notificationMessage) {
            const ScheduledMessage = require('../models/ScheduledMessage');
            const newMsg = new ScheduledMessage({
                message: notificationMessage,
                status: 'pending',
                sendAt: Date.now()
            });
            await newMsg.save();
        }

        res.json({ message: 'Đã áp dụng giảm giá thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Giảm giá hàng loạt theo Danh mục
router.post('/categories/batch-discount', async (req, res) => {
    try {
        const { categoryIds, discountPercent, sendNotification, notificationMessage } = req.body;
        
        if (!categoryIds || !categoryIds.length || !discountPercent) {
            return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
        }
        
        const percent = parseFloat(discountPercent);
        if (isNaN(percent) || percent <= 0 || percent >= 100) {
            return res.status(400).json({ error: '% giảm giá không hợp lệ' });
        }

        const products = await Product.find({ categoryId: { $in: categoryIds } });
        if (products.length === 0) {
             return res.status(400).json({ error: 'Không có sản phẩm nào thuộc các danh mục này' });
        }
        
        for (const p of products) {
            if (!p.originalPrice || p.originalPrice === 0) {
                p.originalPrice = p.price;
            }
            const newPrice = p.originalPrice * (1 - percent / 100);
            p.price = Math.round(newPrice);
            await p.save();
        }

        if (sendNotification && notificationMessage) {
            const ScheduledMessage = require('../models/ScheduledMessage');
            const newMsg = new ScheduledMessage({
                message: notificationMessage,
                status: 'pending',
                sendAt: Date.now()
            });
            await newMsg.save();
        }

        res.json({ message: `Đã áp dụng giảm giá cho ${products.length} sản phẩm thành công` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Hủy giảm giá sản phẩm
router.post('/products/cancel-discount', async (req, res) => {
    try {
        const { productIds } = req.body;
        if (!productIds || !productIds.length) {
            return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
        }
        const products = await Product.find({ _id: { $in: productIds } });
        for (const p of products) {
            if (p.originalPrice && p.originalPrice > 0) {
                p.price = p.originalPrice;
                p.originalPrice = 0;
                await p.save();
            }
        }
        res.json({ message: 'Đã hủy giảm giá thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Hủy giảm giá danh mục
router.post('/categories/cancel-discount', async (req, res) => {
    try {
        const { categoryIds } = req.body;
        if (!categoryIds || !categoryIds.length) {
            return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
        }
        const products = await Product.find({ categoryId: { $in: categoryIds } });
        for (const p of products) {
            if (p.originalPrice && p.originalPrice > 0) {
                p.price = p.originalPrice;
                p.originalPrice = 0;
                await p.save();
            }
        }
        res.json({ message: `Đã hủy giảm giá cho ${products.length} sản phẩm` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
