import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BsGlobe, BsPlusLg, BsPencilFill, BsTrashFill, BsCheckCircleFill, BsXCircleFill, BsLightningChargeFill, BsCodeSlash, BsKeyFill } from 'react-icons/bs';
import { useDialog } from '../context/DialogContext';
import { API_URL } from '../config';

const ApiProviders = () => {
  const { alert, confirm } = useDialog();
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [editingProvider, setEditingProvider] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' or 'advanced'

  const [formData, setFormData] = useState({
    name: '',
    isActive: true,
    apiUrl: '',
    apiMethod: 'GET',
    headers: '{}',
    body: '',
    mappingArrayPath: '',
    mappingIdField: '_id',
    mappingNameField: 'product_name',
    mappingPriceField: 'pricing',
    mappingStockField: 'stats.available',
    purchaseUrl: '',
    purchaseMethod: 'POST',
    purchaseHeaders: '{}',
    purchaseBodyTemplate: '{"product_id": "{{id}}", "quantity": {{qty}}}',
    purchaseAccountListPath: 'deliveredAccounts',
    purchaseAccountFormat: '{{raw}}'
  });

  const fetchProviders = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin/api-providers`);
      setProviders(res.data);
    } catch (err) {
      console.error(err);
      alert('Lỗi lấy danh sách nguồn API');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const openModal = (provider = null) => {
    if (provider) {
      setEditingProvider(provider);
      setFormData(provider);
    } else {
      setEditingProvider(null);
      setFormData({
        name: '', isActive: true, apiUrl: '', apiMethod: 'GET', headers: '{}', body: '',
        mappingArrayPath: '', mappingIdField: '_id', mappingNameField: 'name', mappingPriceField: 'price', mappingStockField: 'stock',
        purchaseUrl: '', purchaseMethod: 'POST', purchaseHeaders: '{}', purchaseBodyTemplate: '{"product_id": "{{id}}", "quantity": {{qty}}}',
        purchaseAccountListPath: 'data', purchaseAccountFormat: '{{raw}}'
      });
    }
    setActiveTab('advanced'); // Default to advanced for custom ones
    setIsModalOpen(true);
  };
  
  const openCanbosoTemplate = () => {
    setEditingProvider(null);
    setFormData({
      name: 'Canboso Partner (Auto)', 
      isActive: true, 
      apiUrl: 'http://api-tgbot.testflighty.com/t/PA1/api/telegram-buyer/products', 
      apiMethod: 'GET', 
      headers: '{\n  "Authorization": "Bearer tgb_YOUR_KEY_HERE"\n}', 
      body: '',
      mappingArrayPath: 'products', 
      mappingIdField: '_id', 
      mappingNameField: 'product_name', 
      mappingPriceField: 'pricing', 
      mappingStockField: 'stats.available',
      purchaseUrl: 'http://api-tgbot.testflighty.com/t/PA1/api/telegram-buyer/purchase', 
      purchaseMethod: 'POST', 
      purchaseHeaders: '{\n  "Authorization": "Bearer tgb_YOUR_KEY_HERE",\n  "Idempotency-Key": "order-{{telegramId}}-{{orderCode}}"\n}', 
      purchaseBodyTemplate: '{\n  "product_id": "{{id}}", \n  "quantity": {{qty}}\n}',
      purchaseAccountListPath: 'deliveredAccounts', 
      purchaseAccountFormat: '{{raw}}'
    });
    setActiveTab('basic'); // Force basic tab for Canboso
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  // Helper cho Tab Cơ bản (Canboso API Key)
  const handleApiKeyChange = (e) => {
    const key = e.target.value;
    const newHeaders = `{\n  "Authorization": "Bearer ${key}"\n}`;
    const newPurchaseHeaders = `{\n  "Authorization": "Bearer ${key}",\n  "Idempotency-Key": "order-{{telegramId}}-{{orderCode}}"\n}`;
    setFormData({
      ...formData,
      headers: newHeaders,
      purchaseHeaders: newPurchaseHeaders
    });
  };

  const extractApiKey = (headersStr) => {
    try {
      const obj = JSON.parse(headersStr);
      if (obj.Authorization && obj.Authorization.startsWith('Bearer ')) {
        return obj.Authorization.replace('Bearer ', '');
      }
    } catch(e) {}
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProvider) {
        await axios.put(`${API_URL}/api/admin/api-providers/${editingProvider._id}`, formData);
        alert('Đã cập nhật nguồn API');
      } else {
        await axios.post(`${API_URL}/api/admin/api-providers`, formData);
        alert('Đã thêm nguồn API mới thành công!');
      }
      closeModal();
      fetchProviders();
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi lưu cấu hình');
    }
  };

  const handleDelete = async (provider) => {
    const isConfirmed = await confirm(`Bạn có chắc muốn xóa nguồn API "${provider.name}"? Mọi sản phẩm thuộc nguồn này sẽ không thể cập nhật/mua được nữa!`);
    if (!isConfirmed) return;
    
    try {
      await axios.delete(`${API_URL}/api/admin/api-providers/${provider._id}`);
      alert('Đã xóa nguồn API');
      fetchProviders();
    } catch (err) {
      console.error(err);
      alert('Lỗi khi xóa nguồn API');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="text-h1" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BsGlobe style={{ color: 'var(--primary)' }} /> Nguồn API (Đối tác)
        </h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-warning" onClick={openCanbosoTemplate} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BsLightningChargeFill /> Thêm nhanh mẫu Canboso
          </button>
          <button className="btn btn-primary" onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BsPlusLg /> Tự định nghĩa API mới
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên Đối tác (API)</th>
                <th>URL API Gốc</th>
                <th>Tình trạng</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {providers.map(p => (
                <tr key={p._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BsCodeSlash style={{ color: 'var(--primary)' }} />
                      <strong>{p.name}</strong>
                    </div>
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new URL(p.apiUrl).hostname}</td>
                  <td>
                    {p.isActive ? 
                      <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(34,197,94,0.1)', color: 'var(--success)', fontSize: '12px', fontWeight: 'bold' }}>Hoạt động</span> : 
                      <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', fontSize: '12px', fontWeight: 'bold' }}>Tạm ngưng</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button className="btn btn-secondary" onClick={() => openModal(p)} style={{ padding: '6px 12px' }}>Sửa <BsPencilFill style={{marginLeft: '4px'}}/></button>
                      <button className="btn btn-danger" onClick={() => handleDelete(p)} style={{ padding: '6px 12px' }}>Xóa <BsTrashFill style={{marginLeft: '4px'}}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {providers.length === 0 && (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '48px' }}>Chưa có cấu hình nguồn API nào. Thêm ngay bằng nút phía trên!</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1000, padding: '20px', overflowY: 'auto' }}>
          <div className="glass-modal" style={{ width: '100%', maxWidth: '800px', margin: '20px auto', padding: '0', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
              <h2 className="text-h2" style={{ margin: 0 }}>
                {editingProvider ? `Sửa Đối tác: ${formData.name}` : 'Thêm Nguồn Đối tác API'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '24px' }}>&times;</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 24px', background: 'rgba(0,0,0,0.1)' }}>
              <button 
                type="button"
                onClick={() => setActiveTab('basic')}
                style={{ background: 'none', border: 'none', borderBottom: activeTab === 'basic' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'basic' ? 'var(--primary)' : 'var(--text-muted)', padding: '16px 20px', cursor: 'pointer', fontWeight: 'bold' }}
              >Cài đặt Cơ bản (Dễ dùng)</button>
              <button 
                type="button"
                onClick={() => setActiveTab('advanced')}
                style={{ background: 'none', border: 'none', borderBottom: activeTab === 'advanced' ? '3px solid var(--warning)' : '3px solid transparent', color: activeTab === 'advanced' ? 'var(--warning)' : 'var(--text-muted)', padding: '16px 20px', cursor: 'pointer', fontWeight: 'bold' }}
              >Cấu hình JSON Nâng cao</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              
              {/* TAB BASIC */}
              {activeTab === 'basic' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '350px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--text-muted)' }}>Tên Gợi nhớ (Ví dụ: Trùm Sub, Canboso...)</label>
                      <input type="text" className="input-field" name="name" value={formData.name} onChange={handleInputChange} required style={{ fontSize: '16px', padding: '12px' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'rgba(0,0,0,0.2)', padding: '10px 16px', borderRadius: '8px' }}>
                        <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleInputChange} style={{ width: '18px', height: '18px' }} />
                        <span style={{ fontWeight: '500' }}>Cho phép hoạt động</span>
                      </label>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 'bold', color: 'var(--warning)', marginBottom: '16px' }}>
                      <BsKeyFill size={18} /> Reseller API Key (Mã Token)
                    </label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={extractApiKey(formData.headers) || ''} 
                      onChange={handleApiKeyChange}
                      placeholder="tgb_xxxxxxxxxxxxxxxxxxxxxxxxxx..." 
                      style={{ fontSize: '16px', padding: '16px', fontFamily: 'monospace', letterSpacing: '1px', background: 'rgba(0,0,0,0.4)', color: '#10B981' }} 
                    />
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px', lineHeight: '1.5' }}>
                      Nếu bạn sử dụng API dạng Canboso, chỉ cần dán API Key vào đây, hệ thống sẽ tự động tạo Header (Bearer Token) và cấu hình mã hóa Idempotency-Key chống thanh toán trùng lặp an toàn.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB ADVANCED */}
              {activeTab === 'advanced' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '350px' }}>
                  <div className="alert-warning" style={{ background: 'rgba(234, 179, 8, 0.1)', color: 'var(--warning)', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '8px' }}>
                    <strong>CẢNH BÁO:</strong> Khu vực dành cho lập trình viên hoặc người am hiểu API. Nếu bạn dùng Canboso, không cần chỉnh sửa phần này!
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
                    <h4 style={{ color: 'var(--primary)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                      1. TẢI SẢN PHẨM (Fetch)
                      <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-muted)' }}>URL trả về JSON danh sách sp</span>
                    </h4>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                      <div style={{ width: '120px' }}>
                        <select className="input-field" name="apiMethod" value={formData.apiMethod} onChange={handleInputChange}>
                          <option value="GET">GET</option><option value="POST">POST</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <input type="url" className="input-field" name="apiUrl" value={formData.apiUrl} onChange={handleInputChange} placeholder="URL Lấy sản phẩm" />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <textarea className="input-field" name="headers" value={formData.headers} onChange={handleInputChange} rows="3" placeholder="Headers (JSON)"></textarea>
                      <textarea className="input-field" name="body" value={formData.body} onChange={handleInputChange} rows="3" placeholder="Body (POST)"></textarea>
                    </div>

                    <h4 style={{ color: 'var(--warning)', margin: '24px 0 16px 0' }}>2. JSON MAPPING (Lọc dữ liệu)</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mảng Sản phẩm</label>
                        <input type="text" className="input-field" name="mappingArrayPath" value={formData.mappingArrayPath} onChange={handleInputChange} placeholder="VD: products" />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mã ID SP</label>
                        <input type="text" className="input-field" name="mappingIdField" value={formData.mappingIdField} onChange={handleInputChange} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tên SP</label>
                        <input type="text" className="input-field" name="mappingNameField" value={formData.mappingNameField} onChange={handleInputChange} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Giá</label>
                        <input type="text" className="input-field" name="mappingPriceField" value={formData.mappingPriceField} onChange={handleInputChange} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tồn kho</label>
                        <input type="text" className="input-field" name="mappingStockField" value={formData.mappingStockField} onChange={handleInputChange} />
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
                    <h4 style={{ color: 'var(--danger)', marginBottom: '16px' }}>3. MUA HÀNG (Purchase)</h4>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                      <div style={{ width: '120px' }}>
                        <select className="input-field" name="purchaseMethod" value={formData.purchaseMethod} onChange={handleInputChange}>
                          <option value="POST">POST</option><option value="GET">GET</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <input type="url" className="input-field" name="purchaseUrl" value={formData.purchaseUrl} onChange={handleInputChange} placeholder="URL Mua hàng" />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <textarea className="input-field" name="purchaseHeaders" value={formData.purchaseHeaders} onChange={handleInputChange} rows="4" placeholder="Headers (Hỗ trợ {{orderCode}})"></textarea>
                      <textarea className="input-field" name="purchaseBodyTemplate" value={formData.purchaseBodyTemplate} onChange={handleInputChange} rows="4" placeholder="Body Template"></textarea>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mảng Tài khoản trả về</label>
                        <input type="text" className="input-field" name="purchaseAccountListPath" value={formData.purchaseAccountListPath} onChange={handleInputChange} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Format Lưu File (.txt)</label>
                        <input type="text" className="input-field" name="purchaseAccountFormat" value={formData.purchaseAccountFormat} onChange={handleInputChange} placeholder="{{raw}}" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal} style={{ minWidth: '120px' }}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ minWidth: '180px' }}>Lưu Cấu Hình</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiProviders;
