import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";

export default function Landing() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="landing-page">
      {/* Navigation Header */}
      <header className="landing-nav">
        <div className="landing-nav-container">
          <Link to="/" className="landing-brand" onClick={() => setMobileMenuOpen(false)}>
            <span className="brand-leaf">🌿</span>
            <span className="brand-name">Ekyama</span>
            <span className="brand-tag">Uganda Clinical AI</span>
          </Link>

          {/* Desktop Anchor Links */}
          <nav className="landing-links desktop-only">
            <a href="#mission">The Mission</a>
            <a href="#humanitarian">Why It Matters</a>
            <a href="#clinical-examples">Clinical Examples</a>
            <a href="#how-it-works">How It Works</a>
          </nav>

          {/* Desktop Actions & Mobile Toggle */}
          <div className="landing-auth-actions">
            <div className="landing-desktop-auth desktop-only">
              {user ? (
                <Link to={user.role === "admin" ? "/admin" : user.role === "reviewer" ? "/review" : "/work"} className="primary landing-btn">
                  Go to Portal →
                </Link>
              ) : (
                <>
                  <Link to="/login" className="ghost landing-login-btn">
                    Sign In
                  </Link>
                  <Link to="/login?mode=register" className="primary landing-btn">
                    Join the Mission
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              className={`mobile-menu-toggle ${mobileMenuOpen ? "open" : ""}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
            >
              <span className="hamburger-icon">
                <span className="line"></span>
                <span className="line"></span>
                <span className="line"></span>
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="landing-mobile-drawer">
            <nav className="mobile-nav-links">
              <a href="#mission" onClick={() => setMobileMenuOpen(false)}>
                <span className="nav-icon">🎯</span>
                <div className="nav-text">
                  <strong>The Mission</strong>
                  <small>Emergency triage & clinical AI</small>
                </div>
              </a>
              <a href="#humanitarian" onClick={() => setMobileMenuOpen(false)}>
                <span className="nav-icon">❤️</span>
                <div className="nav-text">
                  <strong>Why It Matters</strong>
                  <small>Beyond token rewards: saving lives</small>
                </div>
              </a>
              <a href="#clinical-examples" onClick={() => setMobileMenuOpen(false)}>
                <span className="nav-icon">🔬</span>
                <div className="nav-text">
                  <strong>Clinical Examples</strong>
                  <small>Flawed machine vs doctor-verified Luganda</small>
                </div>
              </a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>
                <span className="nav-icon">📋</span>
                <div className="nav-text">
                  <strong>How It Works</strong>
                  <small>Claim, refine, verify, MoMo payout</small>
                </div>
              </a>
            </nav>

            <div className="mobile-drawer-auth">
              {user ? (
                <Link
                  to={user.role === "admin" ? "/admin" : user.role === "reviewer" ? "/review" : "/work"}
                  className="primary mobile-action-btn"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Go to Portal Dashboard →
                </Link>
              ) : (
                <>
                  <Link
                    to="/login?mode=register"
                    className="primary mobile-action-btn"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Join the Mission (Create Account) →
                  </Link>
                  <Link
                    to="/login"
                    className="ghost mobile-action-btn"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In to Existing Account
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Backdrop overlay when mobile menu is open */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Hero Section */}
      <section className="landing-hero" id="mission">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="pulse-dot"></span>
            HUMANITARIAN HEALTHCARE INITIATIVE • UGANDA
          </div>
          <h1 className="hero-title">
            Words That Heal: Teaching AI to Speak Luganda in Ugandan Hospitals
          </h1>
          <p className="hero-subtitle">
            A single mistranslation in an emergency triage room or maternity ward can cost a patient their life.
            Help us correct clinical translations from English to Luganda so that every doctor, nurse, and patient
            can communicate with life-saving accuracy.
          </p>

          <div className="hero-cta-group">
            {user ? (
              <Link to="/work" className="primary hero-primary-btn">
                Continue Translating Tasks →
              </Link>
            ) : (
              <Link to="/login?mode=register" className="primary hero-primary-btn">
                Start Validating Sentences →
              </Link>
            )}
            <a href="#humanitarian" className="ghost hero-secondary-btn">
              Read Why Your Voice Matters ↓
            </a>
          </div>

          <div className="hero-stats-grid">
            <div className="stat-card">
              <span className="stat-number">16,000+</span>
              <span className="stat-label">Clinical Dialogues</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">100%</span>
              <span className="stat-label">Doctor-Verified QA</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">UGX 10M</span>
              <span className="stat-label">Community Fund Pool</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">Instant</span>
              <span className="stat-label">MTN & Airtel MoMo</span>
            </div>
          </div>
        </div>
      </section>

      {/* Humanitarian Section: Why Your Voice Matters */}
      <section className="humanitarian-section" id="humanitarian">
        <div className="section-container">
          <div className="humanitarian-banner">
            <div className="heart-icon">❤️</div>
            <div>
              <span className="banner-subtitle">A Token of Appreciation, A Lifetime of Impact</span>
              <h2>Beyond the Money: The Life You Save Today</h2>
            </div>
          </div>

          <div className="humanitarian-content-grid">
            <div className="humanitarian-narrative">
              <p className="lead-paragraph">
                Let's be completely transparent: <strong>the rewards on this platform will not make anyone wealthy</strong>.
                Each corrected sentence offers a modest appreciation stipend of UGX 100 to 2,000 via MTN MoMo and Airtel Money
                to cover your data and time.
              </p>
              <p>
                <strong>The true reason to translate is far bigger:</strong> In clinics and referral hospitals across Uganda,
                over 80% of patients express their deepest pain, symptoms, and medical history in Luganda. Yet diagnostic protocols,
                medical records, foreign medical doctors, and clinical software operate almost entirely in English.
              </p>
              <p>
                When a mother rushes a convulsing toddler into emergency triage at 2:00 AM, confusion between <em>"okusimbibwa"</em> and
                <em>"ensimbu"</em> can delay anti-epileptic treatment by hours. When an elderly grandfather describes chest tightness, missing
                the nuance of <em>"obulumi obusala"</em> can mask a cardiac arrest.
              </p>
              <div className="quote-box">
                <blockquote>
                  "You are not just typing words into a website. You are teaching an AI physician to understand the heartbeat of our people."
                </blockquote>
                <cite>— Ugandan Clinical Triage Working Group</cite>
              </div>
            </div>

            <div className="humanitarian-cards">
              <div className="cause-card">
                <div className="cause-icon">🤱</div>
                <h3>Maternal & Infant Safety</h3>
                <p>
                  Prevent fatal delays in labor wards by ensuring symptoms like acute abdominal cramping and postpartum hemorrhage
                  are instantly understood.
                </p>
              </div>

              <div className="cause-card">
                <div className="cause-icon">🏥</div>
                <h3>Rural Clinic Support</h3>
                <p>
                  Equip Village Health Teams (VHTs) and community nurses with an AI translator that speaks fluent, respectful, and
                  culturally accurate Luganda.
                </p>
              </div>

              <div className="cause-card">
                <div className="cause-icon">💊</div>
                <h3>Prescription & Dosage Precision</h3>
                <p>
                  Eliminate toxic medication errors by accurately translating dosage instructions for hypertension, diabetes, and malaria regimens.
                </p>
              </div>

              <div className="cause-card">
                <div className="cause-icon">🇺🇬</div>
                <h3>Preserving Our Language in Technology</h3>
                <p>
                  Ensure Luganda is not left behind as artificial intelligence revolutionizes global medicine. Your translations belong to our collective heritage.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real Clinical Examples */}
      <section className="examples-section" id="clinical-examples">
        <div className="section-container">
          <div className="section-heading-center">
            <span className="section-tag">REAL CLINICAL EVIDENCE</span>
            <h2>How Machine Translation Fails — And How You Fix It</h2>
            <p className="section-desc">
              Standard AI translation models hallucinate or pick the wrong clinical meanings. Look at these real examples from our dataset:
            </p>
          </div>

          <div className="clinical-cards-grid">
            <div className="clinical-card">
              <div className="clinical-card-header">
                <span className="case-badge emergency">Pediatric Emergency</span>
                <span className="case-id">Sentence #104</span>
              </div>
              <div className="clinical-field">
                <label>English Clinical Prompt</label>
                <p className="english-prompt">"Has the child had convulsive seizures or vomited everything they drink?"</p>
              </div>
              <div className="clinical-comparison">
                <div className="comparison-box flawed">
                  <span className="status-label error">❌ Flawed Machine AI Attempt</span>
                  <p>"Omwana alina okusimbibwa oba okusesema byonna by'anywa?"</p>
                  <span className="flaw-note">Dangerous: Confuses convulsions with 'okusimbibwa', obscuring neurological distress.</span>
                </div>
                <div className="comparison-box verified">
                  <span className="status-label success">✓ Your Corrected Translation</span>
                  <p>"Omwana abaddemu ensimbu oba okusesema buli ky'anywa?"</p>
                  <span className="flaw-note">Accurate: Immediately alerts the medical officer to acute cerebral malaria or meningitis.</span>
                </div>
              </div>
            </div>

            <div className="clinical-card">
              <div className="clinical-card-header">
                <span className="case-badge cardiology">Cardiology & Triage</span>
                <span className="case-id">Sentence #101</span>
              </div>
              <div className="clinical-field">
                <label>English Clinical Prompt</label>
                <p className="english-prompt">"Do you experience sharp, stabbing pain in your chest when inhaling deeply?"</p>
              </div>
              <div className="clinical-field comparison">
                <div className="comparison-box flawed">
                  <span className="status-label error">❌ Flawed Machine AI Attempt</span>
                  <p>"Ono wulira obulumi obusala mu kifuba ng'ossaamu omukka omungi?"</p>
                  <span className="flaw-note">Inaccurate: Fails to capture the stabbing, knife-like quality critical for pleurisy triage.</span>
                </div>
                <div className="comparison-box verified">
                  <span className="status-label success">✓ Your Corrected Translation</span>
                  <p>"Owulira obulumi obusala ng'obw'ekiso mu kifuba ng'ossaamu omukka ogw'amaanyi?"</p>
                  <span className="flaw-note">Accurate: Culturally and clinically exact phrasing recognized by patients across Buganda.</span>
                </div>
              </div>
            </div>

            <div className="clinical-card">
              <div className="clinical-card-header">
                <span className="case-badge obstetrics">Maternal Health</span>
                <span className="case-id">Sentence #102</span>
              </div>
              <div className="clinical-field">
                <label>English Clinical Prompt</label>
                <p className="english-prompt">"Have you noticed any dark blood clots in your stool over the past three days?"</p>
              </div>
              <div className="clinical-field comparison">
                <div className="comparison-box flawed">
                  <span className="status-label error">❌ Flawed Machine AI Attempt</span>
                  <p>"Olabyeko omusaayi omukwafu mu bubi bwo mu nnaku essatu eziyise?"</p>
                  <span className="flaw-note">Crude: Uses insensitive wording that causes embarrassment and clinical miscommunication.</span>
                </div>
                <div className="comparison-box verified">
                  <span className="status-label success">✓ Your Corrected Translation</span>
                  <p>"Olabyeko ebitole by'omusaayi omukwafu omuddugavu mu bulyo bwo mu nnaku essatu eziyise?"</p>
                  <span className="flaw-note">Respectful & Precise: Clarifies gastrointestinal bleeding while respecting patient dignity.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section" id="how-it-works">
        <div className="section-container">
          <div className="section-heading-center">
            <span className="section-tag">SIMPLE WORKFLOW</span>
            <h2>How You Participate in 3 Steps</h2>
            <p className="section-desc">
              You don't need to be a medical professional to participate. All you need is fluency in English and Luganda, and a heart for healthcare.
            </p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Claim a Sentence</h3>
              <p>
                Log in and receive a clinical prompt. You have 15 minutes to review the English source sentence alongside the AI's first attempt.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Refine in Natural Luganda</h3>
              <p>
                Fix grammatical errors, clinical terminology, and tone. If the AI was completely accurate, confirm it with one click.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Reviewed by Doctors & Paid</h3>
              <p>
                Our panel of Ugandan medical reviewers clinically verifies your work. Request instant cashout directly to your MTN or Airtel Mobile Money phone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Community Call to Action */}
      <section className="landing-cta-banner">
        <div className="cta-container">
          <h2>Ready to Lend Your Words to Save Lives?</h2>
          <p>
            Join bilingual Ugandans giving healthcare a voice that every mother, child, and patient can understand.
            15 minutes of your day can make all the difference in a hospital ward tomorrow.
          </p>
          <div className="cta-buttons-row">
            {user ? (
              <Link to="/work" className="primary cta-btn">
                Go to Validation Dashboard →
              </Link>
            ) : (
              <>
                <Link to="/login?mode=register" className="primary cta-btn">
                  Create Validator Account →
                </Link>
                <Link to="/login" className="ghost cta-secondary-btn">
                  Sign In to Existing Account
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-left">
            <span className="footer-logo">🌿 Ekyama</span>
            <p className="hint">
              Crowdsourced English-to-Luganda Clinical Translation Validation Platform.
              Dedicated to clinical safety, health equity, and linguistic heritage across Uganda.
            </p>
          </div>
          <div className="footer-right">
            <div className="footer-links">
              <Link to="/login">Sign In</Link>
              <Link to="/login?mode=register">Join as Validator</Link>
              <Link to="/reset-password">Reset Password</Link>
            </div>
            <p className="hint copyright">© 2026 Ekyama Health Initiative. Open healthcare translation project.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
