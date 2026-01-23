'use client';

import { useState, useRef, useEffect } from 'react';
import { CanvasBlock, DatabaseBlockConfig, DatabaseProperty, DatabaseRow, DatabasePropertyType } from '@/types';
import { nanoid } from 'nanoid';

interface DatabaseBlockProps {
  blockId: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  config: DatabaseBlockConfig;
  onUpdate: (blockId: string, updates: Partial<CanvasBlock>) => void;
  onDelete: (blockId: string) => void;
  isDragging?: boolean;
  isClicked?: boolean;
  zIndex?: number;
  onPointerDown?: (e: React.PointerEvent) => void;
}

const DEFAULT_PROPERTIES: DatabaseProperty[] = [
  { id: nanoid(), name: '이름', type: 'text' },
  { id: nanoid(), name: '상태', type: 'select', options: ['진행중', '완료', '보류'] },
];

export default function DatabaseBlock({
  blockId,
  x,
  y,
  width = 480,
  height = 200,
  config,
  onUpdate,
  onDelete,
  isDragging = false,
  isClicked = false,
  zIndex = 10,
  onPointerDown,
}: DatabaseBlockProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [databaseName, setDatabaseName] = useState(config.name || '데이터베이스');
  const [properties, setProperties] = useState<DatabaseProperty[]>(
    config.properties.length > 0 ? config.properties : DEFAULT_PROPERTIES
  );
  const [rows, setRows] = useState<DatabaseRow[]>(config.rows || []);
  const [editingCell, setEditingCell] = useState<{ rowId: string; propertyId: string } | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [sortBy, setSortBy] = useState<string | undefined>(config.sortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(config.sortOrder || 'asc');
  const [addingProperty, setAddingProperty] = useState(false);
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newPropertyType, setNewPropertyType] = useState<DatabasePropertyType>('text');

  // 설정 저장
  useEffect(() => {
    onUpdate(blockId, {
      config: {
        name: databaseName,
        properties,
        rows,
        sortBy,
        sortOrder,
      },
    });
  }, [blockId, databaseName, properties, rows, sortBy, sortOrder, onUpdate]);

  // 정렬된 행
  const sortedRows = [...rows].sort((a, b) => {
    if (!sortBy) return 0;
    const aVal = a.properties[sortBy];
    const bVal = b.properties[sortBy];
    
    if (aVal === undefined && bVal === undefined) return 0;
    if (aVal === undefined) return 1;
    if (bVal === undefined) return -1;

    let comparison = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal, 'ko');
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal), 'ko');
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // 속성 추가
  const handleAddProperty = () => {
    if (!newPropertyName.trim()) return;
    const newProperty: DatabaseProperty = {
      id: nanoid(),
      name: newPropertyName.trim(),
      type: newPropertyType,
      options: newPropertyType === 'select' || newPropertyType === 'multi-select' ? [] : undefined,
    };
    setProperties([...properties, newProperty]);
    setNewPropertyName('');
    setAddingProperty(false);
  };

  // 속성 삭제
  const handleDeleteProperty = (propertyId: string) => {
    setProperties(properties.filter(p => p.id !== propertyId));
    setRows(rows.map(row => {
      const newProperties = { ...row.properties };
      delete newProperties[propertyId];
      return { ...row, properties: newProperties };
    }));
  };

  // 행 추가
  const handleAddRow = () => {
    const newRow: DatabaseRow = {
      id: nanoid(),
      properties: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setRows([...rows, newRow]);
  };

  // 행 삭제
  const handleDeleteRow = (rowId: string) => {
    setRows(rows.filter(r => r.id !== rowId));
  };

  // 셀 값 업데이트
  const handleCellUpdate = (rowId: string, propertyId: string, value: any) => {
    setRows(rows.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          properties: { ...row.properties, [propertyId]: value },
          updatedAt: Date.now(),
        };
      }
      return row;
    }));
    setEditingCell(null);
  };

  // 셀 값 렌더링
  const renderCellValue = (row: DatabaseRow, property: DatabaseProperty) => {
    const value = row.properties[property.id];
    const isEditing = editingCell?.rowId === row.id && editingCell?.propertyId === property.id;

    if (isEditing) {
      return (
        <input
          type={property.type === 'number' ? 'number' : 'text'}
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={() => {
            let finalValue: any = editingValue;
            if (property.type === 'number') {
              finalValue = editingValue ? parseFloat(editingValue) : null;
            } else if (property.type === 'checkbox') {
              finalValue = editingValue === 'true' || editingValue === 'checked';
            }
            handleCellUpdate(row.id, property.id, finalValue);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              setEditingCell(null);
            }
          }}
          autoFocus
          className="w-full px-1 py-0.5 text-[10px] border-2 border-indigo-500 focus:outline-none"
        />
      );
    }

    if (property.type === 'checkbox') {
      const checked = value === true || value === 'true';
      return (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => handleCellUpdate(row.id, property.id, e.target.checked)}
            className="w-4 h-4"
          />
        </div>
      );
    }

    if (property.type === 'select' || property.type === 'multi-select') {
      return (
        <select
          value={value || ''}
          onChange={(e) => handleCellUpdate(row.id, property.id, e.target.value)}
          className="w-full px-1 py-0.5 text-[10px] border-2 border-gray-300 focus:outline-none focus:border-indigo-500"
          multiple={property.type === 'multi-select'}
        >
          {property.options?.map((opt, idx) => (
            <option key={idx} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (property.type === 'date') {
      const dateValue = value ? new Date(value).toISOString().split('T')[0] : '';
      return (
        <input
          type="date"
          value={dateValue}
          onChange={(e) => handleCellUpdate(row.id, property.id, e.target.value ? new Date(e.target.value).getTime() : null)}
          className="w-full px-1 py-0.5 text-[10px] border-2 border-gray-300 focus:outline-none focus:border-indigo-500"
        />
      );
    }

    const displayValue = value ?? '';
    return (
      <div
        className="px-1 py-0.5 text-[10px] text-gray-700 cursor-pointer hover:bg-gray-50 min-h-[18px]"
        onClick={() => {
          setEditingCell({ rowId: row.id, propertyId: property.id });
          setEditingValue(String(displayValue));
        }}
      >
        {String(displayValue)}
      </div>
    );
  };

  return (
    <div
      className="absolute bg-white rounded-lg shadow-lg border-2 border-gray-200 overflow-hidden flex flex-col"
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: isDragging ? 10000 : zIndex,
        opacity: isDragging ? 0.85 : 1,
        transition: 'none',
        willChange: isDragging ? 'transform' : 'auto',
        pointerEvents: isDragging ? 'none' : 'auto',
        contain: 'layout style paint',
      }}
      onPointerDown={onPointerDown}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2 flex-1">
          {isEditingName ? (
            <input
              type="text"
              value={databaseName}
              onChange={(e) => setDatabaseName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              autoFocus
              className="text-sm font-semibold text-gray-700 bg-transparent border-b-2 border-indigo-500 focus:outline-none"
            />
          ) : (
            <h3
              className="text-xs font-semibold text-gray-700 cursor-pointer hover:text-indigo-600"
              onClick={() => setIsEditingName(true)}
            >
              {databaseName}
            </h3>
          )}
          <span className="text-xs text-gray-400">({rows.length}개 행)</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(blockId);
          }}
          className="text-gray-400 hover:text-gray-600 text-xs"
          title="삭제"
        >
          ×
        </button>
      </div>

      {/* 테이블 컨텐츠 */}
      <div className="flex-1 overflow-auto" style={{ maxHeight: `${Math.max(50, height - 80)}px` }}>
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {properties.map((property) => (
                <th
                  key={property.id}
                  className="border-b border-r border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 text-left min-w-[120px]"
                >
                  <div className="flex items-center justify-between">
                    <span>{property.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          if (sortBy === property.id) {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy(property.id);
                            setSortOrder('asc');
                          }
                        }}
                        className="text-gray-400 hover:text-gray-600 text-xs"
                        title="정렬"
                      >
                        {sortBy === property.id ? (sortOrder === 'asc' ? '↑' : '↓') : '⇅'}
                      </button>
                      <button
                        onClick={() => handleDeleteProperty(property.id)}
                        className="text-gray-400 hover:text-red-600 text-xs"
                        title="삭제"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </th>
              ))}
              <th className="border-b border-gray-200 px-1 py-1 text-[10px] font-semibold text-gray-700 w-8">
                <button
                  onClick={handleAddRow}
                  className="w-full h-5 bg-blue-500 hover:bg-blue-600 text-white rounded text-[10px]"
                  title="행 추가"
                >
                  +
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 border-b border-gray-100">
                {properties.map((property) => (
                  <td
                    key={property.id}
                    className="border-r border-gray-200 px-0 py-0"
                  >
                    {renderCellValue(row, property)}
                  </td>
                ))}
                <td className="px-2 py-1">
                  <button
                    onClick={() => handleDeleteRow(row.id)}
                    className="text-gray-400 hover:text-red-600 text-xs"
                    title="삭제"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={properties.length + 1} className="px-2 py-4 text-center text-[10px] text-gray-400">
                  행이 없습니다. + 버튼을 눌러 행을 추가하세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 속성 추가 바 */}
      <div className="border-t border-gray-200 px-3 py-2 bg-gray-50">
        {addingProperty ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="속성 이름"
              value={newPropertyName}
              onChange={(e) => setNewPropertyName(e.target.value)}
              className="flex-1 px-1 py-0.5 text-[10px] border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <select
              value={newPropertyType}
              onChange={(e) => setNewPropertyType(e.target.value as DatabasePropertyType)}
              className="px-1 py-0.5 text-[10px] border border-gray-300 rounded focus:outline-none"
            >
              <option value="text">텍스트</option>
              <option value="number">숫자</option>
              <option value="date">날짜</option>
              <option value="checkbox">체크박스</option>
              <option value="select">선택</option>
              <option value="multi-select">다중 선택</option>
            </select>
            <button
              onClick={handleAddProperty}
              className="px-2 py-0.5 bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] border-2 border-indigo-600"
            >
              추가
            </button>
            <button
              onClick={() => {
                setAddingProperty(false);
                setNewPropertyName('');
              }}
              className="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-white text-xs rounded"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingProperty(true)}
            className="w-full px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-100 rounded border border-dashed border-gray-300"
          >
            + 속성 추가
          </button>
        )}
      </div>
    </div>
  );
}
