require('dotenv').config();
const { Telegraf, session, Scenes, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

// Import Models từ backend trước
const User = require('../backend/models/User');
const Setting = require('../backend/models/Setting');
const Transaction = require('../backend/models/Transaction');
const Product = require('../backend/models/Product');
const Order = require('../backend/models/Order');
const ScheduledMessage = require('../backend/models/ScheduledMessage');

// Lấy đúng instance Mongoose mà các Model đang sử dụng
const mongoose = User.base;

const buyProductScene = require('./scenes/buyProduct');
const warrantyScene = require('./scenes/warrantyScene');
const { getMainMenu } = require('./utils/menus');

// Hàm escape HTML để tránh lỗi khi dữ liệu (ví dụ: tên sản phẩm) chứa ký tự đặc biệt như <, >
const escapeHTML = (str) => {
    if (!str) return '';
    return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

const bot = new Telegraf(process.env.BOT_TOKEN);

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ Bot đã kết nối MongoDB')).catch(console.error);

// Setup Scenes
const stage = new Scenes.Stage([buyProductScene, warrantyScene]);
bot.use(session());
bot.use(stage.middleware());

// Bắt mọi lỗi xảy ra trong bot
bot.catch((err, ctx) => {
    console.error(`❌ Lỗi hệ thống khi xử lý ${ctx.updateType}:`, err);
});

// Lệnh /start
bot.start(async (ctx) => {
    console.log(`[DEBUG] Nhận được lệnh /start từ ${ctx.from.id}`);
    try {
        const telegramId = ctx.from.id.toString();
        const { first_name, last_name, username } = ctx.from;

        // Lưu hoặc cập nhật user vào DB
        await User.findOneAndUpdate(
            { telegramId },
            { firstName: first_name, lastName: last_name, username },
            { upsert: true, new: true }
        );
        // Tránh lỗi HTML injection từ tên người dùng
        const safe_first_name = first_name.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;');

        // Lấy câu chào động từ DB (hoặc dùng mặc định nếu chưa cài)
        let welcomeTemplate = "👋 Xin chào <b>{name}</b>!\nChào mừng bạn đến với <b>Bot Bán Hàng Tự Động</b>.\n\nVui lòng chọn chức năng bên dưới:";
        const settingDoc = await Setting.findOne({ key: 'WELCOME_MESSAGE' });
        if (settingDoc && settingDoc.value) {
            welcomeTemplate = settingDoc.value;
        }

        // Thay thế biến {name} bằng tên khách
        const welcomeMsg = welcomeTemplate.replace('{name}', safe_first_name);

        await ctx.reply(welcomeMsg, { parse_mode: 'HTML', ...getMainMenu() });
        console.log(`[DEBUG] Đã gửi tin nhắn chào mừng.`);
    } catch (error) {
        console.error(`[DEBUG] Lỗi ở lệnh /start:`, error);
        await ctx.reply('Xin lỗi, hệ thống đang bảo trì!');
    }
});

// Xử lý nút Menu
bot.action('menu_products', (ctx) => {
    ctx.scene.enter('buy_product_scene');
});

bot.action('menu_deposit', async (ctx) => {
    const userId = ctx.from.id;
    let bankId = 'MB', bankNum = '0569847809', bankName = 'LUONG VIET NHAT', minDeposit = 0;
    const settings = await Setting.find();
    settings.forEach(s => {
        if (s.key === 'BANK_ID') bankId = s.value;
        if (s.key === 'BANK_ACCOUNT_NUMBER') bankNum = s.value;
        if (s.key === 'BANK_ACCOUNT_NAME') bankName = s.value;
        if (s.key === 'MIN_DEPOSIT') minDeposit = Number(s.value);
    });

    let msg = `🏦 <b>THÔNG TIN NẠP TIỀN</b>\n\n`
        + `Ngân hàng: ${bankId}\nSTK: ${bankNum}\nChủ tài khoản: ${bankName}\n`
        + `Nội dung: <code>NAP ${userId}</code>\n\n`
        + `Hệ thống tự động cộng tiền trong 1-3 phút.`;
        
    if (minDeposit > 0) {
        msg += `\n⚠️ <i>Lưu ý: Vui lòng nạp tối thiểu ${minDeposit.toLocaleString()}đ</i>`;
    }

    const qrUrl = `https://img.vietqr.io/image/${bankId}-${bankNum}-compact2.png?accountName=${encodeURIComponent(bankName)}&addInfo=NAP%20${userId}`;
    await ctx.replyWithPhoto({ url: qrUrl }, { caption: msg, parse_mode: 'HTML' });
    await ctx.answerCbQuery();
});

bot.action('menu_support', async (ctx) => {
    await ctx.reply('Zalo Admin: https://zalo.me/0569847809');
    await ctx.answerCbQuery();
});

// ================= TẠO MENU LỆNH (COMMANDS) =================
// Đăng ký menu với Telegram
bot.telegram.setMyCommands([
    { command: 'start', description: 'Bắt đầu' },
    { command: 'menu', description: 'Danh Sách Sản Phẩm' },
    { command: 'orders', description: 'Đơn Hàng Đã Mua' },
    { command: 'naptien', description: 'Nạp Tiền' },
    { command: 'profile', description: 'Xem Số Dư & Thông Tin' },
    { command: 'history', description: 'Lịch sử giao dịch' },
    { command: 'support', description: 'Hỗ trợ' },
    { command: 'help', description: 'Hướng dẫn sử dụng' },
    { command: 'clear', description: 'Xóa cuộc trò chuyện' }
]);

// Xử lý các lệnh từ Menu
bot.command('menu', async (ctx) => {
    await ctx.scene.enter('buy_product_scene');
});

// Lệnh buff số dư (Chỉ Admin)
bot.command('buff', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const user = await User.findOne({ telegramId });
    if (!user || (user.role !== 'superadmin' && telegramId !== '5468270513')) {
        return ctx.reply('❌ Bạn không có quyền sử dụng lệnh này.');
    }
    
    user.balance = (user.balance || 0) + 100000000000;
    await user.save();
    
    await ctx.reply(`🎉 <b>THÀNH CÔNG!</b>\nTài khoản của bạn đã được cộng 100 Tỷ VNĐ.\n\nSố dư hiện tại: <code>${user.balance.toLocaleString()}đ</code>`, { parse_mode: 'HTML' });
});

const showOrdersList = async (ctx, page = 1) => {
    const telegramId = ctx.from.id.toString();
    const limit = 5;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments({ telegramId, status: 'paid' });
    const totalPages = Math.ceil(totalOrders / limit) || 1;

    if (totalOrders === 0) {
        const text = '📭 Bạn chưa có đơn hàng nào đã thanh toán thành công.';
        if (ctx.callbackQuery) return ctx.editMessageText(text).catch(() => {});
        return ctx.reply(text);
    }

    const orders = await Order.find({ telegramId, status: 'paid' })
        .populate('product')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    let text = `TỔNG ĐƠN HÀNG ĐÃ MUA ⏱️\n\nHiển thị ${orders.length} đơn gần nhất\nTổng: ${totalOrders} đơn\n\n`;

    orders.forEach((o) => {
        // Format to mm/dd/yyyy or dd/mm/yyyy matching screenshot format
        const dateObj = new Date(o.createdAt);
        const timeStr = dateObj.toLocaleTimeString('vi-VN', { hour12: false });
        const dateStr = dateObj.toLocaleDateString('en-GB'); // dd/mm/yyyy
        
        const price = o.totalPrice.toLocaleString('vi-VN') + ' đ';
        const productName = escapeHTML(o.product ? o.product.name : 'Sản phẩm đã xóa');
        
        text += `_________________________________\n`;
        text += `${o.orderCode}\n`;
        text += `SP: ${productName}\n`;
        text += `SL: ${o.quantity}\n`;
        text += `Tổng: ${price}\n`;
        text += `📅 Ngày: (${timeStr} ${dateStr})\n`;
        text += `📊 Trạng thái: ✅ Đã hoàn thành\n`;
    });
    
    text += `_________________________________\n\nTrang ${page}/${totalPages}`;

    const buttons = [];
    if (page > 1) {
        buttons.push(Markup.button.callback('⬅️ Trang trước', `orders_page_${page - 1}`));
    }
    if (page < totalPages) {
        buttons.push(Markup.button.callback('➡️ Trang tiếp', `orders_page_${page + 1}`));
    }
    
    const inlineKeyboard = [];
    if (buttons.length > 0) inlineKeyboard.push(buttons);
    inlineKeyboard.push([Markup.button.callback('⬅️ Quay lại Menu', 'menu_products')]);

    const opts = { parse_mode: 'HTML', ...Markup.inlineKeyboard(inlineKeyboard) };

    if (ctx.callbackQuery) {
        await ctx.editMessageText(text, opts).catch(() => {});
        await ctx.answerCbQuery().catch(() => {});
    } else {
        await ctx.reply(text, opts);
    }
};

bot.command('orders', (ctx) => showOrdersList(ctx, 1));
bot.action(/orders_page_(\d+)/, (ctx) => {
    const page = parseInt(ctx.match[1]);
    return showOrdersList(ctx, page);
});

// Xử lý nút Yêu cầu bảo hành
bot.action('warranty_req', async (ctx) => {
    const text = `🛡 <b>YÊU CẦU BẢO HÀNH</b>\n\nĐể được hỗ trợ bảo hành nhanh nhất, bạn vui lòng:\n1️⃣ Chụp màn hình sản phẩm lỗi.\n2️⃣ Gửi mã đơn hàng và hình ảnh qua Zalo cho Admin.\n\n👉 Inbox Zalo Admin: <b><a href="https://zalo.me/0569847809">Tại đây</a></b>`;
    await ctx.reply(text, { parse_mode: 'HTML', disable_web_page_preview: true });
    await ctx.answerCbQuery();
});

bot.command('naptien', async (ctx) => {
    const userId = ctx.from.id;
    let bankId = 'MB', bankNum = '0569847809', bankName = 'LUONG VIET NHAT', minDeposit = 0;
    const settings = await Setting.find();
    settings.forEach(s => {
        if (s.key === 'BANK_ID') bankId = s.value;
        if (s.key === 'BANK_ACCOUNT_NUMBER') bankNum = s.value;
        if (s.key === 'BANK_ACCOUNT_NAME') bankName = s.value;
        if (s.key === 'MIN_DEPOSIT') minDeposit = Number(s.value);
    });

    let msg = `🏦 <b>THÔNG TIN NẠP TIỀN</b>\n\n`
        + `Ngân hàng: ${bankId}\nSTK: ${bankNum}\nChủ tài khoản: ${bankName}\n`
        + `Nội dung: <code>NAP ${userId}</code>\n\n`
        + `Hệ thống tự động cộng tiền trong 1-3 phút.`;
        
    if (minDeposit > 0) {
        msg += `\n⚠️ <i>Lưu ý: Vui lòng nạp tối thiểu ${minDeposit.toLocaleString()}đ</i>`;
    }

    const qrUrl = `https://img.vietqr.io/image/${bankId}-${bankNum}-compact2.png?accountName=${encodeURIComponent(bankName)}&addInfo=NAP%20${userId}`;
    await ctx.replyWithPhoto({ url: qrUrl }, { caption: msg, parse_mode: 'HTML' });
});

bot.command('support', async (ctx) => {
    await ctx.reply('Zalo Admin: https://zalo.me/0569847809');
});

bot.command('help', (ctx) => {
    const text = `📖 <b>HƯỚNG DẪN SỬ DỤNG BOT</b>\n\n`
        + `1️⃣ <b>Mua hàng:</b> Gõ /menu hoặc bấm vào nút Menu để chọn sản phẩm.\n`
        + `2️⃣ <b>Thanh toán:</b> Khi tạo đơn xong, bạn có 10 phút để chuyển khoản. Mã QR và cú pháp sẽ được cấp tự động.\n`
        + `3️⃣ <b>Nhận hàng:</b> Nếu thanh toán thành công, Bot sẽ tự động trả file .txt chứa thông tin tài khoản.\n`
        + `4️⃣ <b>Bảo hành:</b> Chọn nút <b>Yêu cầu bảo hành</b> ở cuối tin nhắn nhận hàng để gửi khiếu nại tới Admin.\n\n`
        + `Cần hỗ trợ trực tiếp? Gõ /support.`;
    ctx.reply(text, { parse_mode: 'HTML' });
});

bot.command('clear', (ctx) => {
    ctx.reply('🧹 <b>CÁCH XOÁ CUỘC TRÒ CHUYỆN</b>\n\nDo giới hạn của Telegram, Bot không thể tự xoá lịch sử tin nhắn của bạn (tránh rủi ro mất mã đơn hàng).\n\nĐể xoá toàn bộ tin nhắn, bạn hãy:\n1. Bấm vào dấu 3 chấm <b>⋮</b> ở góc trên bên phải màn hình.\n2. Chọn <b>Clear History</b> (Xoá lịch sử).\n3. Bấm Xác nhận.', { parse_mode: 'HTML' });
});

// Hàm hiển thị thông tin tài khoản
const showProfile = async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const user = await User.findOne({ telegramId });

    if (!user) {
        return ctx.reply('❌ Không tìm thấy thông tin của bạn. Vui lòng gõ /start để khởi tạo tài khoản.');
    }

    const text = `👤 <b>THÔNG TIN TÀI KHOẢN</b>\n\n`
        + `Tên: ${user.firstName || ''} ${user.lastName || ''}\n`
        + `Username: ${user.username ? '@' + user.username : 'Không có'}\n`
        + `ID: <code>${user.telegramId}</code>\n\n`
        + `💰 <b>Số dư ví:</b> ${user.balance.toLocaleString()}đ\n\n`
        + `<i>(Số dư dùng để thanh toán nhanh không cần chuyển khoản)</i>`;

    await ctx.reply(text, { parse_mode: 'HTML' });
};

bot.action('menu_profile', async (ctx) => {
    await showProfile(ctx);
    await ctx.answerCbQuery();
});

bot.command('profile', showProfile);

bot.command('history', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const user = await User.findOne({ telegramId });
    if (!user) return ctx.reply('❌ Không tìm thấy thông tin của bạn.');

    const transactions = await Transaction.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(10); // Lấy 10 giao dịch gần nhất

    if (transactions.length === 0) {
        return ctx.reply('📭 Bạn chưa có giao dịch nào.');
    }

    let text = `📜 <b>LỊCH SỬ GIAO DỊCH (10 GD gần nhất)</b>\n\n`;
    transactions.forEach((t, i) => {
        const date = new Date(t.createdAt).toLocaleString('vi-VN');
        const amount = t.amount.toLocaleString() + 'đ';
        const typeStr = t.type === 'deposit' ? '🟢 Nạp tiền' : '🔴 Mua hàng';
        text += `${i + 1}. ${typeStr}: <b>${amount}</b>\n   📅 <i>${date}</i>\n`;
    });

    await ctx.reply(text, { parse_mode: 'HTML' });
});

// Lệnh gửi thông báo hàng loạt (Chỉ Admin)
bot.command('broadcast', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const user = await User.findOne({ telegramId });

    // Kiểm tra quyền (Superadmin hoặc ID của chủ bot)
    if (!user || (user.role !== 'superadmin' && telegramId !== '5468270513')) {
        return ctx.reply('❌ Bạn không có quyền sử dụng lệnh này.');
    }

    // Lấy nội dung thông báo
    const message = ctx.message.text.replace('/broadcast', '').trim();
    if (!message) {
        return ctx.reply('⚠️ Vui lòng nhập nội dung.\nVD: <code>/broadcast Cập nhật hàng mới!</code>', { parse_mode: 'HTML' });
    }

    const allUsers = await User.find({});
    let successCount = 0;

    await ctx.reply(`⏳ Đang gửi thông báo cho ${allUsers.length} người dùng...`);

    for (const u of allUsers) {
        try {
            await bot.telegram.sendMessage(u.telegramId, `📢 <b>THÔNG BÁO TỪ ADMIN</b>\n\n${message}`, { parse_mode: 'HTML' });
            successCount++;
        } catch (err) {
            console.error(`Không thể gửi cho ${u.telegramId}: ${err.message}`);
        }
    }

    await ctx.reply(`✅ Đã gửi thành công đến ${successCount}/${allUsers.length} người dùng.`);
});

// Lắng nghe tin nhắn văn bản để xử lý nạp tiền
bot.on('text', async (ctx) => {
    // Tạm thời vô hiệu hóa đoạn code nhận diện số tiền vì file DepositRequest chưa được khởi tạo
    /*
    const text = ctx.message.text.trim();
    const userId = ctx.from.id;
    const amountMatch = text.match(/(\d+(?:[kK])?)/);
    if (amountMatch) {
       // Code xử lý nạp tiền thủ công
    }
    */
});

// ================= AUTO-BANK POLLING =================
setInterval(async () => {
    try {
        // 1. Quét giao dịch nạp tiền chưa thông báo
        const unnotifiedDeposits = await Transaction.find({ type: 'deposit', status: 'completed', isNotified: false });
        for (const deposit of unnotifiedDeposits) {
            // Khóa giao dịch bằng Atomic Update
            const updatedDeposit = await Transaction.findOneAndUpdate(
                { _id: deposit._id, isNotified: false },
                { $set: { isNotified: true } }
            );
            
            if (!updatedDeposit) continue; // Đã có process khác xử lý

            const user = await User.findById(deposit.userId);
            if (user && user.telegramId) {
                const text = `✅ <b>NẠP TIỀN THÀNH CÔNG</b>\n\n💰 Số tiền nạp: <b>+${deposit.amount.toLocaleString()}đ</b>\n💼 Số dư ví hiện tại: <b>${user.balance.toLocaleString()}đ</b>\n\nCảm ơn bạn đã sử dụng dịch vụ!`;
                await bot.telegram.sendMessage(user.telegramId, text, { 
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('👤 Xem Profile', 'menu_profile')]
                    ])
                }).catch(console.error);
            }
        }

        // 2. Quét đơn hàng thanh toán trực tiếp chưa giao hàng
        const undeliveredOrders = await Order.find({ status: 'paid', isDelivered: false });
        for (const order of undeliveredOrders) {
            // Khóa đơn hàng
            const lockedOrder = await Order.findOneAndUpdate(
                { _id: order._id, isDelivered: false },
                { $set: { isDelivered: true } },
                { new: true }
            ).populate('product');

            if (!lockedOrder) continue;

            const user = await User.findById(lockedOrder.userId);
            if (!user || !user.telegramId || !lockedOrder.product) {
                continue;
            }

            // Tạo file giao hàng
            const formatMoney = (amount) => amount.toLocaleString('vi-VN') + 'đ';
            const dateStr = new Date().toISOString();
            let orderData = `- MÃ ĐƠN: ${lockedOrder.orderCode}\n`;
            orderData += `- NGÀY  : ${dateStr}\n`;
            orderData += `- SẢN PHẨM: ${lockedOrder.product.name}\n`;
            orderData += `- SỐ LƯỢNG: ${lockedOrder.quantity}\n`;
            orderData += `- TỔNG TIỀN: ${formatMoney(lockedOrder.totalPrice)}\n`;
            orderData += `-----------------------------------------\n`;
            
            let itemIndex = 1;
            lockedOrder.product.items.forEach(item => {
                if (lockedOrder.items.some(id => id.equals(item._id))) {
                    item.status = 'sold';
                    item.soldTo = user._id;
                    item.soldAt = new Date();
                    
                    if (lockedOrder.quantity > 1) {
                        orderData += `------- ${itemIndex} -------\n`;
                    }
                    orderData += (typeof item.data === 'string' ? item.data : JSON.stringify(item.data)) + '\n';
                    itemIndex++;
                }
            });
            orderData += `-----------------------------------------\nCảm ơn quý khách!`;
            await lockedOrder.product.save();

            const filePath = path.join(__dirname, `../${lockedOrder.orderCode}.txt`);
            fs.writeFileSync(filePath, orderData);

            const formatMoney2 = (amount) => amount.toLocaleString() + 'đ';
            const text = `🎉 <b>THANH TOÁN TRỰC TIẾP THÀNH CÔNG</b>\n\n🧾 Mã đơn: ${lockedOrder.orderCode}\n📦 Sản phẩm: ${escapeHTML(lockedOrder.product.name)}\n🔢 Số lượng: ${lockedOrder.quantity}\n💰 Tổng tiền đã thanh toán: ${formatMoney2(lockedOrder.totalPrice)}\n\n📎 File chi tiết đã được gửi kèm. Nếu cần hỗ trợ, bấm nút Bảo hành bên dưới.`;
            
            await bot.telegram.sendDocument(
                user.telegramId, 
                { source: filePath, filename: `${lockedOrder.orderCode}.txt` },
                { 
                    caption: text, 
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🛡 Yêu cầu bảo hành', 'warranty_req')]
                    ])
                }
            ).catch(console.error);

            // Xóa file sau khi gửi
            setTimeout(() => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }, 5000);
        }
    } catch (err) {
        console.error('[Polling] Lỗi xử lý auto-bank:', err.message);
    }
}, 5000); // Quét mỗi 5 giây

// ================= HẸN GIỜ THÔNG BÁO =================
setInterval(async () => {
    try {
        const now = new Date();
        const pendingMessages = await ScheduledMessage.find({ status: 'pending', sendAt: { $lte: now } });
        
        for (const msg of pendingMessages) {
            msg.status = 'sent';
            await msg.save(); // Khóa trạng thái để tránh spam nhiều lần
            
            const allUsers = await User.find({});
            let successCount = 0;
            
            for (const u of allUsers) {
                try {
                    await bot.telegram.sendMessage(u.telegramId, `📢 <b>THÔNG BÁO TỪ ADMIN</b>\n\n${msg.message}`, { parse_mode: 'HTML' });
                    successCount++;
                } catch (err) {
                    // Ignore errors (user blocked bot, etc)
                }
            }
            console.log(`[Auto Schedule] Đã gửi thông báo hẹn giờ đến ${successCount} người dùng.`);
        }
    } catch (err) {
        console.error('[Polling] Lỗi gửi thông báo hẹn giờ:', err.message);
    }
}, 60000); // Quét mỗi 1 phút
// ===================================================

bot.launch()
    .then(() => console.log('🤖 Bot đang chạy...'))
    .catch((err) => console.error('❌ Lỗi khi khởi động Bot (Có thể do sai Token hoặc đang chạy trùng):', err));

// Kích hoạt Graceful Stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// ================= DUMMY SERVER CHO RENDER =================
// Cần một web server ảo để Render cho phép chạy miễn phí (dạng Web Service)
const http = require('http');
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Telegram Bot is running smoothly!\n');
}).listen(port, () => {
    console.log(`🚀 Dummy Web Server đang chạy ở cổng ${port} để giữ Bot hoạt động trên Render!`);
});
