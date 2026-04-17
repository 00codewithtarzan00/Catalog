import { Link } from 'react-router-dom';
import { Notice } from '../../types';

interface NoticeAreaProps {
  currentNotice: Notice | null;
}

export default function NoticeArea({ currentNotice }: NoticeAreaProps) {
  return (
    <section className="bg-white border-b border-brand-border py-6 px-6 md:px-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex-1">
        <div className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] font-bold text-gray-400 mb-1">
          Notices
        </div>

        {currentNotice ? (
          <div className="animate-slide-up">
            <h4 className="text-lg md:text-xl font-display font-bold text-brand-accent">
              {currentNotice.title}
            </h4>
            <p className="text-sm md:text-base text-brand-muted mt-1 leading-relaxed">
              {currentNotice.content}
            </p>
          </div>
        ) : (
          <div>
            <h4 className="text-lg md:text-xl font-display font-bold text-brand-accent leading-none">
              Shop Status
            </h4>
            <p className="text-sm md:text-base text-brand-muted mt-1 italic">
              Opens daily (Sunday - Monday) : 6am - 8pm
            </p>
          </div>
        )}
      </div>

      <div className="flex-shrink-0">
        <Link
          to="/notices"
          className="editorial-btn-secondary inline-block whitespace-nowrap"
        >
          Previous Notices
        </Link>
      </div>
    </section>
  );
}
