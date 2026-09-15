import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BsFolderFill, BsTagsFill, BsBoxSeamFill, BsController, BsDisplayFill, BsCartFill, BsLightningFill, BsStarFill, BsTrash, BsPencilSquare, BsArrowsMove } from 'react-icons/bs';
import { useDialog } from '../context/DialogContext';
import { API_URL } from '../config';
import EmojiPicker from 'emoji-picker-react';
import DataTableTools from '../components/DataTableTools';
import Pagination from '../components/Pagination';

const ICON_OPTIONS = [
  { name: 'Folder', icon: <BsFolderFill /> },
  { name: 'Tags', icon: <BsTagsFill /> },
  { name: 'Box', icon: <BsBoxSeamFill /> },
  { name: 'Game', icon: <BsController /> },
  { name: 'Screen', icon: <BsDisplayFill /> },
  { name: 'Cart', icon: <BsCartFill /> },
  { name: 'Flash', icon: <BsLightningFill /> },
  { name: 'Star', icon: <BsStarFill /> }
];

const getIconComponent = (iconName) => {
  const found = ICON_OPTIONS.find(i => i.name === iconName);
  if (found) return found.icon;
  return <span style={{ fontSize: '1.2em', lineHeight: 1 }}>{iconName || '📁'}</span>;
};

const Categories = () => {
  const { alert, confirm } = useDialog();
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Folder');
  const [description, setDescription] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('Folder');
  const [editDesc, setEditDesc] = useState('');
  const [showEditIconPicker, setShowEditIconPicker] = useState(false);

  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountPercent, setDiscountPercent] = useState('');
  const [sendNotification, setSendNotification] = useState(true);
  const [notificationMessage, setNotificationMessage] = useState('');
  
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Pagination & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/categories`);
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await axios.post(`${API_URL}/api/admin/categories`, { name, description, icon });
      setName('');
      setIcon('Folder');
      setDescription('');
      fetchCategories();
    } catch (err) {
      console.error(err);
      await alert('Lỗi thêm danh mục');
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm('Bạn có chắc chắn muốn xóa danh mục này?');
    if (!isConfirmed) return;
    
    try {
      await axios.delete(`${API_URL}/api/admin/categories/${id}`);
      fetchCategories();
    } catch (err) {
      console.error(err);
      await alert('Lỗi khi xóa danh mục');
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    try {
      await axios.put(`${API_URL}/api/admin/categories/${editId}`, {
        name: editName,
        description: editDesc,
        icon: editIcon
      });
      setEditId(null);
      fetchCategories();
    } catch (err) {
      console.error(err);
      await alert('Lỗi cập nhật danh mục');
    }
  };

  const startEdit = (c) => {
    setEditId(c._id);
    setEditName(c.name);
    setEditIcon(c.icon || 'Folder');
    setEditDesc(c.description || '');
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) setSelectedCategoryIds(categories.map(c => c._id));
    else setSelectedCategoryIds([]);
  };

  const toggleSelectCategory = (id) => {
    setSelectedCategoryIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const generateAutoMessage = () => {
    if (!discountPercent) return alert('Vui lòng nhập % giảm giá trước');
    const selectedNames = categories.filter(c => selectedCategoryIds.includes(c._id)).map(c => c.name).join(', ');
    setNotificationMessage(`🔥 Bão SALE Đổ Bộ: Tất cả sản phẩm thuộc danh mục [${selectedNames}] đang được GIẢM GIÁ ${discountPercent}%! Nhanh tay kẻo lỡ!`);
  };

  const handleApplyDiscount = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/admin/categories/batch-discount`, {
        categoryIds: selectedCategoryIds,
        discountPercent,
        sendNotification,
        notificationMessage
      });
      alert(res.data.message || 'Đã áp dụng giảm giá thành công!');
      setIsDiscountModalOpen(false);
      setSelectedCategoryIds([]);
      setDiscountPercent('');
      setNotificationMessage('');
    } catch (err) {
      console.error(err);
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCancelDiscount = async () => {
    const isConfirmed = await confirm('Bạn có chắc muốn hủy giảm giá cho tất cả sản phẩm thuộc các danh mục đã chọn?');
    if (!isConfirmed) return;
    try {
      const res = await axios.post(`${API_URL}/api/admin/categories/cancel-discount`, {
        categoryIds: selectedCategoryIds
      });
      alert(res.data.message || 'Đã hủy giảm giá thành công!');
      setSelectedCategoryIds([]);
    } catch (err) {
      console.error(err);
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const onDragStart = (index) => {
    setDraggedIndex(index);
  };

  const onDragEnter = (index) => {
    if (draggedIndex === null || draggedIndex === index) return;
    const newCategories = [...categories];
    const draggedItem = newCategories[draggedIndex];
    newCategories.splice(draggedIndex, 1);
    newCategories.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setCategories(newCategories);
  };

  const onDragEnd = async () => {
    setDraggedIndex(null);
    const orderedData = categories.map((c, i) => ({ id: c._id, order: i }));
    try {
      await axios.put(`${API_URL}/api/admin/categories/reorder`, { categories: orderedData });
    } catch (err) {
      console.error(err);
      alert('Lỗi khi lưu thứ tự danh mục');
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

  // Filter & Pagination logic
  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalItems = filteredCategories.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCategories = filteredCategories.slice(startIndex, startIndex + itemsPerPage);

  // Reset trang về 1 khi search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="text-h1" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BsFolderFill /> Quản lý Danh mục
        </h1>
        {selectedCategoryIds.length > 0 && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={handleCancelDiscount} style={{ color: 'var(--danger)' }}>
              Hủy Giảm Giá ({selectedCategoryIds.length})
            </button>
            <button className="btn btn-warning" onClick={() => setIsDiscountModalOpen(true)}>
              Giảm Giá ({selectedCategoryIds.length})
            </button>
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <DataTableTools 
          searchPlaceholder="Tìm kiếm danh mục..."
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
        
        <div style={{ overflowX: 'auto' }}>
        <h3 className="text-h3" style={{ color: 'var(--primary)' }}>Thêm Danh Mục Mới</h3>
        <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-muted)' }}>Tên danh mục</label>
            <input type="text" className="input-field" placeholder="VD: Netflix Premium" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          
          <div style={{ flex: 1, minWidth: '150px', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-muted)' }}>Biểu tượng</label>
            <div 
              onClick={() => setShowIconPicker(!showIconPicker)}
              style={{ padding: '11px', background: 'white', border: '1px solid var(--border-color)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', cursor: 'pointer', transition: 'all 0.2s', width: '45px', boxSizing: 'border-box' }}
            >
              {getIconComponent(icon)}
            </div>
            <IconPickerPopover show={showIconPicker} onSelect={setIcon} onClose={() => setShowIconPicker(false)} />
          </div>

          <div style={{ flex: 3, minWidth: '250px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-muted)' }}>Mô tả ngắn</label>
            <input type="text" className="input-field" placeholder="Dịch vụ giải trí..." value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '65px' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px' }}>
              Thêm Mới
            </button>
          </div>
        </form>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th style={{ width: '40px' }}><input type="checkbox" onChange={toggleSelectAll} checked={categories.length > 0 && selectedCategoryIds.length === categories.length} /></th>
                <th>Danh mục</th>
                <th>Mô tả</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {currentCategories.map((c, idx) => {
                const isDraggable = searchTerm === ''; // Disable drag during search
                const originalIndex = startIndex + idx;
                
                return (
                <tr 
                  key={c._id}
                  draggable={isDraggable}
                  onDragStart={(e) => isDraggable ? onDragStart(originalIndex) : e.preventDefault()}
                  onDragEnter={() => isDraggable && onDragEnter(originalIndex)}
                  onDragEnd={onDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  style={{ cursor: draggedIndex === originalIndex ? 'grabbing' : (isDraggable ? 'grab' : 'default'), opacity: draggedIndex === originalIndex ? 0.5 : 1, transition: 'opacity 0.2s' }}
                >
                  <td style={{ color: 'var(--text-muted)', cursor: isDraggable ? 'grab' : 'default' }}>{isDraggable ? <BsArrowsMove /> : ''}</td>
                  <td><input type="checkbox" checked={selectedCategoryIds.includes(c._id)} onChange={() => toggleSelectCategory(c._id)} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ padding: '10px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '10px' }}>
                        {getIconComponent(c.icon)}
                      </div>
                      <strong style={{ fontSize: '15px' }}>{c.name}</strong>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.description}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => startEdit(c)} className="btn btn-secondary">
                        <BsPencilSquare /> Sửa
                      </button>
                      <button onClick={() => handleDelete(c._id)} className="btn btn-danger">
                        <BsTrash /> Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
              {filteredCategories.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <BsFolderFill size={32} style={{ opacity: 0.5, marginBottom: '16px' }} />
                    <p>Chưa có danh mục nào. Hãy tạo danh mục đầu tiên!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <Pagination 
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px', position: 'relative', zIndex: 10 }}>
        <h3 className="text-h3" style={{ color: 'var(--primary)' }}>Thêm Danh Mục Mới</h3>
        <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-muted)' }}>Tên danh mục</label>
            <input type="text" className="input-field" placeholder="VD: Netflix Premium" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          
          <div style={{ flex: 1, minWidth: '150px', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-muted)' }}>Biểu tượng</label>
            <div 
              onClick={() => setShowIconPicker(!showIconPicker)}
              style={{ padding: '11px', background: 'white', border: '1px solid var(--border-color)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', cursor: 'pointer', transition: 'all 0.2s', width: '45px', boxSizing: 'border-box' }}
            >
              {getIconComponent(icon)}
            </div>
            <IconPickerPopover show={showIconPicker} onSelect={setIcon} onClose={() => setShowIconPicker(false)} />
          </div>

          <div style={{ flex: 3, minWidth: '250px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-muted)' }}>Mô tả ngắn</label>
            <input type="text" className="input-field" placeholder="Dịch vụ giải trí..." value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '65px' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px' }}>
              Thêm Mới
            </button>
          </div>
        </form>
      </div>

      {/* Edit Modal */}
      {editId && (
        <div className="modal-overlay">
          <div className="glass-modal" style={{ width: '100%', maxWidth: '500px' }}>
            <h3 className="text-h3" style={{ marginBottom: '24px' }}>Sửa Danh Mục</h3>
            <form onSubmit={handleUpdateCategory}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Tên danh mục</label>
                <input type="text" className="input-field" value={editName} onChange={e => setEditName(e.target.value)} required />
              </div>
              
              <div style={{ marginBottom: '16px', position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Biểu tượng</label>
                <div 
                  onClick={() => setShowEditIconPicker(!showEditIconPicker)}
                  style={{ padding: '11px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', cursor: 'pointer', transition: 'all 0.2s', width: '45px', boxSizing: 'border-box' }}
                >
                  {getIconComponent(editIcon)}
                </div>
                <IconPickerPopover show={showEditIconPicker} onSelect={setEditIcon} onClose={() => setShowEditIconPicker(false)} />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Mô tả ngắn</label>
                <input type="text" className="input-field" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditId(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu Thay Đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Giảm Giá Hàng Loạt */}
      {isDiscountModalOpen && (
        <div className="modal-overlay">
          <div className="glass-modal" style={{ width: '100%', maxWidth: '500px' }}>
            <h3 className="text-h3" style={{ marginBottom: '16px' }}>Giảm Giá Theo Danh Mục</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
              Đang chọn {selectedCategoryIds.length} danh mục. Tất cả sản phẩm thuộc các danh mục này sẽ được giảm giá.
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

export default Categories;
