// 推演模式相关的样式辅助

export const getBorderColorClass = (level) => {
  if (level === 1) return 'border-fuchsia-600 shadow-[0_0_20px_rgba(217,70,239,0.3)]';
  if (level === 2) return 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]';
  if (level === 3) return 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]';
  return 'border-slate-800 shadow-xl';
};

export const getContainerBgClass = (level) => {
  if (level === 1) return 'bg-fuchsia-50/50 shadow-[inset_0_0_40px_rgba(217,70,239,0.15)]';
  if (level === 2) return 'bg-blue-50/50 shadow-[inset_0_0_40px_rgba(59,130,246,0.15)]';
  if (level === 3) return 'bg-amber-50/50 shadow-[inset_0_0_40px_rgba(251,191,36,0.15)]';
  return '';
};

export const getBorderBaseClass = (level) => {
  if (level === 1) return 'border-fuchsia-600';
  if (level === 2) return 'border-blue-500';
  if (level === 3) return 'border-amber-400';
  return 'border-slate-800';
};

export const getHoverBgClass = (level) => {
  if (level === 1) return 'bg-fuchsia-100';
  if (level === 2) return 'bg-blue-100';
  if (level === 3) return 'bg-amber-100';
  return 'bg-[#e0f2e9]';
};
