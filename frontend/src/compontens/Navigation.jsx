import { LogOut, Menu, X, ArrowLeft } from 'lucide-react';
import { useState } from 'react';

export default function Navigation({ user, onLogout, onBack, showBack = false, isPurchasePage = false }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-gray-900/90 backdrop-blur-sm fixed w-full z-50 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {isPurchasePage && showBack ? (
              <button
                onClick={onBack}
                className="flex items-center text-blue-400 hover:text-blue-300 transition mr-4"
              >
                <ArrowLeft size={20} className="mr-2" />
                Буцах
              </button>
            ) : (
              <div className="flex items-center cursor-pointer">
                <span className="text-2xl font-bold">
                  <span className="text-blue-400">Хэрэгтэй</span> Файл
                </span>
              </div>
            )}
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {user?.is_paid && (
              <div className="flex items-center space-x-2 mr-4">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-400">Premium</span>
              </div>
            )}
            <div className="text-sm bg-slate-800/60 px-3 py-1 rounded-full">
              {user?.email}
            </div>
            <button
              onClick={onLogout}
              className="flex items-center text-slate-300 hover:text-white transition"
            >
              <LogOut size={18} className="mr-2" />
              Гарах
            </button>
          </div>

          {/* Mobile menu button */}
          <button 
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-gray-900/95 border-t border-slate-700">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {user?.is_paid && (
              <div className="flex items-center space-x-2 px-3 py-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-400">Premium</span>
              </div>
            )}
            <div className="px-3 py-2 text-sm text-slate-300">
              {user?.email}
            </div>
            <button 
              onClick={onLogout}
              className="flex items-center w-full text-left px-3 py-2 hover:bg-slate-800 rounded text-slate-300"
            >
              <LogOut size={18} className="mr-2" />
              Гарах
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}