import React, { useState } from 'react';
import { X, ShoppingBag, Trash2, Plus, Minus, CheckCircle2, Mail, Phone, User, MapPin, Hash, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem, Order } from '../../types';
import { formatPrice, formatQuantityUnit } from '../../lib/utils';
import QuantitySelector from './QuantitySelector';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onClearCart: () => void;
}

export default function OrderModal({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onClearCart,
}: OrderModalProps) {
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; address?: string; pincode?: string }>({});

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(val);
    setFormErrors(prev => ({ ...prev, pincode: undefined }));
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors: { name?: string; phone?: string; address?: string; pincode?: string } = {};
    if (!name.trim()) {
      errors.name = 'नाम डालना आवश्यक है / Name is required';
    }
    if (!phone.trim()) {
      errors.phone = 'फ़ोन नंबर डालना आवश्यक है / Phone number is required';
    } else {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(phone.trim())) {
        errors.phone = 'कृपया 10 अंकों का सही मोबाइल नंबर डालें / Please enter a valid 10-digit mobile number';
      }
    }
    if (!address.trim()) {
      errors.address = 'डिलिवरी पता डालना आवश्यक है / Delivery address is required';
    }
    if (!pincode.trim()) {
      errors.pincode = 'पिन कोड डालना आवश्यक है / PIN code is required';
    } else {
      const pinRegex = /^[0-9]{6}$/;
      if (!pinRegex.test(pincode.trim())) {
        errors.pincode = 'कृपया 6 अंकों का सही पिन कोड डालें / Please enter a valid 6-digit PIN code';
      }
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      const missedFields: string[] = [];
      if (!name.trim()) missedFields.push('नाम (Name)');
      if (!phone.trim()) missedFields.push('फ़ोन नंबर (Phone Number)');
      if (!address.trim()) missedFields.push('डिलिवरी पता (Delivery Address)');
      if (!pincode.trim()) missedFields.push('पिन कोड (PIN Code)');

      if (missedFields.length > 0) {
        alert(`कृपया छूटे हुए फ़ील्ड को भरें:\n- ${missedFields.join('\n- ')}`);
      } else {
        const invalidFields: string[] = [];
        if (errors.phone) invalidFields.push('फ़ोन नंबर (10-digit Phone)');
        if (errors.pincode) invalidFields.push('पिन कोड (6-digit PIN)');
        alert(`कृपया दर्ज की गई जानकारी को सही करें:\n- ${invalidFields.join('\n- ')}`);
      }
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = phone.trim().startsWith('+91') ? phone.trim() : `+91${phone.trim()}`;
      const orderData: Omit<Order, 'id'> = {
        customerName: name,
        customerPhone: formattedPhone,
        customerAddress: address,
        customerPincode: pincode,
        status: 'pending',
        createdAt: Date.now(),
        totalPrice: subtotal,
        items: cartItems.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          quantityValue: item.product.quantityValue,
          quantityUnit: item.product.quantityUnit,
        })),
      };

      // Generate 6-character random uppercase alphanumeric ID
      const generateId = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };
      
      const customOrderId = generateId();

      // Add to Firestore
      const docRef = doc(collection(db, 'orders'), customOrderId);
      await setDoc(docRef, orderData);
      const fullOrder: Order = { ...orderData, id: customOrderId };

      // Trigger server-side email dispatch
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: customOrderId,
            customerName: name,
            customerPhone: formattedPhone,
            customerAddress: address,
            customerPincode: pincode,
            totalPrice: subtotal,
            items: orderData.items,
          }),
        });
      } catch (emailErr) {
        console.error('Failed to trigger email notification API:', emailErr);
      }

      setPlacedOrder(fullOrder);
      onClearCart();
      setStep('success');
    } catch (error) {
      console.error('Error placing order:', error);
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!placedOrder) return;

    const itemsText = placedOrder.items
      .map(
        (item) =>
          `• *${item.name}* (${item.quantityValue || ''} ${item.quantityUnit || ''}) x ${item.quantity} - ₹${item.price * item.quantity}`
      )
      .join('\n');

    const pincodeText = placedOrder.customerPincode ? `*PIN Code:* ${placedOrder.customerPincode}\n` : '';

    const message = `*🛒 RAJ KIRANA STORE - NEW ORDER*\n\n` +
      `*Order ID:* ${placedOrder.id || 'N/A'}\n` +
      `*Name:* ${placedOrder.customerName}\n` +
      `*Phone:* ${placedOrder.customerPhone}\n` +
      `*Delivery Address:* ${placedOrder.customerAddress}\n` +
      pincodeText +
      `\n*Items Ordered:*\n${itemsText}\n\n` +
      `*Total Price:* ₹${placedOrder.totalPrice}\n\n` +
      `Please confirm the delivery. Thank you!`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const generateBill = () => {
    if (!placedOrder) return;

    const itemsHtml = placedOrder.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name} ${item.quantityValue ? `(${item.quantityValue} ${item.quantityUnit || ''})` : ''}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">Rs. ${item.price}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">Rs. ${item.price * item.quantity}</td>
      </tr>
    `).join('');

    const billHtml = `
      <html>
        <head>
          <title>Raj Kirana Store - ${placedOrder.id || 'N/A'}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 40px; }
            .invoice-title { font-size: 28px; font-weight: bold; margin-bottom: 5px; }
            .order-id { color: #666; margin-bottom: 20px; }
            .details { display: flex; justify-content: space-between; margin-bottom: 30px; border-top: 2px solid #000; padding-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; padding: 12px 10px; background: #f8f9fa; border-bottom: 2px solid #ddd; font-weight: bold; text-transform: uppercase; font-size: 12px; }
            th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: center; }
            th:nth-child(3), th:nth-child(4) { text-align: right; }
            .total-row { font-weight: bold; font-size: 18px; }
            .total-row td { padding: 15px 10px; border-top: 2px solid #000; }
            .footer { text-align: center; color: #888; font-size: 12px; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="invoice-title">Raj Kirana Store</div>
            <div class="order-id">Order ID: ${placedOrder.id || 'N/A'}</div>
          </div>
          <div class="details">
            <div>
              <strong>Billed To:</strong><br/>
              ${placedOrder.customerName}<br/>
              ${placedOrder.customerPhone}<br/>
              ${placedOrder.customerAddress}<br/>
              ${placedOrder.customerPincode ? `PIN: ${placedOrder.customerPincode}` : ''}
            </div>
            <div style="text-align: right;">
              <strong>Date:</strong><br/>
              ${new Date().toLocaleDateString()}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item Description</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="3" style="text-align: right;">Total Amount</td>
                <td style="text-align: right;">Rs. ${placedOrder.totalPrice}</td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            Thank you for shopping with us!
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(billHtml);
      printWindow.document.close();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-brand-border flex items-center justify-between bg-gray-50 shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-accent" />
              <h3 className="font-display font-bold text-lg text-brand-text">
                {step === 'cart' && 'My Shopping Cart'}
                {step === 'checkout' && 'Checkout & Address'}
                {step === 'success' && 'Order Placed Successfully!'}
              </h3>
            </div>
            {step !== 'success' && (
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-brand-muted" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {step === 'cart' && (
              <>
                {cartItems.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-brand-muted">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <p className="text-brand-muted font-medium text-sm">Your cart is currently empty.</p>
                    <button
                      onClick={onClose}
                      className="bg-brand-accent text-white px-5 py-2 rounded-lg text-xs font-bold shadow hover:bg-opacity-95 transition-all"
                    >
                      Shop Now
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {cartItems.map((item) => (
                        <div
                          key={item.product.id}
                          className="flex items-center gap-4 bg-white p-3.5 rounded-xl border border-brand-border shadow-sm"
                        >
                          {item.product.imageUrl ? (
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              className="w-12 h-12 object-contain bg-gray-50 rounded-lg p-1 border border-brand-border"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg border border-brand-border flex items-center justify-center font-bold text-xs text-brand-muted">
                              RK
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-brand-text truncate">
                              {item.product.name}
                            </h4>
                            <p className="text-xs text-brand-muted font-semibold mt-0.5">
                              {item.product.showQuantity && item.product.quantityValue && (
                                <span className="mr-2">
                                  {item.product.quantityValue}{' '}
                                  {formatQuantityUnit(item.product.quantityUnit || 'g')}
                                </span>
                              )}
                              <span>{formatPrice(item.product.price)}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0 sm:ml-auto">
                            <div className="w-24">
                              <QuantitySelector
                                label=""
                                initialQuantity={item.quantity}
                                onQuantityChange={(qty) => onUpdateQuantity(item.product.id, qty)}
                              />
                            </div>

                            <button
                              onClick={() => onUpdateQuantity(item.product.id, 0)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto sm:ml-0"
                              title="Delete Item"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-gray-50 border border-brand-border rounded-xl p-4 flex justify-between items-center">
                      <span className="text-sm font-semibold text-brand-muted">Total Amount:</span>
                      <span className="text-xl font-display font-black text-brand-accent">
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {step === 'checkout' && (
              <form onSubmit={handlePlaceOrder} className="space-y-5 text-brand-text">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name field */}
                  <div className="space-y-1.5">
                    <label className={`text-xs uppercase font-bold tracking-wider flex items-center gap-1 ${formErrors.name ? 'text-red-500' : 'text-brand-muted'}`}>
                      <User className={`w-3.5 h-3.5 ${formErrors.name ? 'text-red-500' : 'text-brand-accent'}`} />
                      Your Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (formErrors.name) {
                          setFormErrors(prev => ({ ...prev, name: undefined }));
                        }
                      }}
                      placeholder="Enter your full name"
                      className={`w-full bg-gray-50 border rounded-xl p-3 text-sm focus:outline-none transition-all font-medium ${
                        formErrors.name 
                          ? 'border-red-500 focus:border-red-500 bg-red-50/20' 
                          : 'border-brand-border focus:border-brand-accent focus:bg-white'
                      }`}
                    />
                    {formErrors.name && (
                      <p className="text-red-500 text-xs font-semibold mt-1">{formErrors.name}</p>
                    )}
                  </div>

                  {/* Phone field */}
                  <div className="space-y-1.5">
                    <label className={`text-xs uppercase font-bold tracking-wider flex items-center gap-1 ${formErrors.phone ? 'text-red-500' : 'text-brand-muted'}`}>
                      <Phone className={`w-3.5 h-3.5 ${formErrors.phone ? 'text-red-500' : 'text-brand-accent'}`} />
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className={`flex bg-gray-50 border rounded-xl overflow-hidden transition-all ${
                      formErrors.phone 
                        ? 'border-red-500 focus-within:border-red-500 bg-red-50/20' 
                        : 'border-brand-border focus-within:border-brand-accent focus-within:bg-white'
                    }`}>
                      <span className={`flex items-center justify-center border-r px-3 text-sm font-bold select-none ${
                        formErrors.phone ? 'bg-red-50 border-red-500 text-red-500' : 'bg-gray-100 border-brand-border text-brand-muted'
                      }`}>
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                          if (formErrors.phone) {
                            setFormErrors(prev => ({ ...prev, phone: undefined }));
                          }
                        }}
                        placeholder="Enter 10-digit mobile number"
                        pattern="[0-9]{10}"
                        title="Please enter a valid 10-digit mobile number"
                        className="w-full p-3 text-sm focus:outline-none bg-transparent font-medium"
                      />
                    </div>
                    {formErrors.phone && (
                      <p className="text-red-500 text-xs font-semibold mt-1">{formErrors.phone}</p>
                    )}
                  </div>
                </div>

                {/* Manual Address & Pincode Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <label className={`text-xs uppercase font-bold tracking-wider flex items-center gap-1 ${formErrors.address ? 'text-red-500' : 'text-brand-muted'}`}>
                      <MapPin className={`w-3.5 h-3.5 ${formErrors.address ? 'text-red-500' : 'text-brand-accent'}`} />
                      Delivery Address / landmarks <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        if (formErrors.address) {
                          setFormErrors(prev => ({ ...prev, address: undefined }));
                        }
                      }}
                      placeholder="Enter house number, colony, landmarks details..."
                      rows={2}
                      className={`w-full bg-gray-50 border rounded-xl p-3 text-sm focus:outline-none transition-all font-medium ${
                        formErrors.address 
                          ? 'border-red-500 focus:border-red-500 bg-red-50/20' 
                          : 'border-brand-border focus:border-brand-accent focus:bg-white'
                      }`}
                    />
                    {formErrors.address && (
                      <p className="text-red-500 text-xs font-semibold mt-1">{formErrors.address}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className={`text-xs uppercase font-bold tracking-wider flex items-center gap-1 ${formErrors.pincode ? 'text-red-500' : 'text-brand-muted'}`}>
                      <Hash className={`w-3.5 h-3.5 ${formErrors.pincode ? 'text-red-500' : 'text-brand-accent'}`} />
                      PIN Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => {
                        handlePincodeChange(e);
                        if (formErrors.pincode) {
                          setFormErrors(prev => ({ ...prev, pincode: undefined }));
                        }
                      }}
                      placeholder="6-digit PIN"
                      pattern="[0-9]{6}"
                      title="Please enter a valid 6-digit Indian PIN code"
                      className={`w-full bg-gray-50 border rounded-xl p-3 text-sm focus:outline-none transition-all font-medium md:h-[62px] ${
                        formErrors.pincode 
                          ? 'border-red-500 focus:border-red-500 bg-red-50/20' 
                          : 'border-brand-border focus:border-brand-accent focus:bg-white'
                      }`}
                    />
                    {formErrors.pincode && (
                      <p className="text-red-500 text-xs font-semibold mt-1">{formErrors.pincode}</p>
                    )}
                  </div>
                </div>
              </form>
            )}

            {step === 'success' && placedOrder && (
              <div className="text-center py-8 space-y-4">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500 shadow-sm animate-bounce">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-display font-black text-2xl text-brand-accent">
                    Order Placed!
                  </h4>
                  <p className="text-brand-muted text-sm max-w-md mx-auto">
                    Your order details have been saved under ID <span className="font-bold text-brand-text">{placedOrder.id}</span>. We will process your delivery shortly.
                  </p>
                </div>

                <div className="bg-gray-50 border border-brand-border rounded-2xl p-5 max-w-md mx-auto text-left space-y-3 shadow-sm">
                  <h5 className="font-bold text-xs uppercase text-brand-muted tracking-wider">
                    Receipt Summary
                  </h5>
                  <div className="text-sm space-y-2">
                    <p className="flex justify-between">
                      <span className="text-brand-muted font-semibold">Customer:</span>
                      <span className="font-bold">{placedOrder.customerName}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-brand-muted font-semibold">Phone:</span>
                      <span className="font-bold truncate max-w-[200px]">{placedOrder.customerPhone}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-brand-muted font-semibold">Address:</span>
                      <span className="font-medium text-right max-w-[200px] truncate" title={placedOrder.customerAddress}>
                        {placedOrder.customerAddress}
                      </span>
                    </p>
                    {placedOrder.customerPincode && (
                      <p className="flex justify-between">
                        <span className="text-brand-muted font-semibold">PIN Code:</span>
                        <span className="font-bold">{placedOrder.customerPincode}</span>
                      </p>
                    )}
                    <div className="border-t border-brand-border pt-2 flex justify-between items-center">
                      <span className="text-sm font-semibold text-brand-muted">Total:</span>
                      <span className="text-lg font-display font-black text-brand-accent">
                        {formatPrice(placedOrder.totalPrice)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 justify-center pt-4 max-w-sm mx-auto">
                  <button
                    onClick={generateBill}
                    className="w-full bg-blue-600 text-white p-3.5 rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-display uppercase tracking-wider"
                  >
                    <Download className="w-4 h-4" /> Download Bill
                  </button>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleWhatsAppShare}
                      className="flex-1 bg-emerald-600 text-white p-3.5 rounded-xl font-bold text-sm shadow-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 font-display uppercase tracking-wider"
                    >
                      Send to WhatsApp
                    </button>
                    <button
                      onClick={() => {
                        setStep('cart');
                        setPlacedOrder(null);
                        setName('');
                        setPhone('');
                        setAddress('');
                        onClose();
                      }}
                      className="flex-1 bg-white border border-brand-border text-brand-text p-3.5 rounded-xl font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors uppercase tracking-wider"
                    >
                      Back to Store
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer controls */}
          {step !== 'success' && cartItems.length > 0 && (
            <div className="p-4 border-t border-brand-border bg-gray-50 flex gap-3 shrink-0">
              {step === 'cart' && (
                <>
                  <button
                    onClick={onClose}
                    className="flex-1 bg-white border border-brand-border text-brand-text py-3 rounded-xl font-bold text-xs md:text-sm hover:bg-gray-50 transition-colors"
                  >
                    Continue Shopping
                  </button>
                  <button
                    onClick={() => setStep('checkout')}
                    className="flex-1 bg-brand-accent text-white py-3 rounded-xl font-bold text-xs md:text-sm shadow-lg hover:bg-opacity-95 transition-all"
                  >
                    Proceed to Order (₹{subtotal})
                  </button>
                </>
              )}

              {step === 'checkout' && (
                <>
                  <button
                    onClick={() => setStep('cart')}
                    className="flex-1 bg-white border border-brand-border text-brand-text py-3 rounded-xl font-bold text-xs md:text-sm hover:bg-gray-50 transition-colors"
                  >
                    Back to Cart
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={loading}
                    className="flex-1 bg-brand-accent text-white py-3 rounded-xl font-bold text-xs md:text-sm shadow-lg hover:bg-opacity-95 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? 'Placing Order...' : `Place Order (₹${subtotal})`}
                  </button>
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
