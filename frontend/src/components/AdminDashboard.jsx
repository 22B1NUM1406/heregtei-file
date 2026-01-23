import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  Users, 
  LogOut,
  RefreshCw,
  Search,
  Key,
  Mail,
  UserPlus,
  Eye,
  Smartphone,
  AlertCircle,
  Filter,
  Download
} from 'lucide-react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyBl8Nh38xSuaBvJ8x1r7cVutwyiqCV8Xzg",
  authDomain: "shop-app-28e75.firebaseapp.com",
  projectId: "shop-app-28e75",
  storageBucket: "shop-app-28e75.firebasestorage.app",
  messagingSenderId: "779779701658",
  appId: "1:779779701658:web:5baba477eef7c4eb665823",
  measurementId: "G-DXPN326NHY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function AdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [firebaseToken, setFirebaseToken] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('pending'); // pending, paid, rejected, all
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({ email: '', name: '' });
  const [adminList, setAdminList] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const API_URL = '/api';;

  // Firebase Auth state listener
// Firebase Auth state listener
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      setIsLoggedIn(true);
      setCurrentUser(user);
      try {
        // getIdToken() гэж дуудах
        const token = await user.getIdToken();
        setFirebaseToken(token);
        fetchAdminProfile(token);
        fetchOrders(token);
        fetchStats(token);
        fetchAdminList(token);
      } catch (error) {
        console.error('Token авахад алдаа:', error);
      }
    } else {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setFirebaseToken('');
    }
  });

  return () => unsubscribe();
}, []);

  // Firebase-ээр нэвтрэх
  const handleFirebaseLogin = async () => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
    } catch (error) {
      alert(`Нэвтрэх алдаа: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Гарах
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Гарах алдаа:', error);
    }
  };

  // Админ профайл татах
  const fetchAdminProfile = async (token) => {
    try {
      await fetch(`${API_URL}/admin/profile`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Профайл татах алдаа:', error);
    }
  };

  // Захиалгууд татах
  const fetchOrders = async (token) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/orders?status=${filter}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setFilteredOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Захиалга татах алдаа:', error);
    } finally {
      setLoading(false);
    }
  };

  // Статистик татах
  const fetchStats = async (token) => {
    try {
      const response = await fetch(`${API_URL}/admin/stats`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Статистик татах алдаа:', error);
    }
  };

  // Админ жагсаалт татах
  const fetchAdminList = async (token) => {
    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAdminList(data.admins || []);
      }
    } catch (error) {
      console.error('Админ жагсаалт татах алдаа:', error);
    }
  };

  // Шинэ админ нэмэх
  const handleAddAdmin = async () => {
    if (!newAdminForm.email || !newAdminForm.name) {
      alert('Бүх талбарыг бөглөнө үү');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${firebaseToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAdminForm)
      });

      const data = await response.json();

      if (response.ok) {
        alert('✅ Шинэ админ амжилттай нэмэгдлээ');
        setShowAddAdmin(false);
        setNewAdminForm({ email: '', name: '' });
        fetchAdminList(firebaseToken);
      } else {
        alert(`❌ Алдаа: ${data.error}`);
      }
    } catch (error) {
      alert('Сүлжээний алдаа: ' + error.message);
    }
  };

  // Premium болгох (Төлбөр баталгаажуулах) - ШИНЭЧЛЭЛТ
// Админ панелийн verifyPayment, rejectPayment функцуудыг дээрх шинэ backend-тэй тохируулах

// verifyPayment функц:
const verifyPayment = async (orderId) => {
  if (!orderId) {
    alert('Захиалгын дугаар алга байна');
    return;
  }

  if (!confirm(`Захиалгын дугаар: ${orderId}\nТөлбөрийг баталгаажуулж Premium болгох уу?`)) return;

  try {
    const response = await fetch(`${API_URL}/admin/orders/${orderId}/verify`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        notes: 'Админаар баталгаажсан',
        adminName: currentUser?.email || 'Админ'
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert('✅ Төлбөр амжилттай баталгаажлаа! Хэрэглэгч файл татахад бэлэн боллоо.');
      fetchOrders(firebaseToken);
      fetchStats(firebaseToken);
      setSelectedOrder(null);
    } else {
      alert(`❌ Алдаа: ${data.error || 'Алдаа гарлаа'}`);
    }
  } catch (error) {
    alert('Алдаа гарлаа: ' + error.message);
  }
};

// rejectPayment функц:
const rejectPayment = async (orderId) => {
  if (!orderId) {
    alert('Захиалгын дугаар алга байна');
    return;
  }

  const reason = rejectReason.trim();
  if (!reason) {
    alert('Татгалзах шалтгаанаа бичнэ үү');
    return;
  }

  if (!confirm(`Захиалгын дугаар: ${orderId}\nТөлбөрийг татгалзах уу?`)) return;

  try {
    const response = await fetch(`${API_URL}/admin/orders/${orderId}/reject`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        reason,
        adminName: currentUser?.email || 'Админ'
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert('✅ Захиалгыг татгалзлаа');
      fetchOrders(firebaseToken);
      setSelectedOrder(null);
      setRejectReason('');
    } else {
      alert(`❌ Алдаа: ${data.error || 'Алдаа гарлаа'}`);
    }
  } catch (error) {
    alert('Алдаа гарлаа: ' + error.message);
  }
};
  // Хайлт шүүлтүүр
  useEffect(() => {
    if (!searchTerm) {
      setFilteredOrders(orders);
    } else {
      const filtered = orders.filter(order => 
        order.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.phone.includes(searchTerm) ||
        order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.bank_transaction_reference?.includes(searchTerm)
      );
      setFilteredOrders(filtered);
    }
  }, [searchTerm, orders]);

  // Filter өөрчлөгдөхөд
  useEffect(() => {
    if (isLoggedIn && firebaseToken) {
      fetchOrders(firebaseToken);
    }
  }, [filter, isLoggedIn]);

  // Login Page
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white flex items-center justify-center p-4">
        <div className="bg-slate-800/90 rounded-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Key className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold mb-2">Админ нэвтрэх</h1>
            <p className="text-slate-400">Төлбөр баталгаажуулах систем</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Mail className="inline mr-2" size={16} />
                И-мэйл хаяг
              </label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@example.com"
                onKeyPress={(e) => e.key === 'Enter' && handleFirebaseLogin()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Key className="inline mr-2" size={16} />
                Нууц үг
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                onKeyPress={(e) => e.key === 'Enter' && handleFirebaseLogin()}
              />
            </div>

            <button
              onClick={handleFirebaseLogin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Нэвтэрч байна...' : 'Нэвтрэх'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white">
      {/* Header */}
      <nav className="bg-gray-900/90 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <span className="text-xl font-bold">A</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Admin Dashboard</h1>
                <p className="text-xs text-slate-400">
                  {currentUser?.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {adminList.some(admin => admin.email === currentUser?.email && admin.role === 'super_admin') && (
                <button
                  onClick={() => setShowAddAdmin(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition"
                >
                  <UserPlus size={18} />
                  <span>Админ нэмэх</span>
                </button>
              )}
              
              <button
                onClick={() => { fetchOrders(firebaseToken); fetchStats(firebaseToken); }}
                className="p-2 hover:bg-slate-800 rounded-lg transition"
                title="Шинэчлэх"
              >
                <RefreshCw size={20} />
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              >
                <LogOut size={18} />
                <span>Гарах</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-slate-800/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="text-blue-400" size={32} />
                <span className="text-2xl font-bold">{stats.total_orders}</span>
              </div>
              <div className="text-slate-400 text-sm">Нийт захиалга</div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="text-green-400" size={32} />
                <span className="text-2xl font-bold">{stats.paid_orders}</span>
              </div>
              <div className="text-slate-400 text-sm">Төлсөн</div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="text-amber-400" size={32} />
                <span className="text-2xl font-bold">{stats.pending_orders}</span>
              </div>
              <div className="text-slate-400 text-sm">Хүлээгдэж буй</div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="text-purple-400" size={32} />
                <span className="text-2xl font-bold">
                  {stats.total_revenue ? (stats.total_revenue / 1000).toFixed(0) + 'k₮' : '0₮'}
                </span>
              </div>
              <div className="text-slate-400 text-sm">Нийт орлого</div>
            </div>
          </div>
        )}

        {/* Админ нэмэх modal */}
        {showAddAdmin && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">Шинэ админ нэмэх</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">И-мэйл</label>
                  <input
                    type="email"
                    value={newAdminForm.email}
                    onChange={(e) => setNewAdminForm({...newAdminForm, email: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white"
                    placeholder="admin@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Нэр</label>
                  <input
                    type="text"
                    value={newAdminForm.name}
                    onChange={(e) => setNewAdminForm({...newAdminForm, name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white"
                    placeholder="Админы нэр"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleAddAdmin}
                  className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg"
                >
                  Нэмэх
                </button>
                <button
                  onClick={() => setShowAddAdmin(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg"
                >
                  Цуцлах
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold">Захиалгын дэлгэрэнгүй</h3>
                  <p className="text-slate-400 text-sm">ID: {selectedOrder.order_id}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-slate-700 rounded-lg"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-slate-400">Нэр</label>
                    <p className="font-medium">{selectedOrder.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Утас</label>
                    <p className="font-medium">{selectedOrder.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Имэйл</label>
                    <p className="font-medium">{selectedOrder.email}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-slate-400">Гүйлгээний утга</label>
                    <div className="flex items-center gap-2">
                      <Smartphone className="text-blue-400" size={18} />
                      <p className="font-medium">{selectedOrder.bank_transaction_reference || selectedOrder.phone}</p>
                    </div>
                    <p className="text-xs text-amber-400 mt-1">Хэрэглэгч энэ дугаараар гүйлгээ хийх ёстой</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Дүн</label>
                    <p className="font-bold text-lg text-blue-400">{selectedOrder.amount?.toLocaleString() || '50,000'}₮</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Огноо</label>
                    <p className="font-medium">{new Date(selectedOrder.created_at).toLocaleString('mn-MN')}</p>
                  </div>
                </div>
              </div>

              {!selectedOrder.payment_verified && selectedOrder.status !== 'rejected' && (
  <div className="space-y-4">
    <div className="bg-amber-900/20 border border-amber-800/30 rounded-lg p-4">
      <p className="text-amber-300 text-sm">
        Энэ хэрэглэгч {selectedOrder.bank_transaction_reference || selectedOrder.phone} утасны дугаараар гүйлгээ хийсэн эсэхийг шалгана уу.
      </p>
    </div>

    <div className="flex gap-3">
      <button
        onClick={() => {
          console.log('Баталгаажуулах товч дарлаа, order_id:', selectedOrder.order_id);
          verifyPayment(selectedOrder.order_id);
        }}
        className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-lg font-medium"
      >
        ✓ Premium болгох
      </button>
      <button
        onClick={() => {
          const reason = prompt('Татгалзах шалтгаанаа бичнэ үү:');
          if (reason) {
            setRejectReason(reason);
            // Бага зэрэг хүлээгээд дуудах
            setTimeout(() => {
              console.log('Татгалзах товч дарлаа, order_id:', selectedOrder.order_id);
              rejectPayment(selectedOrder.order_id);
            }, 100);
          }
        }}
        className="flex-1 bg-red-600 hover:bg-red-700 py-3 rounded-lg font-medium"
      >
        ✕ Татгалзах
      </button>
    </div>
  </div>
)}

              {selectedOrder.payment_verified && (
                <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4">
                  <p className="text-green-300">
                    ✅ Баталгаажсан: {selectedOrder.verified_by} - {new Date(selectedOrder.paid_at).toLocaleString('mn-MN')}
                  </p>
                  {selectedOrder.notes && (
                    <p className="text-sm text-slate-300 mt-2">Тэмдэглэл: {selectedOrder.notes}</p>
                  )}
                </div>
              )}

              {selectedOrder.status === 'rejected' && (
                <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4">
                  <p className="text-red-300">
                    ❌ Татгалзсан: {selectedOrder.verified_by}
                  </p>
                  {selectedOrder.notes && (
                    <p className="text-sm text-slate-300 mt-2">Шалтгаан: {selectedOrder.notes}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filters & Search */}
        <div className="bg-slate-800/50 rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                  filter === 'pending' 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Clock size={16} />
                Хүлээгдэж буй ({orders.filter(o => o.status === 'pending').length})
              </button>
              <button
                onClick={() => setFilter('paid')}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                  filter === 'paid' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <CheckCircle size={16} />
                Төлсөн ({orders.filter(o => o.payment_verified === 1).length})
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                  filter === 'rejected' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <XCircle size={16} />
                Татгалзсан ({orders.filter(o => o.status === 'rejected').length})
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition ${
                  filter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Бүгд ({orders.length})
              </button>
            </div>

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Хайх: захиалгын дугаар, нэр, утас, имэйл..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-slate-800/50 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-400">Уншиж байна...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              Захиалга олдсонгүй
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Захиалгын №</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Нэр</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Утас / Гүйлгээний утга</th>
                    <th className="px6 py-4 text-left text-sm font-semibold text-slate-300">Имэйл</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Дүн</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Төлөв</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Огноо</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-900/30 transition">
                      <td className="px-6 py-4">
                        <span className="font-mono text-blue-400">{order.order_id}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-200">{order.name}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Smartphone className="text-blue-400" size={16} />
                          <div>
                            <div className="text-slate-300">{order.phone}</div>
                            <div className="text-xs text-slate-500">
                              Гүйлгээний утга: {order.bank_transaction_reference || order.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-300 truncate max-w-[200px]">
                          {order.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-200">
                        {order.amount?.toLocaleString() || '50,000'}₮
                      </td>
                      <td className="px-6 py-4">
                        {order.payment_verified ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-900/30 text-green-400 rounded-full text-sm">
                            <CheckCircle size={14} />
                            Premium
                          </span>
                        ) : order.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-900/30 text-red-400 rounded-full text-sm">
                            <XCircle size={14} />
                            Татгалзсан
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-900/30 text-amber-400 rounded-full text-sm">
                            <Clock size={14} />
                            Шалгах хэрэгтэй
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {new Date(order.created_at).toLocaleDateString('mn-MN')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition flex items-center gap-1"
                          >
                            <Eye size={14} />
                            Дэлгэрэнгүй
                          </button>
                          
                          {!order.payment_verified && order.status !== 'rejected' && (
  <>
    <button
      onClick={() => {
        console.log('Хүснэгтээс баталгаажуулах:', order.order_id);
        verifyPayment(order.order_id);
      }}
      className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-lg text-sm transition"
    >
      ✓ Баталгаажуулах
    </button>
    <button
      onClick={() => {
        const reason = prompt('Татгалзах шалтгаанаа бичнэ үү:');
        if (reason) {
          console.log('Хүснэгтээс татгалзах:', order.order_id);
          rejectPayment(order.order_id);
        }
      }}
      className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition"
    >
      ✕ Татгалзах
    </button>
  </>
)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}