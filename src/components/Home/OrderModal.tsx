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
  
  // Auto-fill customer profile for superfast checkout
  const [name, setName] = useState(() => {
    try {
      const saved = localStorage.getItem('rk_customer_profile');
      return saved ? JSON.parse(saved).name || '' : '';
    } catch {
      return '';
    }
  });
  const [phone, setPhone] = useState(() => {
    try {
      const saved = localStorage.getItem('rk_customer_profile');
      return saved ? JSON.parse(saved).phone || '' : '';
    } catch {
      return '';
    }
  });
  const [address, setAddress] = useState(() => {
    try {
      const saved = localStorage.getItem('rk_customer_profile');
      return saved ? JSON.parse(saved).address || '' : '';
    } catch {
      return '';
    }
  });
  const [pincode, setPincode] = useState(() => {
    try {
      const saved = localStorage.getItem('rk_customer_profile');
      return saved ? JSON.parse(saved).pincode || '' : '';
    } catch {
      return '';
    }
  });

  const [loading, setLoading] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; address?: string; pincode?: string }>({});
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [shakeTrigger, setShakeTrigger] = useState(false);

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(val);
    setFormErrors(prev => ({ ...prev, pincode: undefined }));
    if (val.length === 6) {
      setValidationMsg(null);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(val);
    setFormErrors(prev => ({ ...prev, phone: undefined }));
    if (val.length === 10) {
      setValidationMsg(null);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationMsg(null);
    
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
      setShakeTrigger(true);
      setTimeout(() => setShakeTrigger(false), 500);
      
      const missedFields: string[] = [];
      if (!name.trim()) missedFields.push('नाम (Name)');
      if (!phone.trim()) missedFields.push('फ़ोन नंबर (Phone Number)');
      if (!address.trim()) missedFields.push('डिलिवरी पता (Delivery Address)');
      if (!pincode.trim()) missedFields.push('पिन कोड (PIN Code)');

      if (missedFields.length > 0) {
        setValidationMsg(`कृपया सभी आवश्यक जानकारी भरें: ${missedFields.join(', ')}`);
      } else {
        setValidationMsg('कृपया दर्ज की गई जानकारी को सही करें (फ़ोन या पिन कोड सही नहीं है)');
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

      // Save customer profile details for next time (superfast checkout!)
      try {
        localStorage.setItem('rk_customer_profile', JSON.stringify({ name, phone, address, pincode }));
      } catch (storageErr) {
        console.error('Failed to save user profile locally:', storageErr);
      }

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
    const invoiceUrl = `${window.location.origin}/#/invoice/${placedOrder.id}`;

    const message = `*🛒 RAJ KIRANA STORE - NEW ORDER*\n\n` +
      `*Order ID:* ${placedOrder.id || 'N/A'}\n` +
      `*Name:* ${placedOrder.customerName}\n` +
      `*Phone:* ${placedOrder.customerPhone}\n` +
      `*Delivery Address:* ${placedOrder.customerAddress}\n` +
      pincodeText +
      `\n*Items Ordered:*\n${itemsText}\n\n` +
      `*Total Price:* ₹${placedOrder.totalPrice}\n` +
      `*Download Invoice:* ${invoiceUrl}\n\n` +
      `Please confirm the delivery. Thank you!`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const generateBill = () => {
    if (!placedOrder) return;
    // Unified elegant PDF invoice view
    window.open(`${window.location.origin}/#/invoice/${placedOrder.id}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative bg-white w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Progress Tracker Header */}
          <div className="border-b border-brand-border bg-gray-50 shrink-0">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-brand-accent animate-pulse" />
                <h3 className="font-display font-black text-base md:text-lg text-brand-text">
                  {step === 'cart' && 'My Shopping Cart'}
                  {step === 'checkout' && 'Checkout details'}
                  {step === 'success' && 'Order Confirmed!'}
                </h3>
              </div>
              {step !== 'success' && (
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-brand-muted" />
                </button>
              )}
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 md:gap-4 px-4 pb-3 text-[10px] md:text-xs font-black uppercase tracking-wider border-t border-brand-border/40 pt-3 bg-white">
              <button 
                onClick={() => step === 'checkout' && setStep('cart')}
                disabled={step !== 'checkout'}
                className={`flex items-center gap-1.5 transition-all ${step === 'cart' ? 'text-brand-accent scale-105 font-black' : step !== 'success' ? 'text-green-600 hover:text-green-700 font-bold cursor-pointer' : 'text-green-600'}`}
              >
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${step === 'cart' ? 'bg-brand-accent text-white' : 'bg-green-100 text-green-700'}`}>
                  {step !== 'cart' ? '✓' : '1'}
                </div>
                <span>Cart</span>
              </button>
              <div className="w-6 md:w-10 h-[1.5px] bg-gray-200" />
              <div className={`flex items-center gap-1.5 transition-all ${step === 'checkout' ? 'text-brand-accent scale-105 font-black' : step === 'success' ? 'text-green-600 font-bold' : 'text-gray-400'}`}>
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${step === 'checkout' ? 'bg-brand-accent text-white' : step === 'success' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  {step === 'success' ? '✓' : '2'}
                </div>
                <span>Address</span>
              </div>
              <div className="w-6 md:w-10 h-[1.5px] bg-gray-200" />
              <div className={`flex items-center gap-1.5 transition-all ${step === 'success' ? 'text-brand-accent scale-105 font-black' : 'text-gray-400'}`}>
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${step === 'success' ? 'bg-brand-accent text-white' : 'bg-gray-100 text-gray-400'}`}>
                  3
                </div>
                <span>Receipt</span>
              </div>
            </div>
          </div>

          {/* Superfast loader overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-[120] flex flex-col items-center justify-center p-6 space-y-4 text-center">
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
                <ShoppingBag className="w-6 h-6 text-brand-accent absolute animate-pulse" />
              </div>
              <div className="space-y-1 max-w-sm">
                <p className="font-black text-lg text-brand-text">सुरक्षित ऑर्डर भेज रहे हैं...</p>
                <p className="text-sm text-brand-muted font-bold">Placing your secure order to Raj Kirana Store...</p>
                <p className="text-xs text-brand-accent font-semibold animate-pulse mt-2">Almost ready! Please do not refresh.</p>
              </div>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {step === 'cart' && (
              <>
                {cartItems.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-brand-muted">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <p className="text-brand-muted font-black text-sm">Your cart is currently empty.</p>
                    <button
                      onClick={onClose}
                      className="bg-brand-accent text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:bg-opacity-95 transition-all cursor-pointer"
                    >
                      Shop Now
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-1">
                      {cartItems.map((item) => (
                        <div
                          key={item.product.id}
                          className="flex items-center gap-3 bg-white p-3 rounded-xl border border-brand-border shadow-sm hover:border-brand-accent/35 transition-colors"
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

                          <div className="flex items-center gap-3">
                            <div className="w-24">
                              <QuantitySelector
                                label=""
                                initialQuantity={item.quantity}
                                onQuantityChange={(qty) => onUpdateQuantity(item.product.id, qty)}
                              />
                            </div>

                            <button
                              onClick={() => onUpdateQuantity(item.product.id, 0)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-gray-50 border border-brand-border rounded-xl p-4 flex justify-between items-center shadow-sm">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-brand-muted uppercase tracking-wider">Subtotal</span>
                        <span className="text-[10px] text-green-600 font-extrabold">🎉 FREE HOME DELIVERY TODAY</span>
                      </div>
                      <span className="text-xl font-display font-black text-brand-accent">
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {step === 'checkout' && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* Form column */}
                <div className={`md:col-span-3 space-y-4 ${shakeTrigger ? 'animate-bounce' : ''}`}>
                  <h4 className="font-black text-xs uppercase tracking-wider text-brand-muted border-b border-brand-border pb-1">
                    📍 Delivery details / पता विवरण
                  </h4>

                  {validationMsg && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2"
                    >
                      <span className="shrink-0 bg-red-100 text-red-700 w-4 h-4 rounded-full flex items-center justify-center text-[10px]">!</span>
                      <span>{validationMsg}</span>
                    </motion.div>
                  )}

                  <form onSubmit={handlePlaceOrder} className="space-y-4 text-brand-text">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name field */}
                      <div className="space-y-1.5">
                        <label className={`text-[11px] uppercase font-bold tracking-wider flex items-center gap-1 ${formErrors.name ? 'text-red-500' : 'text-brand-muted'}`}>
                          <User className={`w-3.5 h-3.5 ${formErrors.name ? 'text-red-500' : 'text-brand-accent'}`} />
                          Your Name / नाम <span className="text-red-500">*</span>
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
                          className={`w-full bg-gray-50 border rounded-xl p-3 text-sm focus:outline-none transition-all font-semibold ${
                            formErrors.name 
                              ? 'border-red-500 focus:border-red-500 bg-red-50/20' 
                              : 'border-brand-border focus:border-brand-accent focus:bg-white'
                          }`}
                        />
                        {formErrors.name && (
                          <p className="text-red-500 text-[10px] font-bold mt-1">{formErrors.name}</p>
                        )}
                      </div>

                      {/* Phone field */}
                      <div className="space-y-1.5">
                        <label className={`text-[11px] uppercase font-bold tracking-wider flex items-center gap-1 ${formErrors.phone ? 'text-red-500' : 'text-brand-muted'}`}>
                          <Phone className={`w-3.5 h-3.5 ${formErrors.phone ? 'text-red-500' : 'text-brand-accent'}`} />
                          Phone Number / फ़ोन <span className="text-red-500">*</span>
                        </label>
                        <div className={`flex bg-gray-50 border rounded-xl overflow-hidden transition-all ${
                          formErrors.phone 
                            ? 'border-red-500 focus-within:border-red-500 bg-red-50/20' 
                            : 'border-brand-border focus-within:border-brand-accent focus-within:bg-white'
                        }`}>
                          <span className={`flex items-center justify-center border-r px-3 text-xs font-black select-none ${
                            formErrors.phone ? 'bg-red-50 border-red-500 text-red-500' : 'bg-gray-100 border-brand-border text-brand-muted'
                          }`}>
                            +91
                          </span>
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={handlePhoneChange}
                            placeholder="10-digit mobile number"
                            pattern="[0-9]{10}"
                            className="w-full p-3 text-sm focus:outline-none bg-transparent font-semibold"
                          />
                          {phone.length === 10 && !formErrors.phone && (
                            <span className="flex items-center pr-3 text-green-600 font-bold">✓</span>
                          )}
                        </div>
                        {formErrors.phone && (
                          <p className="text-red-500 text-[10px] font-bold mt-1">{formErrors.phone}</p>
                        )}
                      </div>
                    </div>

                    {/* Manual Address & Pincode Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className={`text-[11px] uppercase font-bold tracking-wider flex items-center gap-1 ${formErrors.address ? 'text-red-500' : 'text-brand-muted'}`}>
                          <MapPin className={`w-3.5 h-3.5 ${formErrors.address ? 'text-red-500' : 'text-brand-accent'}`} />
                          Delivery Address / पूरा पता <span className="text-red-500">*</span>
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
                          placeholder="House No., Street name, landmarks, colony, town details..."
                          rows={2}
                          className={`w-full bg-gray-50 border rounded-xl p-3 text-sm focus:outline-none transition-all font-semibold ${
                            formErrors.address 
                              ? 'border-red-500 focus:border-red-500 bg-red-50/20' 
                              : 'border-brand-border focus:border-brand-accent focus:bg-white'
                          }`}
                        />
                        {formErrors.address && (
                          <p className="text-red-500 text-[10px] font-bold mt-1">{formErrors.address}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className={`text-[11px] uppercase font-bold tracking-wider flex items-center gap-1 ${formErrors.pincode ? 'text-red-500' : 'text-brand-muted'}`}>
                          <Hash className={`w-3.5 h-3.5 ${formErrors.pincode ? 'text-red-500' : 'text-brand-accent'}`} />
                          PIN Code / पिन कोड <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={pincode}
                          onChange={handlePincodeChange}
                          placeholder="6-digit PIN"
                          pattern="[0-9]{6}"
                          className={`w-full bg-gray-50 border rounded-xl p-3 text-sm focus:outline-none transition-all font-semibold sm:h-[62px] ${
                            formErrors.pincode 
                              ? 'border-red-500 focus:border-red-500 bg-red-50/20' 
                              : 'border-brand-border focus:border-brand-accent focus:bg-white'
                          }`}
                        />
                        {formErrors.pincode && (
                          <p className="text-red-500 text-[10px] font-bold mt-1">{formErrors.pincode}</p>
                        )}
                      </div>
                    </div>
                  </form>
                </div>

                {/* Modern Side Summary column */}
                <div className="md:col-span-2 bg-gray-50 border border-brand-border rounded-2xl p-4 self-start space-y-4 shadow-sm">
                  <div>
                    <h5 className="font-black text-xs uppercase tracking-wider text-brand-muted border-b border-brand-border/60 pb-1.5 mb-2.5">
                      Order Summary ({cartItems.length} items)
                    </h5>
                    
                    {/* Compact Item List */}
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1 text-xs">
                      {cartItems.map((item) => (
                        <div key={item.product.id} className="flex justify-between items-center gap-1.5">
                          <span className="font-bold text-brand-text truncate max-w-[130px]">
                            {item.product.name}
                          </span>
                          <span className="text-brand-muted font-semibold shrink-0 text-[11px]">
                            x{item.quantity}
                          </span>
                          <span className="font-extrabold text-brand-accent ml-auto shrink-0">
                            {formatPrice(item.product.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-brand-border/60 pt-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-brand-muted">Subtotal</span>
                      <span className="text-brand-text">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-brand-muted">Home Delivery</span>
                      <span className="text-green-600 uppercase tracking-wide text-[10px] bg-green-100 px-1.5 py-0.5 rounded-md">FREE</span>
                    </div>
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-brand-muted">Speed Delivery</span>
                      <span className="text-blue-600 font-extrabold">2-4 Hours</span>
                    </div>
                    
                    <div className="border-t border-brand-border pt-2.5 flex justify-between items-center">
                      <span className="font-extrabold text-sm text-brand-text">Grand Total</span>
                      <span className="font-black text-base text-brand-accent">
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 'success' && placedOrder && (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500 shadow-sm animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-display font-black text-2xl text-brand-accent">
                    Order Placed!
                  </h4>
                  <p className="text-brand-muted text-xs max-w-md mx-auto font-bold">
                    आपका ऑर्डर स्वीकार कर लिया गया है। ऑर्डर आईडी <span className="font-black text-brand-accent bg-gray-100 px-1.5 py-0.5 rounded">#{placedOrder.id}</span> है।
                  </p>
                </div>

                <div className="bg-gray-50 border border-brand-border rounded-2xl p-4 max-w-md mx-auto text-left space-y-3 shadow-sm text-xs">
                  <h5 className="font-black text-[11px] uppercase text-brand-muted tracking-wider border-b border-brand-border/60 pb-1 flex justify-between">
                    <span>Receipt Summary / रसीद</span>
                    <span className="text-brand-accent font-black">#{placedOrder.id}</span>
                  </h5>
                  <div className="space-y-1.5">
                    <p className="flex justify-between">
                      <span className="text-brand-muted font-bold">Customer Name:</span>
                      <span className="font-extrabold">{placedOrder.customerName}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-brand-muted font-bold">Phone:</span>
                      <span className="font-extrabold">{placedOrder.customerPhone}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-brand-muted font-bold">Delivery Address:</span>
                      <span className="font-semibold text-right max-w-[200px] truncate" title={placedOrder.customerAddress}>
                        {placedOrder.customerAddress}
                      </span>
                    </p>
                    {placedOrder.customerPincode && (
                      <p className="flex justify-between">
                        <span className="text-brand-muted font-bold">PIN Code:</span>
                        <span className="font-extrabold">{placedOrder.customerPincode}</span>
                      </p>
                    )}
                    <div className="border-t border-brand-border pt-2 flex justify-between items-center">
                      <span className="font-bold text-brand-muted">Total Amount Paid:</span>
                      <span className="text-base font-display font-black text-brand-accent">
                        {formatPrice(placedOrder.totalPrice)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 justify-center pt-3 max-w-sm mx-auto">
                  <button
                    onClick={generateBill}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-black text-xs shadow-md transition-colors flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> View / Download Bill
                  </button>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      onClick={handleWhatsAppShare}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl font-black text-xs shadow-md transition-colors flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
                    >
                      Send to WhatsApp
                    </button>
                    <button
                      onClick={() => {
                        setStep('cart');
                        setPlacedOrder(null);
                        onClose();
                      }}
                      className="flex-1 bg-white border border-brand-border text-brand-text p-3 rounded-xl font-black text-xs shadow-sm hover:bg-gray-50 transition-colors uppercase tracking-wider cursor-pointer"
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
                    className="flex-1 bg-white border border-brand-border text-brand-text py-3 rounded-xl font-black text-xs md:text-sm hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Continue Shopping
                  </button>
                  <button
                    onClick={() => setStep('checkout')}
                    className="flex-1 bg-brand-accent text-white py-3 rounded-xl font-black text-xs md:text-sm shadow-lg hover:bg-opacity-95 transition-all cursor-pointer"
                  >
                    Proceed to Order (₹{subtotal})
                  </button>
                </>
              )}

              {step === 'checkout' && (
                <>
                  <button
                    onClick={() => setStep('cart')}
                    className="flex-1 bg-white border border-brand-border text-brand-text py-3 rounded-xl font-black text-xs md:text-sm hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Back to Cart
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={loading}
                    className="flex-1 bg-brand-accent text-white py-3 rounded-xl font-black text-xs md:text-sm shadow-lg hover:bg-opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
