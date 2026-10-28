import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  iconClass?: string;
  iconColorClass?: string;
  confirmText: string;
  cancelText: string;
  confirmBtnClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  iconClass = 'fa-circle-question',
  iconColorClass = 'text-red-500',
  confirmText,
  cancelText,
  confirmBtnClass = 'bg-red-600 hover:bg-red-700 text-white',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 text-center">
        <div className={`${iconColorClass} text-4xl mb-3`}>
          <i className={`fa-solid ${iconClass}`}></i>
        </div>
        <h3 className="text-lg font-bold text-stone-900 mb-2 japanese-font">{title}</h3>
        <p className="text-stone-500 text-sm mb-6 leading-relaxed whitespace-pre-line">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2 px-4 rounded-lg transition-colors text-sm font-bold cursor-pointer ${confirmBtnClass}`}
          >
            {confirmText}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2 px-4 rounded-lg transition-colors text-sm cursor-pointer"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};
