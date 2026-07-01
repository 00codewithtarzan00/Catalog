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
import { auth, loginWithGoogle, logout, db } from '../../firebase';
import firebaseAppletConfig from '../../../firebase-applet-config.json';
import { Order } from '../../types';
import { formatPrice } from '../../lib/utils';

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
  const [loginError, setLoginError] = useState<React.ReactNode | null>(null);
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
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        console.warn('Login popup closed/cancelled by user:', err);
      } else {
        console.error('Login failed:', err);
      }
      if (code === 'auth/popup-closed-by-user') {
        setLoginError(
          'लॉगिन विंडो बंद कर दी गई थी। कृपया सुनिश्चित करें कि आपका ब्राउज़र पॉपअप को ब्लॉक नहीं कर रहा है।'
        );
      } else if (code === 'auth/popup-blocked') {
        setLoginError(
          'आपके ब्राउज़र ने पॉपअप विंडो को ब्लॉक कर दिया है। कृपया पॉपअप को अनुमति दें या नीचे "बिना लॉगिन आगे बढ़ें" का उपयोग करें।'
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
              💡 <strong>त्वरित समाधान (Quick Option):</strong> आप नीचे दिए गए <strong>Guest Tracking (अतिथि लॉगिन)</strong> विकल्प का उपयोग करके तुरंत बिना किसी सेटअप के आगे बढ़ सकते हैं!
            </p>
          </div>
        );
      } else {
        setLoginError(`लॉगिन असफल रहा: ${err?.message || 'अज्ञात त्रुटि'}`);
      }
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
      return new Date(timestamp).toLocaleString('hi-IN', {
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
                        <div className="font-semibold leading-relaxed text-amber-800 text-[11px]">
                          {loginError}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="w-full space-y-3">
                  <button
                    onClick={handleGoogleLogin}
                    disabled={loginLoading}
                    className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-bold text-sm shadow-md hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>{loginLoading ? 'लॉगिन हो रहा है...' : 'Login with Google / गूगल लॉगिन'}</span>
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
                        <div className="border-t border-brand-border/60 pt-2.5 flex items-center justify-between gap-2">
                          <div className="text-xs min-w-0">
                            <span className="text-brand-muted font-bold block leading-none">Total Paid</span>
                            <span className="text-brand-accent font-black text-sm leading-none mt-0.5 inline-block">
                              {formatPrice(order.totalPrice)}
                            </span>
                          </div>

                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => {
                                const msg = `Hi, I have a question regarding my Order #${order.id} at Raj Kirana Store.`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                              }}
                              className="inline-flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-black px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer uppercase tracking-wider"
                            >
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.114-2.904-6.99C16.458 1.875 13.983 1.85 12.016 1.85c-5.434 0-9.858 4.42-9.863 9.864-.001 1.73.457 3.418 1.328 4.904L2.474 21.56l5.173-1.356z" />
                              </svg>
                              Support / सहायता
                            </button>

                            <button
                              onClick={() => window.open(`${window.location.origin}/#/invoice/${order.id}`, '_blank')}
                              className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-black px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer uppercase tracking-wider"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Invoice / रसीद
                            </button>
                          </div>
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
