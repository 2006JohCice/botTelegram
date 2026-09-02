const { Scenes, Markup } = require('telegraf');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Category = require('../../backend/models/Category');
const Product = require('../../backend/models/Product');
const User = require('../../backend/models/User');
const Order = require('../../backend/models/Order');
const Setting = require('../../backend/models/Setting');
const Transaction = require('../../backend/models/Transaction');

const buyProductScene = new Scenes.BaseScene('buy_product_scene');

// Hàm Helper để format tiền
const formatMoney = (amount) => amount.toLocaleString() + 'đ';

// Hàm escape HTML để tránh lỗi khi tên sản phẩm có chứa ký tự đặc biệt như <, >
const escapeHTML = (str) => {
    if (!str) return '';
    return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

// Hàm cắt mảng để làm lưới nút (Grid)
const chunkArray = (arr, size) => arr.length ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [];

// BƯỚC 1: Chọn Danh Mục
buyProductScene.enter(async (ctx) => {
    try {
        const categories = await Category.find({ isActive: true });
        if (categories.length === 0) {
            await ctx.reply('Hiện tại chưa có danh mục nào.');
            return ctx.scene.leave();
        }
        const categoryButtons = categories.map(c => Markup.button.callback(`${c.icon || '📁'} ${c.name}`, `cat_${c._id}`));
        const buttons = chunkArray(categoryButtons, 2);
        buttons.push([Markup.button.callback('❌ Thoát', 'cancel_buy')]);
        
        await ctx.reply('🛒 <b>Menu Đơn Hàng</b>\nChọn danh mục bên dưới 👇', { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    } catch(err) {
        console.error(err);
        ctx.reply('Lỗi hệ thống');
        ctx.scene.leave();
    }
});

// BƯỚC 2: Chọn Sản Phẩm
buyProductScene.action(/^cat_(.+)$/, async (ctx) => {
    const categoryId = ctx.match[1];
    ctx.session.categoryId = categoryId;
    ctx.session.awaitingQuantity = false;
    
    await ctx.sendChatAction('typing');

    const products = await Product.find({ categoryId });
    if (products.length === 0) {
        return ctx.reply('📭 Danh mục này chưa có sản phẩm nào. Vui lòng quay lại sau!', {
            reply_markup: { inline_keyboard: [[Markup.button.callback('⬅️ Quay lại', 'menu_products')]] }
        });
    }

    const productButtons = products.map(p => {
        // Lấy số lượng available
        const available = p.items.filter(i => i.status === 'available').length;
        const icon = p.icon || '📦';
        let priceStr = formatMoney(p.price);
        if (p.originalPrice && p.originalPrice > p.price) {
            priceStr = `🔥 ${priceStr}`;
        }
        return Markup.button.callback(`${icon} ${p.name} • ${priceStr}`, `prod_${p._id}`);
    });
    
    const buttons = chunkArray(productButtons, 2);
    buttons.push([Markup.button.callback('⬅️ Quay lại Menu', 'back_menu')]);

    try {
        await ctx.editMessageText('📦 <b>Chọn sản phẩm bên dưới 👇</b>', { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    } catch (e) {
        try { await ctx.deleteMessage(); } catch (err) {}
        await ctx.reply('📦 <b>Chọn sản phẩm bên dưới 👇</b>', { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    }
});

// BƯỚC 3: Chọn Số Lượng
buyProductScene.action(/^prod_(.+)$/, async (ctx) => {
    const productId = ctx.match[1];
    const product = await Product.findById(productId);
    if (!product) return ctx.answerCbQuery('Sản phẩm không tồn tại.', { show_alert: true });
    
    if (product.purchaseType === 'contact_admin') {
        let priceText = `💰 Giá: ${formatMoney(product.price)}`;
        if (product.originalPrice && product.originalPrice > product.price) {
            priceText = `💰 Giá: <s>${formatMoney(product.originalPrice)}</s> ➡️ <b>${formatMoney(product.price)}</b>`;
        }
        const text = `🛒 <b>${escapeHTML(product.name)}</b>\n\n${priceText}\n\n⚠️ Sản phẩm này cần liên hệ trực tiếp với Admin để đặt mua.\n👉 Vui lòng nhắn tin qua Zalo: <b><a href="https://zalo.me/0569847809">0569847809</a></b>`;
        const buttons = [[Markup.button.callback('⬅️ Quay lại', `cat_${product.categoryId}`)]];
        try { await ctx.deleteMessage(); } catch(e) {}
                await ctx.sendChatAction('typing');
            if (product.imageUrl) {
                try {
                    await ctx.replyWithPhoto(product.imageUrl, { caption: text, parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
                } catch (e) {
                    await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
                }
            } else {
                await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
            }
            
            return;
    }

    const available = product.items.filter(i => i.status === 'available').length;
    if (available === 0) {
        return ctx.answerCbQuery('Sản phẩm này đã hết hàng!', { show_alert: true });
    }

    ctx.session.productId = productId;
    ctx.session.productName = escapeHTML(product.name);
    ctx.session.productPrice = product.price;
    ctx.session.availableStock = available;
    ctx.session.awaitingQuantity = true;

    let priceText = `💰 Giá: ${formatMoney(product.price)}`;
    if (product.originalPrice && product.originalPrice > product.price) {
        priceText = `💰 Giá: <s>${formatMoney(product.originalPrice)}</s> ➡️ <b>${formatMoney(product.price)}</b>`;
    }

    const text = `🛒 <b>CHỌN SỐ LƯỢNG</b>\n\n📦 ${ctx.session.productName}\n${priceText}\n📊 Tồn kho: ${available}\n\nChọn số lượng bên dưới 👇 hoặc <b>nhắn tin số lượng</b> bạn muốn mua:`;
    const buttons = [
        [
            Markup.button.callback('1', 'qty_1'),
            Markup.button.callback('2', 'qty_2'),
            Markup.button.callback('5', 'qty_5'),
            Markup.button.callback('10', 'qty_10')
        ],
        [Markup.button.callback('⬅️ Quay lại', `cat_${product.categoryId}`)]
    ];
    
    try { await ctx.deleteMessage(); } catch(e) {}
    
    if (product.imageUrl) {
        try {
            await ctx.replyWithPhoto(product.imageUrl, { caption: text, parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
        } catch (e) {
            await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
        }
    } else {
        await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    }
});

// BƯỚC 4: Xác nhận Mua Hàng & Hold Kho
buyProductScene.action(/^qty_(\d+)$/, async (ctx) => {
    const qty = parseInt(ctx.match[1]);
    const { productId, productName, productPrice, availableStock } = ctx.session;

    if (qty > availableStock) {
        return ctx.answerCbQuery(`Chỉ còn tối đa ${availableStock} sản phẩm!`, { show_alert: true });
    }

    ctx.session.awaitingQuantity = false;
    ctx.session.quantity = qty;
    ctx.session.totalPrice = qty * productPrice;

    const text = `✅ <b>XÁC NHẬN MUA HÀNG</b>\n\n📦 Sản phẩm: ${productName}\n🔢 Số lượng: ${qty}\n💰 Tổng tiền: ${formatMoney(ctx.session.totalPrice)}\n\nBấm ✅ Xác nhận để giữ hàng và chọn cách thanh toán.`;
    const buttons = [
        [Markup.button.callback('✅ Xác nhận', 'create_order')],
        [Markup.button.callback('❌ Hủy', 'cancel_buy')]
    ];
    try { await ctx.deleteMessage(); } catch(e) {}
    await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
});

// Cho phép nhập số lượng bằng tay
buyProductScene.on('text', async (ctx) => {
    if (!ctx.session.awaitingQuantity) return;

    const qtyText = ctx.message.text.trim();
    const qty = parseInt(qtyText);

    if (isNaN(qty) || qty <= 0) {
        return ctx.reply('⚠️ Vui lòng nhập một số lượng hợp lệ (lớn hơn 0).');
    }

    const { productName, productPrice, availableStock } = ctx.session;

    if (qty > availableStock) {
        return ctx.reply(`⚠️ Số lượng vượt quá tồn kho. Chỉ còn tối đa ${availableStock} sản phẩm!`);
    }

    ctx.session.awaitingQuantity = false;
    ctx.session.quantity = qty;
    ctx.session.totalPrice = qty * productPrice;

    const text = `✅ <b>XÁC NHẬN MUA HÀNG</b>\n\n📦 Sản phẩm: ${productName}\n🔢 Số lượng: ${qty}\n💰 Tổng tiền: ${formatMoney(ctx.session.totalPrice)}\n\nBấm ✅ Xác nhận để giữ hàng và chọn cách thanh toán.`;
    const buttons = [
        [Markup.button.callback('✅ Xác nhận', 'create_order')],
        [Markup.button.callback('❌ Hủy', 'cancel_buy')]
    ];
    await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
});

// BƯỚC 5: Tạo Đơn Hàng & Chọn Phương Thức Thanh Toán
buyProductScene.action('create_order', async (ctx) => {
    const { productId, quantity, totalPrice } = ctx.session;
    const telegramId = ctx.from.id.toString();
    const user = await User.findOne({ telegramId });

    // Lock db/Hold inventory logic
    const product = await Product.findById(productId);
    let availableItems = product.items.filter(i => i.status === 'available');
    
    if (availableItems.length < quantity) {
        return ctx.answerCbQuery('Rất tiếc, đã có người mua trước, không đủ hàng!', { show_alert: true });
    }

    // Lấy N items
    const itemsToHold = availableItems.slice(0, quantity);
    const itemIdsToHold = availableItems.slice(0, quantity).map(i => i._id);
    
    const holdUntil = new Date(Date.now() + 10 * 60000);
    
    // Cập nhật Atomic (ngăn race condition)
    await Product.updateOne(
        { _id: productId },
        { 
            $set: { 
                'items.$[elem].status': 'held',
                'items.$[elem].heldUntil': holdUntil
            }
        },
        { arrayFilters: [{ 'elem._id': { $in: itemIdsToHold }, 'elem.status': 'available' }] }
    );

    // Kiểm tra xem có lấy đủ số lượng hàng hay không bằng cách fetch lại
    const updatedProduct = await Product.findById(productId);
    const successfullyHeld = updatedProduct.items.filter(i => 
        itemIdsToHold.some(id => id.equals(i._id)) && i.status === 'held' && i.heldUntil && i.heldUntil.getTime() === holdUntil.getTime()
    );

    if (successfullyHeld.length !== quantity) {
        // Rollback lại các item đã lỡ giữ
        if (successfullyHeld.length > 0) {
            const heldIds = successfullyHeld.map(i => i._id);
            await Product.updateOne(
                { _id: productId },
                { 
                    $set: { 
                        'items.$[elem].status': 'available',
                        'items.$[elem].heldUntil': null
                    }
                },
                { arrayFilters: [{ 'elem._id': { $in: heldIds }, 'elem.status': 'held' }] }
            );
        }
        await ctx.reply('⚠️ Rất tiếc, hệ thống đang bận hoặc có khách khác vừa thanh toán sản phẩm này. Vui lòng thử lại sau giây lát!', { reply_markup: { remove_keyboard: true } });
        return ctx.scene.leave();
    }

    const orderCode = 'ORDER' + crypto.randomBytes(4).toString('hex').toUpperCase() + Date.now().toString().slice(-4);
    const newOrder = new Order({
        userId: user._id,
        telegramId: ctx.from.id,
        orderCode: orderCode,
        product: product._id,
        items: itemIdsToHold,
        quantity: quantity,
        totalPrice: totalPrice,
        status: 'pending',
        expiresAt: holdUntil
    });
    await newOrder.save();

    ctx.session.orderCode = orderCode;
    ctx.session.orderId = newOrder._id;

    const text = `💳 <b>CHỌN CÁCH THANH TOÁN</b>\n\n📦 Sản phẩm: ${escapeHTML(product.name)}\n🔢 Số lượng: ${quantity}\n💰 Tổng tiền: ${formatMoney(totalPrice)}\n💼 Số dư ví: ${formatMoney(user.balance || 0)}\n\n⏳ Hàng đã được giữ trong 10 phút. Nếu quá thời gian không thanh toán, hệ thống sẽ hoàn kho tự động.`;
    
    const buttons = [
        [Markup.button.callback(`💼 Thanh toán bằng ví (${formatMoney(user.balance || 0)})`, 'pay_wallet')],
        [Markup.button.callback(`🏦 Chuyển khoản trực tiếp`, 'pay_bank')],
        [Markup.button.callback('❌ Hủy (Hoàn kho)', 'cancel_order')]
    ];
    try { await ctx.deleteMessage(); } catch(e) {}
    await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
});

// Hàm dùng chung để xử lý hủy đơn và hoàn kho
const processCancellation = async (ctx) => {
    const { orderId } = ctx.session;
    if (!orderId) return false;

    const order = await Order.findById(orderId);
    if (order && order.status === 'pending') {
        order.status = 'cancelled';
        await order.save();
        
        // Hoàn kho
        const product = await Product.findById(order.product);
        if (product) {
            product.items.forEach(item => {
                if (order.items.includes(item._id)) {
                    item.status = 'available';
                    item.heldUntil = null;
                }
            });
            product.stockCount = product.items.filter(i => i.status === 'available').length;
            await product.save();
        }
        return true;
    }
    return false;
};

// BƯỚC 6: Xử lý Hủy đơn
buyProductScene.action('cancel_order', async (ctx) => {
    const isCancelled = await processCancellation(ctx);
    ctx.scene.leave();
    if (isCancelled) {
        ctx.session.orderId = null; // Xóa khỏi session
        try { await ctx.deleteMessage(); } catch(e) {}
        await ctx.reply('✅ <b>Đã hủy đơn hàng và hoàn kho thành công!</b>', { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Quay lại Menu', 'menu_products')]]) });
    } else {
        try { await ctx.deleteMessage(); } catch(e) {}
        await ctx.reply('❌ <b>Không tìm thấy đơn hàng chờ xử lý hoặc đơn đã bị hủy!</b>', { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Quay lại Menu', 'menu_products')]]) });
    }
});

// BƯỚC 7: Xử lý thanh toán ví (Tự động trừ tiền và giao hàng)
buyProductScene.action('pay_wallet', async (ctx) => {
    const { orderId } = ctx.session;
    const order = await Order.findById(orderId);
    if (!order || order.status !== 'pending') return ctx.answerCbQuery('Đơn hàng không hợp lệ hoặc đã hết hạn!', { show_alert: true });

    const user = await User.findById(order.userId);
    if (user.balance < order.totalPrice) {
        return ctx.answerCbQuery('❌ Số dư ví không đủ! Vui lòng chọn Thanh toán trực tiếp.', { show_alert: true });
    }

    // Trừ tiền
    user.balance -= order.totalPrice;
    await user.save();

    // Ghi lại lịch sử giao dịch mua hàng
    const newTransaction = new Transaction({
        userId: user._id,
        type: 'purchase',
        amount: order.totalPrice,
        status: 'completed',
        productId: order.product,
        description: `Mua sản phẩm ${order.orderCode}`
    });
    await newTransaction.save();

    // Đánh dấu đơn hàng đã thanh toán
    order.status = 'paid';
    order.paidAt = new Date();
    await order.save();

    // Giao hàng
    const product = await Product.findById(order.product);
    
    const dateStr = new Date().toISOString();
    let orderData = `- MÃ ĐƠN: ${order.orderCode}\n`;
    orderData += `- NGÀY  : ${dateStr}\n`;
    orderData += `- SẢN PHẨM: ${product.name}\n`;
    orderData += `- SỐ LƯỢNG: ${order.quantity}\n`;
    orderData += `- TỔNG TIỀN: ${formatMoney(order.totalPrice)}\n`;
    orderData += `-----------------------------------------\n`;

    let itemIndex = 1;
    product.items.forEach(item => {
        if (order.items.includes(item._id)) {
            item.status = 'sold';
            item.soldTo = user._id;
            item.soldAt = new Date();
            // Nối data vào file text
            if (order.quantity > 1) {
                orderData += `------- ${itemIndex} -------\n`;
            }
            orderData += (typeof item.data === 'string' ? item.data : JSON.stringify(item.data)) + '\n';
            itemIndex++;
        }
    });
    orderData += `-----------------------------------------\nCảm ơn quý khách!`;
    await product.save();

    // Tạo file txt
    const filePath = path.join(__dirname, `../../${order.orderCode}.txt`);
    fs.writeFileSync(filePath, orderData);

    const text = `🎉 <b>THANH TOÁN THÀNH CÔNG</b>\n\n🧾 Mã đơn: ${order.orderCode}\n📦 Sản phẩm: ${escapeHTML(product.name)}\n🔢 Số lượng: ${order.quantity}\n💰 Tổng tiền: ${formatMoney(order.totalPrice)}\n\n📎 File chi tiết đã được gửi kèm. Nếu cần hỗ trợ, bấm nút Bảo hành bên dưới.`;
    
    await ctx.replyWithDocument(
        { source: filePath, filename: `${order.orderCode}.txt` },
        { 
            caption: text, 
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🛡 Yêu cầu bảo hành', 'warranty_req')],
                [Markup.button.callback('⬅️ Quay lại Menu', 'back_menu')]
            ])
        }
    );
    
    // Xóa file sau khi gửi
    setTimeout(() => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }, 5000);
    
    await ctx.deleteMessage();
    return ctx.scene.leave();
});

// BƯỚC 8: Thanh toán Ngân hàng (Hiển thị QR Code)
buyProductScene.action('pay_bank', async (ctx) => {
    const { orderId, orderCode, totalPrice } = ctx.session;
    const order = await Order.findById(orderId);
    if (!order || order.status !== 'pending') return ctx.answerCbQuery('Đơn hàng không hợp lệ!', { show_alert: true });

    // Lấy Bank config từ DB (Mặc định nếu chưa set)
    let bankId = 'MB', bankNum = '0569847809', bankName = 'LUONG VIET NHAT';
    const settings = await Setting.find();
    settings.forEach(s => {
        if (s.key === 'BANK_ID') bankId = s.value;
        if (s.key === 'BANK_ACCOUNT_NUMBER') bankNum = s.value;
        if (s.key === 'BANK_ACCOUNT_NAME') bankName = s.value;
    });

    const qrUrl = `https://img.vietqr.io/image/${bankId}-${bankNum}-compact2.png?amount=${totalPrice}&accountName=${encodeURIComponent(bankName)}&addInfo=NAP%20${orderCode}`;

    const text = `╭─⌈ 🧾 <b>XÁC NHẬN THANH TOÁN</b> ⌋─╮\nMã đơn: <code>${orderCode}</code>\n╰───────────────────────────╯\n\n💰 Cần thanh toán: <b>${formatMoney(totalPrice)}</b>\n⏳ Giữ hàng: 10 phút\n\n📝 Nội dung chuyển khoản bắt buộc:\n<code>NAP ${orderCode}</code>\n\n✅ Bot sẽ tự giao hàng khi giao dịch khớp đúng.`;

    const buttons = [
        [Markup.button.callback('🔄 Kiểm tra lại thanh toán', 'check_pay')],
        [Markup.button.callback('❌ Hủy đơn chuyển khoản', 'cancel_order')]
    ];

    await ctx.replyWithPhoto({ url: qrUrl }, { caption: text, parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    await ctx.deleteMessage();
});

// Nút kiểm tra trạng thái
buyProductScene.action('check_pay', async (ctx) => {
    // Trong thực tế, hệ thống Auto-bank qua webhook sẽ tự xử lý giao hàng. Nút này dùng để cho khách biết hoặc check thủ công.
    await ctx.answerCbQuery('Đang kiểm tra giao dịch... Nếu bạn đã thanh toán, hãy chờ 1-3 phút nhé!', { show_alert: true });
});

// Các action điều hướng khác
buyProductScene.action('cancel_buy', async (ctx) => {
    await processCancellation(ctx); // Nếu đang giữ hàng (Bước 4) cũng hủy
    ctx.scene.leave(); // Thoát scene an toàn thay vì xoá trắng session
    try { await ctx.deleteMessage(); } catch(e) {}
    await ctx.reply('❌ <b>Đã hủy giao dịch!</b>', { 
        parse_mode: 'HTML', 
        ...Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Quay lại Menu', 'menu_products')]
        ]) 
    });
});
buyProductScene.action('back_menu', async (ctx) => {
    await processCancellation(ctx); // Nếu đang có đơn (Bước 5, 8) cũng hủy và hoàn kho
    ctx.session = {}; // reset session
    try { await ctx.deleteMessage(); } catch(e) {}
    return ctx.scene.enter('buy_product_scene');
});

// Route sang bảo hành (sẽ tạo Scene riêng)
buyProductScene.action('warranty_req', (ctx) => {
    ctx.scene.enter('warranty_scene');
});

module.exports = buyProductScene;
