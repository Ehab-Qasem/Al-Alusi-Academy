# Agent Handover Documentation - Al-Alusi Secondary Academy (Al-Manara LMS)

## ✅ Project Status: ACTIVE DEVELOPMENT (Offline Mode)
**Current State:** The application is fully functional for local development and testing. 
It uses a **Hybrid Architecture** where data is persisted to `localStorage` via a `MockBackendService`, bypassing the need for a live MongoDB connection during development (due to network restrictions).

---

## 🏗️ Technical Architecture

### 1. Frontend (Vite + React)
- **Framework:** React 18 with TypeScript.
- **Build Tool:** Vite (Replaced Create-React-App).
- **Styling:** TailwindCSS + Lucide Icons.
- **State/Data:** 
    - `services/mockBackend.ts`: Handles all data operations.
    - `OFFLINE_MODE = true`: Forces all calls to use `localStorage` ('almanara_*' keys) instead of API calls.

### 2. Backend (Express.js)
- **Role:** Currently serves as a shell and static file server. 
- **Database:** MongoDB code is present but **bypassed** by the frontend in current mode.
- **Uploads:** configured in `server/index.js` but frontend is currently using direct imports/offline data for demo purposes.

---

## 🌟 Key Features Implemented

### 1. Administrative Control (`/admin`)
- **User Management:** 
    - Full CRUD for Students, Teachers, Admins.
    - **Structured Grades:** New system to define Grades (e.g., "3rd Secondary") and Sections.
    - **Dependent Filtering:** Filter users by Role -> Grade -> Section.
- **Password Security:**
    - "Show/Hide" toggle on all password fields.
    - Force Password Change logic for new users.
    - Locked roles in Edit mode.

### 2. Teacher Tools (`/teacher`)
- **Student Tracking:** View students filtered by Grade/Section.
- **Course Manager:** Manage course content (Video/PDF).
- **Question Bank:** Create/Delete questions.

### 3. Student Portal (`/student`) - *In Progress*
- View Enrolled Courses.
- Take Mock Exams.

---

## 🛠️ Development Commands

1.  **Start Development Server:**
    ```bash
    npm run dev
    ```
    *Starts both Frontend (Vite @ 3000) and Backend (Express @ 5000) concurrently.*

2.  **Build for Production:**
    ```bash
    npm run build
    ```

---

## ⚠️ Known Notes for Handover
1.  **Authentication:**
    - The system currently uses a simplified offline auth check against `mockBackend` users.
    - **Default Admin:** User: `1`, Pass: `1`.
2.  **Data Persistence:**
    - If you clear browser cache/Local Storage, all created users and grades will be lost (except hardcoded seeds).
3.  **Deployment:**
    - To deploy to production with a real DB, `OFFLINE_MODE` in `mockBackend.ts` must be set to `false`, and MongoDB Atlas connection in `.env` must be active.

## � Detailed Session Log

### Session Started: 2026-01-09

#### 1. Password Visibility & Security
- **[UI]** Added `Eye` / `EyeOff` icons to Login Page password field.
- **[UI]** Added `Eye` / `EyeOff` icons to Force Change Password Modal.
- **[UI]** Added `Eye` / `EyeOff` icons to Admin "Add User" and "Edit User" modals.
- **[Logic]** Implemented strict password validation (8-20 chars, mixed case, numbers).

#### 2. User User Management Refactor
- **[Backend]** Added `updateUser` method to `MockBackendService` to support user edits.
- **[Feature]** Created "Edit User" Modal in `AdminDashboard`.
- **[Logic]** Locked "Role" field during editing.
- **[Logic]** Admin can now set a custom password during edit (bypassing force change).

#### 3. Structured Grade & Section System
- **[Data Model]** Updated `types.ts` to include `SchoolGrade` interface.
- **[Backend]** Updated `mockBackend.ts` to store/retrieve/seed `schoolGrades`.
- **[Feature]** Created `SchoolStructureManager.tsx` (Admin -> Structure Tab).
    - Allows adding/deleting Grades.
    - Allows adding/removing Sections within Grades.
- **[Refactor]** Updated `AdminDashboard` > User Management:
    - Replaced free-text Grade/Section inputs with Dropdowns populated from `SchoolStructureManager`.
    - Added Filter Bar support for Grade -> Section dependency.
- **[Refactor]** Updated `TeacherDashboard` > Student List:
    - Added Filter Bar support for Grade -> Section dependency.

#### 4. Documentation
- **[Docs]** Updated `AGENT_HANDOVER.md` to reflect Offline Mode architecture.
- **[Docs]** Established this Detailed Log for future tracking.

#### 5. Dashboard Redesign (Premium Update)
- **[Refactor]** Converted `AdminDashboard` to a "Premium Home" with stats and quick actions.
- **[Refactor]** Split Admin Tabs into independent pages (`AdminUsersPage`, etc.).
- **[UI]** Updated `DashboardLayout` Sidebar to include new independent routes.
- **[Fix]** Fixed Sidebar text visibility in Light Mode (was invisible `text-gray-50`).

*(Continuing to log changes...)*
