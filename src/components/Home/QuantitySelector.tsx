import React, { useState, useEffect } from 'react';

interface QuantitySelectorProps {
  initialQuantity?: number;
  onQuantityChange: (qty: number) => void;
  label?: string;
  disabled?: boolean;
}

export default function QuantitySelector({ initialQuantity = 1, onQuantityChange, label = "Product Quantity", disabled = false }: QuantitySelectorProps) {
  const [mode, setMode] = useState<'dropdown' | 'input'>('dropdown');
  const [dropdownValue, setDropdownValue] = useState<string>(initialQuantity > 3 ? 'more' : initialQuantity.toString());
  const [inputValue, setInputValue] = useState<string>(initialQuantity > 3 ? initialQuantity.toString() : '');

  useEffect(() => {
    if (initialQuantity > 3) {
      setMode('input');
      setInputValue(initialQuantity.toString());
      setDropdownValue('more');
    } else {
      setMode('dropdown');
      setDropdownValue(initialQuantity.toString());
    }
  }, [initialQuantity]);

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDropdownValue(val);
    if (val === 'more') {
      setMode('input');
      setInputValue('');
    } else {
      const num = parseInt(val, 10);
      onQuantityChange(num);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (val !== '') {
      let num = parseInt(val, 10);
      if (isNaN(num)) num = 1;
      if (num > 50) num = 50;
      onQuantityChange(num);
    }
  };

  const handleInputBlur = () => {
    if (inputValue === '' || parseInt(inputValue, 10) < 1) {
      setInputValue('1');
      onQuantityChange(1);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>}
      {mode === 'dropdown' ? (
        <select
          value={dropdownValue}
          onChange={handleDropdownChange}
          disabled={disabled}
          className="border border-brand-border rounded-lg bg-white px-3 py-2.5 text-sm font-bold text-brand-text shadow-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all disabled:opacity-50"
        >
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="more">More</option>
        </select>
      ) : (
        <input
          type="number"
          min="1"
          max="50"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          disabled={disabled}
          placeholder="Qty (Max 50)"
          className="border border-brand-border rounded-lg bg-white px-3 py-2.5 text-sm font-bold text-brand-text shadow-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all w-full disabled:opacity-50"
          autoFocus
        />
      )}
    </div>
  );
}
