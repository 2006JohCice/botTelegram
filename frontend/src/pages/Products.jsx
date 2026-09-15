import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BsBoxSeamFill, BsFolderFill, BsTagsFill, BsController, BsDisplayFill, BsCartFill, BsLightningFill, BsStarFill, BsTrash, BsPencilSquare, BsPlusCircle, BsCheckCircle } from 'react-icons/bs';
import { useDialog } from '../context/DialogContext';
import { API_URL } from '../config';
import EmojiPicker from 'emoji-picker-react';

const ICON_OPTIONS = [
  { name: 'Box', icon: <BsBoxSeamFill /> },
  { name: 'Folder', icon: <BsFolderFill /> },
  { name: 'Tags', icon: <BsTagsFill /> },
  { name: 'Game', icon: <BsController /> },
  { name: 'Screen', icon: <BsDisplayFill /> },
  { name: 'Cart', icon: <BsCartFill /> },
  { name: 'Flash', icon: <BsLightningFill /> },
  { name: 'Star', icon: <BsStarFill /> }
];

const getIconComponent = (iconName) => {
  const found = ICON_OPTIONS.find(i => i.name === iconName);
  if (found) return found.icon;
  return <span style={{ fontSize: '1.2em', lineHeight: 1 }}>{iconName || '📦'}</span>;
};

const Products = () => {
  const { confirm, alert } = useDialog();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [stockInput, setStockInput] = useState('');

  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemData, setEditingItemData] = useState('');

  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showEditIconPicker, setShowEditIconPicker] = useState(false);

  const [newProduct, setNewProduct] = useState({ name: '', categoryId: '', price: '', description: '', imageUrl: '', icon: 'Box', purchaseType: 'direct' });

  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountPercent, setDiscountPercent] = useState('');
  const [sendNotification, setSendNotification] = useState(true);
  const [notificationMessage, setNotificationMessage] = useState('');

  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/products`),
        axios.get(`${API_URL}/api/admin/categories`)
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openStockModal = (product) => {
    setSelectedProduct(product);
    setStockInput('');
    setIsStockModalOpen(true);
  };

  const handleAddStock = async () => {
    if (!stockInput.trim()) return;

    const itemsToAdd = stockInput.split('\n').filter(line => line.trim() !== '').map(line => ({
      data: line.trim(),
      status: 'available'
    }));

    try {
      const res = await axios.put(`${API_URL}/api/admin/products/${selectedProduct._id}`, {
        items: itemsToAdd
      });
      setStockInput('');
      setSelectedProduct(res.data);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (productId, itemId) => {
    const isConfirmed = await confirm('Xóa tài khoản này khỏi kho?');
    if (!isConfirmed) return;
    try {
      const res = await axios.delete(`${API_URL}/api/admin/products/${productId}/items/${itemId}`);
      setSelectedProduct(res.data);
      fetchData();
    } catch (err) {
      console.error(err);
      await alert('Lỗi xóa tài khoản');
    }
  };

  const handleUpdateItem = async (productId, itemId) => {
    try {
      const res = await axios.put(`${API_URL}/api/admin/products/${productId}/items/${itemId}`, { data: editingItemData });
      setEditingItemId(null);
      setEditingItemData('');
      setSelectedProduct(res.data);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/admin/products`, newProduct);
      setIsAddModalOpen(false);
      setNewProduct({ name: '', categoryId: '', price: '', description: '', imageUrl: '', icon: 'Box', purchaseType: 'direct' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (product) => {
    setEditingProduct({
      _id: product._id,
      name: product.name,
      categoryId: product.categoryId?._id || product.categoryId,
      price: product.price,
      description: product.description || '',
      imageUrl: product.imageUrl || '',
      icon: product.icon || 'Box',
      purchaseType: product.purchaseType || 'direct'
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/api/admin/products/${editingProduct._id}`, editingProduct);
      setIsEditModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (id) => {
    const isConfirmed = await confirm('Bạn có chắc chắn muốn xóa sản phẩm này?');
    if (!isConfirmed) return;
    try {
      await axios.delete(`${API_URL}/api/admin/products/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      await alert('Lỗi xóa sản phẩm');
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) setSelectedProductIds(products.map(p => p._id));
    else setSelectedProductIds([]);
  };

  const toggleSelectProduct = (id) => {
    setSelectedProductIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const generateAutoMessage = () => {
    if (!discountPercent) return alert('Vui lòng nhập % giảm giá trước');
    const selectedNames = products.filter(p => selectedProductIds.includes(p._id)).map(p => p.name).join(', ');
    setNotificationMessage(`🔥 SIÊU HOT: Các sản phẩm [${selectedNames}] đang được GIẢM GIÁ ${discountPercent}%! Nhanh tay kẻo lỡ!`);
  };

  const handleApplyDiscount = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/admin/products/batch-discount`, {
        productIds: selectedProductIds,
        discountPercent,
        sendNotification,
        notificationMessage
      });
      alert('Đã áp dụng giảm giá thành công!');
      setIsDiscountModalOpen(false);
      setSelectedProductIds([]);
      setDiscountPercent('');
      setNotificationMessage('');
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCancelDiscount = async () => {
    const isConfirmed = await confirm('Bạn có chắc muốn hủy giảm giá cho các sản phẩm đã chọn?');
    if (!isConfirmed) return;
    try {
      await axios.post(`${API_URL}/api/admin/products/cancel-discount`, {
        productIds: selectedProductIds
      });
      alert('Đã hủy giảm giá thành công!');
      setSelectedProductIds([]);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const IconPickerPopover = ({ show, onSelect, onClose }) => {
    if (!show) return null;
    return (
      <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', zIndex: 99999, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <EmojiPicker
          onEmojiClick={(emojiData) => {
            onSelect(emojiData.emoji);
            onClose();
          }}
          searchDisabled={true}
          skinTonesDisabled={true}
          width={300}
          height={400}
        />
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="text-h1" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BsBoxSeamFill /> Quản lý Sản phẩm
        </h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          {selectedProductIds.length > 0 && (
            <>
              <button className="btn btn-secondary" onClick={handleCancelDiscount} style={{ color: 'var(--danger)' }}>
                Hủy Giảm Giá ({selectedProductIds.length})
              </button>
              <button className="btn btn-warning" onClick={() => setIsDiscountModalOpen(true)}>
                Giảm Giá ({selectedProductIds.length})
              </button>
            </>
          )}
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <BsPlusCircle /> Thêm Sản Phẩm
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}><input type="checkbox" onChange={toggleSelectAll} checked={products.length > 0 && selectedProductIds.length === products.length} /></th>
                <th>Sản phẩm</th>
                <th>Danh mục</th>
                <th>Giá</th>
                <th style={{ textAlign: 'center' }}>Tồn kho</th>
                <th>Hình thức</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const available = p.items ? p.items.filter(i => i.status === 'available').length : 0;
                return (
                  <tr key={p._id}>
                    <td><input type="checkbox" checked={selectedProductIds.includes(p._id)} onChange={() => toggleSelectProduct(p._id)} /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '8px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}>
                          {getIconComponent(p.icon)}
                        </div>
                        <strong style={{ fontSize: '15px' }}>{p.name}</strong>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.categoryId ? p.categoryId.name : 'N/A'}</td>
                    <td style={{ color: 'var(--primary)', fontWeight: '600' }}>
                      {p.originalPrice && p.originalPrice > p.price ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '11px', textDecoration: 'line-through', color: 'var(--text-muted)' }}>{p.originalPrice.toLocaleString()}đ</span>
                          <span>{p.price.toLocaleString()}đ</span>
                        </div>
                      ) : (
                        <span>{p.price.toLocaleString()}đ</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={available > 0 ? 'badge badge-success' : 'badge badge-danger'}>
                        {available} item
                      </span>
                    </td>
                    <td>
                      {p.purchaseType === 'contact_admin' ? (
                        <span className="badge badge-warning">Liên hệ Admin</span>
                      ) : (
                        <span className="badge badge-success">Trực tiếp</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-success" onClick={() => openStockModal(p)}>
                          <BsBoxSeamFill /> Quản lý Kho
                        </button>
                        <button className="btn btn-secondary" onClick={() => openEditModal(p)}>
                          <BsPencilSquare /> Sửa
                        </button>
                        <button className="btn btn-danger" onClick={() => handleDeleteProduct(p._id)}>
                          <BsTrash /> Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan="12" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <BsBoxSeamFill size={32} style={{ opacity: 0.5, marginBottom: '16px' }} />
                    <p>Chưa có sản phẩm nào. Hãy tạo mới!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nạp Kho & Quản lý Kho */}
      {isStockModalOpen && selectedProduct && (
        <div className="modal-overlay">
          <div className="glass-modal" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <h3 className="text-h3" style={{ marginBottom: '24px' }}>Kho Hàng: {selectedProduct.name}</h3>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
              {/* Nửa Nạp Thêm */}
              <div style={{ flex: 1, minWidth: '300px' }}>
                <h4 style={{ marginBottom: '12px', color: 'var(--primary)', fontSize: '15px' }}>Nạp Thêm Tài Khoản</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>Mỗi dòng là 1 item. Ví dụ:<br /><code style={{ background: 'var(--bg-color)', padding: '2px 4px', borderRadius: '4px' }}>user1|pass1</code></p>
                <textarea
                  className="input-field"
                  rows="5"
                  placeholder="Nhập data (mỗi tài khoản một dòng)..."
                  value={stockInput}
                  onChange={e => setStockInput(e.target.value)}
                />
                <button className="btn btn-success" onClick={handleAddStock} style={{ width: '100%', marginTop: '12px' }}>
                  <BsPlusCircle /> Nạp Kho Nhanh
                </button>
              </div>

              {/* Nửa Quản Lý Hiện Có */}
              <div style={{ flex: 1.5, minWidth: '350px', borderLeft: '1px solid var(--border-color)', paddingLeft: '24px' }}>
                <h4 style={{ marginBottom: '12px', color: 'var(--primary)', fontSize: '15px' }}>Danh Sách Kho ({selectedProduct.items ? selectedProduct.items.length : 0} item)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedProduct.items && selectedProduct.items.map((item, index) => (
                    <div key={item._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--bg-color)', borderRadius: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', width: '24px' }}>#{index + 1}</span>

                      {editingItemId === item._id ? (
                        <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                          <input type="text" className="input-field" value={editingItemData} onChange={e => setEditingItemData(e.target.value)} style={{ padding: '6px 8px', fontSize: '13px' }} />
                          <button className="btn btn-primary" onClick={() => handleUpdateItem(selectedProduct._id, item._id)} style={{ padding: '6px 12px' }}><BsCheckCircle /></button>
                          <button className="btn btn-secondary" onClick={() => setEditingItemId(null)} style={{ padding: '6px 12px' }}>X</button>
                        </div>
                      ) : (
                        <>
                          <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', fontFamily: 'monospace' }} title={typeof item.data === 'string' ? item.data : JSON.stringify(item.data)}>
                            {typeof item.data === 'string' ? item.data : JSON.stringify(item.data)}
                          </div>
                          <div style={{ width: '60px', textAlign: 'center' }}>
                            {item.status === 'sold' ? <span className="badge badge-danger" style={{ fontSize: '10px', padding: '4px' }}>Đã Bán</span> : item.status === 'held' ? <span className="badge badge-warning" style={{ fontSize: '10px', padding: '4px' }}>Tạm Giữ</span> : <span className="badge badge-success" style={{ fontSize: '10px', padding: '4px' }}>Trống</span>}
                          </div>
                          <button onClick={() => { setEditingItemId(item._id); setEditingItemData(typeof item.data === 'string' ? item.data : JSON.stringify(item.data)); }} style={{ border: 'none', background: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px' }} title="Sửa"><BsPencilSquare /></button>
                          <button onClick={() => handleDeleteItem(selectedProduct._id, item._id)} style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }} title="Xóa"><BsTrash /></button>
                        </>
                      )}
                    </div>
                  ))}
                  {(!selectedProduct.items || selectedProduct.items.length === 0) && (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>Kho trống.</p>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary" onClick={() => setIsStockModalOpen(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm Sản Phẩm Mới */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="glass-modal" style={{ width: '100%', maxWidth: '600px' }}>
            <h3 className="text-h3" style={{ marginBottom: '24px' }}>Thêm Sản Phẩm Mới</h3>
            <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>Tên sản phẩm (*)</label>
                  <input type="text" className="input-field" required value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>Giá tiền (VNĐ) (*)</label>
                  <input type="number" className="input-field" required min="0" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>Danh mục (*)</label>
                  <select className="input-field" required value={newProduct.categoryId} onChange={e => setNewProduct({ ...newProduct, categoryId: e.target.value })}>
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>Hình thức mua (*)</label>
                  <select className="input-field" required value={newProduct.purchaseType} onChange={e => setNewProduct({ ...newProduct, purchaseType: e.target.value })}>
                    <option value="direct">Mua trực tiếp</option>
                    <option value="contact_admin">Liên hệ Admin (Zalo)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>Biểu tượng (Icon)</label>
                <div style={{ position: 'relative' }}>
                  <div
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    style={{ padding: '11px', background: 'white', border: '1px solid var(--border-color)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', cursor: 'pointer', transition: 'all 0.2s', width: '45px', boxSizing: 'border-box' }}
                  >
                    {getIconComponent(newProduct.icon)}
                  </div>
                  <IconPickerPopover show={showIconPicker} onSelect={(icon) => setNewProduct({ ...newProduct, icon })} onClose={() => setShowIconPicker(false)} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>Mô tả ngắn</label>
                <textarea rows="3" className="input-field" value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>Link ảnh sản phẩm (tuỳ chọn)</label>
                <input type="text" className="input-field" value={newProduct.imageUrl} onChange={e => setNewProduct({ ...newProduct, imageUrl: e.target.value })} placeholder="https://..." />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Tạo Sản Phẩm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chỉnh Sửa Sản Phẩm */}
      {isEditModalOpen && editingProduct && (
        <div className="modal-overlay">
          <div className="glass-modal" style={{ width: '100%', maxWidth: '600px' }}>
            <h3 className="text-h3" style={{ marginBottom: '24px' }}>Chỉnh Sửa Sản Phẩm</h3>
            <form onSubmit={handleUpdateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>Tên sản phẩm (*)</label>
                  <input type="text" className="input-field" required value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>Giá tiền (VNĐ) (*)</label>
                  <input type="number" className="input-field" required min="0" value={editingProduct.price} onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>Danh mục (*)</label>
                  <select className="input-field" required value={editingProduct.categoryId} onChange={e => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}>
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>Hình thức mua (*)</label>
                  <select className="input-field" required value={editingProduct.purchaseType} onChange={e => setEditingProduct({ ...editingProduct, purchaseType: e.target.value })}>
                    <option value="direct">Mua trực tiếp</option>
                    <option value="contact_admin">Liên hệ Admin (Zalo)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>Biểu tượng (Icon)</label>
                <div style={{ position: 'relative' }}>
                  <div
                    onClick={() => setShowEditIconPicker(!showEditIconPicker)}
                    style={{ padding: '11px', background: 'white', border: '1px solid var(--border-color)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', cursor: 'pointer', transition: 'all 0.2s', width: '45px', boxSizing: 'border-box' }}
                  >
                    {getIconComponent(editingProduct.icon)}
                  </div>
                  <IconPickerPopover show={showEditIconPicker} onSelect={(icon) => setEditingProduct({ ...editingProduct, icon })} onClose={() => setShowEditIconPicker(false)} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>Mô tả ngắn</label>
                <textarea rows="3" className="input-field" value={editingProduct.description} onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>Link ảnh sản phẩm (tuỳ chọn)</label>
                <input type="text" className="input-field" value={editingProduct.imageUrl} onChange={e => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })} placeholder="https://..." />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-warning">Lưu Thay Đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Giảm Giá Hàng Loạt */}
      {isDiscountModalOpen && (
        <div className="modal-overlay">
          <div className="glass-modal" style={{ width: '100%', maxWidth: '500px' }}>
            <h3 className="text-h3" style={{ marginBottom: '16px' }}>Giảm Giá Hàng Loạt</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
              Đang chọn {selectedProductIds.length} sản phẩm.
            </p>
            <form onSubmit={handleApplyDiscount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>Giảm giá (%)</label>
                <input type="number" min="1" max="99" required className="input-field" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} placeholder="VD: 10, 20..." />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                  <input type="checkbox" checked={sendNotification} onChange={e => setSendNotification(e.target.checked)} />
                  Gửi thông báo tới người dùng Bot
                </label>
              </div>
              {sendNotification && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ fontSize: '13px', fontWeight: '500' }}>Nội dung thông báo</label>
                    <button type="button" onClick={generateAutoMessage} style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}>Tạo AUTO</button>
                  </div>
                  <textarea rows="4" className="input-field" required value={notificationMessage} onChange={e => setNotificationMessage(e.target.value)} placeholder="Nhập nội dung..."></textarea>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsDiscountModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-warning">Áp Dụng Giảm Giá</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
