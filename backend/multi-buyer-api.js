const BASE_URL = "http://api-tgbot.testflighty.com/t/PA1/api/telegram-buyer";

class MultiBuyerAPI {
  /**
   * Khởi tạo với nhiều API keys
   * @param {string[]} apiKeys - Mảng chứa các API keys
   */
  constructor(apiKeys) {
    if (!apiKeys || apiKeys.length === 0) {
      throw new Error("Cần cung cấp ít nhất 1 API key.");
    }
    this.apiKeys = apiKeys;
  }

  /**
   * Helper function để gọi API
   */
  async _fetchAPI(endpoint, key, method = "GET", body = null, extraHeaders = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      ...extraHeaders
    };

    const options = {
      method,
      headers,
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        // Handle rate limits / server errors
        if (response.status === 429) {
          console.warn(`[Key: ${key.substring(0,8)}...] Bị giới hạn tốc độ (Rate Limit).`);
        }
      }
      return await response.json();
    } catch (error) {
      console.error(`[Key: ${key.substring(0,8)}...] Lỗi khi gọi API:`, error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * Kiểm tra số dư của TẤT CẢ các keys
   */
  async checkAllBalances() {
    const results = [];
    for (const key of this.apiKeys) {
      const res = await this._fetchAPI("/balance", key);
      results.push({
        key: key.substring(0, 8) + '...',
        fullKey: key,
        data: res
      });
    }
    return results;
  }

  /**
   * Lấy danh sách sản phẩm từ một key cụ thể (hoặc key đầu tiên nếu không chỉ định)
   * (Vì sản phẩm giữa các shop có thể giống/khác nhau)
   */
  async getProducts(keyIndex = 0) {
    if (keyIndex >= this.apiKeys.length) keyIndex = 0;
    const key = this.apiKeys[keyIndex];
    return await this._fetchAPI("/products", key);
  }

  /**
   * Tổng hợp tất cả sản phẩm từ tất cả các shop (nếu bạn muốn gộp chung)
   */
  async getAllProductsAggregated() {
    const allProducts = [];
    for (const key of this.apiKeys) {
      const res = await this._fetchAPI("/products", key);
      if (res.success && res.products) {
        // Gắn thêm thông tin key/shop nào sở hữu sản phẩm này
        const productsWithShop = res.products.map(p => ({
          ...p,
          shopKey: key
        }));
        allProducts.push(...productsWithShop);
      }
    }
    return allProducts;
  }

  /**
   * Mua hàng tự động: Tìm key nào có đủ tiền (và tồn kho nếu biết) để mua
   * @param {string} productId - ID sản phẩm muốn mua
   * @param {number} quantity - Số lượng
   * @param {string} idempotencyKey - (Tùy chọn) Mã đơn hàng để tránh trùng lặp
   */
  async smartPurchase(productId, quantity, idempotencyKey = null) {
    // 1. Kiểm tra số dư tất cả
    const balances = await this.checkAllBalances();
    
    // 2. Tìm shop có đủ tiền (cần ước lượng giá, hoặc cứ thử mua ở shop nhiều tiền nhất)
    // Ở đây ta cứ thử từng shop một, nếu thành công thì dừng.
    // Nếu có lỗi "không đủ tiền", ta chuyển sang shop tiếp theo.
    
    const keyToUse = idempotencyKey || `order-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    
    for (const shop of balances) {
      // Chỉ thử với những shop lấy được balance thành công
      if (shop.data && shop.data.success) {
        console.log(`Đang thử mua qua key ${shop.key} (Số dư: ${shop.data.balanceText})...`);
        
        const purchaseRes = await this._fetchAPI("/purchase", shop.fullKey, "POST", {
          product_id: productId,
          quantity: quantity
        }, {
          "Idempotency-Key": keyToUse
        });

        if (purchaseRes.success) {
          console.log(`✅ Mua thành công qua key ${shop.key}!`);
          return {
            success: true,
            usedKey: shop.key,
            data: purchaseRes
          };
        } else {
          console.log(`❌ Không thể mua qua key ${shop.key}: ${purchaseRes.message}`);
          // Nếu lỗi là do hết hàng hoặc không đủ tiền, vòng lặp sẽ tiếp tục thử key khác
        }
      }
    }

    return {
      success: false,
      message: "Đã thử tất cả các API keys nhưng không mua được (có thể hết tiền hoặc lỗi sản phẩm)."
    };
  }
}

// ==========================
// VÍ DỤ SỬ DỤNG
// ==========================
async function runDemo() {
  // Thay thế bằng danh sách API keys của bạn
  const myKeys = [
    "tgb_a78b7dfdfb09d18b799eba1403613861173431cffb07a8bc",
    "tgb_ANOTHER_KEY_1234567890",
    "tgb_YET_ANOTHER_KEY_098765"
  ];

  const multiApi = new MultiBuyerAPI(myKeys);

  console.log("1. Đang kiểm tra số dư tất cả các keys...");
  const balances = await multiApi.checkAllBalances();
  balances.forEach(b => {
    if(b.data.success) {
       console.log(`- Key ${b.key}: ${b.data.balanceText}`);
    } else {
       console.log(`- Key ${b.key}: Lỗi - ${b.data.message}`);
    }
  });

  console.log("\n2. Đang lấy danh sách sản phẩm từ key đầu tiên...");
  const productsRes = await multiApi.getProducts(0);
  if (productsRes.success && productsRes.products.length > 0) {
    const firstProduct = productsRes.products[0];
    console.log(`Sản phẩm đầu tiên: ${firstProduct.product_name} (Giá: ${firstProduct.pricing} ${productsRes.walletCurrency})`);
    
    // Bỏ comment đoạn dưới để test thử mua hàng
    /*
    console.log("\n3. Thử tính năng Smart Purchase (Mua hàng qua key có đủ đk)...");
    const purchaseResult = await multiApi.smartPurchase(firstProduct._id, 1);
    console.log("Kết quả mua:", JSON.stringify(purchaseResult, null, 2));
    */
  } else {
    console.log("Không tìm thấy sản phẩm nào.");
  }
}

// Chạy demo nếu file được gọi trực tiếp
if (require.main === module) {
  runDemo();
}

module.exports = MultiBuyerAPI;
