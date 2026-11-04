import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Globe, FileText, Code2 } from 'lucide-react';

const features = [
  {
    icon: Globe,
    name: 'Web Intelligence',
    desc: 'DuckDuckGo-powered live web search with summarization. The agent fetches, parses, and synthesizes real-time information from across the web into coherent, cited answers.',
    tag: 'DuckDuckGo API',
    num: '01',
  },
  {
    icon: FileText,
    name: 'Document RAG',
    desc: 'Upload PDFs, DOCX, or TXT files. ChromaDB vector indexing enables semantic retrieval — the agent finds the most relevant passages and answers with full document context.',
    tag: 'ChromaDB · PDF · DOCX',
    num: '02',
  },
  {
    icon: Code2,
    name: 'Python Sandbox',
    desc: 'Execute arbitrary Python code inside a Docker container with network disabled, 128MB RAM cap, and 50 PID limit. Safe, isolated, and fast — ideal for data analysis and computation.',
    tag: 'Docker · Isolated',
    num: '03',
  },
];

export default function Features() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="features-section" ref={ref} id="features">
      <div className="features-inner">
        <div className="features-header">
          <div>
            <motion.div
              className="section-label"
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6 }}
            >
              <div className="section-label-line" />
              Capabilities
            </motion.div>

            <motion.h2
              className="section-title"
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              Three tools.
              <br />
              <span className="highlight">Infinite reach.</span>
            </motion.h2>
          </div>

          <motion.p
            className="features-desc"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            The LangGraph ReAct agent selects the right tool for each task, chains them together
            when needed, and streams every step of its reasoning — so you're never in the dark.
          </motion.p>
        </div>

        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.name}
              className="feature-band"
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.12 }}
            >
              <div className="feature-band-bg" />

              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.08em',
                  alignSelf: 'flex-start',
                  paddingTop: 6,
                }}
              >
                {f.num}
              </div>

              <div className="feature-main">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                  <div className="feature-icon-wrap">
                    <Icon size={22} />
                  </div>
                  <div className="feature-name">{f.name}</div>
                </div>
                <p className="feature-desc">{f.desc}</p>
              </div>

              <div className="feature-tag">{f.tag}</div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
