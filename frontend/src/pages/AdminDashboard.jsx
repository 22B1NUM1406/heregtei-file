import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  Users, 
  TrendingUp,
  LogOut,
  RefreshCw,
  Search,
  Eye
} from 'lucide-react';

export default function AdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, paid
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const API_URL = 'http://localhost:3000/api';

  // Нэвтрэх
  const handleLogin = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      const data = await response.json();

      if (data.success) {
        setToken(data.token);
        setIsLoggedIn(true);
        fetchOrders(data.token);
        fetchStats(data.token);
      } else {
        alert('Нэвтрэх амжилтгүй');
      }
    } catch (error) {
      alert('Алдаа гарлаа: ' + error.message);
    }
  };

  // Захиалгууд татах
  const fetchOrders = async (authToken = token) => {
    setLoading(true);
    try {
      const url = filter === 'all' 
        ? `${API_URL}/admin/orders`
        : `${API_URL}/admin/orders?status=${filter === 'paid' ? 'paid' : 'pending'}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Алдаа:', error);
    } finally {
      setLoading(false);
    }
  };

  // Статистик татах
  const fetchStats = async (authToken = token) => {
    try {
      const response = await fetch(`${API_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Алдаа:', error);
    }
  };

  // Төлбөр баталгаажуулах
  const verifyPayment = async (orderId) => {
    if (!confirm('Төлбөр баталгаажуулах уу?')) return;

    try {
      const response = await fetch(`${API_URL}/admin/orders/${orderId}/verify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Төлбөр амжилттай баталгаажлаа!');
        fetchOrders();
        fetchStats();
        setSelectedOrder(null);
      }
    } catch (error) {
      alert('Алдаа гарлаа: ' + error.message);
    }
  };

  // Татгалзах
  const rejectPayment = async (orderId) => {
    if (!confirm('Захиалгыг татгалзах уу?')) return;

    try {
      const response = await fetch(`${API_URL}/admin/orders/${orderId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        alert('Захиалгыг татгалзлаа');
        fetchOrders();
        setSelectedOrder(null);
      }
    } catch (error) {
      alert('Алдаа гарлаа: ' + error.message);
    }
  };

  // Filter хэрэглэх
  useEffect(() => {
    if (isLoggedIn) {
      fetchOrders();
    }
  }, [filter]);

  // Хайлтын үр дүн
  const filteredOrders = orders.filter(order => 
    order.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.phone.includes(searchTerm) ||
    order.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Login Page
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white flex items-center justify-center p-4">
        <div className="bg-slate-800/90 rounded-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold">A</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Админ нэвтрэх</h1>
            <p className="text-slate-400">Төлбөр баталгаажуулах систем</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Хэрэглэгчийн нэр
              </label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Нууц үг
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-3 px-6 rounded-lg transition"
            >
              Нэвтрэх
            </button>

            <div className="text-center text-sm text-slate-400 mt-4">
              Анхдагч: admin / admin123
            </div>
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
                <p className="text-xs text-slate-400">Төлбөр баталгаажуулах</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => { fetchOrders(); fetchStats(); }}
                className="p-2 hover:bg-slate-800 rounded-lg transition"
              >
                <RefreshCw size={20} />
              </button>
              <button
                onClick={() => setIsLoggedIn(false)}
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
              </div>
              <div className="text-3xl font-bold mb-1">{stats.total_orders}</div>
              <div className="text-slate-400 text-sm">Нийт захиалга</div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="text-green-400" size={32} />
              </div>
              <div className="text-3xl font-bold mb-1">{stats.paid_orders}</div>
              <div className="text-slate-400 text-sm">Төлсөн</div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="text-amber-400" size={32} />
              </div>
              <div className="text-3xl font-bold mb-1">{stats.pending_orders}</div>
              <div className="text-slate-400 text-sm">Хүлээгдэж буй</div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="text-purple-400" size={32} />
              </div>
              <div className="text-3xl font-bold mb-1">
                {(stats.total_revenue / 1000).toFixed(0)}k₮
              </div>
              <div className="text-slate-400 text-sm">Нийт орлого</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-800/50 rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2">
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
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg transition ${
                  filter === 'pending' 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Хүлээгдэж буй
              </button>
              <button
                onClick={() => setFilter('paid')}
                className={`px-4 py-2 rounded-lg transition ${
                  filter === 'paid' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Төлсөн
              </button>
            </div>

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Хайх: захиалгын дугаар, нэр, утас, и-мэйл..."
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
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Холбоо барих</th>
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
                        <div className="text-sm">
                          <div className="text-slate-300">{order.phone}</div>
                          <div className="text-slate-500 text-xs">{order.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-200">
                        {order.amount.toLocaleString()}₮
                      </td>
                      <td className="px-6 py-4">
                        {order.payment_verified ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-900/30 text-green-400 rounded-full text-sm">
                            <CheckCircle size={14} />
                            Төлсөн
                          </span>
                        ) : order.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-900/30 text-red-400 rounded-full text-sm">
                            <XCircle size={14} />
                            Татгалзсан
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-900/30 text-amber-400 rounded-full text-sm">
                            <Clock size={14} />
                            Хүлээгдэж буй
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {new Date(order.created_at).toLocaleString('mn-MN')}
                      </td>
                      <td className="px-6 py-4">
                        {!order.payment_verified && order.status !== 'rejected' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => verifyPayment(order.order_id)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-lg text-sm transition"
                            >
                              ✓ Баталгаажуулах
                            </button>
                            <button
                              onClick={() => rejectPayment(order.order_id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition"
                            >
                              ✕ Татгалзах
                            </button>
                          </div>
                        )}
                        {order.payment_verified && (
                          <span className="text-xs text-green-400">
                            ✓ {order.verified_by}
                          </span>
                        )}
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