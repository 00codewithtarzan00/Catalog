import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Trash2, Plus, Minus, CheckCircle2, Mail, Phone, User, MapPin, Hash, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem, Order } from '../../types';
import { formatPrice, formatQuantityUnit } from '../../lib/utils';
import QuantitySelector from './QuantitySelector';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, auth, loginWithGoogle } from '../../firebase';
import firebaseAppletConfig from '../../../firebase-applet-config.json';

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
  const [user, setUser] = useState<FirebaseUser | null>(null);
  
  // Auto-fill customer profile for superfast checkout
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Load and auto-fill customer profile on auth change
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch from Firestore
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.name) setName(data.name);
            if (data.phone) setPhone(data.phone);
            if (data.address) setAddress(data.address);
          } else {
            // Fallback to local storage if present, otherwise default name
            try {
              const saved = localStorage.getItem('rk_customer_profile');
              if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.name) setName(parsed.name);
                if (parsed.phone) setPhone(parsed.phone);
                if (parsed.address) setAddress(parsed.address);
              } else if (currentUser.displayName) {
                setName(currentUser.displayName);
              }
            } catch (localErr) {
              if (currentUser.displayName) {
                setName(currentUser.displayName);
              }
            }
          }
        } catch (err) {
          console.error('Error fetching profile from Firestore:', err);
          if (currentUser.displayName) {
            setName(currentUser.displayName);
          }
        }
      } else {
        // If logged out, reset fields to local storage or blank
        try {
          const saved = localStorage.getItem('rk_customer_profile');
          if (saved) {
            const parsed = JSON.parse(saved);
            setName(parsed.name || '');
            setPhone(parsed.phone || '');
            setAddress(parsed.address || '');
          } else {
            setName('');
            setPhone('');
            setAddress('');
          }
        } catch {
          setName('');
          setPhone('');
          setAddress('');
        }
      }
    });
    return () => unsub();
  }, []);

  const [loading, setLoading] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; address?: string }>({});
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [shakeTrigger, setShakeTrigger] = useState(false);
  const [loginError, setLoginError] = useState<React.ReactNode | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        console.warn('Google Sign-in popup closed/cancelled in modal:', err);
      } else {
        console.error('Google Sign-in failed in modal:', err);
      }
      if (code === 'auth/popup-closed-by-user') {
        setLoginError(
          'लॉगिन विंडो बंद कर दी गई थी। कृपया सुनिश्चित करें कि आपका ब्राउज़र पॉपअप को ब्लॉक नहीं कर रहा है। यदि समस्या बनी रहती है, तो ऊपर "Open in New Tab" बटन पर क्लिक करके स्टोर को नए टैब में खोलें और फिर से आर्डर करें!'
        );
      } else if (code === 'auth/popup-blocked') {
        setLoginError(
          'आपके ब्राउज़र ने पॉपअप विंडो को ब्लॉक कर दिया है। कृपया पॉपअप को अनुमति दें (Allow Popups) या इस वेबसाइट को नए टैब में खोलकर फिर से प्रयास करें।'
        );
      } else if (code === 'auth/unauthorized-domain') {
        const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'your-domain';
        const consoleLink = `https://console.firebase.google.com/project/${firebaseAppletConfig.projectId}/authentication/settings`;
        setLoginError(
          <div className="space-y-3">
            <p className="font-extrabold text-amber-950 text-xs">Unauthorized Domain / अनधिकृत डोमेन:</p>
            <p className="text-[11px] leading-relaxed text-amber-900 font-semibold">
              यह वेबसाइट डोमेन (<code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-red-700 font-bold">{currentHostname}</code>) आपके Firebase प्रोजेक्ट में अधिकृत (Authorized) नहीं है।
            </p>
            <div className="bg-white/95 border border-amber-200/80 p-3 rounded-xl space-y-2 text-[11px] text-gray-800 shadow-sm">
              <p className="font-bold text-amber-950">इसे ठीक करने के चरण (Steps to fix):</p>
              <ol className="list-decimal list-inside space-y-1 text-left text-gray-700 font-medium">
                <li>
                  अपने Firebase कंसोल पर जाएं:{' '}
                  <a href={consoleLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-extrabold break-all inline-flex items-center gap-0.5">
                    यहाँ क्लिक करें ↗
                  </a>
                </li>
                <li>
                  <strong>Authorized domains</strong> (अधिकृत डोमेन) सेक्शन तक स्क्रॉल करें।
                </li>
                <li>
                  <strong>Add domain</strong> पर क्लिक करें।
                </li>
                <li>
                  इनपुट फ़ील्ड में <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-blue-700 font-extrabold break-all">{currentHostname}</code> डालें और <strong>Add</strong> पर क्लिक करें।
                </li>
              </ol>
            </div>
            <p className="text-[11px] font-semibold text-amber-900 leading-relaxed">
              💡 <strong>त्वरित समाधान (Quick Option):</strong> आप नीचे दिए गए <strong>Guest Sign-in (अतिथि लॉगिन)</strong> विकल्प का उपयोग करके तुरंत बिना किसी सेटअप के आगे बढ़ सकते हैं!
            </p>
          </div>
        );
      } else {
        setLoginError(
          `लॉगिन असफल रहा: ${err?.message || 'अज्ञात त्रुटि'}। कृपया ऊपर "Open in New Tab" पर क्लिक करें ताकि कोई ब्राउज़र सुरक्षा प्रतिबंध लॉगिन में बाधा न डाले।`
        );
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

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
    
    const errors: { name?: string; phone?: string; address?: string } = {};
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

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      setShakeTrigger(true);
      setTimeout(() => setShakeTrigger(false), 500);
      
      const missedFields: string[] = [];
      if (!name.trim()) missedFields.push('नाम (Name)');
      if (!phone.trim()) missedFields.push('फ़ोन नंबर (Phone Number)');
      if (!address.trim()) missedFields.push('डिलिवरी पता (Delivery Address)');

      if (missedFields.length > 0) {
        setValidationMsg(`कृपया सभी आवश्यक जानकारी भरें: ${missedFields.join(', ')}`);
      } else {
        setValidationMsg('कृपया दर्ज की गई जानकारी को सही करें (फ़ोन नंबर सही नहीं है)');
      }
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = phone.trim().startsWith('+91') ? phone.trim() : `+91${phone.trim()}`;
      const orderData: any = {
        customerName: name,
        customerPhone: formattedPhone,
        customerAddress: address,
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
        customerUid: user?.uid || null,
        customerEmail: user?.email || null,
      };

      // Save customer profile details for next time (superfast checkout!)
      try {
        localStorage.setItem('rk_customer_profile', JSON.stringify({ name, phone, address }));
        if (user) {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            name,
            phone,
            address,
            updatedAt: Date.now()
          }, { merge: true });
        }
      } catch (storageErr) {
        console.error('Failed to save user profile:', storageErr);
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

    const pincodeText = '';
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
                {!user ? (
                  /* SECURE GOOGLE LOGIN WALL */
                  <div className="col-span-5 bg-white border border-brand-border rounded-3xl p-6 md:p-8 text-center space-y-6 shadow-sm max-w-xl mx-auto my-4 animate-fade-in">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                      {isLoggingIn ? (
                        <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-display font-black text-lg md:text-xl text-brand-text uppercase tracking-wide">
                        {isLoggingIn ? 'गूगल लॉगिन प्रक्रिया में है...' : 'गूगल लॉगिन करना अनिवार्य है'}
                      </h3>
                      <p className="text-xs text-brand-muted font-bold leading-relaxed max-w-md mx-auto">
                        सुरक्षा और प्रमाणिकता (Security & Verification) के लिए सभी ऑर्डर्स के लिए Google Login आवश्यक है। इससे आपका ऑर्डर सुरक्षित रहेगा और बार-बार पता नहीं भरना पड़ेगा।
                      </p>
                    </div>

                    {isInIframe && !loginError && (
                      <div className="bg-amber-50/60 border border-amber-200/80 text-amber-900 p-4 rounded-2xl text-left text-xs space-y-2.5 animate-fade-in shadow-sm">
                        <div className="flex items-start gap-2.5">
                          <span className="shrink-0 bg-amber-100 text-amber-800 w-5 h-5 rounded-full flex items-center justify-center font-black text-xs">💡</span>
                          <div className="space-y-1">
                            <p className="font-extrabold text-amber-950 text-xs">AI Studio Preview (Iframe Constraint):</p>
                            <p className="font-semibold leading-relaxed text-amber-800 text-[11px]">
                              सुरक्षित गूगल लॉगिन (Google Auth Pop-up) सुचारू रूप से काम कर सके, इसके लिए कृपया इस स्टोर को नीचे बटन से <strong>New Tab</strong> में खोलें।
                            </p>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-amber-200/40 flex justify-end">
                          <a 
                            href={window.location.href} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-brand-accent hover:bg-opacity-90 text-white font-black px-4 py-2 rounded-xl text-[11px] uppercase tracking-wider shadow-md transition-all shrink-0 inline-flex items-center gap-1.5"
                          >
                            <span>Open App in New Tab / नए टैब में खोलें ↗</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {loginError && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl text-left text-xs space-y-2.5 animate-fade-in shadow-sm">
                        <div className="flex items-start gap-2.5">
                          <span className="shrink-0 bg-amber-100 text-amber-800 w-5 h-5 rounded-full flex items-center justify-center font-black text-xs">!</span>
                          <div className="space-y-1">
                            <p className="font-extrabold text-amber-950">लॉगिन समस्या (Popup Warning):</p>
                            <div className="font-semibold leading-relaxed text-amber-800">
                              {loginError}
                            </div>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-amber-200/50 flex flex-col sm:flex-row gap-2 justify-between items-center">
                          <span className="text-[10px] text-amber-700/90 font-bold">💡 प्रो-टिप: नए टैब में यह समस्या तुरंत हल हो जाएगी!</span>
                          <a 
                            href={window.location.href} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-brand-accent hover:bg-opacity-90 text-white font-black px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider shadow transition-all shrink-0 inline-flex items-center gap-1.5"
                          >
                            <span>Open In New Tab ↗</span>
                          </a>
                        </div>
                      </div>
                    )}

                    <div className="bg-gray-50 border border-brand-border rounded-2xl p-4 text-left space-y-3">
                      <p className="text-[10px] uppercase font-black text-brand-accent tracking-wider">
                        🛡️ सुरक्षा और सुविधा के फायदे / Key Benefits
                      </p>
                      <ul className="space-y-2 text-[11px] font-bold text-brand-muted">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span><strong>1-Click Google Sign-in:</strong> बिना पासवर्ड अत्यंत सुरक्षित लॉगिन।</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span><strong>No Repeat Typing:</strong> आपका नाम, फ़ोन और पता सुरक्षित सहेजा जाएगा।</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span><strong>Live Tracking & Bills:</strong> अपने सभी वर्तमान और पुराने ऑर्डर की रसीदें ट्रैक करें।</span>
                        </li>
                      </ul>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        disabled={isLoggingIn}
                        onClick={handleGoogleLogin}
                        className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-md transition-all cursor-pointer text-sm hover:border-gray-400 active:scale-98 disabled:opacity-50"
                      >
                        {isLoggingIn ? (
                          <>
                            <div className="w-4 h-4 border-2 border-brand-muted border-t-transparent rounded-full animate-spin"></div>
                            <span>Logging you in... / लॉगिन हो रहा है...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                            </svg>
                            <span className="font-extrabold">Login with Google to Checkout / लॉगिन करें</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Form column */}
                    <div className={`md:col-span-3 space-y-4 ${shakeTrigger ? 'animate-bounce' : ''}`}>
                      <h4 className="font-black text-xs uppercase tracking-wider text-brand-muted border-b border-brand-border pb-1">
                        📍 Delivery details / पता विवरण
                      </h4>

                      <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                          <span className="truncate">लॉगइन: <strong className="text-brand-accent">{user.displayName || user.email}</strong></span>
                        </span>
                        <span className="text-[10px] uppercase font-black text-green-700 bg-green-100 px-1.5 py-0.5 rounded shrink-0">Verified Google Acc</span>
                      </div>

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

                        {/* Manual Address Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="sm:col-span-3 space-y-1.5">
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
                  </>
                )}
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
{/* No PIN Code needed in receipt */}
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
                  {user ? (
                    <button
                      onClick={handlePlaceOrder}
                      disabled={loading}
                      className="flex-1 bg-brand-accent text-white py-3 rounded-xl font-black text-xs md:text-sm shadow-lg hover:bg-opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? 'Placing Order...' : `Place Order (₹${subtotal})`}
                    </button>
                  ) : (
                    <button
                      onClick={handleGoogleLogin}
                      disabled={isLoggingIn}
                      className="flex-1 bg-brand-accent text-white py-3 rounded-xl font-black text-xs md:text-sm shadow-lg hover:bg-opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isLoggingIn ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Logging in... / लॉगिन हो रहा है...</span>
                        </>
                      ) : (
                        <span>Google Login / गूगल लॉगिन</span>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
