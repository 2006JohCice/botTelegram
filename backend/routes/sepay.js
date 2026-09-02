const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');

// SePay Webhook Endpoint
router.post('/webhook', async (req, res) => {
    try {
        const data = req.body;
        
        // --- DEBUG LOGGING ---
        const fs = require('fs');
        const path = require('path');
        fs.writeFileSync(path.join(__dirname, '../sepay_debug_log.txt'), JSON.stringify(data, null, 2));
        // ---------------------

        // Trích xuất amount và content từ payload của SePay
        const amount = Number(data.amountIn || data.transferAmount || data.amount || 0);
        const content = String(data.transactionContent || data.transferContent || data.content || '').toUpperCase();
        const transferType = data.transferType || (data.amountIn > 0 ? 'in' : 'out');
        
        // Chỉ xử lý giao dịch cộng tiền (in)
        if ((transferType && transferType !== 'in') || amount <= 0) {
            return res.json({ success: true, message: 'Bỏ qua giao dịch không phải nạp tiền' });
        }

        // Tìm kiếm cú pháp NAP <ID> hoặc NAP <ORDER>
        // Hỗ trợ cả trường hợp khách viết liền hoặc viết thường
        const match = content.match(/NAP\s*([A-Z0-9_]+)/i);
        if (!match) {
            return res.json({ success: true, message: 'Không tìm thấy cú pháp NAP hợp lệ' });
        }

        const keyword = match[1];

        // TRƯỜNG HỢP 1: Nạp tiền vào ví (keyword là telegramId)
        if (!keyword.startsWith('ORDER')) {
            const user = await User.findOne({ telegramId: keyword });
            if (user) {
                const ref = data.referenceNumber || data.referenceCode || `SEPAY_${Date.now()}`;
                
                // Sử dụng updateOne với upsert để đảm bảo Atomicity an toàn trên mọi phiên bản Mongoose
                const updateResult = await Transaction.updateOne(
                    { paymentReference: ref },
                    {
                        $setOnInsert: {
                            userId: user._id,
                            type: 'deposit',
                            amount: amount,
                            status: 'completed',
                            description: `Nạp tiền Auto-Bank (${ref})`,
                            paymentReference: ref,
                            isNotified: false
                        }
                    },
                    { upsert: true }
                );

                // Nếu có upsertedId, nghĩa là giao dịch mới tinh vừa được thêm vào
                if (updateResult.upsertedId) {
                    await User.findByIdAndUpdate(user._id, { $inc: { balance: amount } });
                    console.log(`[Webhook] Nạp ${amount} cho user ${keyword}`);
                } else {
                    console.log(`[Webhook] Bỏ qua giao dịch bị trùng: ${ref}`);
                }
            }
        } 
        // TRƯỜNG HỢP 2: Thanh toán trực tiếp đơn hàng
        else {
            let order = await Order.findOne({ orderCode: keyword });
            if (!order) {
                // Thử khôi phục dấu _ (do App Ngân hàng xoá đi khi quét QR)
                const restoredKeyword = keyword.slice(0, -4) + '_' + keyword.slice(-4);
                order = await Order.findOne({ orderCode: restoredKeyword });
            }
            if (order && order.status === 'pending') {
                if (amount >= order.totalPrice) {
                    order.status = 'paid';
                    order.paidAt = new Date();
                    order.isDelivered = false; // Đánh dấu chưa giao hàng
                    await order.save();
                    
                    const newTransaction = new Transaction({
                        userId: order.userId,
                        type: 'purchase',
                        amount: order.totalPrice,
                        status: 'completed',
                        productId: order.product,
                        description: `Mua trực tiếp ${keyword}`
                    });
                    await newTransaction.save();
                    console.log(`[Webhook] Thanh toán thành công đơn ${keyword}`);
                }
            }
        }

        res.json({ success: true, message: 'Webhook xử lý thành công' });
    } catch (error) {
        console.error('Lỗi Webhook:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
