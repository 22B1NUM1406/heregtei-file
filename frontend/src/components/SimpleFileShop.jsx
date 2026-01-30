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
  Smartphone,
  AlertCircle
} from 'lucide-react';

export default function SimpleFileShop() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [step, setStep] = useState('home');
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    name: ''
  });
  const [orderData, setOrderData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);

  const API_URL = '/api';

  // ============ ШИНЭЧЛЭЛТ: Component ачаалахад localStorage шалгах ============
  useEffect(() => {
    const initializeOrder = async () => {
      const savedOrderId = localStorage.getItem('currentOrderId');
      
      if (savedOrderId) {
        console.log('📦 Хадгалсан захиалга олдлоо:', savedOrderId);
        await fetchOrderDetails(savedOrderId);
      } else {
        setLoading(false);
      }
    };

    initializeOrder();
  }, []);

  // ============ Захиалгын дэлгэрэнгүй татах ============
  const fetchOrderDetails = async (orderId) => {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}`);
      const data = await response.json();

      if (data.success) {
        setOrderData(data);
        
        // Төлбөр баталгаажсан эсэхийг шалгах
        if (data.payment_verified === 1) {
          setStep('download');
          setPaymentStatus('paid');
          stopStatusPolling();
        } else if (data.status === 'rejected') {
          setStep('payment');
          setPaymentStatus('rejected');
        } else {
          setStep('payment');
          setPaymentStatus('pending');
          startStatusPolling(orderId);
        }
      } else {
        // Захиалга олдохгүй бол localStorage цэвэрлэх
        localStorage.removeItem('currentOrderId');
        setStep('home');
      }
    } catch (error) {
      console.error('Захиалга татахад алдаа:', error);
      localStorage.removeItem('currentOrderId');
      setStep('home');
    } finally {
      setLoading(false);
    }
  };

  // ============ Шинэ захиалга үүсгэх ============
  const handleFormSubmit = async () => {
    setFormError('');
    
    // Validation
    if (!formData.name || !formData.phone || !formData.email) {
      setFormError('Бүх талбарыг бөглөнө үү');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setOrderData(data.order);
        // ============ ШИНЭЧЛЭЛТ: localStorage-д хадгалах ============
        localStorage.setItem('currentOrderId', data.order.order_id);
        setStep('payment');
        startStatusPolling(data.order.order_id);
      } else {
        setFormError(data.error || 'Алдаа гарлаа');
      }
    } catch (error) {
      setFormError('Холболтын алдаа гарлаа');
      console.error('Error:', error);
    }
  };

  // ============ Төлбөрийн төлөв шалгах ============
  const checkPaymentStatus = async (orderId) => {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}`);
      const data = await response.json();

      if (!data.success) {
        return false;
      }

      const isPaid = data.payment_verified === 1;
      setPaymentStatus(isPaid ? 'paid' : data.status || 'pending');
      
      if (isPaid) {
        setOrderData(data);
        setStep('download');
        stopStatusPolling();
        return true;
      }
      
      // Status өөрчлөгдсөн эсэхийг шалгах
      if (data.status === 'rejected') {
        setPaymentStatus('rejected');
      }
      
      return false;
    } catch (error) {
      console.error('Төлөв шалгах алдаа:', error);
      return false;
    }
  };

  // ============ Автомат polling ============
  let pollingInterval = null;

  const startStatusPolling = (orderId) => {
    checkPaymentStatus(orderId);
    pollingInterval = setInterval(() => {
      checkPaymentStatus(orderId);
    }, 10000); // 10 секунд тутам
  };

  const stopStatusPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };

  // ============ Гараар шалгах ============
  const handleManualCheck = async () => {
    if (!orderData?.order_id) return;

    setChecking(true);
    try {
      const verified = await checkPaymentStatus(orderData.order_id);
      
      if (verified) {
        alert('✅ Төлбөр баталгаажлаа! Файлууд татахад бэлэн.');
      } else {
        alert('Төлбөр хараахан баталгаажаагүй байна. Админ шалгаж байна...');
      }
    } catch (error) {
      alert('Шалгахад алдаа гарлаа');
    }
    setChecking(false);
  };

  // ============ Файл татах ============
  const handleDownload = async () => {
    if (!orderData?.order_id) return;

    setDownloading(true);
    try {
      const response = await fetch(`${API_URL}/download/${orderData.order_id}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Файл татахад алдаа гарлаа');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Хэрэгтэй-Файл-${orderData.order_id}.zip`;
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

  // ============ Шинэ захиалга эхлүүлэх ============
  const handleNewOrder = () => {
    localStorage.removeItem('currentOrderId');
    stopStatusPolling();
    setOrderData(null);
    setFormData({ phone: '', email: '', name: '' });
    setStep('home');
    setPaymentStatus('pending');
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Cleanup
  useEffect(() => {
    return () => stopStatusPolling();
  }, []);

  // ============ LOADING STATE ============
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Уншиж байна...</p>
        </div>
      </div>
    );
  }

  // ============ HOME PAGE ============
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
              <button 
                onClick={() => setStep('form')}
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
                <button 
                  onClick={() => setStep('form')}
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
                  onClick={() => setStep('form')}
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

          {/* Features & Pricing sections remain the same */}
          
        </div>

        <footer className="bg-gray-900/80 border-t border-slate-800 py-8 px-4">
          <div className="max-w-7xl mx-auto text-center text-slate-400">
            <p>&copy; {new Date().getFullYear()} Хэрэгтэй Файл. Бүх эрх хуулиар хамгаалагдсан.</p>
          </div>
        </footer>
      </div>
    );
  }

  // ============ FORM PAGE ============
  if (step === 'form') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white">
        <nav className="bg-gray-900/90 backdrop-blur-sm border-b border-slate-800 py-4 px-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              onClick={handleNewOrder}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition"
            >
              <ArrowLeft size={20} />
              <span>Буцах</span>
            </button>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">HF</span>
              </div>
              <span className="text-xl font-bold">
                <span className="text-blue-400">Хэрэгтэй</span> Файл
              </span>
            </div>
          </div>
        </nav>

        <main className="pt-20 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-8 lg:p-12">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="text-blue-400" size={40} />
                </div>
                <h2 className="text-3xl font-bold mb-3">Холбоо барих мэдээлэл</h2>
                <p className="text-slate-300">Төлбөрийн мэдээллийг таньд илгээхийн тулд</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Овог нэр *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Бат Болд"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Smartphone className="inline mr-2" size={16} />
                    Утасны дугаар * (Гүйлгээний утга болно)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="99887766"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Энэ утасны дугаар нь гүйлгээний утга болно
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    И-мэйл хаяг *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="example@email.com"
                  />
                </div>

                {formError && (
                  <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4">
                    <p className="text-red-300 text-sm">{formError}</p>
                  </div>
                )}

                <button
                  onClick={handleFormSubmit}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-4 px-8 rounded-xl text-lg transition transform hover:scale-105 shadow-lg"
                >
                  Үргэлжлүүлэх
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ============ PAYMENT PAGE ============
  if (step === 'payment' && orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white">
        <nav className="bg-gray-900/90 backdrop-blur-sm border-b border-slate-800 py-4 px-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              onClick={handleNewOrder}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition"
            >
              <ArrowLeft size={20} />
              <span>Шинэ захиалга</span>
            </button>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">HF</span>
              </div>
              <span className="text-xl font-bold">
                <span className="text-blue-400">Хэрэгтэй</span> Файл
              </span>
            </div>
          </div>
        </nav>

        <main className="pt-20 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-8 lg:p-12">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="text-green-400" size={40} />
                </div>
                <h2 className="text-3xl font-bold mb-3">Төлбөрийн мэдээлэл</h2>
                <p className="text-slate-300">Дараах мэдээллийг ашиглан төлбөрөө төлнө үү</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="bg-slate-900/60 rounded-xl p-6 space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                    <span className="text-slate-400">Дансны дугаар</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-lg">5063 3291 06</span>
                      <button
                        onClick={() => handleCopy('5063329106')}
                        className="p-2 hover:bg-slate-800 rounded-lg transition"
                      >
                        {copied ? <CheckCheck size={18} className="text-green-400" /> : <Copy size={18} className="text-slate-400" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                    <span className="text-slate-400">Банк</span>
                    <span className="font-semibold">Хаан Банк</span>
                  </div>

                  <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                    <span className="text-slate-400">Дансны эзэн</span>
                    <span className="font-semibold">Түвшинбаяр Энхбаатар</span>
                  </div>

                  <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                    <span className="text-slate-400">Дүн</span>
                    <span className="font-bold text-2xl text-blue-400">50,000₮</span>
                  </div>

                  <div className="bg-red-900/30 border border-red-800/40 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                      <div>
                        <h4 className="font-bold text-red-300 mb-1">ЧУХАЛ!</h4>
                        <p className="text-sm text-red-200">
                          Гүйлгээний утга дээр <span className="font-bold text-white">{orderData.phone}</span> бичнэ үү!
                        </p>
                        <p className="text-xs text-red-300 mt-2">
                          Админ таны гүйлгээг энэ утасны дугаараар шалгана
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-blue-300">
                    📱 Таны холбоо барих мэдээлэл:
                  </p>
                  <div className="text-sm text-slate-300 space-y-1 ml-4">
                    <p>• Нэр: <span className="font-semibold">{orderData.name}</span></p>
                    <p>• Утас (гүйлгээний утга): <span className="font-semibold">{orderData.phone}</span></p>
                    <p>• И-мэйл: <span className="font-semibold">{orderData.email}</span></p>
                    <p>• Захиалгын дугаар: <span className="font-semibold text-blue-400">{orderData.order_id}</span></p>
                  </div>
                </div>

                {paymentStatus === 'rejected' && (
                  <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4">
                    <p className="text-red-300">
                      ❌ Төлбөр татгалзагдсан. Шалтгаан шалгана уу.
                    </p>
                  </div>
                )}

                <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4">
                  <p className="text-sm text-green-300">
                    ✨ Төлбөр төлсний дараа админ шалгаад файл татахад бэлэн болно. 
                    Доорх товчоор шалгана уу.
                  </p>
                </div>

                <div className="bg-amber-900/20 border border-amber-800/30 rounded-lg p-4">
                  <p className="text-sm text-amber-300">
                    ⏳ Админы шалгалт хийхэд 5-10 минут шаардагдана
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleManualCheck}
                  disabled={checking}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-8 rounded-xl text-lg transition transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {checking ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Шалгаж байна...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={20} />
                      Төлбөрийн төлөв шалгах
                    </>
                  )}
                </button>

                <div className="text-center">
                  <p className="text-sm text-slate-400">
                    Төлөв: <span className={`font-semibold ${
                      paymentStatus === 'paid' ? 'text-green-400' :
                      paymentStatus === 'rejected' ? 'text-red-400' :
                      'text-amber-400'
                    }`}>
                      {paymentStatus === 'paid' ? '✅ Баталгаажсан' :
                       paymentStatus === 'rejected' ? '❌ Татгалзсан' :
                       '⏳ Хүлээгдэж байна'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ============ DOWNLOAD PAGE ============
  if (step === 'download' && orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white">
        <nav className="bg-gray-900/90 backdrop-blur-sm border-b border-slate-800 py-4 px-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              onClick={handleNewOrder}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition"
            >
              <ArrowLeft size={20} />
              <span>Шинэ захиалга</span>
            </button>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">HF</span>
              </div>
              <span className="text-xl font-bold">
                <span className="text-green-400">Premium</span> Файл
              </span>
            </div>
          </div>
        </nav>

        <main className="pt-20 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-8 lg:p-12">
              <div className="text-center mb-10">
                <div className="w-24 h-24 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="text-green-400" size={48} />
                </div>
                <h2 className="text-4xl font-bold mb-4">Амжилттай!</h2>
                <p className="text-lg text-slate-300 mb-6">
                  Төлбөр баталгаажлаа. Файлууд татахад бэлэн. Баярлалаа!
                </p>
                <div className="inline-flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-lg mb-8">
                  <span className="text-sm text-slate-300">
                    Захиалгын дугаар: <span className="font-mono font-bold text-blue-400">{orderData.order_id}</span>
                  </span>
                </div>

                <div className="max-w-md mx-auto">
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-4 px-8 rounded-xl text-lg transition transform hover:scale-105 shadow-lg flex items-center justify-center gap-3 mb-4 disabled:opacity-50"
                  >
                    {downloading ? (
                      <>
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        <span>Бэлтгэж байна...</span>
                      </>
                    ) : (
                      <>
                        <Download size={24} />
                        <span>Бүх файлуудыг татах (ZIP)</span>
                      </>
                    )}
                  </button>

                  <p className="text-center text-sm text-slate-400 mb-8">
                    Файлууд ZIP форматаар татагдана
                  </p>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-700">
                <h3 className="font-bold text-xl mb-6">Файлуудын жагсаалт:</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Балансын тайлан', count: '15 файл' },
                    { name: 'Орлогын тайлан', count: '12 файл' },
                    { name: 'Мөнгөн гүйлгээний тайлан', count: '8 файл' },
                    { name: 'Тайлант тайлбар', count: '10 файл' },
                    { name: 'Дүн шинжилгээ', count: '5+ файл' }
                  ].map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl">
                      <div className="flex items-center gap-3">
                        <FileText className="text-blue-400" size={20} />
                        <span className="text-slate-200">{file.name}</span>
                      </div>
                      <span className="text-sm text-slate-400 bg-slate-800/50 px-3 py-1 rounded-lg">
                        {file.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="bg-gray-900/80 border-t border-slate-800 py-8 px-4">
          <div className="max-w-7xl mx-auto text-center text-slate-400">
            <p>&copy; {new Date().getFullYear()} Хэрэгтэй Файл. Бүх эрх хуулиар хамгаалагдсан.</p>
          </div>
        </footer>
      </div>
    );
  }

  return null;
}