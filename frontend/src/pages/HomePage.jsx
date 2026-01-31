import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, Mail, TrendingUp, ArrowRight, Star } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const developerTypes = [
  'Frontend Developers',
  'Backend Developers', 
  'AI Engineers',
  'Full Stack Developers',
  'DevOps Engineers',
  'Mobile Developers',
  'Data Scientists'
];

const HomePage = () => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = developerTypes[currentWordIndex];
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setCurrentText(currentWord.substring(0, currentText.length + 1));
        if (currentText === currentWord) {
          setTimeout(() => setIsDeleting(true), 1800);
        }
      } else {
        setCurrentText(currentWord.substring(0, currentText.length - 1));
        if (currentText === '') {
          setIsDeleting(false);
          setCurrentWordIndex((prev) => (prev + 1) % developerTypes.length);
        }
      }
    }, isDeleting ? 40 : 80);

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, currentWordIndex]);


  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={styles.page}>
      <Navbar />

      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>
            <span style={styles.titleLine}>Find the Best</span>
            <span style={styles.typingWrapper}>
              <span style={styles.typingText}>{currentText}</span>
              <span style={styles.cursor}>|</span>
            </span>
            <span style={styles.titleLine}>Before Your Competitors Do</span>
          </h1>
          <p style={styles.heroSubtitle}>
            AI-powered Tech talent sourcing that finds, scores, and helps you reach out to top developers. Get 10x more responses than traditional recruiting.
          </p>
          <div style={styles.heroCta}>
            <Link to="/signup" style={styles.primaryBtn}>
              Start Free Trial <ArrowRight size={20} />
            </Link>
            <Link to="/pricing" style={styles.secondaryBtn}>
              View Pricing
            </Link>
          </div>
          <div style={styles.heroStats}>
            <div style={styles.stat}>
              <span style={styles.statNumber}>300+</span>
              <span style={styles.statLabel}>Profiles per search</span>
            </div>
            <div style={styles.statDivider}></div>
            <div style={styles.stat}>
              <span style={styles.statNumber}>35-45%</span>
              <span style={styles.statLabel}>Response rate</span>
            </div>
            <div style={styles.statDivider}></div>
            <div style={styles.stat}>
              <span style={styles.statNumber}>10x</span>
              <span style={styles.statLabel}>Faster sourcing</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={styles.features}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Why TalentBox?</h2>
          <p style={styles.sectionSubtitle}>Everything you need to find and hire top developers</p>
          
          <div style={styles.featureGrid}>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}><Search size={28} color="#FF6B35" /></div>
              <h3 style={styles.featureTitle}>Smart Developer Search</h3>
              <p style={styles.featureDesc}>Search developers by roles, skills, contributions, tech stack, projects, and more. Find exactly who you need with precision filters.</p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}><Users size={28} color="#FF6B35" /></div>
              <h3 style={styles.featureTitle}>Role-Based Hiring</h3>
              <p style={styles.featureDesc}>There's huge demand for tech talent. Don't miss the best developers — hire by specific roles, expertise levels, and specializations.</p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}><TrendingUp size={28} color="#FF6B35" /></div>
              <h3 style={styles.featureTitle}>AI Developer Scoring</h3>
              <p style={styles.featureDesc}>Every developer gets a 0-100 quality score based on contributions, code quality, and activity patterns.</p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}><Mail size={28} color="#FF6B35" /></div>
              <h3 style={styles.featureTitle}>Personalized Outreach</h3>
              <p style={styles.featureDesc}>AI-crafted emails that reference specific projects and contributions. Get 35-45% response rates vs 2-5% industry average.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={styles.howItWorks}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>How It Works</h2>
          <p style={styles.sectionSubtitle}>Three simple steps to find your next hire</p>
          
          <div style={styles.stepsGrid}>
            <div style={styles.step}>
                <div style={styles.stepNumber}>1</div>
                <h3 style={styles.stepTitle}>Search by Role</h3>
                <p style={styles.stepDesc}>Search by role, skills, location, and experience. Find developers that match your exact requirements.</p>
             </div>
              <div style={styles.stepArrow}>→</div>
              <div style={styles.step}>
                <div style={styles.stepNumber}>2</div>
                <h3 style={styles.stepTitle}>Score & Save</h3>
                <p style={styles.stepDesc}>Review AI-scored profiles with detailed insights. Save the best candidates to your shortlist.</p>
              </div>
              <div style={styles.stepArrow}>→</div>
              <div style={styles.step}>
                <div style={styles.stepNumber}>3</div>
                <h3 style={styles.stepTitle}>One-Click Outreach</h3>
                <p style={styles.stepDesc}>Send personalized emails with one click. Track responses and manage your hiring pipeline.</p>
              </div>
          </div>
        </div>
      </section>

      {/* Product Demo Video */}
      <section style={styles.videoSection}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>See TalentBox in Action</h2>
          <p style={styles.sectionSubtitle}>Watch how easy it is to find and hire top developers</p>
          <div style={styles.videoWrapper}>
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/zDrQ2QdaqeQ?si=UiZYqCrK8cZHzwvM"
              title="TalentBox Product Demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={styles.videoIframe}
            ></iframe>
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section style={styles.testimonials}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Trusted by Recruiters</h2>
          <div style={styles.testimonialGrid}>
            <div style={styles.testimonialCard}>
              <div style={styles.stars}>
                {[...Array(5)].map((_, i) => <Star key={i} size={18} fill="#FF6B35" color="#FF6B35" />)}
              </div>
              <p style={styles.testimonialText}>"TalentBox helped us find 3 senior engineers in 2 weeks. The response rate was incredible compared to LinkedIn."</p>
              <div style={styles.testimonialAuthor}>
                <div style={styles.authorAvatar}>SK</div>
                <div>
                  <div style={styles.authorName}>Sarah K.</div>
                  <div style={styles.authorRole}>Tech Recruiter, Series B Startup</div>
                </div>
              </div>
            </div>
            <div style={styles.testimonialCard}>
              <div style={styles.stars}>
                {[...Array(5)].map((_, i) => <Star key={i} size={18} fill="#FF6B35" color="#FF6B35" />)}
              </div>
              <p style={styles.testimonialText}>"The AI scoring saved us hours of manual screening. We only talk to developers who are actually a good fit."</p>
              <div style={styles.testimonialAuthor}>
                <div style={styles.authorAvatar}>MR</div>
                <div>
                  <div style={styles.authorName}>Mike R.</div>
                  <div style={styles.authorRole}>Engineering Manager</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={styles.cta}>
        <div style={styles.container}>
          <h2 style={styles.ctaTitle}>Ready to Find Your Next Developer?</h2>
          <p style={styles.ctaSubtitle}>Start your 7-day free trial. No credit card required.</p>
          <Link to="/signup" style={styles.ctaBtn}>
            Get Started Free <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      <Footer />

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

const styles = {
  page: { minHeight: '100vh', background: '#ffffff', fontFamily: "'Outfit', sans-serif" },
  
  hero: { padding: '6rem 2rem 4rem', background: 'linear-gradient(135deg, #ffffff 0%, #fff8f5 100%)', textAlign: 'center' },
  heroContent: { maxWidth: '900px', margin: '0 auto' },
  heroTitle: { fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: '700', color: '#1a1a1a', marginBottom: '1.5rem', lineHeight: '1.2', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' },
  titleLine: { whiteSpace: 'nowrap' },
  typingWrapper: { display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '340px', height: '1.2em' },
  typingText: { color: '#FF6B35', whiteSpace: 'nowrap' },
  cursor: { color: '#FF6B35', animation: 'blink 1s infinite', marginLeft: '2px', fontWeight: '400' },
  heroSubtitle: { fontSize: '1.25rem', color: '#6b7280', maxWidth: '700px', margin: '0 auto 2rem', lineHeight: '1.7' },
  heroCta: { display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3rem' },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', background: '#FF6B35', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '1.0625rem', transition: 'all 0.2s' },
  secondaryBtn: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', background: '#fff', color: '#1a1a1a', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '1.0625rem', border: '2px solid #e5e7eb', transition: 'all 0.2s' },
  heroStats: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' },
  stat: { textAlign: 'center' },
  statNumber: { display: 'block', fontSize: '2rem', fontWeight: '700', color: '#FF6B35' },
  statLabel: { fontSize: '0.9375rem', color: '#6b7280' },
  statDivider: { width: '1px', height: '40px', background: '#e5e7eb' },

  features: { padding: '5rem 2rem', background: '#ffffff' },
  container: { maxWidth: '1100px', margin: '0 auto' },
  sectionTitle: { fontSize: '2.5rem', fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: '0.5rem' },
  sectionSubtitle: { fontSize: '1.125rem', color: '#6b7280', textAlign: 'center', marginBottom: '3rem' },
  featureGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' },
  featureCard: { padding: '2rem', background: '#f9fafb', borderRadius: '16px', textAlign: 'center' },
  featureIcon: { width: '60px', height: '60px', background: '#fff5f2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' },
  featureTitle: { fontSize: '1.25rem', fontWeight: '700', color: '#1a1a1a', marginBottom: '0.75rem' },
  featureDesc: { fontSize: '1rem', color: '#6b7280', lineHeight: '1.6' },

  howItWorks: { padding: '5rem 2rem', background: '#f9fafb' },
  stepsGrid: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' },
  step: { textAlign: 'center', maxWidth: '280px' },
  stepNumber: { width: '50px', height: '50px', background: '#FF6B35', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: '700', margin: '0 auto 1rem' },
  stepTitle: { fontSize: '1.25rem', fontWeight: '700', color: '#1a1a1a', marginBottom: '0.5rem' },
  stepDesc: { fontSize: '1rem', color: '#6b7280', lineHeight: '1.6' },
  stepArrow: { fontSize: '2rem', color: '#d1d5db', fontWeight: '300' },

  testimonials: { padding: '5rem 2rem', background: '#ffffff' },
  testimonialGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: '900px', margin: '0 auto' },
  testimonialCard: { padding: '2rem', background: '#f9fafb', borderRadius: '16px' },
  stars: { display: 'flex', gap: '4px', marginBottom: '1rem' },
  testimonialText: { fontSize: '1.0625rem', color: '#1a1a1a', lineHeight: '1.7', marginBottom: '1.5rem', fontStyle: 'italic' },
  testimonialAuthor: { display: 'flex', alignItems: 'center', gap: '1rem' },
  authorAvatar: { width: '48px', height: '48px', background: '#FF6B35', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' },
  authorName: { fontWeight: '600', color: '#1a1a1a' },
  authorRole: { fontSize: '0.875rem', color: '#6b7280' },

  cta: { padding: '5rem 2rem', background: 'linear-gradient(135deg, #FF6B35 0%, #ff8a65 100%)', textAlign: 'center' },
  ctaTitle: { fontSize: '2.5rem', fontWeight: '700', color: '#fff', marginBottom: '1rem' },
  ctaSubtitle: { fontSize: '1.25rem', color: 'rgba(255,255,255,0.9)', marginBottom: '2rem' },
  ctaBtn: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2.5rem', background: '#fff', color: '#FF6B35', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '1.0625rem' },

  videoSection: { padding: '5rem 2rem', background: '#f9fafb' },
  videoWrapper: { position: 'relative', paddingBottom: '50%', height: 0, maxWidth: '1000px', margin: '0 auto', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.15)' },
  videoIframe: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' },
};

export default HomePage;