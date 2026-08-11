import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

/** 折叠面板 */
const Accordion = ({ title, icon: Icon, defaultOpen = false, testId, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-slate-200 shrink-0 overflow-hidden flex flex-col shadow-sm">
      <button
        data-testid={testId}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors border-b border-transparent data-[open=true]:border-slate-200"
        data-open={isOpen}
      >
        <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
          {Icon && <Icon className="w-4 h-4 text-indigo-500" />} {title}
        </div>
        <ChevronRight
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>
      {isOpen && <div className="p-4 flex flex-col gap-4 bg-white border-t border-slate-100">{children}</div>}
    </div>
  );
};

export default Accordion;
