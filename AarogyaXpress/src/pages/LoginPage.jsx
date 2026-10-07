import { useState } from "react";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, provider } from "../firebase";
import { useNavigate } from "react-router-dom";
import { saveUserToSupabase } from "../lib/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [activeForm, setActiveForm] = useState(null);
  
  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      const { needsSetup } = await saveUserToSupabase(result.user);
      navigate(needsSetup ? "/setup" : "/");
    } catch (error) {
      console.error("Login Error:", error);
      alert("Login Failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (isSignup = false) => {
    if (!email || !password) return alert("Please enter email and password.");
    try {
      setLoading(true);
      let result;
      if (isSignup) {
        result = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        result = await signInWithEmailAndPassword(auth, email, password);
      }
      const { needsSetup } = await saveUserToSupabase(result.user);
      navigate(needsSetup ? "/setup" : "/");
    } catch (error) {
      console.error("Auth Error:", error);
      alert("Authentication Failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <style>{`
        .login-wrapper { font-family:'Nunito Sans',sans-serif;background:var(--cream);display:flex;justify-content:center;min-height:100vh;width:100%; }
        .login-wrapper * { box-sizing: border-box; margin: 0; padding: 0; }
        .phone{width:100%;max-width:480px;min-height:100vh;background:var(--cream);display:flex;flex-direction:column;position:relative}
        .header{background:linear-gradient(180deg,var(--olive-dark) 0%,var(--olive-med) 100%);padding:24px 22px 20px;display:flex;justify-content:space-between;align-items:center}
        .hdr-logo{display:flex;align-items:center;gap:10px}
        .logo-icon{width:38px;height:38px;background:rgba(255,255,255,0.13);border-radius:12px;border:1px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center}
        .logo-text{font-family:'Nunito',sans-serif;font-size:16px;font-weight:900;color:#fff}
        .logo-text span{color:#a8c47a}
        .icon-btn{width:36px;height:36px;background:rgba(255,255,255,0.13);border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.18);cursor:pointer}
        .scroll{flex:1;overflow-y:auto;padding-bottom:32px;scrollbar-width:none}
        .scroll::-webkit-scrollbar{display:none}

        /* HERO */
        .hero-section{padding:18px 18px 0}
        .hero-card{background:linear-gradient(145deg,var(--olive) 0%,var(--olive-dark) 100%);border-radius:26px;padding:24px 22px;position:relative;overflow:hidden;min-height:168px}
        .hero-card::before{content:'';position:absolute;top:-50px;right:-50px;width:200px;height:200px;background:rgba(255,255,255,0.05);border-radius:50%}
        .hero-tags{display:flex;gap:7px;margin-bottom:12px; position:relative; z-index:10;}
        .tag{border-radius:20px;padding:3px 11px;font-size:10px;font-weight:700;font-family:'Nunito',sans-serif}
        .tag-t{background:rgba(255,255,255,0.15);color:rgba(255,255,255,0.9)}
        .tag-g{background:var(--sage);color:#fff}
        .hero-title{position:relative; z-index:10; font-family:'Nunito',sans-serif;font-size:28px;font-weight:900;color:#fff;line-height:1.1;margin-bottom:5px}
        .hero-sub{position:relative; z-index:10; font-size:11px;color:rgba(255,255,255,0.6);margin-bottom:8px}
        .hero-desc{position:relative; z-index:10; font-size:13px;color:rgba(255,255,255,0.8);line-height:1.5;max-width:220px}

        /* SECTION HEADER */
        .sec-hdr{display:flex;justify-content:space-between;align-items:flex-end;padding:22px 18px 12px}
        .sec-title{font-family:'Nunito',sans-serif;font-size:19px;font-weight:900;color:var(--text-primary)}
        .sec-sub{font-size:11px;color:var(--text-muted);margin-top:2px}

        /* AUTH CARDS */
        .auth-cards{padding:0 18px;display:flex;flex-direction:column;gap:12px}
        .auth-card{background:#fff;border-radius:22px;padding:16px 18px;display:flex;align-items:center;gap:14px;box-shadow:0 3px 16px rgba(0,0,0,0.06);cursor:pointer;border:none;width:100%;text-align:left; transition:transform 0.1s;}
        .auth-card:active{transform:scale(0.98)}
        .auth-icon{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .aig{background:#f0f4fe}
        .aie{background:#eef3e4}
        .auth-with{font-size:11px;color:var(--text-muted);font-family:'Nunito Sans',sans-serif;margin:0}
        .auth-name{font-size:16px;font-weight:900;color:var(--text-primary);font-family:'Nunito',sans-serif;margin:0}
        .auth-arrow{width:32px;height:32px;background:var(--surface);border-radius:50%;display:flex;align-items:center;justify-content:center;margin-left:auto;flex-shrink:0}

        /* DIVIDER */
        .divider{display:flex;align-items:center;gap:12px;padding:20px 18px 0}
        .div-line{flex:1;height:1px;background:#e0ddd5}
        .div-txt{font-size:11px;color:#b0b8a0;font-weight:600;font-family:'Nunito Sans',sans-serif;white-space:nowrap}

        /* EMAIL FIELDS */
        .email-section{padding:16px 18px 0}
        .field-label{font-size:13px;font-weight:700;color:var(--olive-dark);font-family:'Nunito',sans-serif;display:block;margin-bottom:6px}
        .field-wrap{display:flex;align-items:center;border:1.5px solid #e0ddd5;border-radius:16px;padding:13px 16px;background:#fff;margin-bottom:12px}
        .field-wrap input{margin-left:10px;flex:1;outline:none;border:none;background:transparent;font-size:14px;font-family:'Nunito Sans',sans-serif;color:var(--text-primary)}
        .field-wrap input::placeholder{color:#c0bdb5}
        .pw-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
        .forgot{font-size:12px;color:var(--olive-light);font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;background:none;border:none;padding:0}
        .cta-btn{width:100%;background:linear-gradient(135deg,var(--olive),var(--olive-dark));color:#fff;border:none;border-radius:16px;padding:15px;font-size:15px;font-weight:800;font-family:'Nunito',sans-serif;cursor:pointer;box-shadow:0 6px 20px rgba(62,78,38,0.32);margin-top:4px;letter-spacing:0.2px}
        .cta-btn:active{transform:scale(0.98)}

        /* BOTTOM */
        .signup-row{display:flex;align-items:center;justify-content:center;gap:5px;padding:20px 18px 0}
        .signup-txt{font-size:13px;color:var(--text-muted);font-family:'Nunito Sans',sans-serif}
        .signup-lnk{font-size:13px;font-weight:800;color:var(--olive-light);font-family:'Nunito',sans-serif;background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:3px}
        .terms{text-align:center;padding:14px 18px 0;font-size:11px;color:#b0b8a0;font-family:'Nunito Sans',sans-serif;line-height:1.5}
      `}</style>

      <div className="phone">
        <div className="scroll pt-8 flex flex-col">
          <div className="hero-section">
            <div className="hero-card">
              <div className="hero-tags">
                <span className="tag tag-t">Secure Login</span>
                <span className="tag tag-g">Built for India 🇮🇳</span>
              </div>
              <div className="hero-title">Welcome To,<br />Aarogya Xpress</div>
              <div className="hero-sub">अपने स्वास्थ्य खाते में लॉगिन करें</div>
              <div className="hero-desc">Access your pill tracker, health records and more.</div>
            </div>
          </div>

          <div className="sec-hdr">
            <div>
              <div className="sec-title">Sign In</div>
              <div className="sec-sub">Choose how you want to continue</div>
            </div>
          </div>

          <div className="auth-cards">
            <button className="auth-card" onClick={handleGoogleLogin}>
              <div className="auth-icon aig">
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              <div>
                <p className="auth-with">continue with</p>
                <p className="auth-name">Google</p>
              </div>
              <div className="auth-arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5a6e3a" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
              </div>
            </button>

            <button className={`auth-card ${activeForm === 'email' ? 'ring-2 ring-[#7a9448]' : ''}`} onClick={() => setActiveForm(activeForm === 'email' ? null : 'email')}>
              <div className="auth-icon aie">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5a6e3a" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              </div>
              <div>
                <p className="auth-with">continue with</p>
                <p className="auth-name">Email</p>
              </div>
              <div className="auth-arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5a6e3a" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
              </div>
            </button>

            <button className={`auth-card ${activeForm === 'phone' ? 'ring-2 ring-[#7a9448]' : ''}`} onClick={() => setActiveForm(activeForm === 'phone' ? null : 'phone')}>
              <div className="auth-icon" style={{ background: '#fff3e8' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c88010" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" /></svg>
              </div>
              <div>
                <p className="auth-with">continue with</p>
                <p className="auth-name">Phone Number</p>
              </div>
              <div className="auth-arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5a6e3a" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
              </div>
            </button>
          </div>

          {activeForm === 'phone' && (
            <div className="animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="divider">
                <div className="div-line"></div>
                <span className="div-txt">ENTER PHONE NUMBER</span>
                <div className="div-line"></div>
              </div>

              <div className="email-section">
                <label className="field-label">Phone Number</label>
                <div className="field-wrap" style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '10px', borderRight: '1px solid #e0ddd5', flexShrink: '0' }}>
                    <span style={{ fontSize: '16px', lineHeight: '1' }}>🇮🇳</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e2a12', fontFamily: "'Nunito',sans-serif" }}>+91</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8a9a7a" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                  </div>
                  <input type="tel" placeholder="98765 43210" />
                </div>
                <button style={{ width: '100%', background: 'linear-gradient(135deg,#5a6e3a,#3e4e26)', color: '#fff', border: 'none', borderRadius: '16px', padding: '15px', fontSize: '15px', fontWeight: '800', fontFamily: "'Nunito',sans-serif", cursor: 'pointer', boxShadow: '0 6px 20px rgba(62,78,38,0.32)', letterSpacing: '0.2px', marginBottom: '0' }}>
                  Send OTP
                </button>
              </div>
            </div>
          )}

          {activeForm === 'email' && (
            <div className="animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="divider">
                <div className="div-line"></div>
                <span className="div-txt">ENTER EMAIL ADDRESS</span>
                <div className="div-line"></div>
              </div>

              <div className="email-section">
                <label className="field-label">Email Address</label>
                <div className="field-wrap">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a9a7a" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  <input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div className="pw-row">
                  <label className="field-label" style={{ margin: '0' }}>Password</label>
                  <button className="forgot">Forgot?</button>
                </div>
                <div className="field-wrap" style={{ marginTop: '6px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a9a7a" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c0bdb5" strokeWidth="2" style={{ cursor: 'pointer', marginLeft: '6px' }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                </div>

                <button className="cta-btn" disabled={loading} onClick={() => handleEmailAuth(false)}>
                  {loading ? 'Authenticating...' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          <div className="signup-row">
            <span className="signup-txt">Don't have an account?</span>
            <button className="signup-lnk" disabled={loading} onClick={() => {
              if (activeForm !== 'email') {
                setActiveForm('email');
              } else {
                handleEmailAuth(true); // Trigger Signup
              }
            }}>
              Create Account
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7a9448" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </button>
          </div>

          <div className="terms">By continuing you agree to our Terms of Service and Privacy Policy</div>

          <div className="mt-auto pt-16 pb-6 flex flex-col items-center justify-center w-full text-center">
            <div className="w-12 h-[3px] bg-gradient-to-r from-transparent via-[#8aab5c]/40 to-transparent rounded-full mb-5"></div>

            <div className="text-[11px] font-extrabold text-[#8a9a7a] font-['Nunito_Sans'] mb-1">
              Facing issues? Reach to:
            </div>
            <div className="text-[11px] font-bold text-[#8aab5c] font-['Nunito_Sans'] mb-6 flex items-center justify-center gap-2">
              <a href="mailto:support@aarogyaxpress.in" className="hover:underline">support@aarogyaxpress.in</a>
              <span className="text-[#8a9a7a] opacity-50">|</span>
              <a href="tel:+919412856627" className="hover:underline">+91 9412856627</a>
            </div>

            <div className="text-[11px] text-[#b0b8a0] font-bold font-['Nunito_Sans']">
              Made with ❤️ By India For The World.
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}