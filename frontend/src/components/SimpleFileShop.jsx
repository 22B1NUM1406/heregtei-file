import { useState, useEffect } from 'react';
import { 
  Check, 
  Menu, 
  X, 
  FileText, 
  TrendingUp, 
  Award, 
  ChevronRight, 
  Download, 
  Clock,
  CheckCircle,
  Shield,
  Copy,
  ArrowLeft,
  CheckCheck,
  RefreshCw,
  AlertCircle,
  LogOut,
  Mail,
  Lock,
  User,
  Phone
} from 'lucide-react';

export default function SimpleFileShop() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [step, setStep] = useState('home');
  const [authMode, setAuthMode] = useState('login');
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: ''
  });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [purchaseRequest, setPurchaseRequest] = useState(null);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserProfile(token);
    }
  }, []);

  const fetchUserProfile = async (token) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        setCurrentUser(data.user);
        setIsLoggedIn(true);
        await checkPurchaseStatus(token);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      localStorage.removeItem('token');
    }
  };

  const checkPurchaseStatus = async (token) => {
    try {
      const response = await fetch(`${API_URL}/api/purchase/status`, {
        headers: { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` }
      });

      const data = await response.json();

      if (data.success && data.has_request) {
        setPurchaseRequest(data.request);
        if (data.is_premium === 1) {
          setCurrentUser(prev => ({ ...prev, is_premium: 1 }));
        }
      }
    } catch (error) {
      console.error('Purchase status error:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authForm.email, password: authForm.password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        setCurrentUser(data.user);
        setIsLoggedIn(true);
        setStep('payment');
        await checkPurchaseStatus(data.token);
      } else {
        setAuthError(data.error);
      }
    } catch (error) {
      setAuthError('Холболтын алдаа гарлаа');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        setCurrentUser(data.user);
        setIsLoggedIn(true);
        setStep('payment');
      } else {
        setAuthError(data.error);
      }
    } catch (error) {
      setAuthError('Холболтын алдаа гарлаа');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setPurchaseRequest(null);
    setStep('home');
    setAuthForm({ email: '', password: '', name: '', phone: '' });
  };

  const handlePurchaseRequest = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_URL}/api/purchase/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setPurchaseRequest(data.request);
        alert('✅ Худалдан авалтын хүсэлт илгээгдлээ! Админ шалгах болно.');
      } else {
        alert(data.error || data.message);
      }
    } catch (error) {
      alert('Алдаа гарлаа: ' + error.message);
    }
  };

  const handleDownload = async () => {
    const token = localStorage.getItem('token');
    setDownloading(true);

    try {
      const response = await fetch(`${API_URL}/api/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Хэрэгтэй-Файл-${currentUser.name}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert('✅ Файл амжилттай татагдлаа!');
    } catch (error) {
      alert('Файл татахад алдаа гарлаа: ' + error.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleManualCheck = async () => {
    setChecking(true);
    const token = localStorage.getItem('token');
    
    try {
      await checkPurchaseStatus(token);
      await fetchUserProfile(token);
      
      if (currentUser?.is_premium === 1) {
        alert('✅ Төлбөр баталгаажлаа! Файлууд татахад бэлэн.');
      } else {
        alert('⏳ Төлбөр хараахан баталгаажаагүй байна. Админ шалгаж байна...');
      }
    } catch (error) {
      alert('Шалгахад алдаа гарлаа');
    } finally {
      setChecking(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartPurchase = () => {
    if (isLoggedIn) {
      setStep('payment');
    } else {
      setStep('auth');
    }
  };

  // [REST OF THE CODE CONTINUES WITH HOME, AUTH, AND PAYMENT PAGES...]
  // Due to length, I'll create the file with all pages included

  if (step === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white">
        <nav className="bg-gray-900/90 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50 py-4 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">HF</span>
              </div>
              <span className="text-xl font-bold">
                <span className="text-blue-400">Хэрэгтэй</span> Файл
              </span>
            </div>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-slate-300 hover:text-white transition">Давуу талууд</a>
              <a href="#pricing" className="text-slate-300 hover:text-white transition">Үнэ</a>
              {isLoggedIn ? (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <User size={16} />
                    <span className="text-slate-300">{currentUser?.name}</span>
                    {currentUser?.is_premium === 1 && (
                      <span className="px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-xs rounded-full">
                        Premium
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                  >
                    <LogOut size={18} />
                    <span>Гарах</span>
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setStep('auth')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                >
                  Нэвтрэх
                </button>
              )}
              <button 
                onClick={handleStartPurchase}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-2 px-6 rounded-full transition"
              >
                Файлуудыг худалдан авах
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4">
              <div className="flex flex-col gap-4">
                <a href="#features" className="text-slate-300 hover:text-white transition">Давуу талууд</a>
                <a href="#pricing" className="text-slate-300 hover:text-white transition">Үнэ</a>
                {isLoggedIn ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <User size={16} />
                      <span className="text-slate-300">{currentUser?.name}</span>
                      {currentUser?.is_premium === 1 && (
                        <span className="px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-xs rounded-full">
                          Premium
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                    >
                      <LogOut size={18} />
                      <span>Гарах</span>
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setStep('auth')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                  >
                    Нэвтрэх
                  </button>
                )}
                <button 
                  onClick={handleStartPurchase}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-2 px-6 rounded-full transition"
                >
                  Файлуудыг худалдан авах
                </button>
              </div>
            </div>
          )}
        </nav>

        <div className="pt-20">
          <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-purple-900/10 to-indigo-900/10"></div>
            <div className="max-w-7xl mx-auto relative z-10">
              <div className="text-center mb-16">
                <h1 className="text-5xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                  Хэрэгтэй файл
                </h1>
                <p className="text-xl lg:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto">
                  Таны бизнесийн санхүүгийн тайланг мэргэжлийн түвшинд бэлтгэхэд зориулсан 50+ загвар файлууд
                </p>
                <button 
                  onClick={handleStartPurchase}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-4 px-12 rounded-full text-lg transition transform hover:scale-105 shadow-lg"
                >
                  <span className="flex items-center justify-center gap-2">
                    Файлуудыг худалдан авах <ChevronRight className="inline ml-2" size={20} />
                  </span>
                </button>
              </div>

              <div className="grid md:grid-cols-4 gap-8 mt-20">
                {[
                  { icon: FileText, number: '50+', label: 'Загвар файл' },
                  { icon: Clock, number: '80%', label: 'Цаг хэмнэлт' },
                  { icon: Award, number: 'Тогтмол', label: 'Шинэчлэлт' },
                  { icon: Shield, number: 'Баталгаатай', label: 'Стандарт' }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 text-center transform hover:scale-105 transition">
                    <stat.icon className="mx-auto mb-4 text-blue-400" size={40} />
                    <div className="text-3xl font-bold mb-2">{stat.number}</div>
                    <div className="text-slate-400">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900/30 to-slate-900/10">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-16">Манай давуу талууд</h2>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: FileText,
                    title: 'Бүрэн багц',
                    description: 'Excel, Word, PDF форматаар 50+ загвар файл',
                    features: ['Балансын тайлан', 'Орлогын тайлан', 'Мөнгөн гүйлгээний тайлан']
                  },
                  {
                    icon: TrendingUp,
                    title: 'Цаг хэмнэлт',
                    description: 'Тайлан бэлдэх цагийг 80% хэмнэнэ',
                    features: ['Автомат тооцоолол', 'Бэлэн загварууд', 'Хялбар тохируулга']
                  },
                  {
                    icon: Shield,
                    title: 'Мэргэжлийн стандарт',
                    description: 'Олон улсын санхүүгийн тайлагналын стандартад нийцсэн',
                    features: ['IFRS стандарт', 'Монгол стандарт', 'Олон улсын практик']
                  }
                ].map((service, idx) => (
                  <div key={idx} className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-8 hover:shadow-2xl hover:shadow-blue-500/20 transition">
                    <service.icon className="text-blue-400 mb-4" size={48} />
                    <h3 className="text-2xl font-bold mb-4">{service.title}</h3>
                    <p className="text-slate-300 mb-6">{service.description}</p>
                    <ul className="space-y-2">
                      {service.features.map((feature, i) => (
                        <li key={i} className="flex items-center text-slate-400">
                          <Check className="text-green-400 mr-2" size={16} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-8 lg:p-12">
                <div className="text-center mb-8">
                  <div className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-full text-sm font-bold mb-6">
                    НЭГ УДААГИЙН ТӨЛБӨР
                  </div>
                  
                  <h2 className="text-3xl font-bold mb-6">
                    Санхүүгийн тайлангийн 50+ загвар файлуудын цогц багц
                  </h2>
                  
                  <div className="flex items-baseline justify-center gap-6 mb-8">
                    <div className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      50,000₮
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {[
                    '50+ санхүүгийн тайлангийн загвар',
                    'Excel, Word, PDF форматууд',
                    'Хязгааргүй татах боломж',
                    'Тогтмол шинэчлэлт'
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 text-slate-300">
                      <CheckCircle className="text-green-400 flex-shrink-0" size={24} />
                      <span className="text-lg">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleStartPurchase}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-4 px-8 rounded-xl text-lg transition transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                >
                  <FileText size={20} />
                  Файлуудыг худалдан авах
                </button>
              </div>
            </div>
          </section>
        </div>

        <footer className="bg-gray-900/80 border-t border-slate-800 py-8 px-4">
          <div className="max-w-7xl mx-auto text-center text-slate-400">
            <p>&copy; {new Date().getFullYear()} Хэрэгтэй Файл. Бүх эрх хуулиар хамгаалагдсан.</p>
          </div>
        </footer>
      </div>
    );
  }

  if (step === 'auth') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white">
        <nav className="bg-gray-900/90 backdrop-blur-sm border-b border-slate-800 py-4 px-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button onClick={() => setStep('home')} className="flex items-center gap-2 text-slate-300 hover:text-white transition">
              <ArrowLeft size={20} /> Буцах
            </button>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">HF</span>
              </div>
              <span className="text-xl font-bold"><span className="text-blue-400">Хэрэгтэй</span> Файл</span>
            </div>
          </div>
        </nav>

        <main className="pt-20 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <User className="text-blue-400" size={40} />
                </div>
                <h2 className="text-3xl font-bold mb-3">{authMode === 'login' ? 'Нэвтрэх' : 'Бүртгүүлэх'}</h2>
              </div>

              <div className="flex gap-2 mb-6">
                <button onClick={() => setAuthMode('login')} className={`flex-1 py-2 rounded-lg transition ${authMode === 'login' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                  Нэвтрэх
                </button>
                <button onClick={() => setAuthMode('register')} className={`flex-1 py-2 rounded-lg transition ${authMode === 'register' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                  Бүртгүүлэх
                </button>
              </div>

              <form onSubmit={authMode === 'login' ? handleLogin : handleRegister}>
                <div className="space-y-4">
                  {authMode === 'register' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2"><User className="inline mr-2" size={16} />Овог нэр</label>
                        <input type="text" value={authForm.name} onChange={(e) => setAuthForm({...authForm, name: e.target.value})} className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white" placeholder="Бат Болд" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2"><Phone className="inline mr-2" size={16} />Утасны дугаар</label>
                        <input type="tel" value={authForm.phone} onChange={(e) => setAuthForm({...authForm, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white" placeholder="99887766" required />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2"><Mail className="inline mr-2" size={16} />И-мэйл</label>
                    <input type="email" value={authForm.email} onChange={(e) => setAuthForm({...authForm, email: e.target.value})} className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white" placeholder="example@email.com" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2"><Lock className="inline mr-2" size={16} />Нууц үг</label>
                    <input type="password" value={authForm.password} onChange={(e) => setAuthForm({...authForm, password: e.target.value})} className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white" placeholder="••••••••" required />
                  </div>
                  {authError && <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4"><p className="text-red-300 text-sm">{authError}</p></div>}
                  <button type="submit" disabled={authLoading} className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-4 rounded-xl disabled:opacity-50">
                    {authLoading ? 'Уншиж байна...' : (authMode === 'login' ? 'Нэвтрэх' : 'Бүртгүүлэх')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (step === 'payment' && isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white">
        <nav className="bg-gray-900/90 backdrop-blur-sm border-b border-slate-800 py-4 px-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button onClick={() => setStep('home')} className="flex items-center gap-2 text-slate-300 hover:text-white transition">
              <ArrowLeft size={20} /> Буцах
            </button>
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold">HF</span>
                </div>
                <span className="text-xl font-bold"><span className="text-blue-400">Хэрэгтэй</span> Файл</span>
              </div>
              <button onClick={handleLogout} className="p-2 hover:bg-slate-800 rounded-lg"><LogOut size={20} /></button>
            </div>
          </div>
        </nav>

        <main className="pt-20 pb-20 px-4">
          <div className="max-w-2xl mx-auto">
            {currentUser?.is_premium === 1 ? (
              <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="text-green-400" size={48} />
                </div>
                <h2 className="text-4xl font-bold mb-4">Та Premium хэрэглэгч байна!</h2>
                <button onClick={handleDownload} disabled={downloading} className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-4 px-8 rounded-xl inline-flex items-center gap-3 disabled:opacity-50">
                  {downloading ? 'Бэлтгэж байна...' : <><Download size={24} /> Файл татах</>}
                </button>
                
              </div>
              
            ) : (
              <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold">Төлбөрийн мэдээлэл</h2>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-6 space-y-4 mb-8">
                  <div className="flex justify-between pb-3 border-b border-slate-700">
                    <span className="text-slate-400">Данс</span>
                    <div className="flex gap-2">
                      <span className="font-mono font-bold">5063 3291 06</span>
                      <button onClick={() => handleCopy('5063 3291 06')} className="p-2 hover:bg-slate-800 rounded">
                        {copied ? <CheckCheck size={18} className="text-green-400" /> : <Copy size={18} />}
                      </button>
                    </div>
                    
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                    <span className="text-slate-400">Банк</span>
                    <span className="font-semibold">Хаан Банк</span>
                  </div>

                  <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                    <span className="text-slate-400">Дансны эзэмшигч</span>
                    <span className="font-semibold">Түвшинбаяр Энхбаатар</span>
                  </div>
                  <div className="flex justify-between pb-3 border-b border-slate-700">
                    <span className="text-slate-400">Дүн</span>
                    <span className="font-bold text-2xl text-blue-400">50,000₮</span>
                  </div>
                  <div className="bg-red-900/30 border border-red-800/40 rounded-lg p-4">
                    <AlertCircle className="inline mr-2 text-red-400" size={20} />
                    <span className="text-red-200">Гүйлгээний утга: <strong>{currentUser?.phone}</strong></span>
                  </div>
                </div>
                <div className="space-y-4">
                  {!purchaseRequest ? (
                    <button onClick={handlePurchaseRequest} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 rounded-xl">
                      ✓ Төлбөр төлсөн, хүсэлт илгээх
                    </button>
                  ) : (
                    <>
                      <div className={`rounded-lg p-4 ${purchaseRequest.status === 'pending' ? 'bg-amber-900/20 border-amber-800/30' : 'bg-green-900/20 border-green-800/30'}`}>
                        <p className="text-sm">{purchaseRequest.status === 'pending' ? '⏳ Хүсэлт илгээгдсэн, админ шалгаж байна' : '✅ Баталгаажлаа!'}</p>
                      </div>
                      <button onClick={handleManualCheck} disabled={checking} className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-xl flex items-center justify-center gap-2">
                        {checking ? 'Шалгаж байна...' : <><RefreshCw size={20} /> Төлөв шалгах</>}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return null;
}