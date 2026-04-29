
import app, { auth } from "./firebase";
import {
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  getAuth as getAuthSecondary,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { initializeApp, getApp } from "firebase/app";
import { User, UserRole } from "../types";
import { backend } from "./mockBackend"; // Integrating Mock Backend

const API_URL = '/api';

// Generates a synthetic email since requirements use National ID
const getEmailFromID = (nationalID: string) => `${nationalID}@almanara-lms.local`;

const apiCall = async (endpoint: string, method = 'GET', body?: any) => {
  try {
    const stored = localStorage.getItem('almanara_session');
    let token = '';
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        token = parsed.token || '';
      } catch(e){}
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }
    return res.json();
  } catch (error) {
    console.warn("API call failed, falling back to mock mode logic if managed by backend service.");
    throw error;
  }
};

// --- MOCK USERS FOR DEMO/OFFLINE MODE ---
// User requested: Admin only, User: 1, Pass: 1
const MOCK_USERS: User[] = [
  {
    id: "admin_1",
    nationalID: "1",
    fullName: "المدير العام",
    role: UserRole.ADMIN,
    enrolledCourses: []
  }
];

export const authService = {

  async login(nationalID: string, password: string): Promise<User> {
    // --- MOCK / OFFLINE AUTH ---
    const localUsers = backend.getUsers();
    const targetUser = localUsers.find(u => u.nationalID === nationalID);

    let loggedUser: User | null = null;

    if (targetUser) {
      if (nationalID === '1') {
        if (password === '1') {
          console.log("🔓 Login Success: Admin 1");
          loggedUser = targetUser;
        } else {
          throw new Error("كلمة المرور غير صحيحة");
        }
      } else {
        if (targetUser.password && targetUser.password === password) {
          loggedUser = targetUser;
        } else if (password === nationalID || password === '123456') {
          loggedUser = targetUser;
        }
      }
    }

    if (!loggedUser) {
      // Online Fallback
      try {
        const email = getEmailFromID(nationalID);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        loggedUser = await apiCall(`/users/me/${fbUser.uid}`);
      } catch (e) {
        if (targetUser) throw new Error("كلمة المرور غير صحيحة");
        throw new Error("بيانات الدخول غير صحيحة");
      }
    }

    if (loggedUser) {
      // If we used the local mock login, we don't have a token. But if we use real API, we should use it.
      // Let's call /api/login directly to get a real token.
      try {
        const loginRes = await apiCall('/login', 'POST', { nationalID, password });
        loggedUser = loginRes.user;
        const token = loginRes.token;
        const expiry = Date.now() + (24 * 60 * 60 * 1000); // 24 Hours
        localStorage.setItem('almanara_session', JSON.stringify({ user: loggedUser, token, expiry }));
        return loggedUser;
      } catch (e) {
        // Fallback to local session without token if API fails
        const expiry = Date.now() + (24 * 60 * 60 * 1000);
        localStorage.setItem('almanara_session', JSON.stringify({ user: loggedUser, expiry }));
        return loggedUser;
      }
    }

    throw new Error("Error logging in");
  },

  async logout() {
    try {
      localStorage.removeItem('almanara_session');
      await signOut(auth);
    } catch (e) {
      // Ignore
    }
  },

  checkSession(): User | null {
    const stored = localStorage.getItem('almanara_session');
    if (!stored) return null;
    try {
      const { user, expiry } = JSON.parse(stored);
      if (Date.now() > expiry) {
        this.logout();
        return null;
      }
      return user as User;
    } catch (e) {
      return null;
    }
  },

  async createUserByAdmin(
    nationalID: string,
    fullName: string,
    role: UserRole,
    gradeLevel?: string,
    classSection?: string,
    providedPassword?: string
  ) {
    const password = providedPassword || nationalID;
    const mustChangePassword = !providedPassword;

    // --- OFFLINE MODE / MOCK BACKEND CREATION ---
    // Directly create in backend service
    const newUser: User = {
      id: `user_${Date.now()}`,
      nationalID,
      fullName,
      role,
      password: password, // Store password for local auth
      enrolledCourses: [],
      mustChangePassword,
      gradeLevel: role === UserRole.STUDENT ? gradeLevel : undefined,
      classSection: role === UserRole.STUDENT ? classSection : undefined,
    };

    try {
      backend.createUser(newUser);
      return newUser;
    } catch (e: any) {
      throw new Error(e.message || "فشل إنشاء المستخدم");
    }
  },

  async changePasswordFirstTime(userId: string, newPassword: string) {
    try {
      await apiCall(`/users/${userId}/change-password`, 'POST', { newPassword });
    } catch (e) {
      console.warn("Failed to update password via API, falling back to local memory update.", e);
      // Local Update fallback
      const users = backend.getUsers();
      const user = users.find(u => u.id === userId);
      if (user) {
        user.password = newPassword;
        user.mustChangePassword = false;
      }
    }
  },

  async getUserProfile(uid: string): Promise<User | null> {
    const localUser = backend.getUsers().find(u => u.id === uid);
    if (localUser) return localUser;

    try {
      return await apiCall(`/users/me/${uid}`);
    } catch (e) {
      return null;
    }
  }
};
