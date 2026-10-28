import React from 'react';

interface CustomAlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  iconClass?: string;
  iconColorClass?: string;
  onClose: () => void;
}

export const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
  isOpen,
  title,
  message,
  iconClass = 'fa-circle-info',
  iconColorClass = 'text-amber-700',
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 text-center">
        <div className={`${iconColorClass} text-4xl mb-3`}>
          <i className={`fa-solid ${iconClass}`}></i>
        </div>
        <h3 className="text-lg font-bold text-stone-900 mb-2 japanese-font">{title}</h3>
        <p className="text-stone-500 text-xs mb-6 leading-relaxed whitespace-pre-line">{message}</p>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="bg-amber-900 hover:bg-amber-950 text-white font-bold py-2 px-6 rounded-lg transition-colors text-sm cursor-pointer shadow-sm"
          >
            確認
          </button>
        </div>
      </div>
    </div>
  );
};
