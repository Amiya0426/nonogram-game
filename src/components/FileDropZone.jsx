import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';

/**
 * 文件拖拽 / 点击选择区域。
 * 使用 display:none 的 input + 程序化 click()，避免文件对话框关闭后
 * 浏览器滚动焦点元素导致的界面跳动。
 */
const FileDropZone = ({
  onFiles,
  multiple = false,
  accept = '.json,application/json',
  icon: Icon = UploadCloud,
  buttonText = '点击选择或拖拽文件到此处',
  hint,
}) => {
  const inputRef = useRef(null);
  const dragDepthRef = useRef(0);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (list) => {
    const files = Array.from(list || []);
    if (files.length) onFiles(files);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepthRef.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepthRef.current = 0;
        setDragging(false);
        handleFiles(e.dataTransfer?.files);
      }}
      className={`flex flex-col items-center justify-center gap-1 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors text-center select-none ${
        dragging
          ? 'border-indigo-400 bg-indigo-50'
          : 'border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = null;
        }}
      />
      <Icon className={`w-4 h-4 ${dragging ? 'text-indigo-500' : 'text-emerald-500'}`} />
      <span className="text-[10px] font-bold text-slate-600">
        {dragging ? '松开即可导入' : buttonText}
      </span>
      {hint && <span className="text-[9px] text-slate-400">{hint}</span>}
    </div>
  );
};

export default FileDropZone;
