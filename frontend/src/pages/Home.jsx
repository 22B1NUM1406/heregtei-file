import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { purchaseAPI, downloadAPI } from '../api/client';
import { 
  Check, 
  Menu, 
  X, 
  FileText, 
  Users, 
  TrendingUp, 
  Award, 
  ChevronRight, 
  Download, 
  Star, 
  Calendar,
  MessageCircle,
  CheckCircle,
  Shield,
  Clock,
  ArrowLeft,
  QrCode,
  ExternalLink,
  LogOut,
  Mail
} from 'lucide-react';

export default function Home() {
  const { user, logout, checkAuth } = useAuth();
  const [purchasing, setPurchasing] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Ажилладаг handlePurchase функц
  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const { data } = await purchaseAPI.buy();
      
      if (data.already_paid) {
        await checkAuth();
        alert('✅ Та аль хэдийн premium эрхтэй байна! Файлаа татаж авна уу.');
        return;
      }
      
      setQrData(data);
      
      // startPaymentPolling функцийг дуудах
      startPaymentPolling(data.order_id);
      
      if (data.urls && data.urls.length > 0) {
        const deeplink = data.urls.find(url => url.name === 'deeplink');
        if (deeplink) {
          window.location.href = deeplink.link;
        }
      }
      
    } catch (error) {
      console.error('Purchase error:', error);
      let errorMessage = 'Төлбөр үүсгэхэд алдаа гарлаа';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      alert(`❌ ${errorMessage}`);
    } finally {
      setPurchasing(false);
    }
  };

  // Төлбөрийн статус шалгах функц
  const startPaymentPolling = (orderId) => {
    console.log('Starting payment polling for order:', orderId);
    
    const interval = setInterval(async () => {
      try {
        const { data } = await purchaseAPI.checkStatus(orderId);
        
        if (data.status === 'PAID') {
          clearInterval(interval);
          setQrData(null);
          
          await checkAuth();
          
          alert('✅ Төлбөр амжилттай! Одоо файлаа татаж авна уу.');
        }
      } catch (error) {
        console.error('Payment polling error:', error);
      }
    }, 3000);

    setTimeout(() => clearInterval(interval), 10 * 60 * 1000);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data } = await downloadAPI.generateLink();
      window.open(`http://localhost:3000${data.download_url}`, '_blank');
      alert('Татаж эхэллээ!');
    } catch (error) {
      alert(error.response?.data?.error || 'Татаж авах амжилтгүй');
    } finally {
      setDownloading(false);
    }
  };

  // QR код харуулах эсэх (qrData байвал харуулна)
  if (!user?.is_paid && qrData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white">
        {/* Navigation */}
        <nav className="bg-gray-900/90 backdrop-blur-sm fixed w-full z-50 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <button 
                onClick={() => setQrData(null)}
                className="flex items-center text-slate-300 hover:text-white transition"
              >
                <ArrowLeft className="mr-2" size={20} />
                Буцах
              </button>
              
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-lg">HF</span>
                </div>
                <span className="text-xl font-bold">
                  <span className="text-blue-400">Төлбөр</span> Төлөх
                </span>
              </div>
              
              <div className="w-24"></div> {/* For balance */}
            </div>
          </div>
        </nav>

        <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-8 lg:p-12">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <QrCode className="text-blue-400" size={40} />
                </div>
                <h2 className="text-3xl font-bold mb-3">QPay төлбөр</h2>
                <p className="text-lg text-slate-300">QR кодыг уншуулж 49,900₮ төлбөрөө төлнө үү</p>
              </div>

              <div className="flex flex-col items-center">
                {/* QR Code Section */}
                <div className="bg-slate-900/40 rounded-2xl p-8">
                  <div className="bg-white rounded-xl p-6 mb-6">
                    <img 
                      src={qrData.qr_image} 
                      alt="QPay QR Code" 
                      className="w-72 h-72 mx-auto"
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                      49,900₮
                    </div>
                    <p className="text-sm text-slate-400">QPay аппаар QR кодыг уншуулна уу</p>
                  </div>
                </div>

               
              </div>

              <div className="mt-8 pt-8 border-t border-slate-700 text-center">
                <button
                  onClick={() => setQrData(null)}
                  className="text-slate-400 hover:text-white font-medium transition"
                >
                  Төлбөр төлөхөөс татгалзах
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Premium биш хэрэглэгч - Нүүр хуудас
  if (!user?.is_paid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white">
        {/* Navigation */}
        <nav className="bg-gray-900/90 backdrop-blur-sm fixed w-full z-50 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-lg">HF</span>
                </div>
                <span className="text-xl font-bold">
                  <span className="text-blue-400">Хэрэгтэй</span> Файл
                </span>
              </div>
              
              <div className="hidden md:flex items-center space-x-6">
                <div className="flex items-center space-x-2 bg-slate-800/50 px-4 py-2 rounded-lg">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300">{user?.email}</span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center space-x-2 text-slate-300 hover:text-white transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Гарах</span>
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
              <div className="px-4 py-3 space-y-3">
                <div className="flex items-center space-x-2 bg-slate-800/50 px-4 py-2 rounded-lg">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300">{user?.email}</span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center space-x-2 text-slate-300 hover:text-white transition w-full px-4 py-2 hover:bg-slate-800 rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Гарах</span>
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* Hero Section */}
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
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-4 px-12 rounded-full text-lg transition transform hover:scale-105 shadow-lg disabled:opacity-50"
                >
                  {purchasing ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Бэлтгэж байна...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Файлуудыг худалдан авах <ChevronRight className="inline ml-2" size={20} />
                    </span>
                  )}
                </button>
              </div>

              {/* Stats */}
              <div className="grid md:grid-cols-4 gap-8 mt-20">
                {[
                  { icon: FileText, number: '50+', label: 'Загвар файл' },
                  { icon: Clock, number: '80%', label: 'Цаг хэмнэлт' },
                  { icon: Award, number: 'Тогтмол', label: 'Шинэчлэлт' },
                  { icon: Shield, number: 'Санхүүгийн', label: 'Баталгаатай байдал' }
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

          {/* Services Section */}
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900/30 to-slate-900/10">
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

          {/* Pricing Card */}
          <section className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-8 lg:p-12">
                <div className="text-center mb-8">
                  <div className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-full text-sm font-bold mb-6">
                    НЭГ УДААГИЙН ТӨЛБӨР
                  </div>
                  
                  <h2 className="text-3xl font-bold mb-6">
                    Санхүүгийн тайлангийн 50+ загвар файлуудын цогц багц
                  </h2>
                  
                  <p className="text-slate-300 mb-8 text-lg">
                    Олон улсын стандартад нийцсэн, мэргэжлийн түвшний загварууд
                  </p>

                  <div className="flex items-baseline justify-center gap-6 mb-8">
                    <div className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      49,900₮
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="text-green-400" size={24} />
                    <span className="text-lg">50+ санхүүгийн тайлангийн загвар</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="text-green-400" size={24} />
                    <span className="text-lg">Excel, Word, PDF форматууд</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="text-green-400" size={24} />
                    <span className="text-lg">Хязгааргүй татах боломж</span>
                  </div>
                  
                </div>

                <button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-4 px-8 rounded-xl text-lg transition transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {purchasing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Бэлтгэж байна...</span>
                    </>
                  ) : (
                    <>
                      <FileText size={20} />
                      Файлуудыг худалдан авах
                    </>
                  )}
                </button>

              
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="bg-gray-900/80 border-t border-slate-800 py-8 px-4">
          <div className="max-w-7xl mx-auto text-center text-slate-400">
            <p>&copy; {new Date().getFullYear()} Хэрэгтэй Файл. Бүх эрх хуулиар хамгаалагдсан.</p>
          </div>
        </footer>
      </div>
    );
  }

  // Premium User - Download Page
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white">
      {/* Navigation */}
      <nav className="bg-gray-900/90 backdrop-blur-sm fixed w-full z-50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">HF</span>
              </div>
              <span className="text-xl font-bold">
                <span className="text-green-400">Premium</span> Файл
              </span>
            </div>
            
            <div className="hidden md:flex items-center space-x-6">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-green-900/30 to-emerald-900/30 px-4 py-2 rounded-lg border border-green-800/50">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-400">Premium хэрэглэгч</span>
              </div>
              <div className="flex items-center space-x-2 bg-slate-800/50 px-4 py-2 rounded-lg">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">{user?.email}</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center space-x-2 text-slate-300 hover:text-white transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Гарах</span>
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
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-green-900/30 to-emerald-900/30 px-4 py-2 rounded-lg border border-green-800/50">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-400">Premium хэрэглэгч</span>
              </div>
              <div className="flex items-center space-x-2 bg-slate-800/50 px-4 py-2 rounded-lg">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">{user?.email}</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center space-x-2 text-slate-300 hover:text-white transition w-full px-4 py-2 hover:bg-slate-800 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                <span>Гарах</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-8 lg:p-12">
            <div className="text-center mb-10">
              <div className="w-24 h-24 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="text-green-400" size={48} />
              </div>
              <h2 className="text-4xl font-bold mb-4">Файлууд татахад бэлэн!</h2>
              <p className="text-lg text-slate-300 mb-6">
                Та амжилттай төлбөр төлсөн. Санхүүгийн тайлангийн 50+ загвар файлуудыг татаж авна уу.
              </p>
              <div className="inline-flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-lg">
                <Calendar className="text-blue-400" size={16} />
                <span className="text-sm text-slate-300">
                  Төлбөр төлсөн: {new Date(user?.paid_at).toLocaleDateString('mn-MN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>

            <div className="max-w-md mx-auto">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-4 px-8 rounded-xl text-lg transition transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {downloading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span>Бэлтгэж байна...</span>
                  </>
                ) : (
                  <>
                    <Download size={24} />
                    <span className="text-lg">Бүх файлуудыг татах (ZIP)</span>
                  </>
                )}
              </button>

              <p className="text-center text-sm text-slate-400 mt-4">
                Файлууд ZIP форматаар татагдана (≈150MB)
              </p>

              <div className="mt-8 pt-8 border-t border-slate-700">
                <h3 className="font-bold text-xl mb-6">Файлуудын жагсаалт:</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Балансын тайлан (Excel, Word, PDF)', count: '15 файл' },
                    { name: 'Орлогын тайлан (Excel, Word, PDF)', count: '12 файл' },
                    { name: 'Мөнгөн гүйлгээний тайлан', count: '8 файл' },
                    { name: 'Тайлант тайлбар, Төсөв', count: '10 файл' },
                    { name: 'Дүн шинжилгээ, График', count: '5+ файл' }
                  ].map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl hover:bg-slate-900/60 transition">
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
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900/80 border-t border-slate-800 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-slate-400">
          <p>&copy; {new Date().getFullYear()} Хэрэгтэй Файл. Бүх эрх хуулиар хамгаалагдсан.</p>
        </div>
      </footer>
    </div>
  );
}