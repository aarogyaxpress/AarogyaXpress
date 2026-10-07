// src/components/HeroBanner.jsx
export default function HeroBanner() {
  return (
    <div className="hero-section">
      <div className="hero-card">
        {/* Animated Background Elements */}
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/5 rounded-full animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute -bottom-16 right-10 w-36 h-36 bg-white/5 rounded-full animate-float" style={{ animationDelay: '1s' }} />
        
        <div className="hero-tags animate-fade-in-up delay-100">
          <span className="tag tag-tech">Tech-Powered</span>
          <span className="tag tag-ai">AI</span>
        </div>
        <div className="hero-title animate-fade-in-up delay-200">Scan Medicine</div>
        <div className="hero-subtitle animate-fade-in-up delay-200">दवाई स्कैन करें</div>
        <div className="hero-desc animate-fade-in-up delay-300">Instantly identify medications and check safety alerts.</div>
        
        <div className="hero-actions animate-scale-in delay-400">
          <div className="hero-action-btn btn-white hover:scale-110 active:scale-95 transition-transform">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </div>
          <div className="hero-action-btn btn-outline hover:bg-white/20 transition-colors animate-pulse-soft">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
          </div>
        </div>
        
        <div className="hero-dots">
          <div className="dot active"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
        
        <div className="hero-right-icons">
          <div className="side-icon animate-fade-in-right delay-100 hover:bg-white/20 transition-colors animate-float" style={{ animationDuration: '4s' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          </div>
          <div className="side-icon animate-fade-in-right delay-200 hover:bg-white/20 transition-colors animate-float" style={{ animationDuration: '5s' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          </div>
          <div className="side-icon animate-fade-in-right delay-300 hover:bg-white/20 transition-colors animate-float" style={{ animationDuration: '4.5s' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
          </div>
        </div>
      </div>
    </div>
  )
}