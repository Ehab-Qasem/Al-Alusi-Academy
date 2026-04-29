
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useNavigate, Link } from 'react-router-dom';
import { UserRole } from '../types';
import { authService } from '../services/authService';
import { Lock, User as UserIcon, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const { login, isAuthenticated, user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ id: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Verification State (Force Password Change)
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Password Visibility State
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Check redirects
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.mustChangePassword) {
        setShowVerifyModal(true);
      } else {
        if (user.role === UserRole.ADMIN) navigate('/admin');
        else if (user.role === UserRole.TEACHER) navigate('/teacher');
        else navigate('/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.id, formData.password);
      // Success is handled by useEffect above
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setError('بيانات الدخول غير صحيحة');
      } else {
        setError('بيانات الدخول غير صحيحة أو السيرفر غير متصل.');
      }
      setLoading(false);
    }
  };

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8 || pwd.length > 20) return false;
    if (!/[A-Z]/.test(pwd)) return false;
    if (!/[a-z]/.test(pwd)) return false;
    if (!/[0-9]/.test(pwd)) return false;
    return true;
  };

  const handleForcePasswordChange = async () => {
    if (!validatePassword(newPassword)) {
      toast.error("كلمة المرور لا تستوفي الشروط الأمنية");
      return;
    }

    try {
      if (user?.id) {
        await authService.changePasswordFirstTime(user.id, newPassword);
        await refreshProfile();
        setShowVerifyModal(false);
      }
    } catch (e: any) {
      toast.error("فشل تحديث كلمة المرور: " + e.message);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 relative transition-all duration-300">
        <Link to="/" className="absolute top-8 left-8 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition">
          <ArrowRight size={24} />
        </Link>
        <div className="text-center pt-2">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">تسجيل الدخول</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">أكاديمية المنارة التعليمية</p>
        </div>

        {/* DEMO ACCOUNTS BOX */}
        {/* DEMO ACCOUNTS BOX REMOVED */}

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100 dark:border-red-900/30">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رقم الهوية الوطنية</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                <UserIcon size={18} />
              </div>
              <input
                type="text"
                required
                className="block w-full pr-10 pl-3 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
                placeholder="رقم الهوية"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">كلمة المرور</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                className="block w-full pr-10 pl-10 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-all hover:scale-[1.02]"
          >
            {loading ? 'جاري التحقق...' : 'دخول'}
          </button>
        </form>
      </div>

      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-8 shadow-2xl border border-gray-100 dark:border-slate-800">
            <div className="flex justify-center mb-4 text-yellow-500">
              <AlertCircle size={48} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">تحديث كلمة المرور مطلوب</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-center text-sm">
              لأمان حسابك، يرجى تعيين كلمة مرور جديدة تستوفي الشروط التالية:
            </p>

            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-6 bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
              <li className={`flex items-center gap-2 ${newPassword.length >= 8 && newPassword.length <= 20 ? 'text-green-600 dark:text-green-400' : ''}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                <span>من 8 إلى 20 خانة</span>
              </li>
              <li className={`flex items-center gap-2 ${/[A-Z]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                <span>حرف كبير (A-Z) واحد على الأقل</span>
              </li>
              <li className={`flex items-center gap-2 ${/[a-z]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                <span>حرف صغير (a-z) واحد على الأقل</span>
              </li>
              <li className={`flex items-center gap-2 ${/[0-9]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                <span>رقم (0-9) واحد على الأقل</span>
              </li>
            </ul>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">كلمة المرور الجديدة</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="block w-full px-4 py-3 pl-10 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg focus:ring-primary-500 focus:border-primary-500 text-left ltr"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Password123"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors focus:outline-none"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button
                onClick={handleForcePasswordChange}
                disabled={!validatePassword(newPassword)}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                حفظ ومتابعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
