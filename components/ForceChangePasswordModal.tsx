import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../App';
import { backend } from '../services/mockBackend';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';
import { ShieldAlert, KeyRound, ArrowRight } from 'lucide-react';

const ForceChangePasswordModal = () => {
  const { user, updateUser } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guard condition
  const needsPasswordChange = user && (user.mustChangePassword || user.password === user.nationalID);

  if (!needsPasswordChange || !document.body) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('كلماتا المرور غير متطابقتين');
      return;
    }
    if (newPassword === user.nationalID) {
      toast.error('لا يمكنك استخدام رقم الهوية ككلمة مرور!');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.changePasswordFirstTime(user.id, newPassword);
      const updatedUser = { ...user, mustChangePassword: false, password: newPassword };
      updateUser(updatedUser);
      toast.success('تم تحديث كلمة المرور بنجاح حفاظاً على أمان حسابك!');
    } catch (e) {
      toast.error('حدث خطأ أثناء التحديث.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xl" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 max-w-md w-full border border-gray-100 dark:border-slate-800 animate-in zoom-in-95 duration-300 relative overflow-hidden">
        
        {/* Decorative background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-red-500/20 to-orange-500/20 dark:from-red-900/30 dark:to-orange-900/30 blur-2xl -z-10" />

        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center relative shadow-inner">
             <ShieldAlert size={32} />
             <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm">
                <KeyRound size={16} className="text-orange-500" />
             </div>
          </div>
        </div>

        <h2 className="text-2xl font-black text-center text-gray-900 dark:text-white mb-2">
          تحديث أمني مطلوب!
        </h2>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          حفاظاً على سرية بياناتك، يرجى تغيير كلمة المرور الافتراضية إلى كلمة مرور قوية خاصة بك لإكمال عملية تسجيل الدخول.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">كلمة المرور الجديدة</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-sans"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">تأكيد كلمة المرور</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-sans"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !newPassword || !confirmPassword}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-red-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group"
          >
            {isSubmitting ? 'جاري التحديث...' : 'تحديث كلمة المرور والمتابعة'}
            {!isSubmitting && <ArrowRight size={18} className="group-hover:-translate-x-1 transition-transform" />}
          </button>
        </form>

      </div>
    </div>,
    document.body
  );
};

export default ForceChangePasswordModal;
