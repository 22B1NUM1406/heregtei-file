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
  Eye,
  Smartphone,
  AlertCircle,
  Download,
  UserCheck
} from 'lucide-react';

export default function AdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loginError, setLoginError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsLoggedIn(true);
      fetchRequests();
      fetchStats();
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('adminToken', data.token);
        setIsLoggedIn(true);
        fetchRequests();
        fetchStats();
      } else {
        setLoginError(data.error);
      }
    } catch (error) {
      setLoginError('Холболтын алдаа гарлаа');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('adminToken');
  };

  const fetchRequests = async () => {
    setLoading(true);
    const token = localStorage.getItem('adminToken');
    
    try {
      const response = await fetch(`${API_URL}/api/admin/requests?status=${filter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRequests(data.requests || []);
        setFilteredRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Fetch алдаа:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    const token = localStorage.getItem('adminToken');
    
    try {
      const response = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Статистик татах алдаа:', error);
    }
  };

  const verifyRequest = async (requestId) => {
    if (!confirm(`Хүсэлт: ${requestId}\nБаталгаажуулах уу?`)) return;

    const token = localStorage.getItem('adminToken');
    
    try {
      const response = await fetch(`${API_URL}/api/admin/requests/${requestId}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: 'Админаар баталгаажсан' })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Хүсэлт амжилттай баталгаажлаа! Хэрэглэгч Premium боллоо.');
        fetchRequests();
        fetchStats();
        setSelectedRequest(null);
      } else {
        alert(`❌ Алдаа: ${data.error}`);
      }
    } catch (error) {
      alert('Алдаа гарлаа: ' + error.message);
    }
  };

  const rejectRequest = async (requestId) => {
    const reason = rejectReason.trim() || prompt('Татгалзах шалтгаанаа бичнэ үү:');
    if (!reason) return;

    if (!confirm(`Хүсэлт: ${requestId}\nТатгалзах уу?`)) return;

    const token = localStorage.getItem('adminToken');
    
    try {
      const response = await fetch(`${API_URL}/api/admin/requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Хүсэлтийг татгалзлаа');
        fetchRequests();
        fetchStats();
        setSelectedRequest(null);
        setRejectReason('');
      } else {
        alert(`❌ Алдаа: ${data.error}`);
      }
    } catch (error) {
      alert('Алдаа гарлаа: ' + error.message);
    }
  };

  useEffect(() => {
    if (!searchTerm) {
      setFilteredRequests(requests);
    } else {
      const filtered = requests.filter(req => 
        req.request_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.phone.includes(searchTerm) ||
        req.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRequests(filtered);
    }
  }, [searchTerm, requests]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchRequests();
    }
  }, [filter]);

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

          <form onSubmit={handleLogin}>
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
                  placeholder="admin@file.mn"
                  required
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
                  placeholder="admin123"
                  required
                />
              </div>

              {loginError && (
                <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4">
                  <p className="text-red-300 text-sm">{loginError}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-3 px-6 rounded-lg transition"
              >
                Нэвтрэх
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white">
      <nav className="bg-gray-900/90 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <span className="text-xl font-bold">A</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Admin Dashboard</h1>
                <p className="text-xs text-slate-400">Худалдан авалтын хүсэлтүүд</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => { fetchRequests(); fetchStats(); }}
                className="p-2 hover:bg-slate-800 rounded-lg transition"
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
        {stats && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-slate-800/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="text-blue-400" size={32} />
                <span className="text-2xl font-bold">{stats.total_users || 0}</span>
              </div>
              <div className="text-slate-400 text-sm">Нийт хэрэглэгч</div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <UserCheck className="text-green-400" size={32} />
                <span className="text-2xl font-bold">{stats.premium_users || 0}</span>
              </div>
              <div className="text-slate-400 text-sm">Premium хэрэглэгч</div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="text-amber-400" size={32} />
                <span className="text-2xl font-bold">{stats.pending_requests || 0}</span>
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

        {selectedRequest && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold">Хүсэлтийн дэлгэрэнгүй</h3>
                  <p className="text-slate-400 text-sm">ID: {selectedRequest.request_id}</p>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-slate-700 rounded-lg">
                  <XCircle size={20} />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-slate-400">Нэр</label>
                    <p className="font-medium">{selectedRequest.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Утас</label>
                    <p className="font-medium">{selectedRequest.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Имэйл</label>
                    <p className="font-medium">{selectedRequest.email}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-slate-400">Гүйлгээний утга</label>
                    <div className="flex items-center gap-2">
                      <Smartphone className="text-blue-400" size={18} />
                      <p className="font-medium">{selectedRequest.phone}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Дүн</label>
                    <p className="font-bold text-lg text-blue-400">50,000₮</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Огноо</label>
                    <p className="font-medium">{new Date(selectedRequest.created_at).toLocaleString('mn-MN')}</p>
                  </div>
                </div>
              </div>

              {selectedRequest.status === 'pending' && (
                <div className="space-y-4">
                  <div className="bg-amber-900/20 border border-amber-800/30 rounded-lg p-4">
                    <p className="text-amber-300 text-sm">
                      Энэ хэрэглэгч {selectedRequest.phone} утасны дугаараар гүйлгээ хийсэн эсэхийг шалгана уу.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => verifyRequest(selectedRequest.request_id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-lg font-medium"
                    >
                      ✓ Premium болгох
                    </button>
                    <button
                      onClick={() => rejectRequest(selectedRequest.request_id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 py-3 rounded-lg font-medium"
                    >
                      ✕ Татгалзах
                    </button>
                  </div>
                </div>
              )}

              {selectedRequest.status === 'approved' && (
                <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4">
                  <p className="text-green-300">✅ Баталгаажсан - Premium хэрэглэгч</p>
                </div>
              )}

              {selectedRequest.status === 'rejected' && (
                <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4">
                  <p className="text-red-300">❌ Татгалзсан</p>
                  {selectedRequest.admin_notes && (
                    <p className="text-sm text-slate-300 mt-2">Шалтгаан: {selectedRequest.admin_notes}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-slate-800/50 rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                  filter === 'pending' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Clock size={16} />
                Хүлээгдэж буй ({requests.filter(r => r.status === 'pending').length})
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                  filter === 'approved' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <CheckCircle size={16} />
                Баталгаажсан ({requests.filter(r => r.status === 'approved').length})
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                  filter === 'rejected' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <XCircle size={16} />
                Татгалзсан ({requests.filter(r => r.status === 'rejected').length})
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition ${
                  filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Бүгд ({requests.length})
              </button>
            </div>

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Хайх..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-400">Уншиж байна...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400">Хүсэлт олдсонгүй</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Хүсэлтийн №</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Нэр</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Утас</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Төлөв</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Огноо</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-900/30 transition">
                      <td className="px-6 py-4">
                        <span className="font-mono text-blue-400">{req.request_id}</span>
                      </td>
                      <td className="px-6 py-4">{req.name}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Smartphone className="text-blue-400" size={16} />
                          {req.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {req.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-900/30 text-green-400 rounded-full text-sm">
                            <CheckCircle size={14} />
                            Баталгаажсан
                          </span>
                        ) : req.status === 'rejected' ? (
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
                        {new Date(req.created_at).toLocaleDateString('mn-MN')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedRequest(req)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition flex items-center gap-1"
                          >
                            <Eye size={14} />
                            Дэлгэрэнгүй
                          </button>
                          
                          {req.status === 'pending' && (
                            <>
                              <button
                                onClick={() => verifyRequest(req.request_id)}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-lg text-sm transition"
                              >
                                ✓ Батал
                              </button>
                              <button
                                onClick={() => rejectRequest(req.request_id)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition"
                              >
                                ✕ Татгал
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