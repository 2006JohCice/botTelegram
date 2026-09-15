import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { BsGrid1X2Fill, BsFolderFill, BsBoxSeamFill, BsGearFill, BsRobot, BsMegaphoneFill, BsGlobe } from 'react-icons/bs';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import ApiStore from './pages/ApiStore';
import ApiProviders from './pages/ApiProviders';
import { DialogProvider } from './context/DialogContext';

const SidebarContent = () => {
  const location = useLocation();
  const path = location.pathname;
  return (
    <div style={{ width: '260px', backgroundColor: 'var(--sidebar-bg)', color: 'white', padding: '32px 24px', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
        <div style={{ background: 'var(--primary)', padding: '8px', borderRadius: '10px', display: 'flex' }}>
          <BsRobot size={20} />
        </div>
        Web Admin
      </h2>
      <div style={{ fontSize: '13px', color: 'var(--sidebar-text)', marginBottom: '40px', paddingLeft: '44px' }}>Bot Bán Hàng Tự Động</div>
      
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Link to="/" className={`nav-link ${path === '/' ? 'active' : ''}`}><BsGrid1X2Fill size={18} /> Dashboard</Link>
        <Link to="/categories" className={`nav-link ${path === '/categories' ? 'active' : ''}`}><BsFolderFill size={18} /> Danh mục</Link>
        <Link to="/products" className={`nav-link ${path === '/products' ? 'active' : ''}`}><BsBoxSeamFill size={18} /> Sản phẩm</Link>
        <Link to="/api-providers" className={`nav-link ${path === '/api-providers' ? 'active' : ''}`}><BsGlobe size={18} /> Nguồn API</Link>
        <Link to="/api-store" className={`nav-link ${path === '/api-store' ? 'active' : ''}`}><BsBoxSeamFill size={18} style={{color: 'var(--warning)'}} /> Cửa hàng API</Link>
        <Link to="/notifications" className={`nav-link ${path === '/notifications' ? 'active' : ''}`}><BsMegaphoneFill size={18} /> Thông báo</Link>
        <Link to="/settings" className={`nav-link ${path === '/settings' ? 'active' : ''}`}><BsGearFill size={18} /> Cài đặt</Link>
      </nav>
    </div>
  );
};

const Layout = ({ children }) => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
      {/* Sidebar */}
      <SidebarContent />

      {/* Main Content */}
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto', backgroundColor: 'var(--bg-color)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <DialogProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/products" element={<Products />} />
            <Route path="/api-providers" element={<ApiProviders />} />
            <Route path="/api-store" element={<ApiStore />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </DialogProvider>
    </BrowserRouter>
  );
}

export default App;
