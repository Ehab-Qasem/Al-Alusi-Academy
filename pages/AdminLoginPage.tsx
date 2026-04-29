
import React, { useState } from 'react';
import { useAuth } from '../App';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { authService } from '../services/authService';
import { UserRole } from '../types';

const AdminLoginPage = () => {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Perform Login via Auth Service
      const user = await authService.login(username, password);
      
      // 2. Strict Role Check
      if (user.role !== UserRole.ADMIN) {
        await authService.logout();
        throw new Error('غير مصرح لك بالدخول إلى هذه البوابة');
      }
      
      // 3. Update Auth Context without redundant API calls
      updateUser(user);
      
      navigate('/admin');
    } catch (err: any) {
      console.error(err);
      if (err.message.includes('غير مصرح')) {
        setError(err.message);
      } else {
        setError('بيانات المسؤول غير صحيحة أو حدث خطأ في النظام');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 text-white p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-700 relative">
        <Link to="/" className="absolute top-8 left-8 text-gray-500 hover:text-white transition">
          <ArrowRight size={24} />
        </Link>
        <div className="flex justify-center mb-6 pt-2">
          <ShieldCheck size={48} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-center mb-6">بوابة المشرفين</h2>
        
        {error && (
          <div className="bg-red-900/50 text-red-200 p-3 rounded mb-4 text-sm flex gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 uppercase">اسم المستخدم</label>
            <input 
              className="w-full bg-gray-700 border-gray-600 rounded p-2 text-white focus:ring-red-500 focus:border-red-500"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
             <label className="text-xs text-gray-400 uppercase">كلمة المرور</label>
             <input 
               type="password"
               className="w-full bg-gray-700 border-gray-600 rounded p-2 text-white focus:ring-red-500 focus:border-red-500"
               value={password}
               onChange={e => setPassword(e.target.value)}
               disabled={loading}
             />
          </div>
          <button 
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 py-2 rounded font-bold transition disabled:opacity-50"
          >
            {loading ? 'جاري التحقق...' : 'دخول آمن'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginPage;
