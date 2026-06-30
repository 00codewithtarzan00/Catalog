import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  LogOut, 
  User, 
  FileText, 
  TrendingUp,
  MapPin,
  Phone,
  ArrowRight
} from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, loginAnonymously, logout, db } from '../../firebase';
import { Order } from '../../types';
import { formatPrice } from '../../lib/utils';
import GoogleLoginButton from './GoogleLoginButton';

interface CustomerOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerOrdersModal({ isOpen, onClose }: CustomerOrdersModalProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Monitor auth state changes reactive
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingUser(false);
    });
    return () => unsub();
  }, []);

  // Fetch customer orders in real-time if logged in
  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }

    setLoadingOrders(true);
    // Query without composite sorting index to avoid Firestore index requirement issues
    const ordersQuery = query(
      collection(db, 'orders'),
      where('customerUid', '==', user.uid)
    );

    const unsubOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const fetched = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Order));

        // Sort on client side: newest orders first
        fetched.sort((a, b) => b.createdAt - a.createdAt);
        setOrders(fetched);
        setLoadingOrders(false);
      },
      (error) => {
        console.error('Error fetching customer orders:', error);
        setLoadingOrders(false);
      }
    );

    return () => unsubOrders();
  }, [user]);

  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Login failed:', err);
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setLoginError(
          'लॉगिन विंडो बंद कर दी गई थी। कृपया सुनिश्चित करें कि आपका ब्राउज़र पॉपअप को ब्लॉक नहीं कर रहा है।'
        );
      } else if (code === 'auth/popup-blocked') {
        setLoginError(
          'आपके ब्राउज़र ने पॉपअप विंडो को ब्लॉक कर दिया है। कृपया पॉपअप को अनुमति दें या नीचे "बिना लॉगिन आगे बढ़ें" का उपयोग करें।'
        );
      } else {
        setLoginError(`लॉगिन असफल रहा: ${err?.message || 'अज्ञात त्रुटि'}`);
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      await loginAnonymously();
    } catch (err: any) {
      console.error('Guest Sign-in failed:', err);
      setLoginError(`अतिथि लॉगिन विफल रहा: ${err?.message || 'अज्ञात त्रुटि'}`);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const formatDate = (timestamp: number) => {
    try {
      return new Date(timestamp).toLocaleDateString('hi-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" />
            डिलीवर हो गया / Delivered
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
            <XCircle className="w-3.5 h-3.5" />
            रद्द हुआ / Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            तैयार हो रहा है / Pending
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col z-[120]"
        >
          {/* Header */}
          <div className="p-4 border-b border-brand-border bg-gray-50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-accent" />
              <h3 className="font-display font-black text-sm md:text-base text-brand-text uppercase tracking-wider">
                My Order Tracking / मेरे ऑर्डर
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 text-brand-muted" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {loadingUser ? (
              <div className="h-full flex flex-col items-center justify-center p-6 space-y-3">
                <div className="w-8 h-8 border-2 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
                <p className="text-xs text-brand-muted font-bold">लोड हो रहा है / Loading profile...</p>
              </div>
            ) : !user ? (
              /* LOGIN SCREEN */
              <div className="h-full flex flex-col justify-center items-center text-center p-4 space-y-6 animate-fade-in">
                <div className="w-16 h-16 bg-brand-accent/10 text-brand-accent rounded-full flex items-center justify-center">
                  <User className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-display font-black text-lg text-brand-text">
                    Google से बिना पासवर्ड लॉगिन करें!
                  </h4>
                  <p className="text-xs text-brand-muted font-bold leading-relaxed max-w-xs">
                    सुरक्षित लॉगिन करें और अपने ऑर्डर की लाइव स्थिति (Live Tracking), वर्तमान डिलिवरी तथा पुरानी रसीदें सीधे देखें।
                  </p>
                </div>

                <div className="bg-gray-50 border border-brand-border rounded-2xl p-4 w-full text-left space-y-3">
                  <p className="text-[10px] uppercase font-black text-brand-accent tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    फायदे / Benefits of Google Login
                  </p>
                  <ul className="space-y-2 text-xs font-bold text-brand-muted">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>बिना पासवर्ड तुरंत 1-क्लिक लॉगिन</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>ऑर्डर की लाइव स्थिति (Status) देखना</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>अगली बार के लिए पता (Address) ऑटो-फ़िल</span>
                    </li>
                  </ul>
                </div>

                {isInIframe && !loginError && (
                  <div className="bg-amber-50/60 border border-amber-200/80 text-amber-900 p-3 rounded-2xl text-left text-xs space-y-2 animate-fade-in shadow-sm w-full">
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 bg-amber-100 text-amber-800 w-5 h-5 rounded-full flex items-center justify-center font-black text-xs">💡</span>
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-amber-950 text-xs">AI Studio Preview Iframe Constraint:</p>
                        <p className="font-semibold leading-relaxed text-amber-800 text-[11px]">
                          गूगल लॉगिन सुचारू रूप से करने के लिए, आप स्टोर को <strong>New Tab</strong> में खोल सकते हैं, या नीचे दिए गए <strong>Guest Tracking</strong> का उपयोग कर सकते हैं।
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {loginError && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-2xl text-left text-xs space-y-2 animate-fade-in shadow-sm w-full">
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 bg-amber-100 text-amber-800 w-5 h-5 rounded-full flex items-center justify-center font-black text-xs">!</span>
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-amber-950">लॉगिन चेतावनी / Popup Message:</p>
                        <p className="font-semibold leading-relaxed text-amber-800 text-[11px]">
                          {loginError}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="w-full space-y-3">
                  <GoogleLoginButton
                    isLoading={loginLoading}
                    setIsLoading={setLoginLoading}
                    onSuccess={() => setLoginLoading(false)}
                    onError={(err) => {
                      console.error('Login failed:', err);
                      setLoginError(`लॉगिन असफल रहा: ${err?.message || 'अज्ञात त्रुटि'}`);
                      setLoginLoading(false);
                    }}
                  />

                  <button
                    onClick={handleGuestLogin}
                    disabled={loginLoading}
                    className="w-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent py-3 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-sm hover:bg-brand-accent/15 transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>🛡️</span>
                    <span>Continue as Guest (No Popups) / बिना लॉगिन ट्रैक करें</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ORDER LISTING FOR USER */
              <div className="space-y-4 animate-fade-in">
                {/* User Card */}
                <div className="bg-gray-50 border border-brand-border rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="w-10 h-10 rounded-full border border-brand-accent shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-brand-accent/10 text-brand-accent flex items-center justify-center shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-black text-xs md:text-sm text-brand-text truncate">
                        {user.displayName || 'Customer'}
                      </p>
                      <p className="text-[10px] text-brand-muted truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Logout / लॉगआउट"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="font-black text-[11px] uppercase tracking-wider text-brand-muted">
                    📦 Order History / कुल ऑर्डर ({orders.length})
                  </h4>
                  {loadingOrders && (
                    <div className="w-3.5 h-3.5 border-2 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
                  )}
                </div>

                {orders.length === 0 ? (
                  !loadingOrders && (
                    <div className="text-center py-12 bg-gray-50 border border-brand-border rounded-2xl p-6 space-y-3">
                      <ShoppingBag className="w-8 h-8 text-brand-muted mx-auto" />
                      <p className="text-xs text-brand-muted font-bold leading-normal">
                        आपने अभी तक कोई ऑर्डर नहीं दिया है। <br />
                        You haven't placed any orders yet.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white border border-brand-border rounded-2xl p-4 shadow-sm hover:border-brand-accent/35 transition-all space-y-3 relative group"
                      >
                        {/* Order ID & Status */}
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[10px] uppercase font-black text-brand-accent bg-brand-accent/5 px-2 py-0.5 rounded-md">
                              Order ID: #{order.id}
                            </span>
                            <p className="text-[10px] text-brand-muted font-bold mt-1">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                          <div className="shrink-0">
                            {getStatusBadge(order.status)}
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="border-t border-brand-border/60 pt-2.5">
                          <p className="text-[10px] uppercase font-bold tracking-wider text-brand-muted mb-1.5">
                            आइटम्स / Items
                          </p>
                          <div className="space-y-1 text-xs">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-brand-text font-bold">
                                <span className="truncate max-w-[200px]">
                                  {item.name} {item.quantityValue ? `(${item.quantityValue}${item.quantityUnit || ''})` : ''}
                                </span>
                                <span className="text-brand-muted">
                                  x{item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Address details */}
                        <div className="bg-gray-50 rounded-xl p-2.5 text-[11px] font-bold text-brand-muted space-y-1">
                          <p className="flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-brand-accent shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{order.customerAddress}</span>
                          </p>
                          <p className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                            <span>{order.customerPhone}</span>
                          </p>
                        </div>

                        {/* Action buttons & Total */}
                        <div className="border-t border-brand-border/60 pt-2.5 flex items-center justify-between">
                          <div className="text-xs">
                            <span className="text-brand-muted font-bold block leading-none">Total Paid</span>
                            <span className="text-brand-accent font-black text-sm leading-none mt-0.5 inline-block">
                              {formatPrice(order.totalPrice)}
                            </span>
                          </div>

                          <button
                            onClick={() => window.open(`${window.location.origin}/#/invoice/${order.id}`, '_blank')}
                            className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-black px-3 py-1.5 rounded-xl transition-colors cursor-pointer uppercase tracking-wider"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Invoice / रसीद
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
