import React from 'react';
import { ShieldQuestion, AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface CustomAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  alertType: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

const alertIcons = {
  success: <CheckCircle className="h-6 w-6 text-green-600" aria-hidden="true" />,
  error: <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />,
  warning: <AlertTriangle className="h-6 w-6 text-yellow-600" aria-hidden="true" />,
  info: <Info className="h-6 w-6 text-blue-600" aria-hidden="true" />,
  confirm: <ShieldQuestion className="h-6 w-6 text-indigo-600" aria-hidden="true" />,
};

const alertIconBgs = {
    success: 'bg-green-100',
    error: 'bg-red-100',
    warning: 'bg-yellow-100',
    info: 'bg-blue-100',
    confirm: 'bg-indigo-100',
}

const CustomAlertModal: React.FC<CustomAlertModalProps> = ({ 
    isOpen, 
    onClose, 
    title, 
    message, 
    alertType, 
    onConfirm, 
    confirmText = 'Onayla', 
    cancelText = 'Vazgeç' 
}) => {
  if (!isOpen) return null;

  const isConfirm = alertType === 'confirm';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full transform transition-all duration-300 scale-95 opacity-0 animate-modal-in">
        <div className="p-6">
          <div className="flex items-start">
            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${alertIconBgs[alertType]} sm:mx-0 sm:h-10 sm:w-10`}>
              {alertIcons[alertType]}
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">{message}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-xl">
          {isConfirm ? (
            <>
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => {
                  if(onConfirm) onConfirm();
                  onClose();
                }}
              >
                {confirmText}
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                onClick={onClose}
              >
                {cancelText}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Tamam
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomAlertModal;
