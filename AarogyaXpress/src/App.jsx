// src/App.jsx
import { useState, useEffect } from "react"
import Header from "./components/Header"
import ScanCard from "./components/ScanCard"
import QuickActions from "./components/QuickActions"
import FeatureCards from "./components/FeatureCards"
import BottomNav from "./components/BottomNav"
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom"
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
import FamilyPage from "./pages/FamilyPage"
import { auth } from "./firebase"
import { supabase } from "./lib/supabase"
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

// Redirects to "/" if the user's profile is already completed
function ProtectedSetup() {
  const [checking, setChecking] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(true)

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { setChecking(false); return }
      try {
        const { data } = await supabase
          .from("users")
          .select("profile_completed")
          .eq("firebase_uid", user.uid)
          .single()
        setNeedsSetup(!data?.profile_completed)
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

  return needsSetup ? <ProfileSetup /> : <Navigate to="/" replace />
}

function App() {
  return (
    <MedicineProvider>
      <BrowserRouter>
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
          <Route path="/family"   element={<Layout><FamilyPage /></Layout>} />
        </Routes>
      </BrowserRouter>
    </MedicineProvider>
  )
}

export default App
