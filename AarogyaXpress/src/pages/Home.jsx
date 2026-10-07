import ScanCard from "../components/ScanCard"
import QuickActions from "../components/QuickActions"
import FeatureCard from "../components/FeatureCards"
import BottomNav from "../components/BottomNav"

function Home() {
  return (
    <div style={{padding:"20px", maxWidth:"500px", margin:"auto"}}>
      
      <ScanCard />

      <QuickActions />

      <FeatureCard 
        title="Netra AI"
        description="Advanced Eye & Retinal Disease Detection"
        color="#7b5cff"
      />

      <FeatureCard 
        title="Hospital Beds"
        description="Live capacity & instant appointment booking"
        color="#ff6b6b"
      />

      <FeatureCard 
        title="Vaccination Hub"
        description="Digital records & upcoming drive alerts"
        color="#1bbf7a"
      />

      <BottomNav />

    </div>
  )
}

export default Home