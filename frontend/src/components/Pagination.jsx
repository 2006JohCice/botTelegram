import React from 'react';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';

const Pagination = ({ 
  currentPage, 
  totalItems, 
  itemsPerPage, 
  onPageChange 
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  // Generate page numbers to show (e.g. 1 2 3 ... 10)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, currentPage + 2);

      if (start === 1) end = maxVisiblePages;
      if (end === totalPages) start = totalPages - maxVisiblePages + 1;

      for (let i = start; i <= end; i++) pages.push(i);
      
      if (start > 1) {
        pages.unshift('...');
        pages.unshift(1);
      }
      if (end < totalPages) {
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const pages = getPageNumbers();

  const btnStyle = {
    padding: '6px 12px',
    border: '1px solid var(--border-color)',
    background: 'white',
    color: 'var(--text-color)',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '36px',
    height: '36px',
    fontWeight: '500',
    transition: 'all 0.2s',
    userSelect: 'none'
  };

  const activeBtnStyle = {
    ...btnStyle,
    background: 'var(--primary)',
    color: 'white',
    borderColor: 'var(--primary)'
  };

  const disabledBtnStyle = {
    ...btnStyle,
    opacity: 0.5,
    cursor: 'not-allowed',
    background: 'var(--bg-color)'
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', flexWrap: 'wrap', gap: '16px' }}>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
        Hiển thị {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} - {Math.min(currentPage * itemsPerPage, totalItems)} trong tổng số {totalItems}
      </div>
      
      <div style={{ display: 'flex', gap: '6px' }}>
        <button 
          style={currentPage === 1 ? disabledBtnStyle : btnStyle} 
          onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <BsChevronLeft />
        </button>

        {pages.map((p, i) => (
          p === '...' ? (
            <span key={i} style={{ padding: '8px', color: 'var(--text-muted)' }}>...</span>
          ) : (
            <button 
              key={i} 
              style={p === currentPage ? activeBtnStyle : btnStyle}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        ))}

        <button 
          style={currentPage === totalPages ? disabledBtnStyle : btnStyle} 
          onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <BsChevronRight />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
