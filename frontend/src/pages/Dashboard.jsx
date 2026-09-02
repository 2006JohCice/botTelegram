import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BsCurrencyDollar, BsBoxSeam, BsExclamationTriangle, BsPeople, BsGraphUpArrow, BsPersonCircle } from 'react-icons/bs';
import { API_URL } from '../config';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    outOfStockProducts: 0,
    totalUsers: 0,
    recentUsers: [],
    topProducts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/admin/dashboard`);
        setStats(res.data);
      } catch (err) {
        console.error('Lỗi lấy thống kê:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon, color, bgColor }) => (
    <div className="glass-panel" style={{ padding: '24px', flex: 1, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {title}
          </p>
          <h3 style={{ fontSize: '28px', fontWeight: '700', margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            {value}
          </h3>
        </div>
        <div style={{ background: bgColor, color: color, padding: '12px', borderRadius: '12px' }}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="text-h1">Dashboard</h1>
      
      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <StatCard 
          title="Tổng Doanh Thu" 
          value={`${(stats.totalRevenue || 0).toLocaleString()}đ`} 
          icon={<BsCurrencyDollar size={24} />}
          color="var(--success)"
          bgColor="var(--success-light)"
        />
        <StatCard 
          title="Tài Khoản Truy Cập" 
          value={stats.totalUsers || 0} 
          icon={<BsPeople size={24} />}
          color="var(--primary)"
          bgColor="var(--primary-light)"
        />
        <StatCard 
          title="Đơn Đã Thanh Toán" 
          value={stats.totalOrders || 0} 
          icon={<BsBoxSeam size={24} />}
          color="var(--primary)"
          bgColor="var(--primary-light)"
        />
        <StatCard 
          title="Sản Phẩm Hết Hàng" 
          value={stats.outOfStockProducts || 0} 
          icon={<BsExclamationTriangle size={24} />}
          color="var(--danger)"
          bgColor="var(--danger-light)"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Recent Users Table */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 className="text-h3" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BsPeople /> Khách Hàng Mới
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Telegram ID</th>
                  <th>Khách Hàng</th>
                  <th style={{ textAlign: 'right' }}>Số Dư</th>
                </tr>
              </thead>
              <tbody>
                {(stats.recentUsers || []).map(u => (
                  <tr key={u._id}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{u.telegramId}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BsPersonCircle size={20} color="var(--text-muted)" />
                        <div>
                          <div style={{ fontWeight: '500' }}>{u.firstName} {u.lastName}</div>
                          {u.username && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{u.username}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--success)' }}>
                      {(u.balance || 0).toLocaleString()}đ
                    </td>
                  </tr>
                ))}
                {(!stats.recentUsers || stats.recentUsers.length === 0) && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Chưa có dữ liệu</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products Table */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 className="text-h3" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BsGraphUpArrow /> Sản Phẩm Bán Chạy
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sản Phẩm</th>
                  <th>Danh Mục</th>
                  <th style={{ textAlign: 'center' }}>Đã Bán</th>
                </tr>
              </thead>
              <tbody>
                {(stats.topProducts || []).map(p => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>{p.icon || '📦'}</span>
                        <div style={{ fontWeight: '500' }}>{p.name}</div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.category}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-success">{p.soldCount || 0}</span>
                    </td>
                  </tr>
                ))}
                {(!stats.topProducts || stats.topProducts.length === 0) && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Chưa có dữ liệu</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
