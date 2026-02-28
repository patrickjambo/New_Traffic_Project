import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'default', theme = 'light' }) {
    if (!isOpen) return null;

    const sizeClasses = {
        default: 'max-w-lg',
        md: 'max-w-xl',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-6xl'
    };

    const isDark = theme === 'dark';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className={`${isDark ? 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border border-cyan-500/30' : 'bg-white'} rounded-2xl shadow-2xl w-full ${sizeClasses[size] || sizeClasses.default} relative animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`flex items-center justify-between p-4 ${isDark ? 'border-b border-cyan-500/20' : 'border-b border-gray-100'}`}>
                    <h3 className={`text-lg font-bold ${isDark ? 'text-cyan-300' : 'text-gray-900'}`}>{title}</h3>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-cyan-300' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className={`p-4 overflow-y-auto ${isDark ? '' : ''}`}>
                    {children}
                </div>
            </div>
        </div>
    );
}
