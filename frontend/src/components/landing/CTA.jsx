import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, GitFork } from 'lucide-react';

export default function CTA({ onLaunch }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="cta-section" ref={ref} id="cta">
      <div className="cta-glow" />

      {/* Top border gradient */}
      <div style={{
        position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(79,110,247,0.3), transparent)',
      }} />

      <div className="cta-inner">
        <motion.div
          className="section-label"
          style={{ justifyContent: 'center' }}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="section-label-line" />
          Ready?
          <div className="section-label-line" />
        </motion.div>

        <motion.h2
          className="cta-headline"
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          Start{' '}
          <span className="highlight">building</span>
          <br />
          with AI.
        </motion.h2>

        <motion.p
          className="cta-subtext"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          No credit card. No lock-in. Just a fully autonomous AI agent ready to work.
        </motion.p>

        <motion.div
          className="cta-actions"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          <a
            className="btn-primary"
            href="#"
            onClick={(e) => { e.preventDefault(); onLaunch(); }}
            style={{ padding: '16px 40px', fontSize: 16 }}
          >
            Launch the Agent
            <ArrowRight size={18} />
          </a>
          <a
            className="btn-secondary"
            href="https://github.com/Sarthakt28/AI-Agent"
            target="_blank"
            rel="noopener noreferrer"
            style={{ padding: '16px 32px', fontSize: 16 }}
          >
            <GitFork size={18} />
            View on GitHub
          </a>
        </motion.div>
      </div>
    </section>
  );
}
