import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const stats = [
  { value: '3+', label: 'Integrated Tools' },
  { value: 'SSE', label: 'Real-time Streaming' },
  { value: 'RAG', label: 'Document Intelligence' },
  { value: '100%', label: 'Open Source' },
];

const revealVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function About() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="about-section" ref={ref} id="about">
      {/* Faint top divider gradient */}
      <div style={{
        position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(79,110,247,0.3), transparent)',
      }} />

      <div className="about-inner">
        <div className="about-left">
          <motion.div
            custom={0}
            variants={revealVariants}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
          >
            <div className="about-number">01</div>
          </motion.div>
        </div>

        <div className="about-right">
          <motion.div
            custom={1}
            variants={revealVariants}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
          >
            <div className="section-label">
              <div className="section-label-line" />
              About the Platform
            </div>
          </motion.div>

          <motion.h2
            className="section-title"
            custom={2}
            variants={revealVariants}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
          >
            Intelligence that{' '}
            <span className="highlight">adapts</span>{' '}
            to your workflow
          </motion.h2>

          <motion.p
            className="about-desc"
            custom={3}
            variants={revealVariants}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
          >
            NexusAI is built on LangGraph's ReAct architecture — a cognitive loop that reasons,
            selects tools, executes actions, and observes results in real-time. Powered by Google
            Gemini 2.5 Flash, it understands your documents, searches the web, and runs Python
            code securely in isolated containers.
          </motion.p>

          <motion.p
            style={{ fontSize: 16, color: 'var(--text-muted)', lineHeight: 1.75 }}
            custom={4}
            variants={revealVariants}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
          >
            Every interaction streams token-by-token over SSE — you see the agent's thoughts, tool
            calls, and results as they happen, not after. Backed by JWT authentication and Redis
            rate limiting for production-grade reliability.
          </motion.p>

          <div className="stat-row">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="stat-item"
                custom={5 + i}
                variants={revealVariants}
                initial="hidden"
                animate={inView ? 'visible' : 'hidden'}
              >
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
