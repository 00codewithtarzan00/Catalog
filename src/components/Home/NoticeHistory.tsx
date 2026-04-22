import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Notice } from '../../types';
import Navbar from './Navbar';

import { StoreConfig } from '../../types';

interface NoticeHistoryProps {
  config?: StoreConfig;
}

export default function NoticeHistory({ config }: NoticeHistoryProps) {
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setNotices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notice)));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notices')
    );
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <Navbar onSearch={() => {}} config={config} />
      
      <main className="flex-1 px-6 md:px-10 py-12 max-w-4xl mx-auto w-full">
        <header className="mb-12 border-b-2 border-brand-accent pb-4 flex items-end justify-between">
          <div className="flex flex-col">
            <h1 className="text-4xl font-display font-black text-brand-accent uppercase tracking-tighter">
              Store Notices
            </h1>
            <p className="text-xs text-brand-muted font-medium mt-1">
              Latest updates and announcements from Raj Kirana Store
            </p>
          </div>
          <div className="text-right">
             <div className="text-[10px] uppercase font-bold text-brand-accent tracking-widest">
               Shop Status
             </div>
             <div className="text-[10px] font-bold text-brand-muted">
               Daily 6am - 8pm
             </div>
          </div>
        </header>

        <div className="space-y-12">
          {notices.map((notice) => (
            <article key={notice.id} className="animate-slide-up">
              <div className="flex items-center gap-4 mb-2">
                <span className="h-px flex-1 bg-brand-border" />
                <time className="text-xs font-mono text-brand-muted">
                  {new Date(notice.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </time>
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">{notice.title}</h2>
              <p className="text-brand-muted leading-relaxed whitespace-pre-wrap">{notice.content}</p>
            </article>
          ))}
          
          {notices.length === 0 && (
            <div className="text-center py-20 text-brand-muted italic">
              No historical notices found.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
