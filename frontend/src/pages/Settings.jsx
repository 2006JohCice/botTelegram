import React, { useState, useEffect, useCallback } from 'react';
import { BsGearFill, BsBank2, BsRobot, BsSave } from 'react-icons/bs';
import { useDialog } from '../context/DialogContext';
import { API_URL } from '../config';

// SettingRow phải nằm NGOÀI component Settings để tránh bị re-mount mất focus
const SettingRow = React.memo(({ label, valueKey, description, placeholder, type = 'text', rows = 1, value, onChange, onSave }) => (
  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '16px 0', borderBottom: '1px solid var(--border-color)' }}>
    <div style={{ flex: 1 }}>
      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600' }}>{label}</h4>
      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{description}</p>
    </div>
    <div style={{ flex: 2, display: 'flex', gap: '12px' }}>
      {type === 'textarea' ? (
        <textarea
          className="input-field"
          rows={rows}
          value={value}
          onChange={(e) => onChange(valueKey, e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1 }}
        />
      ) : (
        <input
          type={type}
          className="input-field"
          value={value}
          onChange={(e) => onChange(valueKey, e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1 }}
        />
      )}
      <button className="btn btn-secondary" onClick={() => onSave(valueKey, label)}>
        <BsSave /> Lưu
      </button>
    </div>
  </div>
));

const Settings = () => {
  const { alert } = useDialog();
  const [settings, setSettings] = useState({
    WELCOME_MESSAGE: '',
    SEPAY_API_KEY: '',
    BANK_ACCOUNT_NAME: '',
    BANK_ACCOUNT_NUMBER: '',
    BANK_ID: '',
    MIN_DEPOSIT: ''
  });

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings`);
      const data = await res.json();
      const newSettings = {};
      data.forEach(item => {
        newSettings[item.key] = item.value;
      });
      setSettings(prev => ({ ...prev, ...newSettings }));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async (key, description = '') => {
    try {
      const res = await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: settings[key], description })
      });
      if (res.ok) {
        alert('Đã lưu cấu hình: ' + key);
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi lưu cấu hình');
    }
  }, [settings, alert]);

  return (
    <div>
      <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <BsGearFill /> Cài đặt Hệ thống
      </h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Auto-Bank Settings */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h3 className="text-h3" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', marginBottom: '24px' }}>
            <BsBank2 /> Cấu hình Auto-Bank (QR Code / SePay)
          </h3>
          
          <SettingRow 
            label="Ngân Hàng" 
            valueKey="BANK_ID" 
            description="Mã ngân hàng (ví dụ: TCB, VCB, MB)"
            placeholder="TCB" 
            value={settings.BANK_ID || ''}
            onChange={handleChange}
            onSave={handleSave}
          />
          <SettingRow 
            label="Số Tài Khoản" 
            valueKey="BANK_ACCOUNT_NUMBER" 
            description="Số tài khoản nhận tiền"
            placeholder="0123456789" 
            value={settings.BANK_ACCOUNT_NUMBER || ''}
            onChange={handleChange}
            onSave={handleSave}
          />
          <SettingRow 
            label="Tên Chủ Tài Khoản" 
            valueKey="BANK_ACCOUNT_NAME" 
            description="Tên in trên thẻ (không dấu)"
            placeholder="NGUYEN VAN A" 
            value={settings.BANK_ACCOUNT_NAME || ''}
            onChange={handleChange}
            onSave={handleSave}
          />
          <SettingRow 
            label="Mức Nạp Tối Thiểu" 
            valueKey="MIN_DEPOSIT" 
            description="Số tiền nạp tối thiểu (VNĐ)"
            placeholder="VD: 10000" 
            type="number"
            value={settings.MIN_DEPOSIT || ''}
            onChange={handleChange}
            onSave={handleSave}
          />
          <SettingRow 
            label="SePay API Key" 
            valueKey="SEPAY_API_KEY" 
            description="Mã API lấy từ SePay.vn"
            placeholder="Nhập API Key cung cấp sau..." 
            value={settings.SEPAY_API_KEY || ''}
            onChange={handleChange}
            onSave={handleSave}
          />
        </div>

        {/* Bot Content Settings */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h3 className="text-h3" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', marginBottom: '24px' }}>
            <BsRobot /> Nội dung Bot Telegram
          </h3>
          
          <SettingRow 
            label="Câu Chào /start" 
            valueKey="WELCOME_MESSAGE" 
            description="Tin nhắn đầu tiên gửi cho khách hàng"
            placeholder="Xin chào!..." 
            type="textarea"
            rows={4}
            value={settings.WELCOME_MESSAGE || ''}
            onChange={handleChange}
            onSave={handleSave}
          />
        </div>

      </div>
    </div>
  );
};

export default Settings;
