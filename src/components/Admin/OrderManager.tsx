import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Order } from '../../types';
import { formatPrice } from '../../lib/utils';
import { ShoppingBag, Clock, CheckCircle2, XCircle, Trash2, MapPin, Mail, Phone, User, Calendar, ExternalLink, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function OrderManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'pending' | 'completed' | 'cancelled' | 'all'>('pending');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const ordersData: Order[] = [];
      snap.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() } as Order);
      });
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: 'pending' | 'completed' | 'cancelled') => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
    } catch (err) {
      console.error('Error updating status: ', err);
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Error deleting order: ', err);
      handleFirestoreError(err, OperationType.DELETE, `orders/${orderId}`);
    }
  };

  const sendWhatsAppNotification = (order: Order, type: 'placed' | 'delivered' | 'custom' | 'bill') => {
    const cleanPhone = order.customerPhone.replace(/\D/g, '');
    const itemsText = order.items
      .map((item) => `• *${item.name}* (${item.quantityValue || ''} ${item.quantityUnit || ''}) x ${item.quantity} = ₹${item.quantity * item.price}`)
      .join('\n');
      
    let message = '';
    if (type === 'placed') {
      message = `*🛒 RAJ KIRANA STORE - ORDER RECEIVED*\n\n` +
        `Hello *${order.customerName}*,\n` +
        `Thank you for your order! We have successfully received your order *#${order.id?.toUpperCase()}*.\n\n` +
        `*Items Ordered:*\n${itemsText}\n\n` +
        `*Total Price:* ₹${order.totalPrice}\n` +
        `*Address:* ${order.customerAddress}\n\n` +
        `We are preparing your items for fast delivery. Stay tuned!`;
    } else if (type === 'delivered') {
      message = `*🚚 RAJ KIRANA STORE - ORDER DELIVERED*\n\n` +
        `Hello *${order.customerName}*,\n` +
        `Great news! Your order *#${order.id?.toUpperCase()}* has been successfully delivered to your address.\n\n` +
        `Thank you for shopping with us! Please order again soon. 🙏`;
    } else if (type === 'bill') {
      const invoiceUrl = `${window.location.origin}/#/invoice/${order.id}`;
      message = `*🧾 RAJ KIRANA STORE - INVOICE*\n\n` +
        `*Order ID:* #${order.id?.toUpperCase()}\n` +
        `*Customer:* ${order.customerName}\n` +
        `*Address:* ${order.customerAddress}\n\n` +
        `*ITEMS:*\n${itemsText}\n\n` +
        `*TOTAL AMOUNT:* ₹${order.totalPrice}\n\n` +
        `*Download/View Bill:* ${invoiceUrl}\n\n` +
        `Thank you for your order! 🙏`;
    } else {
      message = `*💬 RAJ KIRANA STORE*\n\nHello *${order.customerName}*, regarding your order *#${order.id?.toUpperCase()}*: `;
    }

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-green-200">
            <CheckCircle2 className="w-3 h-3" /> Placed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-200">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200">
            <Clock className="w-3 h-3 animate-pulse" /> Pending
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-brand-muted text-sm font-semibold">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-brand-text">Manage Customer Orders</h2>
          <p className="text-sm text-brand-muted mt-1">Tick checklist to place pending orders. Click customer name for full details.</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl border border-brand-border shrink-0 max-w-fit">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'pending' ? 'bg-white text-brand-accent shadow' : 'text-brand-muted'}`}
          >
            Pending ({orders.filter(o => o.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'completed' ? 'bg-white text-brand-accent shadow' : 'text-brand-muted'}`}
          >
            Completed ({orders.filter(o => o.status === 'completed').length})
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'cancelled' ? 'bg-white text-brand-accent shadow' : 'text-brand-muted'}`}
          >
            Cancelled ({orders.filter(o => o.status === 'cancelled').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'all' ? 'bg-white text-brand-accent shadow' : 'text-brand-muted'}`}
          >
            All ({orders.length})
          </button>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-brand-border space-y-3 shadow-sm">
          <div className="w-14 h-14 bg-gray-50 border border-brand-border rounded-full flex items-center justify-center mx-auto text-brand-muted">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <p className="text-brand-muted text-sm font-medium">No {filter !== 'all' ? filter : ''} orders found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-white rounded-xl border border-brand-border overflow-hidden shadow-sm hover:border-brand-accent/30 transition-all"
                >
                  {/* Order Row Header */}
                  <div className="p-4 flex items-center justify-between gap-3 select-none">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Checkbox button to Place/Revert order */}
                      {order.status === 'pending' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateStatus(order.id!, 'completed');
                          }}
                          className="w-6 h-6 rounded-lg border-2 border-brand-border hover:border-green-500 hover:bg-green-50 flex items-center justify-center text-transparent hover:text-green-600 transition-all shrink-0 cursor-pointer"
                          title="Click to place/complete order"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateStatus(order.id!, 'pending');
                          }}
                          className="w-6 h-6 rounded-lg bg-green-500 border-2 border-green-500 flex items-center justify-center text-white transition-all shrink-0 cursor-pointer"
                          title="Click to revert to pending"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Customer Name trigger */}
                      <button
                        onClick={() => toggleExpand(order.id!)}
                        className="text-left font-bold text-brand-text hover:text-brand-accent transition-colors truncate focus:outline-none flex-1 py-1 cursor-pointer flex items-center gap-2"
                      >
                        <span className="truncate">{order.customerName}</span>
                        {getStatusBadge(order.status)}
                      </button>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-xs font-mono text-brand-muted bg-gray-50 border border-brand-border px-1.5 py-0.5 rounded hidden sm:inline">
                        #{order.id?.toUpperCase()}
                      </span>
                      <span className="text-sm font-black text-brand-accent">
                        {formatPrice(order.totalPrice)}
                      </span>
                      <button
                        onClick={() => toggleExpand(order.id!)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-brand-muted transition-colors cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Accordion Expansion View */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-brand-border bg-gray-50/40"
                      >
                        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 text-sm text-brand-text">
                          {/* Left Panel: Contact info */}
                          <div className="lg:col-span-5 space-y-4 border-b lg:border-b-0 lg:border-r border-brand-border pb-5 lg:pb-0 lg:pr-6">
                            <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                              Customer Contact & Route
                            </h4>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-brand-muted shrink-0" />
                                <span className="font-bold">{order.customerName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-brand-muted shrink-0" />
                                <div className="flex items-center gap-2">
                                  <a href={`tel:${order.customerPhone}`} className="hover:underline hover:text-brand-accent font-semibold text-xs break-all">
                                    {order.customerPhone}
                                  </a>
                                  <button
                                    onClick={() => sendWhatsAppNotification(order, 'custom')}
                                    className="p-1 text-emerald-500 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                    title="Send Custom WhatsApp Message"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-brand-muted shrink-0 mt-0.5" />
                                <div className="text-xs leading-relaxed flex flex-col">
                                  <span>{order.customerAddress}</span>
                                  {order.customerPincode && (
                                    <span className="font-bold text-brand-muted mt-0.5">PIN Code: {order.customerPincode}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-brand-muted">
                                <Calendar className="w-4 h-4 shrink-0" />
                                <span>
                                  {new Date(order.createdAt).toLocaleString(undefined, {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right Panel: Ordered items table */}
                          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                            <div className="space-y-2">
                              <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                                Order Items ({order.items.reduce((s, i) => s + i.quantity, 0)})
                              </h4>
                              <div className="divide-y divide-gray-100 max-h-40 overflow-y-auto pr-1">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center py-2 text-xs">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="w-5 h-5 bg-gray-100 border border-brand-border rounded text-[9px] font-bold text-brand-muted flex items-center justify-center shrink-0">
                                        {item.quantity}x
                                      </span>
                                      <span className="font-bold text-brand-text truncate">{item.name}</span>
                                      {item.quantityValue && (
                                        <span className="text-[10px] text-brand-muted font-medium shrink-0">
                                          ({item.quantityValue} {item.quantityUnit || 'g'})
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-semibold text-brand-muted shrink-0 pl-3">
                                      {formatPrice(item.price * item.quantity)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="border-t border-brand-border pt-4 flex items-center justify-between gap-4 overflow-hidden">
                              <div className="flex items-center gap-2 shrink-0">
                                {confirmDeleteId === order.id ? (
                                  <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 p-1 rounded-xl animate-fade-in shrink-0">
                                    <span className="text-[10px] font-bold text-red-700 px-1.5">Confirm?</span>
                                    <button
                                      onClick={() => handleDeleteOrder(order.id!)}
                                      className="bg-red-600 text-white px-2.5 py-1 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="bg-white border border-brand-border text-brand-muted px-2 py-1 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeleteId(order.id!)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 flex items-center gap-1 text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
                                    title="Delete Permanent Log"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap overflow-x-auto no-scrollbar scrollbar-hide py-1 max-w-full">
                                <button
                                  onClick={() => sendWhatsAppNotification(order, 'bill')}
                                  className="bg-brand-accent/10 text-brand-accent border border-brand-accent/20 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-brand-accent/20 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                                  title="Send Bill/Invoice on WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" /> Send Bill
                                </button>
                                {order.status === 'pending' ? (
                                  <>
                                    <button
                                      onClick={() => sendWhatsAppNotification(order, 'placed')}
                                      className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                                      title="Notify Order Received on WhatsApp"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" /> Received
                                    </button>
                                    <button
                                      onClick={() => handleUpdateStatus(order.id!, 'cancelled')}
                                      className="bg-red-50 text-red-600 border border-red-200 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors whitespace-nowrap shrink-0"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleUpdateStatus(order.id!, 'completed')}
                                      className="bg-green-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap shrink-0"
                                    >
                                      Place Order
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {order.status === 'completed' && (
                                      <button
                                        onClick={() => sendWhatsAppNotification(order, 'delivered')}
                                        className="bg-emerald-600 text-white border border-emerald-700 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1 cursor-pointer shadow-sm whitespace-nowrap shrink-0"
                                        title="Notify Order Delivered on WhatsApp"
                                      >
                                        <MessageCircle className="w-3.5 h-3.5" /> Delivered
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleUpdateStatus(order.id!, 'pending')}
                                      className="bg-white border border-brand-border text-brand-muted px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors whitespace-nowrap shrink-0"
                                    >
                                      Revert
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
