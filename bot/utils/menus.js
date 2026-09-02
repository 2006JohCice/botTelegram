const { Markup } = require('telegraf');

const getMainMenu = () => {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🛒 Xem Sản Phẩm', 'menu_products')],
        [
            Markup.button.callback('💳 Nạp Tiền', 'menu_deposit'),
            Markup.button.callback('👤 Tài Khoản', 'menu_profile')
        ],
        [Markup.button.callback('🎧 Hỗ Trợ', 'menu_support')]
    ]);
};

module.exports = { getMainMenu };
