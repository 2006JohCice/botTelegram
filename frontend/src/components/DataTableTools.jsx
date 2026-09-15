import React from 'react';
import { BsSearch, BsFilter } from 'react-icons/bs';

const DataTableTools = ({ 
  searchPlaceholder = 'Tìm kiếm...',
  searchTerm,
  onSearchChange,
  filterOptions = [],
  filterValue,
  onFilterChange,
  rightContent
}) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
      
      {/* Left side: Search & Filter */}
      <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
        
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, maxWidth: '350px' }}>
          <BsSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="input-field" 
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ paddingLeft: '36px', width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {/* Status Filter */}
        {filterOptions && filterOptions.length > 0 && (
          <div style={{ position: 'relative', maxWidth: '200px' }}>
            <BsFilter style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <select 
              className="input-field"
              value={filterValue}
              onChange={(e) => onFilterChange(e.target.value)}
              style={{ paddingLeft: '32px', cursor: 'pointer' }}
            >
              {filterOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Actions (Add new, etc.) */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        {rightContent}
      </div>
      
    </div>
  );
};

export default DataTableTools;
