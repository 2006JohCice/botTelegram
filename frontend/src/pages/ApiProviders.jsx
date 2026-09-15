import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BsGlobe, BsPlusLg, BsPencilFill, BsTrashFill, BsLightningChargeFill, BsCodeSlash, BsKeyFill, BsArrowLeft, BsCheckLg, BsCloudArrowUpFill, BsShieldLockFill, BsListUl, BsCartCheckFill } from 'react-icons/bs';
import { useDialog } from '../context/DialogContext';
import { API_URL } from '../config';
import DataTableTools from '../components/DataTableTools';
import Pagination from '../components/Pagination';

const ApiProviders = () => {
  const { alert, confirm } = useDialog();
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 'list' = danh sách | 'form' = trang thiết lập full
  const [view, setView] = useState('list');
  const [editingProvider, setEditingProvider] = useState(null);

  // Pagination & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const defaultFormData = {
    name: '', isActive: true,
    apiUrl: '', apiMethod: 'GET', headers: '{}', body: '',
    mappingArrayPath: '', mappingIdField: '_id', mappingNameField: 'name', mappingPriceField: 'price', mappingStockField: 'stock',
    purchaseUrl: '', purchaseMethod: 'POST', purchaseHeaders: '{}',
    purchaseBodyTemplate: '{"product_id": "{{id}}", "quantity": {{qty}}}',
    purchaseAccountListPath: 'data', purchaseAccountFormat: '{{raw}}'
  };

  const [formData, setFormData] = useState(defaultFormData);

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

  useEffect(() => { fetchProviders(); }, []);

  // ---- Navigation ----
  const goToForm = (provider = null) => {
    if (provider) {
      setEditingProvider(provider);
      setFormData(provider);
    } else {
      setEditingProvider(null);
      setFormData(defaultFormData);
    }
    setView('form');
  };

  const goToFormCanboso = () => {
    setEditingProvider(null);
    setFormData({
      name: 'Shop Đối Tác (Canboso)',
      isActive: true,
      apiUrl: 'https://api-tgbot.testflighty.com/t/PA1/api/telegram-buyer/products',
      apiMethod: 'GET',
      headers: '{\n  "Authorization": "Bearer tgb_YOUR_KEY_HERE"\n}',
      body: '',
      mappingArrayPath: 'products',
      mappingIdField: '_id',
      mappingNameField: 'product_name',
      mappingPriceField: 'pricing',
      mappingStockField: 'stats.available',
      purchaseUrl: 'https://api-tgbot.testflighty.com/t/PA1/api/telegram-buyer/purchase',
      purchaseMethod: 'POST',
      purchaseHeaders: '{\n  "Authorization": "Bearer tgb_YOUR_KEY_HERE",\n  "Idempotency-Key": "order-{{telegramId}}-{{orderCode}}"\n}',
      purchaseBodyTemplate: '{\n  "product_id": "{{id}}",\n  "quantity": {{qty}}\n}',
      purchaseAccountListPath: 'deliveredAccounts',
      purchaseAccountFormat: '{{raw}}'
    });
    setView('form');
  };

  const goBack = () => {
    setView('list');
    setEditingProvider(null);
  };

  // ---- Handlers ----
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleApiKeyChange = (e) => {
    const key = e.target.value;
    setFormData({
      ...formData,
      headers: `{\n  "Authorization": "Bearer ${key}"\n}`,
      purchaseHeaders: `{\n  "Authorization": "Bearer ${key}",\n  "Idempotency-Key": "order-{{telegramId}}-{{orderCode}}"\n}`
    });
  };

  const extractApiKey = (headersStr) => {
    try {
      const obj = JSON.parse(headersStr);
      if (obj.Authorization && obj.Authorization.startsWith('Bearer '))
        return obj.Authorization.replace('Bearer ', '');
    } catch(e) {}
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProvider) {
        await axios.put(`${API_URL}/api/admin/api-providers/${editingProvider._id}`, formData);
        alert('Đã cập nhật nguồn API thành công!');
      } else {
        await axios.post(`${API_URL}/api/admin/api-providers`, formData);
        alert('Đã thêm nguồn API mới thành công!');
      }
      goBack();
      fetchProviders();
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi lưu cấu hình');
    }
  };

  const handleDelete = async (provider) => {
    const ok = await confirm(`Bạn có chắc muốn xóa nguồn API "${provider.name}"? Mọi sản phẩm thuộc nguồn này sẽ không thể cập nhật/mua được nữa!`);
    if (!ok) return;
    try {
      await axios.delete(`${API_URL}/api/admin/api-providers/${provider._id}`);
      alert('Đã xóa nguồn API');
      fetchProviders();
    } catch (err) {
      console.error(err);
      alert('Lỗi khi xóa nguồn API');
    }
  };

  // =============================================
  //    VIEW: DANH SÁCH
  // =============================================
  const filteredProviders = providers.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.apiUrl.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const totalItems = filteredProviders.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProviders = filteredProviders.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (view === 'list') {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <h1 className="text-h1" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BsGlobe style={{ color: 'var(--primary)' }} /> Nguồn API (Đối tác)
          </h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-warning" onClick={goToFormCanboso} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BsLightningChargeFill /> Thêm nhanh Canboso
            </button>
            <button className="btn btn-primary" onClick={() => goToForm()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BsPlusLg /> Tự định nghĩa API
            </button>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <DataTableTools 
            searchPlaceholder="Tìm kiếm nguồn API..."
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
          
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tên Đối tác</th>
                  <th>URL API Gốc</th>
                  <th>API Key</th>
                  <th>Tình trạng</th>
                  <th style={{ textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {currentProviders.map(p => {
                  const key = extractApiKey(p.headers);
                  let hostname = '';
                  try { hostname = new URL(p.apiUrl).hostname; } catch(e) { hostname = p.apiUrl; }
                  return (
                    <tr key={p._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <BsCodeSlash style={{ color: 'var(--primary)', flexShrink: 0 }} />
                          <strong>{p.name}</strong>
                        </div>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{hostname}</td>
                      <td>
                        {key ? (
                          <code style={{ fontSize: '12px', color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                            {key.substring(0, 10)}…{key.slice(-4)}
                          </code>
                        ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>}
                      </td>
                      <td>
                        {p.isActive ?
                          <span style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(34,197,94,0.1)', color: 'var(--success)', fontSize: '12px', fontWeight: 'bold' }}>Hoạt động</span> :
                          <span style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', fontSize: '12px', fontWeight: 'bold' }}>Tạm ngưng</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button className="btn btn-secondary" onClick={() => goToForm(p)} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}><BsPencilFill /> Sửa</button>
                          <button className="btn btn-danger" onClick={() => handleDelete(p)} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}><BsTrashFill /> Xóa</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProviders.length === 0 && (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
                    <BsGlobe size={40} style={{ opacity: 0.3, marginBottom: '16px' }} />
                    <p>Chưa có cấu hình nguồn API nào hoặc không tìm thấy.</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        
        {!isLoading && (
          <Pagination 
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    );
  }

  // =============================================
  //    VIEW: TRANG THIẾT LẬP FULL-WIDTH
  // =============================================
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-secondary" onClick={goBack} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BsArrowLeft /> Quay lại
          </button>
          <h1 className="text-h1" style={{ margin: 0 }}>
            {editingProvider ? `✏️ Sửa: ${formData.name || 'Nguồn API'}` : '➕ Thêm Nguồn API Mới'}
          </h1>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: formData.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', color: formData.isActive ? 'var(--success)' : 'var(--danger)' }}>
          <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleInputChange} style={{ width: '16px', height: '16px' }} />
          {formData.isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
        </label>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Row 1: Thông tin cơ bản + API Key */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>

          {/* Card: Tên & Trạng thái */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
              <BsShieldLockFill /> Thông tin Cơ bản
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-muted)', fontWeight: '500' }}>Tên Nguồn API (Gợi nhớ)</label>
              <input type="text" className="input-field" name="name" value={formData.name} onChange={handleInputChange} required
                style={{ fontSize: '16px', padding: '14px' }} placeholder="VD: Trùm Sub, Canboso Shop..." />
            </div>
          </div>

          {/* Card: API Key */}
          <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(234,179,8,0.2)' }}>
            <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)' }}>
              <BsKeyFill /> API Key (Token)
            </h3>
            <input
              type="text"
              className="input-field"
              value={extractApiKey(formData.headers) || ''}
              onChange={handleApiKeyChange}
              placeholder="tgb_xxxxxxxxxxxxxxxxxxxxx"
              style={{ fontSize: '16px', padding: '14px', fontFamily: 'monospace', letterSpacing: '0.5px', background: 'rgba(0,0,0,0.3)', color: '#10B981' }}
            />
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px', lineHeight: '1.4' }}>
              Dán API Key từ đối tác vào đây. Hệ thống sẽ tự tạo Header <code>Authorization: Bearer</code> và Idempotency-Key.
            </p>
          </div>
        </div>

        {/* Row 2: Fetch Config + Mapping (ngang) */}
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
            <BsListUl /> 1. Tải Sản Phẩm (Fetch Products)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Cột trái: URL + Headers */}
            <div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '100px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Method</label>
                  <select className="input-field" name="apiMethod" value={formData.apiMethod} onChange={handleInputChange} style={{ padding: '10px' }}>
                    <option value="GET">GET</option><option value="POST">POST</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>URL Lấy sản phẩm</label>
                  <input type="text" className="input-field" name="apiUrl" value={formData.apiUrl} onChange={handleInputChange} style={{ padding: '10px' }} placeholder="https://..." />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Headers (JSON)</label>
                  <textarea className="input-field" name="headers" value={formData.headers} onChange={handleInputChange} rows="4" style={{ padding: '10px', fontFamily: 'monospace', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Body (nếu POST)</label>
                  <textarea className="input-field" name="body" value={formData.body} onChange={handleInputChange} rows="4" style={{ padding: '10px', fontFamily: 'monospace', fontSize: '12px' }} />
                </div>
              </div>
            </div>

            {/* Cột phải: Mapping */}
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '10px' }}>
              <h4 style={{ color: 'var(--warning)', marginBottom: '12px', fontSize: '14px' }}>JSON Mapping (Lọc dữ liệu)</h4>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Đường dẫn Mảng sản phẩm</label>
                <input type="text" className="input-field" name="mappingArrayPath" value={formData.mappingArrayPath} onChange={handleInputChange} placeholder="VD: products hoặc data.items" style={{ padding: '10px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Trường ID</label>
                  <input type="text" className="input-field" name="mappingIdField" value={formData.mappingIdField} onChange={handleInputChange} style={{ padding: '8px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Trường Tên</label>
                  <input type="text" className="input-field" name="mappingNameField" value={formData.mappingNameField} onChange={handleInputChange} style={{ padding: '8px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Trường Giá</label>
                  <input type="text" className="input-field" name="mappingPriceField" value={formData.mappingPriceField} onChange={handleInputChange} style={{ padding: '8px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Trường Tồn kho</label>
                  <input type="text" className="input-field" name="mappingStockField" value={formData.mappingStockField} onChange={handleInputChange} style={{ padding: '8px' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Purchase Config (ngang) */}
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)' }}>
            <BsCartCheckFill /> 2. Mua Hàng (Purchase) & Nhận Tài Khoản
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Cột trái: URL + Headers + Body */}
            <div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '100px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Method</label>
                  <select className="input-field" name="purchaseMethod" value={formData.purchaseMethod} onChange={handleInputChange} style={{ padding: '10px' }}>
                    <option value="POST">POST</option><option value="GET">GET</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>URL Mua hàng</label>
                  <input type="text" className="input-field" name="purchaseUrl" value={formData.purchaseUrl} onChange={handleInputChange} style={{ padding: '10px' }} placeholder="https://..." />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Headers Mua Hàng (JSON)</label>
                  <textarea className="input-field" name="purchaseHeaders" value={formData.purchaseHeaders} onChange={handleInputChange} rows="5" style={{ padding: '10px', fontFamily: 'monospace', fontSize: '12px' }} />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Hỗ trợ biến: {'{{orderCode}}'}, {'{{telegramId}}'}</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Body Mua Hàng (Mẫu)</label>
                  <textarea className="input-field" name="purchaseBodyTemplate" value={formData.purchaseBodyTemplate} onChange={handleInputChange} rows="5" style={{ padding: '10px', fontFamily: 'monospace', fontSize: '12px' }} />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Dùng {'{{id}}'} cho ID SP, {'{{qty}}'} cho Số lượng.</p>
                </div>
              </div>
            </div>

            {/* Cột phải: Mapping tài khoản */}
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '10px' }}>
              <h4 style={{ color: 'var(--warning)', marginBottom: '16px', fontSize: '14px' }}>Trích xuất Tài khoản trả về</h4>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Đường dẫn Mảng Tài khoản</label>
                <input type="text" className="input-field" name="purchaseAccountListPath" value={formData.purchaseAccountListPath} onChange={handleInputChange} placeholder="VD: deliveredAccounts" style={{ padding: '10px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Định dạng lưu File (.txt)</label>
                <input type="text" className="input-field" name="purchaseAccountFormat" value={formData.purchaseAccountFormat} onChange={handleInputChange} placeholder="{{raw}}" style={{ padding: '10px' }} />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <code>{'{{raw}}'}</code> = nội dung thô · <code>{'{{user}}|{{pass}}'}</code> = tùy chỉnh
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Action buttons */}
        <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={goBack} style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BsArrowLeft /> Hủy
          </button>
          <button type="submit" className="btn btn-primary" style={{ padding: '12px 40px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 'bold' }}>
            <BsCloudArrowUpFill size={18} /> {editingProvider ? 'Cập nhật Cấu hình' : 'Lưu & Tạo Nguồn API'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ApiProviders;
