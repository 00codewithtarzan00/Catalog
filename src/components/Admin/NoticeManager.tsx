import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Notice } from '../../types';
import { Plus, Trash2, Calendar } from 'lucide-react';

export default function NoticeManager() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [newNotice, setNewNotice] = useState({ title: '', content: '' });

  useEffect(() => {
    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setNotices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notice)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'notices'));
  }, []);

  const handle发布 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotice.title || !newNotice.content) return;

    try {
      await addDoc(collection(db, 'notices'), {
        ...newNotice,
        createdAt: Date.now()
      });
      setNewNotice({ title: '', content: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'notices');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this notice?')) return;
    try {
      await deleteDoc(doc(db, 'notices', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'notices');
    }
  };

  return (
    <div className="animate-fade-in">
      <header className="mb-8 border-b border-brand-border pb-4">
        <h1 className="text-3xl font-display font-bold text-brand-accent">Official Notices</h1>
        <p className="text-sm text-brand-muted mt-1">Updates, holiday announcements, and special stock news.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1">
          <form onSubmit={handle发布} className="bg-white editorial-card p-6 sticky top-10">
            <h2 className="text-lg font-display font-bold mb-4">Post New Notice</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-brand-muted">Headline</label>
                <input
                  required
                  className="editorial-input"
                  placeholder="e.g. Sunday Store Hours"
                  value={newNotice.title}
                  onChange={e => setNewNotice({ ...newNotice, title: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-brand-muted">Notice Content</label>
                <textarea
                  required
                  className="editorial-input min-h-[120px]"
                  placeholder="Full description of the update..."
                  value={newNotice.content}
                  onChange={e => setNewNotice({ ...newNotice, content: e.target.value })}
                />
              </div>
              <button type="submit" className="w-full editorial-btn-primary flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Post Announcement
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xs uppercase tracking-widest font-bold text-brand-muted mb-4 flex items-center gap-2">
             Notice Timeline
          </h2>
          
          {notices.map((n, idx) => (
            <div key={n.id} className={`bg-white editorial-card p-6 relative ${idx === 0 ? 'border-l-4 border-l-brand-accent shadow-md' : ''}`}>
              {idx === 0 && <span className="absolute top-2 right-4 text-[10px] font-bold text-brand-accent bg-green-50 px-2 py-0.5 rounded-sm">Current Active</span>}
              <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase mb-2">
                <Calendar className="w-3 h-3" />
                {new Date(n.createdAt).toLocaleString()}
              </div>
              <h3 className="text-xl font-display font-bold mb-2">{n.title}</h3>
              <p className="text-sm text-brand-muted whitespace-pre-wrap">{n.content}</p>
              
              <div className="mt-4 pt-4 border-t border-gray-50 flex justify-end">
                <button
                  onClick={() => handleDelete(n.id)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
