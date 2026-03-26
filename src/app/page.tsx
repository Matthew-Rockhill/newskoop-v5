'use client';

import { ReactNode, useRef } from 'react';
import { motion, Variants, useScroll, useTransform } from 'framer-motion';
import {
  ChevronDown,
  Newspaper,
  Radio,
  Mic,
  CheckCircle,
  ArrowRight,
  Globe,
  Headphones,
  TrendingUp,
  Leaf,
  Zap,
  Cpu,
  FileText,
  Users,
  Download,
  Play,
  Settings,
  Shuffle,
  Calendar,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0 },
};

const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0 },
};

const fadeRight: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1 },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const heroStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.18, delayChildren: 0.3 } },
};

const heroChild: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } },
};

/* ------------------------------------------------------------------ */
/*  Reusable components                                                */
/* ------------------------------------------------------------------ */

function AnimateOnScroll({
  children,
  delay = 0,
  className,
  variants = fadeUp,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  variants?: Variants;
}) {
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function EqualizerBars({ className = '', barClass = 'bg-[#76BD43]' }: { className?: string; barClass?: string }) {
  return (
    <div className={`flex items-end gap-[3px] h-6 ${className}`} aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full origin-bottom ${barClass} animate-eq-${i}`}
          style={{ height: '100%' }}
        />
      ))}
    </div>
  );
}

function SectionLabel({ children, light = false }: { children: string; light?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2 mb-6">
      <div className={`h-px w-8 ${light ? 'bg-[#76BD43]/50' : 'bg-[#76BD43]'}`} />
      <span className="text-[#76BD43] font-display font-semibold text-xs tracking-[0.3em] uppercase">
        {children}
      </span>
      <div className={`h-px w-8 ${light ? 'bg-[#76BD43]/50' : 'bg-[#76BD43]'}`} />
    </div>
  );
}

function WaveDivider({ flip = false, color = '#f8f8f8' }: { flip?: boolean; color?: string }) {
  return (
    <div className={`w-full overflow-hidden leading-[0] ${flip ? 'rotate-180' : ''}`} aria-hidden>
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-[50px] sm:h-[80px]">
        <path
          d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z"
          fill={color}
        />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const services = [
  {
    icon: Newspaper,
    title: 'News Bulletins',
    description: 'Consistent, credible, daily news.',
  },
  {
    icon: Radio,
    title: 'Fully Pre-Recorded Bulletins',
    description: 'Ready-to-air news.',
  },
  {
    icon: Users,
    title: 'Community News Stories',
    description: 'Local relevance built in.',
  },
  {
    icon: TrendingUp,
    title: 'Finance and Sport Reports',
    description: 'Specialist updates made simple.',
  },
];

const featuredShows = [
  {
    icon: Leaf,
    title: 'Agriskoops',
    description:
      'Agriculture-focused content combining news, interviews, and insights into farming, production and sustainability. Available in English and Afrikaans.',
  },
  {
    icon: TrendingUp,
    title: 'Bizskoops',
    description:
      'Business and economic updates, including interviews and key financial insights impacting local and global markets. Available in English and Afrikaans.',
  },
  {
    icon: Globe,
    title: 'Ecoskoops',
    description:
      'Environmental news and discussions covering sustainability, climate, and conservation topics. Available in English and Afrikaans.',
  },
  {
    icon: Zap,
    title: 'Blitzskoops',
    description:
      'Short, sharp news summaries that fit any slot in your schedule. Available in English, Afrikaans, isiXhosa and isiZulu.',
  },
  {
    icon: Cpu,
    title: 'Techskoops',
    description:
      'Latest technology news and trends in a concise, listener-focused format. Available in English and Afrikaans.',
  },
  {
    icon: FileText,
    title: 'Paperskoops',
    description:
      'Daily headlines from national newspapers, giving your listeners key news stories in a quick, accessible format.',
  },
];

const steps = [
  {
    icon: Globe,
    number: '01',
    title: 'Access',
    description: 'Access content via our platform.',
  },
  {
    icon: Download,
    number: '02',
    title: 'Download',
    description: 'Download what you need.',
  },
  {
    icon: Play,
    number: '03',
    title: 'Broadcast',
    description: 'Broadcast immediately.',
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Homepage() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <Layout transparent>
      <div className="min-h-screen bg-white overflow-x-hidden">

        {/* ========================================================== */}
        {/*  1. HERO                                                   */}
        {/* ========================================================== */}
        <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[#f8f8f8]" />

          {/* Aurora blobs */}
          <div className="absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full animate-aurora" style={{ background: 'radial-gradient(circle, rgba(118,189,67,0.08) 0%, transparent 70%)' }} />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full animate-aurora-reverse" style={{ background: 'radial-gradient(circle, rgba(118,189,67,0.06) 0%, transparent 70%)' }} />
          </div>

          {/* Signal rings */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden>
            <div className="w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] relative">
              <div className="absolute inset-0 rounded-full border border-[#76BD43]/8 animate-signal-1" />
              <div className="absolute inset-[60px] rounded-full border border-[#76BD43]/10 animate-signal-2" />
              <div className="absolute inset-[120px] rounded-full border border-[#76BD43]/6 animate-signal-3" />
            </div>
          </div>

          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #76BD43 0.5px, transparent 0)', backgroundSize: '32px 32px' }} aria-hidden />

          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 text-center max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
            <motion.div variants={heroStagger} initial="hidden" animate="visible">
              <motion.div variants={heroChild} className="flex items-center justify-center gap-3 mb-8">
                <EqualizerBars barClass="bg-[#76BD43]/60" />
                <span className="text-[#76BD43] font-display font-semibold text-xs sm:text-sm tracking-[0.25em] uppercase">
                  South Africa&apos;s Content Agency for Radio
                </span>
                <EqualizerBars barClass="bg-[#76BD43]/60" />
              </motion.div>

              <motion.h1 variants={heroChild} className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#272727] mb-6 tracking-[-0.01em] leading-[1.15]">
                Trusted News. Real Voices.
                <br />
                <span className="text-[#76BD43]">Lasting Impact.</span>
              </motion.h1>

              <motion.p variants={heroChild} className="text-zinc-500 mb-12 max-w-2xl mx-auto text-base sm:text-lg lg:text-xl leading-relaxed">
                Everything your station needs — credible, ready-to-air content
                that connects with your audience.
              </motion.p>

              <motion.div variants={heroChild} className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/auth/set-password" className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#76BD43] px-9 py-4 text-base font-display font-semibold text-white shadow-[0_0_40px_rgba(118,189,67,0.3)] hover:shadow-[0_0_60px_rgba(118,189,67,0.5)] hover:bg-[#82ca4d] transition-all duration-300">
                  Register for Your Free Trial
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
                <a href="#contact" className="group inline-flex items-center justify-center rounded-full border border-[#272727]/15 px-9 py-4 text-base font-display font-semibold text-[#272727]/70 hover:bg-[#272727]/5 hover:border-[#272727]/30 hover:text-[#272727] transition-all duration-300">
                  Get in Touch
                </a>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.a href="#about" animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }} className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
            <span className="text-[#272727]/30 text-[10px] uppercase tracking-[0.3em] font-display">Scroll</span>
            <ChevronDown className="h-5 w-5 text-[#272727]/30" />
          </motion.a>
        </section>

        {/* ========================================================== */}
        {/*  2. THIS IS US                                             */}
        {/* ========================================================== */}
        <section id="about" className="relative bg-white py-24 lg:py-32 overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full animate-aurora" style={{ background: 'radial-gradient(circle, rgba(118,189,67,0.06) 0%, transparent 70%)' }} aria-hidden />
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #76BD43 0.5px, transparent 0)', backgroundSize: '48px 48px' }} aria-hidden />

          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <AnimateOnScroll className="text-center">
              <SectionLabel>This Is Us</SectionLabel>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[#272727] mb-8 tracking-[-0.01em] leading-[1.2]">
                Built for Radio
              </h2>
            </AnimateOnScroll>

            <AnimateOnScroll delay={0.1} className="space-y-4 max-w-3xl mx-auto text-zinc-500 text-base lg:text-[17px] leading-[1.8]">
              <p>Newskoop is a dedicated media content provider built specifically for radio stations.</p>
              <p>Our team of experienced journalists and contributors work across South Africa to source, verify, and produce news that is both credible and relevant.</p>
              <p>We don&apos;t just gather stories. We craft content that moves people, resonates with communities, and strengthens the connection between your station and your listeners.</p>
            </AnimateOnScroll>

            <AnimateOnScroll delay={0.2} className="mt-10 max-w-3xl mx-auto">
              <div className="relative rounded-xl overflow-hidden p-[1px]" style={{ background: 'linear-gradient(135deg, #76BD43, transparent 50%, #76BD43)' }}>
                <div className="bg-[#272727] rounded-xl px-6 py-5 text-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #76BD43 0.5px, transparent 0)', backgroundSize: '24px 24px' }} aria-hidden />
                  <p className="relative font-display text-base font-semibold text-white leading-relaxed">
                    Built for radio. Not adapted to it.
                    <span className="text-[#76BD43]"> Just content that works</span> — the moment you download it.
                  </p>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </section>

        <WaveDivider color="#f8f8f8" />

        {/* ========================================================== */}
        {/*  3. OUR APPROACH                                           */}
        {/* ========================================================== */}
        <section className="bg-[#f8f8f8] py-24 lg:py-32 relative overflow-hidden">
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full animate-aurora-reverse" style={{ background: 'radial-gradient(circle, rgba(118,189,67,0.05) 0%, transparent 70%)' }} aria-hidden />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <AnimateOnScroll className="text-center mb-16">
              <SectionLabel>Our Approach</SectionLabel>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[#272727] tracking-[-0.01em] leading-[1.2] mb-4">
                Credible. Relevant. Ready to Air.
              </h2>
              <p className="text-zinc-500 text-base max-w-lg mx-auto">
                Every piece of content we produce is crafted with purpose.
              </p>
            </AnimateOnScroll>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-10"
            >
              {[
                { icon: CheckCircle, text: 'Carefully sourced', detail: 'Every story verified before it reaches your station.' },
                { icon: FileText, text: 'Professionally written', detail: 'Crafted by experienced South African journalists.' },
                { icon: Radio, text: 'Produced with radio in mind', detail: 'Content that lands the moment it hits the airwaves.' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <motion.div key={item.text} variants={scaleIn} transition={{ duration: 0.5 }} className="group">
                    <div className="bg-white rounded-xl p-6 text-center h-full shadow-sm border border-zinc-100 hover:border-[#76BD43]/20 hover:shadow-lg transition-all duration-300 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-[#76BD43]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="relative z-10">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#76BD43]/10 mb-4 group-hover:bg-[#76BD43] transition-all duration-300">
                          <Icon className="h-5 w-5 text-[#76BD43] group-hover:text-white transition-colors duration-300" />
                        </div>
                        <p className="font-display text-[#272727] font-semibold text-[15px] mb-1">{item.text}</p>
                        <p className="text-zinc-400 text-sm">{item.detail}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            <AnimateOnScroll className="text-center">
              <p className="text-zinc-400 text-sm leading-relaxed max-w-lg mx-auto">
                Because delivering the news isn&apos;t enough. It needs to land, connect, and move your audience.
              </p>
            </AnimateOnScroll>
          </div>
        </section>

        {/* ========================================================== */}
        {/*  4. COMMUNITY FOCUS                                        */}
        {/* ========================================================== */}
        <section className="bg-[#272727] py-24 lg:py-32 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #76BD43 0.5px, transparent 0)', backgroundSize: '40px 40px' }} aria-hidden />
          <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full animate-aurora" style={{ background: 'radial-gradient(circle, rgba(118,189,67,0.08) 0%, transparent 70%)' }} aria-hidden />
          <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full animate-aurora-reverse" style={{ background: 'radial-gradient(circle, rgba(118,189,67,0.06) 0%, transparent 70%)' }} aria-hidden />
          <div className="absolute right-[-200px] top-[20%] w-[500px] h-[500px]" aria-hidden>
            <div className="absolute inset-0 rounded-full border border-[#76BD43]/6 animate-signal-1" />
            <div className="absolute inset-[50px] rounded-full border border-[#76BD43]/8 animate-signal-2" />
            <div className="absolute inset-[100px] rounded-full border border-[#76BD43]/4 animate-signal-3" />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <AnimateOnScroll className="text-center mb-16">
              <SectionLabel light>Our Community Focus</SectionLabel>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-[-0.01em] leading-[1.2]">
                Stories That Truly Move People
              </h2>
            </AnimateOnScroll>

            <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 max-w-5xl mx-auto">
              <AnimateOnScroll variants={fadeLeft}>
                <div className="glass-card-dark rounded-xl p-7 h-full relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#76BD43]/50 via-[#76BD43]/20 to-transparent" aria-hidden />
                  <p className="text-zinc-300 text-base leading-[1.8] mb-6">
                    Our network allows us to source stories from across the country — bringing together:
                  </p>
                  <ul className="space-y-4 mb-6">
                    {['National perspective', 'Local relevance', 'Community insight'].map((item) => (
                      <li key={item} className="flex items-center gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#76BD43]/10">
                          <CheckCircle className="h-3.5 w-3.5 text-[#76BD43]" />
                        </div>
                        <span className="text-white font-display font-semibold text-[15px]">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    This ensures your station stays connected to what matters most and tells stories that truly move people.
                  </p>
                </div>
              </AnimateOnScroll>

              <AnimateOnScroll variants={fadeRight} delay={0.1}>
                <div className="glass-card-dark rounded-xl p-7 h-full relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#76BD43]/20 to-[#76BD43]/50" aria-hidden />
                  <p className="text-zinc-300 text-base leading-[1.8] mb-4">
                    Trusted news builds trusted stations. Community radio plays a vital role — informing, connecting, and empowering audiences every day.
                  </p>
                  <p className="text-zinc-500 text-sm leading-relaxed mb-5">We support that responsibility by delivering:</p>
                  <ul className="space-y-4">
                    {['Credible, verified journalism', 'Stories with real community relevance', 'Content that reflects the voices and realities of your listeners'].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#76BD43]/10 mt-0.5">
                          <CheckCircle className="h-3.5 w-3.5 text-[#76BD43]" />
                        </div>
                        <span className="text-white font-medium text-sm leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 pt-5 border-t border-white/5">
                    <p className="text-zinc-400 text-sm leading-relaxed italic">
                      Because news isn&apos;t just information — it&apos;s trust, and trust is what keeps listeners coming back.
                    </p>
                  </div>
                </div>
              </AnimateOnScroll>
            </div>
          </div>
        </section>

        {/* ========================================================== */}
        {/*  5. WHY IT MATTERS                                         */}
        {/* ========================================================== */}
        <section className="bg-white py-24 lg:py-32 relative overflow-hidden">
          <div className="absolute top-[-5%] left-[-5%] w-[300px] h-[300px] rounded-full animate-aurora" style={{ background: 'radial-gradient(circle, rgba(118,189,67,0.05) 0%, transparent 70%)' }} aria-hidden />
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #272727 0.5px, transparent 0)', backgroundSize: '40px 40px' }} aria-hidden />

          <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
            <AnimateOnScroll>
              <SectionLabel>Why It Matters to Us</SectionLabel>

              <div className="text-[80px] sm:text-[100px] text-[#76BD43]/10 font-serif leading-none select-none mb-[-25px] sm:mb-[-35px]" aria-hidden>&ldquo;</div>
              <blockquote className="font-display text-lg sm:text-xl lg:text-2xl font-semibold text-[#272727] mb-6 leading-[1.5]">
                Credible news does more than inform. It builds trust, strengthens communities,
                and elevates your station&apos;s role in the community.
              </blockquote>

              <div className="mx-auto h-[2px] w-12 bg-gradient-to-r from-transparent via-[#76BD43] to-transparent mb-6" />

              <p className="text-zinc-500 text-base leading-relaxed max-w-xl mx-auto">
                At Newskoop, we are proud to help your station deliver news that moves people, not just minds.
              </p>
            </AnimateOnScroll>
          </div>
        </section>

        <WaveDivider color="#f8f8f8" />

        {/* ========================================================== */}
        {/*  6. THE NEWSKOOP COMMITMENT                                */}
        {/* ========================================================== */}
        <section className="bg-[#f8f8f8] py-24 lg:py-32 relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full animate-aurora-reverse" style={{ background: 'radial-gradient(circle, rgba(118,189,67,0.04) 0%, transparent 70%)' }} aria-hidden />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <AnimateOnScroll className="text-center mb-16">
              <SectionLabel>The Newskoop Commitment</SectionLabel>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#272727] tracking-[-0.01em] leading-[1.2] mb-4">
                News That Sounds as Good as It Reads
              </h2>
              <p className="text-zinc-500 text-base max-w-lg mx-auto">
                We do not stop at written news — Newskoop goes further.
              </p>
            </AnimateOnScroll>

            <div className="grid lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <AnimateOnScroll variants={fadeLeft}>
                <div className="bg-white rounded-xl p-7 shadow-sm border border-zinc-100 h-full relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.03]" style={{ background: 'radial-gradient(circle, #76BD43, transparent 70%)' }} aria-hidden />
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#76BD43]">
                      <Mic className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="font-display text-base font-bold text-[#272727]">We provide</h3>
                  </div>
                  <ul className="space-y-3.5">
                    {['Fully pre-recorded news bulletins', 'Pre-recorded sport and finance reports', 'Ready-to-air shows and features'].map((item) => (
                      <li key={item} className="flex items-center gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#76BD43] shrink-0" />
                        <span className="text-zinc-600 text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimateOnScroll>

              <AnimateOnScroll variants={fadeRight} delay={0.1}>
                <div className="bg-white rounded-xl p-7 shadow-sm border border-zinc-100 h-full relative overflow-hidden">
                  <div className="absolute bottom-0 left-0 w-24 h-24 opacity-[0.03]" style={{ background: 'radial-gradient(circle, #76BD43, transparent 70%)' }} aria-hidden />
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#76BD43]">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="font-display text-base font-bold text-[#272727]">Giving your station the ability to</h3>
                  </div>
                  <ul className="space-y-3.5">
                    {['Maintain consistent quality', 'Reduce workload', 'Broadcast professional content instantly'].map((item) => (
                      <li key={item} className="flex items-center gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#76BD43] shrink-0" />
                        <span className="text-zinc-600 text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimateOnScroll>
            </div>
          </div>
        </section>

        {/* ========================================================== */}
        {/*  7. FLEXIBILITY FOR YOU                                    */}
        {/* ========================================================== */}
        <section className="bg-white py-24 lg:py-32 relative overflow-hidden">
          <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full animate-aurora" style={{ background: 'radial-gradient(circle, rgba(118,189,67,0.04) 0%, transparent 70%)' }} aria-hidden />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <AnimateOnScroll className="text-center mb-16">
              <SectionLabel>Flexibility for You</SectionLabel>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#272727] tracking-[-0.01em] leading-[1.2] mb-4">
                Built to Fit Your Station
              </h2>
              <p className="text-zinc-500 text-base max-w-lg mx-auto">
                Whether you have a full newsroom or a small team, Newskoop gives you flexibility.
              </p>
            </AnimateOnScroll>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto mb-10"
            >
              {[
                { icon: Newspaper, text: 'Use full bulletins or selected stories' },
                { icon: Shuffle, text: 'Insert local content where needed' },
                { icon: Calendar, text: 'Schedule pre-recorded content at your convenience' },
                { icon: Settings, text: 'Mix formats depending on your capacity' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <motion.div key={item.text} variants={fadeUp} transition={{ duration: 0.5 }} className="group">
                    <div className="bg-[#f8f8f8] rounded-xl p-5 flex items-center gap-4 border border-zinc-100 hover:border-[#76BD43]/20 hover:shadow-md transition-all duration-300 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#76BD43]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-[#76BD43]/10 group-hover:bg-[#76BD43] shrink-0 transition-all duration-300">
                        <Icon className="h-4 w-4 text-[#76BD43] group-hover:text-white transition-colors duration-300" />
                      </div>
                      <p className="relative text-[#272727] font-medium text-sm leading-snug">{item.text}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            <AnimateOnScroll className="text-center">
              <p className="text-zinc-400 text-sm leading-relaxed max-w-lg mx-auto font-medium">
                We work as an extension of your station — not a replacement.
              </p>
            </AnimateOnScroll>
          </div>
        </section>

        <WaveDivider color="#f8f8f8" />

        {/* ========================================================== */}
        {/*  8. OUR SERVICES                                           */}
        {/* ========================================================== */}
        <section id="services" className="bg-[#f8f8f8] py-24 lg:py-32 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #76BD43 0.5px, transparent 0)', backgroundSize: '36px 36px' }} aria-hidden />
          <div className="absolute top-[-5%] left-[-5%] w-[400px] h-[400px] rounded-full animate-aurora" style={{ background: 'radial-gradient(circle, rgba(118,189,67,0.04) 0%, transparent 70%)' }} aria-hidden />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <AnimateOnScroll className="text-center mb-16">
              <SectionLabel>Our Services</SectionLabel>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[#272727] tracking-[-0.01em] leading-[1.2] mb-4">
                Everything Your Station Needs
              </h2>
              <p className="text-zinc-500 text-base max-w-lg mx-auto">
                Credible, ready-to-air content that moves your audience.
              </p>
            </AnimateOnScroll>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20"
            >
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <motion.div key={service.title} variants={scaleIn} transition={{ duration: 0.5 }} className="group">
                    <div className="bg-white rounded-2xl p-7 text-center h-full shadow-sm border border-zinc-100 hover:shadow-lg hover:border-[#76BD43]/20 transition-all duration-300 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-[#76BD43]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="relative z-10">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#76BD43]/10 mb-4 group-hover:bg-[#76BD43] transition-all duration-300">
                          <Icon className="h-5 w-5 text-[#76BD43] group-hover:text-white transition-colors duration-300" />
                        </div>
                        <h3 className="font-display text-base font-bold text-[#272727] mb-1.5">{service.title}</h3>
                        <p className="text-zinc-400 text-sm">{service.description}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Featured Shows */}
            <AnimateOnScroll className="text-center mb-16">
              <div className="inline-flex items-center gap-3 mb-5">
                <EqualizerBars barClass="bg-[#76BD43]/40" />
                <span className="text-[#76BD43] font-display font-semibold text-xs tracking-[0.3em] uppercase">Featured Shows</span>
                <EqualizerBars barClass="bg-[#76BD43]/40" />
              </div>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#272727] tracking-[-0.01em] mb-4">
                Engaging Content That Builds Programming
              </h3>
            </AnimateOnScroll>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10"
            >
              {featuredShows.map((show) => {
                const Icon = show.icon;
                return (
                  <motion.div key={show.title} variants={fadeUp} transition={{ duration: 0.5 }} className="group">
                    <div className="bg-white rounded-xl p-6 h-full border border-zinc-100 hover:border-[#76BD43]/20 hover:shadow-md transition-all duration-300 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#76BD43]/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#76BD43]/10 group-hover:bg-[#76BD43]/20 transition-colors duration-300">
                            <Icon className="h-4 w-4 text-[#76BD43]" />
                          </div>
                          <h4 className="font-display text-base font-bold text-[#272727]">{show.title}</h4>
                        </div>
                        <p className="text-zinc-400 text-sm leading-relaxed">{show.description}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Additional content */}
            <AnimateOnScroll>
              <div className="flex flex-col sm:flex-row items-start gap-5 bg-white rounded-xl p-6 border border-zinc-100 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #76BD43 0.5px, transparent 0)', backgroundSize: '20px 20px' }} aria-hidden />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-[#76BD43]/10 shrink-0">
                  <Headphones className="h-5 w-5 text-[#76BD43]" />
                </div>
                <div className="relative text-sm text-zinc-500 leading-relaxed">
                  <span className="font-display font-semibold text-[#272727]">Additional Content: </span>
                  Daily dedicated sport shows and monthly lifestyle interviews — plus a selection of third-party
                  podcasts available for broadcast, giving you ready-to-air content that complements your schedule.
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </section>

        {/* ========================================================== */}
        {/*  9. HOW IT WORKS                                           */}
        {/* ========================================================== */}
        <section className="bg-white py-24 lg:py-32 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #272727 0.5px, transparent 0)', backgroundSize: '40px 40px' }} aria-hidden />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <AnimateOnScroll className="text-center mb-16">
              <SectionLabel>How It Works</SectionLabel>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#272727] tracking-[-0.01em] leading-[1.2]">
                Simple. Efficient. Reliable.
              </h2>
            </AnimateOnScroll>

            <div className="relative max-w-4xl mx-auto">
              <div className="hidden md:block absolute top-[2.75rem] left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-[#76BD43]/20 via-[#76BD43]/40 to-[#76BD43]/20" aria-hidden />

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                className="grid grid-cols-1 md:grid-cols-3 gap-10"
              >
                {steps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <motion.div key={step.title} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center">
                      <div className="relative inline-flex flex-col items-center">
                        <div className="relative">
                          <div className="flex h-[3.5rem] w-[3.5rem] items-center justify-center rounded-xl bg-[#76BD43] shadow-[0_0_20px_rgba(118,189,67,0.2)] mb-5">
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <span className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#272727] text-[10px] font-display font-bold text-white ring-3 ring-white">
                            {step.number}
                          </span>
                        </div>
                      </div>
                      <h3 className="font-display text-lg font-bold text-[#272727] mb-2">{step.title}</h3>
                      <p className="text-zinc-400 text-sm max-w-xs mx-auto">{step.description}</p>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>

            <AnimateOnScroll className="mt-12 text-center">
              <p className="text-zinc-500 text-base leading-relaxed max-w-lg mx-auto">
                No complicated systems. No delays. Just content that moves people, not just minds.
              </p>
            </AnimateOnScroll>
          </div>
        </section>

        {/* ========================================================== */}
        {/*  10. FINAL CTA                                             */}
        {/* ========================================================== */}
        <section className="relative py-24 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#76BD43] via-[#6aad39] to-[#5a9a2f]" />
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 0.5px, transparent 0)', backgroundSize: '30px 30px' }} aria-hidden />
          <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)' }} aria-hidden />
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)' }} aria-hidden />
          <div className="absolute right-[-150px] top-[-100px] w-[500px] h-[500px]" aria-hidden>
            <div className="absolute inset-0 rounded-full border border-white/10 animate-signal-1" />
            <div className="absolute inset-[50px] rounded-full border border-white/8 animate-signal-2" />
            <div className="absolute inset-[100px] rounded-full border border-white/5 animate-signal-3" />
          </div>

          <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
            <AnimateOnScroll>
              <SectionLabel light>Start Today</SectionLabel>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-5 leading-[1.2] tracking-[-0.01em]">
                Trusted News. Real Voices. Lasting Impact.
              </h2>
              <p className="text-white/80 text-base sm:text-lg mb-12 leading-relaxed max-w-xl mx-auto">
                Every story that you broadcast has the power to resonate. Whether you are running a full
                newsroom or managing a lean team, Newskoop is here to help you connect with your community
                and move your audience through news that matters.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/auth/set-password" className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-9 py-4 text-base font-display font-bold text-[#272727] shadow-[0_4px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_4px_40px_rgba(0,0,0,0.25)] hover:bg-zinc-50 transition-all duration-300">
                  Register for Your Free Trial
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
                <a href="#contact" className="inline-flex items-center justify-center rounded-full border-2 border-white/30 px-9 py-4 text-base font-display font-semibold text-white hover:bg-white/10 hover:border-white/50 transition-all duration-300">
                  Get in Touch
                </a>
              </div>
            </AnimateOnScroll>
          </div>
        </section>

      </div>
    </Layout>
  );
}
