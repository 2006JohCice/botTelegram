import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BsMegaphoneFill, BsSendFill, BsClockHistory, BsTrash, BsCalendarPlus } from 'react-icons/bs';
import { useDialog } from '../context/DialogContext';
import { API_URL } from '../config';

const Notifications = () => {
  const { alert, confirm } = useDialog();
  const [broadcastMessage, setBroadcastMessage] = useState('');
  
  const [scheduledMessage, setScheduledMessage] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduledList, setScheduledList] = useState([]);

  const fetchScheduledMessages = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/broadcast/schedule`);
      setScheduledList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchScheduledMessages();
    // Tự động làm mới danh sách mỗi phút
    const interval = setInterval(fetchScheduledMessages, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return alert('Vui lòng nhập nội dung thông báo!');
    
    const isConfirmed = await confirm('Bạn có chắc chắn muốn gửi thông báo này tới toàn bộ khách hàng ngay LẬP TỨC?');
    if (!isConfirmed) return;
    
    try {
      const res = await axios.post(`${API_URL}/api/admin/broadcast`, { message: broadcastMessage });
      alert(`Đã gửi thành công đến ${res.data.successCount}/${res.data.total} người dùng!`);
      setBroadcastMessage('');
    } catch (err) {
      console.error(err);
      alert('Lỗi gửi thông báo: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!scheduledMessage.trim() || !scheduleTime) return alert('Vui lòng nhập đủ nội dung và thời gian!');

    const isConfirmed = await confirm('Xác nhận lên lịch thông báo này?');
    if (!isConfirmed) return;

    try {
      await axios.post(`${API_URL}/api/admin/broadcast/schedule`, { 
        message: scheduledMessage, 
        sendAt: scheduleTime 
      });
      alert('Đã lên lịch thành công!');
      setScheduledMessage('');
      setScheduleTime('');
      fetchScheduledMessages();
    } catch (err) {
      console.error(err);
      alert('Lỗi hẹn giờ: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteSchedule = async (id) => {
    const isConfirmed = await confirm('Xóa lịch báo này?');
    if (!isConfirmed) return;

    try {
      await axios.delete(`${API_URL}/api/admin/broadcast/schedule/${id}`);
      fetchScheduledMessages();
    } catch (err) {
      console.error(err);
      alert('Lỗi xóa lịch: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div>
      <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <BsMegaphoneFill /> Thông báo & Tin nhắn
      </h1>
      
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        
        {/* Cột trái: Gửi & Hẹn giờ */}
        <div style={{ flex: 1.5, minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Box Gửi Ngay */}
          <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--warning)' }}>
            <h3 className="text-h3" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--warning)', marginBottom: '8px' }}>
              <BsSendFill /> Gửi Thông Báo Tức Thì
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
              Tin nhắn sẽ được gửi ngay lập tức tới 100% khách hàng đã tương tác với Bot.
            </p>
            <textarea 
              className="input-field"
              rows="4" 
              value={broadcastMessage} 
              onChange={(e) => setBroadcastMessage(e.target.value)} 
              placeholder="Nhập nội dung thông báo khẩn cấp..." 
              style={{ marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-warning" onClick={handleBroadcast}>
                <BsSendFill /> Gửi Ngay
              </button>
            </div>
          </div>

          {/* Box Hẹn Giờ */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 className="text-h3" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', marginBottom: '8px' }}>
              <BsCalendarPlus /> Lên Lịch Hẹn Giờ
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
              Hệ thống sẽ tự động gửi tin nhắn đúng vào thời điểm bạn cài đặt.
            </p>
            <form onSubmit={handleSchedule}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Nội dung thông báo</label>
                <textarea 
                  className="input-field"
                  rows="4" 
                  required
                  value={scheduledMessage} 
                  onChange={(e) => setScheduledMessage(e.target.value)} 
                  placeholder="Nhập thông báo sale, event..." 
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Thời gian gửi</label>
                <input 
                  type="datetime-local" 
                  className="input-field" 
                  required
                  value={scheduleTime} 
                  onChange={(e) => setScheduleTime(e.target.value)} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary">
                  <BsClockHistory /> Lưu Lịch Gửi
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Cột phải: Danh sách lịch */}
        <div style={{ flex: 1, minWidth: '350px' }}>
          <div className="glass-panel" style={{ padding: '24px', height: '100%' }}>
            <h3 className="text-h3" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-color)', marginBottom: '16px' }}>
              <BsClockHistory /> Danh sách chờ gửi
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {scheduledList.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <BsClockHistory size={32} style={{ opacity: 0.5, marginBottom: '12px' }} />
                  <p>Chưa có lịch hẹn nào</p>
                </div>
              ) : (
                scheduledList.map(msg => {
                  const sendDate = new Date(msg.sendAt);
                  const isSent = msg.status === 'sent';
                  return (
                    <div key={msg._id} style={{ padding: '16px', background: 'var(--bg-color)', borderRadius: '12px', border: `1px solid ${isSent ? 'var(--success)' : 'var(--border-color)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '13px', color: isSent ? 'var(--success)' : 'var(--primary)' }}>
                          {sendDate.toLocaleString('vi-VN')}
                        </strong>
                        {!isSent && (
                          <button onClick={() => handleDeleteSchedule(msg._id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                            <BsTrash />
                          </button>
                        )}
                        {isSent && (
                          <span className="badge badge-success">Đã Gửi</span>
                        )}
                      </div>
                      <p style={{ fontSize: '14px', margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-muted)' }}>
                        {msg.message}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Notifications;
