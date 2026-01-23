import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SimpleFileShop from './components/SimpleFileShop.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SimpleFileShop />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;