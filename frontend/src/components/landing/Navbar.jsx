import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Menu } from 'lucide-react';

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#process' },
  { label: 'Demo', href: '#showcase' },
];

export default function Navbar({ onLaunch }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNav = (e, href) => {
    e.preventDefault();
    setMenuOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <motion.nav
        className={`landing-nav ${scrolled ? 'scrolled' : ''}`}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <a className="nav-logo" href="/">
          <div className="nav-logo-icon">
            <Zap size={16} color="white" fill="white" />
          </div>
          NexusAI
        </a>

        <ul className="nav-links">
          {navItems.map((item) => (
            <li key={item.label}>
              <a href={item.href} onClick={(e) => handleNav(e, item.href)}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <a className="nav-cta-btn" onClick={onLaunch} href="#" style={{ display: 'block' }}>
          Launch App →
        </a>

        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </motion.nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <button
              onClick={() => setMenuOpen(false)}
              style={{
                position: 'absolute', top: 20, right: 24,
                background: 'none', border: 'none',
                color: 'var(--text-primary)', cursor: 'pointer',
              }}
            >
              <X size={28} />
            </button>
            {navItems.map((item, i) => (
              <motion.a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNav(e, item.href)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                {item.label}
              </motion.a>
            ))}
            <motion.a
              href="#"
              onClick={(e) => { e.preventDefault(); setMenuOpen(false); onLaunch(); }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: navItems.length * 0.08 }}
              style={{
                background: 'var(--accent-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Launch App
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
