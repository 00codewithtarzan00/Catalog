import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Order } from '../../types';
import { formatPrice } from '../../lib/utils';
import { Loader2, Printer } from 'lucide-react';

export default function InvoicePage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        if (!id) return;
        const docRef = doc(db, 'orders', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
        } else {
          setError('Order not found');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h2>
          <p className="text-gray-500">{error || 'Order not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Raj Kirana Store</h1>
            <p className="text-gray-500 text-sm">Invoice / Bill</p>
          </div>
          <button
            onClick={() => window.print()}
            className="print:hidden flex items-center gap-2 bg-brand-accent text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-accent/90 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Customer Details</h3>
            <p className="text-gray-600">{order.customerName}</p>
            <p className="text-gray-600">{order.customerPhone}</p>
            <p className="text-gray-600 mt-1">{order.customerAddress}</p>
          </div>
          <div className="text-right">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Order Details</h3>
            <p className="text-gray-600">ID: #{order.id?.toUpperCase()}</p>
            <p className="text-gray-600">Date: {new Date(order.createdAt).toLocaleDateString()}</p>
            <p className="text-gray-600">Status: <span className="capitalize">{order.status}</span></p>
          </div>
        </div>

        <div className="mb-8">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 text-sm text-gray-500">
                <th className="pb-3 font-medium">Item</th>
                <th className="pb-3 font-medium">Qty</th>
                <th className="pb-3 font-medium text-right">Price</th>
                <th className="pb-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-4 text-gray-900 font-medium">
                    {item.name}
                    {item.quantityValue && (
                      <span className="block text-xs text-gray-500 mt-0.5">
                        {item.quantityValue} {item.quantityUnit}
                      </span>
                    )}
                  </td>
                  <td className="py-4 text-gray-600">{item.quantity}</td>
                  <td className="py-4 text-gray-600 text-right">{formatPrice(item.price)}</td>
                  <td className="py-4 text-gray-900 font-medium text-right">{formatPrice(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-100">
                <td colSpan={3} className="pt-4 text-right font-bold text-gray-900">Total Amount</td>
                <td className="pt-4 text-right font-bold text-brand-accent text-lg">
                  {formatPrice(order.totalPrice)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="text-center text-sm text-gray-500 pt-8 border-t border-gray-100">
          <p>Thank you for shopping with Raj Kirana Store!</p>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white; }
          .max-w-3xl { box-shadow: none; border: none; padding: 0; max-width: 100%; }
        }
      `}} />
    </div>
  );
}
