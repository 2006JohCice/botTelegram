import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BsBoxSeamFill, BsCloudDownload, BsCheckCircleFill, BsGlobe } from 'react-icons/bs';
import { useDialog } from '../context/DialogContext';
import { API_URL } from '../config';
import { Link } from 'react-router-dom';
import DataTableTools from '../components/DataTableTools';
import Pagination from '../components/Pagination';

const ApiStore = () => {
  const { alert, confirm } = useDialog();
  const [providers, setProviders] = useState([]);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currency, setCurrency] = useState('VND');
  const [isLoading, setIsLoading] = useState(false);

  // Pagination & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchProviders = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/api-providers`);
      setProviders(res.data);
      if (res.data.length > 0) {
        setSelectedProviderId(res.data[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/categories`);
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchApiProducts = async () => {
    if (!selectedProviderId) return;
    setIsLoading(true);
    setProducts([]); // Clear old products
    try {
      const res = await axios.get(`${API_URL}/api/admin/api-providers/${selectedProviderId}/products`);
      setProducts(res.data.products || []);
      if (res.data.walletCurrency) setCurrency(res.data.walletCurrency);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.error) {
        alert(err.response.data.error);
      } else {
        alert('Lỗi khi lấy sản phẩm từ nguồn API này.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedProviderId) {
      fetchApiProducts();
    }
  }, [selectedProviderId]);

  const handleImportProduct = async (product) => {
    if (!product.localCategoryId) {
      return alert('Vui lòng chọn danh mục cho sản phẩm này!');
    }
    if (!product.localPrice || product.localPrice <= 0) {
      return alert('Vui lòng nhập giá bán hợp lệ!');
    }

    try {
      await axios.post(`${API_URL}/api/admin/api-store/import`, {
        apiProductId: product._id,
        apiProviderId: selectedProviderId,
        name: product.product_name,
        apiOriginalPrice: product.pricing,
        price: product.localPrice,
        categoryId: product.localCategoryId
      });
      alert('Đã đồng bộ sản phẩm vào kho hệ thống!');
      fetchApiProducts(); // Cập nhật lại trạng thái isImported
    } catch (err) {
      console.error(err);
      alert('Lỗi thêm sản phẩm');
    }
  };

  const handleRemoveProduct = async (product) => {
    const isConfirmed = await confirm(`Bạn có chắc muốn hủy lên kệ sản phẩm "${product.product_name}" không?`);
    if (!isConfirmed) return;
    
    try {
      await axios.delete(`${API_URL}/api/admin/api-store/remove/${product._id}?providerId=${selectedProviderId}`);
      alert('Đã hủy lên kệ sản phẩm!');
      fetchApiProducts(); // Cập nhật lại danh sách
    } catch (err) {
      console.error(err);
      alert('Lỗi hủy sản phẩm');
    }
  };

  const handleFieldChange = (productId, field, value) => {
    setProducts(products.map(p => p._id === productId ? { ...p, [field]: value } : p));
  };

  // Filter & Pagination logic
  const filteredProducts = products.filter(p => {
    const matchSearch = p.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || 
                        (filterStatus === 'IMPORTED' && p.isImported) || 
                        (filterStatus === 'NOT_IMPORTED' && !p.isImported);
    return matchSearch && matchStatus;
  });
  
  const totalItems = filteredProducts.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  // Reset trang về 1 khi đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="text-h1" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BsBoxSeamFill style={{ color: 'var(--warning)' }} /> Cửa Hàng API Động
        </h1>
        <Link to="/api-providers" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BsGlobe /> Quản lý Nguồn API
        </Link>
      </div>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-muted)' }}>Chọn Nguồn API Đối Tác</label>
            <select 
              className="input-field" 
              value={selectedProviderId} 
              onChange={e => setSelectedProviderId(e.target.value)} 
            >
              {providers.length === 0 && <option value="">-- Chưa có nguồn API nào --</option>}
              {providers.map(p => (
                <option key={p._id} value={p._id}>{p.name} ({p.isActive ? 'Hoạt động' : 'Tạm ngưng'})</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={fetchApiProducts} disabled={isLoading || !selectedProviderId} style={{ padding: '12px 24px' }}>
             <BsCloudDownload style={{ marginRight: '8px' }}/> Lấy dữ liệu
          </button>
        </div>
      </div>

      {selectedProviderId && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="text-h3" style={{ margin: 0 }}>Danh sách Sản phẩm từ API</h3>
          </div>

          <DataTableTools 
            searchPlaceholder="Tìm kiếm sản phẩm API..."
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterOptions={[
              { label: 'Tất cả trạng thái', value: 'ALL' },
              { label: 'Đã lên kệ', value: 'IMPORTED' },
              { label: 'Chưa lên kệ', value: 'NOT_IMPORTED' }
            ]}
            filterValue={filterStatus}
            onFilterChange={setFilterStatus}
          />
          
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Đang lấy dữ liệu từ đối tác...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sản phẩm (Từ API)</th>
                    <th>Tồn kho (API)</th>
                    <th>Giá gốc</th>
                    <th>Giá bán (Của bạn)</th>
                    <th>Danh mục (Hiển thị bot)</th>
                    <th style={{ textAlign: 'right' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {currentProducts.map(p => (
                    <tr key={p._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '14px' }}>{p.product_name}</strong>
                          {p.isImported && <BsCheckCircleFill style={{ color: 'var(--success)' }} title="Đã có trong kho" />}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: {p._id}</div>
                      </td>
                      <td>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          background: p.stats?.available > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                          color: p.stats?.available > 0 ? 'var(--success)' : 'var(--danger)',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {p.stats?.available || 0}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--warning)' }}>{Number(p.pricing).toLocaleString()} {currency}</strong>
                      </td>
                      <td>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          className="input-field" 
                          style={{ padding: '6px 12px', width: '120px' }}
                          value={p.localPrice !== undefined && p.localPrice !== null && p.localPrice !== '' ? p.localPrice : p.pricing}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '' || /^\d*$/.test(val)) {
                              handleFieldChange(p._id, 'localPrice', val === '' ? '' : Number(val));
                            }
                          }}
                          onBlur={e => {
                            if (e.target.value === '' || e.target.value === '0') {
                              handleFieldChange(p._id, 'localPrice', p.pricing);
                            }
                          }}
                        />
                      </td>
                      <td>
                        <select 
                          className="input-field" 
                          style={{ padding: '6px 12px', width: '180px' }}
                          value={p.localCategoryId || ''}
                          onChange={e => handleFieldChange(p._id, 'localCategoryId', e.target.value)}
                        >
                          <option value="">-- Chọn danh mục --</option>
                          {categories.map(c => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          {p.isImported && (
                            <button 
                              onClick={() => handleRemoveProduct(p)} 
                              className="btn btn-danger"
                              style={{ padding: '6px 12px' }}
                            >
                              Hủy lên kệ
                            </button>
                          )}
                          <button 
                            onClick={() => handleImportProduct(p)} 
                            className={`btn ${p.isImported ? 'btn-secondary' : 'btn-primary'}`}
                          >
                            {p.isImported ? 'Cập nhật' : 'Đưa lên Kệ'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <BsBoxSeamFill size={32} style={{ opacity: 0.5, marginBottom: '16px' }} />
                        <p>Không có sản phẩm nào hoặc không tìm thấy kết quả.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && (
            <Pagination 
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ApiStore;
