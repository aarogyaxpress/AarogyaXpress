// src/App.jsx
import { useState, useEffect } from "react"
import Header from "./components/Header"
import ScanCard from "./components/ScanCard"
import QuickActions from "./components/QuickActions"
import FeatureCards from "./components/FeatureCards"
import BottomNav from "./components/BottomNav"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import ScanPage from "./pages/ScanPage"
import LoginPage from "./pages/LoginPage"
import ProfileSetup from "./pages/ProfileSetup"
import Hospital from "./pages/Hospital"
import ServicesPage from "./pages/ServicesPage"
import RemindersPage from "./pages/RemindersPage"
import AnatomyProfile from "./pages/AnatomyProfile"
import MedicalDocAnalyzer from "./pages/MedicalDocAnalyzer"
import DoctorPage from "./pages/DoctorPage"
import AmbulancePage from "./pages/AmbulancePage"
import NetraAI from "./pages/NetraAI"
import ChestXrayAI from "./pages/ChestXrayAI"
import FingerprintBloodGroupResearch from "./pages/FingerprintBloodGroupResearch"
import FamilyPage from "./pages/FamilyPage"
import { auth } from "./firebase"
import { getProfileStatus } from "./lib/profile"
import { MedicineProvider } from "./context/MedicineContext"

function Home() {
  return (
    <>
      <ScanCard />
      <QuickActions />
      <FeatureCards />
    </>
  )
}

function Layout({ children }) {
  return (
    <div className="app-container">
      <Header />
      <div className="scroll-area">{children}</div>
      <BottomNav />
    </div>
  )
}

function OfflineNotice() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  if (!offline) return null
  return (
    <div role="status" style={{ position: "fixed", top: 8, left: 8, right: 8, zIndex: 9999, margin: "0 auto", maxWidth: 460, padding: "9px 12px", borderRadius: 12, background: "#fff4d6", color: "#694f16", boxShadow: "0 3px 12px rgba(0,0,0,.12)", fontSize: 12, fontWeight: 700, textAlign: "center" }}>
      Offline mode: saved medicines, reminders, and reports are available on this device. Login, AI, and cloud sync need internet.
    </div>
  )
}

// Redirects to "/" if the user's profile is already completed
function ProtectedSetup() {
  const [checking, setChecking] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(true)

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { setNeedsSetup(false); setChecking(false); return }
      try {
        const profile = await getProfileStatus()
        setNeedsSetup(!profile.profile_completed)
      } catch {
        setNeedsSetup(true)
      } finally {
        setChecking(false)
      }
    })
    return unsub
  }, [])

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fbf9f2]">
      <div className="w-8 h-8 border-4 border-[#425524] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!auth.currentUser) return <Navigate to="/login" replace />
  return needsSetup ? <ProfileSetup /> : <Navigate to="/" replace />
}

function App() {
  return (
    <MedicineProvider>
      <BrowserRouter>
        <OfflineNotice />
        <Routes>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/setup"    element={<ProtectedSetup />} />
          <Route path="/"         element={<Layout><Home /></Layout>} />
          <Route path="/scan"     element={<Layout><ScanPage /></Layout>} />
          <Route path="/beds"     element={<Layout><Hospital /></Layout>} />
          <Route path="/services" element={<Layout><ServicesPage /></Layout>} />
          <Route path="/reminders" element={<Layout><RemindersPage /></Layout>} />
          <Route path="/profile"  element={<AnatomyProfile />} />
          <Route path="/analyzer" element={<Layout><MedicalDocAnalyzer /></Layout>} />
          <Route path="/doctors"  element={<Layout><DoctorPage /></Layout>} />
          <Route path="/ambulance" element={<Layout><AmbulancePage /></Layout>} />
          <Route path="/netra"    element={<Layout><NetraAI /></Layout>} />
          <Route path="/xray"     element={<Layout><ChestXrayAI /></Layout>} />
          <Route path="/fingerprint-research" element={<Layout><FingerprintBloodGroupResearch /></Layout>} />
          <Route path="/family"   element={<Layout><FamilyPage /></Layout>} />
        </Routes>
      </BrowserRouter>
    </MedicineProvider>
  )
}

export default App
