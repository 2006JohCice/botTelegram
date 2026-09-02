import React, { createContext, useState, useContext, useCallback } from 'react';
import { BsExclamationCircle, BsCheckCircle, BsX } from 'react-icons/bs';

const DialogContext = createContext();

export const useDialog = () => useContext(DialogContext);

export const DialogProvider = ({ children }) => {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    type: 'alert', // 'alert' or 'confirm'
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
  });

  const alert = useCallback((message, title = 'Thông báo') => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        type: 'alert',
        title,
        message,
        onConfirm: () => {
          setDialogState((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: null,
      });
    });
  }, []);

  const confirm = useCallback((message, title = 'Xác nhận') => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        onConfirm: () => {
          setDialogState((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setDialogState((prev) => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  }, []);

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}
      {dialogState.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="glass-modal" style={{ width: '100%', maxWidth: '400px', textAlign: 'center', padding: '32px 24px', position: 'relative' }}>
            {dialogState.type === 'confirm' && (
              <button 
                onClick={dialogState.onCancel} 
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <BsX size={24} />
              </button>
            )}
            
            <div style={{ marginBottom: '20px', color: dialogState.type === 'confirm' ? 'var(--warning)' : 'var(--primary)', display: 'flex', justifyContent: 'center' }}>
              {dialogState.type === 'confirm' ? <BsExclamationCircle size={56} /> : <BsCheckCircle size={56} />}
            </div>
            
            <h3 className="text-h3" style={{ marginBottom: '12px', fontSize: '20px' }}>{dialogState.title}</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '15px', lineHeight: '1.5' }}>{dialogState.message}</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              {dialogState.type === 'confirm' && (
                <button 
                  className="btn btn-secondary" 
                  onClick={dialogState.onCancel}
                  style={{ minWidth: '120px', padding: '10px 0' }}
                >
                  Hủy
                </button>
              )}
              <button 
                className={dialogState.type === 'confirm' ? "btn btn-primary" : "btn btn-success"} 
                onClick={dialogState.onConfirm}
                style={{ minWidth: '120px', padding: '10px 0' }}
              >
                {dialogState.type === 'confirm' ? 'Xác nhận' : 'Đóng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};
