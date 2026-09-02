const { Scenes, Markup } = require('telegraf');

const warrantyScene = new Scenes.BaseScene('warranty_scene');

warrantyScene.enter(async (ctx) => {
    const text = `🛡 <b>YÊU CẦU BẢO HÀNH</b>\n\n🧾 Mã đơn: ${ctx.session.orderCode || 'Không xác định'}\n\n✅ Hãy reply (trả lời) tin nhắn này bằng tin nhắn hoặc ảnh.\n• Nếu gửi ảnh, có thể kèm caption lý do.\n• Nếu gửi chữ, hãy mô tả lỗi cần bảo hành.\n\nVí dụ: Tài khoản lỗi đăng nhập / bị đổi mật khẩu\n\nGõ /cancel để hủy.`;
    
    await ctx.reply(text, { parse_mode: 'HTML' });
});

// Hủy
warrantyScene.command('cancel', async (ctx) => {
    await ctx.reply('Đã hủy yêu cầu bảo hành.');
    return ctx.scene.leave();
});

// Lắng nghe chữ hoặc ảnh
warrantyScene.on(['text', 'photo'], async (ctx, next) => {
    if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/')) {
        ctx.scene.leave();
        return next();
    }
    const orderCode = ctx.session.orderCode || 'Không xác định';
    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    const adminId = '5468270513'; // Thay bằng ID Admin thật (Nên đưa vào Settings)

    let reason = '';
    if (ctx.message.text) {
        reason = ctx.message.text;
    } else if (ctx.message.caption) {
        reason = ctx.message.caption;
    }

    try {
        await ctx.telegram.sendMessage(adminId, `⚠️ <b>CÓ YÊU CẦU BẢO HÀNH MỚI</b>\n\nKhách hàng: ${username}\nMã đơn: <code>${orderCode}</code>\nLý do: ${reason}`, { parse_mode: 'HTML' });
        
        // Chuyển tiếp (forward) tin nhắn gốc của khách để Admin dễ xử lý/reply
        await ctx.telegram.forwardMessage(adminId, ctx.chat.id, ctx.message.message_id);

        await ctx.reply('✅ Đã gửi yêu cầu bảo hành tới Admin. Vui lòng chờ phản hồi (1-12h).');
    } catch (err) {
        console.error('Lỗi gửi bảo hành:', err);
        await ctx.reply('❌ Lỗi khi gửi yêu cầu tới Admin, vui lòng thử lại sau.');
    }
    
    return ctx.scene.leave();
});

module.exports = warrantyScene;
