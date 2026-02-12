'use client';

import { ReactNode, useState } from 'react';
import { motion, Variants } from 'framer-motion';
import {
  ChevronDown,
  Newspaper,
  Radio,
  Mic,
  AudioLines,
  CheckCircle,
  UserPlus,
  LayoutDashboard,
  RadioTower,
  ArrowRight,
  Globe,
  Headphones,
  CalendarDays,
  LayoutGrid,
  Download,
  Play,
} from 'lucide-react';
import Image from 'next/image';
import Layout from '@/components/layout/Layout';

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0 },
};

const fadeRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0 },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const heroStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
};

const heroChild: Variants = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
};

/* ------------------------------------------------------------------ */
/*  Reusable scroll-triggered wrapper                                  */
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
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section heading component                                          */
/* ------------------------------------------------------------------ */

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  light = false,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  light?: boolean;
}) {
  return (
    <AnimateOnScroll className="text-center mb-16 max-w-2xl mx-auto">
      <p className="text-[#76BD43] font-semibold text-sm tracking-widest uppercase mb-3">
        {eyebrow}
      </p>
      <h2
        className={`text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-tight ${
          light ? 'text-white' : 'text-[#272727]'
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-4 text-lg leading-relaxed ${
            light ? 'text-zinc-400' : 'text-zinc-500'
          }`}
        >
          {subtitle}
        </p>
      )}
      <div className="mt-6 mx-auto h-1 w-12 rounded-full bg-[#76BD43]" />
    </AnimateOnScroll>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const stats = [
  { value: '70+', label: 'Radio Stations' },
  { value: '10+', label: 'Years Experience' },
  { value: '3', label: 'Languages' },
  { value: '7', label: 'Days a Week' },
];

const services = [
  {
    icon: Newspaper,
    title: 'News Stories',
    description:
      'Credible, well-sourced news stories covering community, national, and international events — professionally written and ready for immediate broadcast.',
    image: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&q=80',
  },
  {
    icon: Radio,
    title: 'Radio Bulletins',
    description:
      'Hourly news bulletins crafted specifically for radio format, delivered in English, Afrikaans, and isiXhosa to reach diverse audiences.',
    image: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80',
  },
  {
    icon: Mic,
    title: 'Radio Shows',
    description:
      'Fully produced daily and weekly programmes covering sport, finance, and specialty content — no presenter required at your end.',
    image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80',
  },
  {
    icon: AudioLines,
    title: 'Audio Content',
    description:
      'Pre-recorded audio reports, interviews, and packages delivered in broadcast-ready format that slots straight into your programming schedule.',
    image: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&q=80',
  },
];

const aboutBullets = [
  { text: 'Experienced South African journalists', detail: 'Working with well-known media professionals across the country' },
  { text: 'Fact-checked and source-verified', detail: 'Rigorous standards for accuracy and credibility' },
  { text: 'Content in 3 languages', detail: 'English, Afrikaans & isiXhosa reaching diverse communities' },
];

const steps = [
  {
    icon: UserPlus,
    number: '01',
    title: 'Subscribe',
    description:
      'Choose a content package that fits your station\'s needs. Our team handles the onboarding and gets you set up within 24 hours.',
  },
  {
    icon: LayoutDashboard,
    number: '02',
    title: 'Access Portal',
    description:
      'Log in to our intuitive content portal. Browse, search, and download stories, bulletins, and audio — all organised by category and language.',
  },
  {
    icon: RadioTower,
    number: '03',
    title: 'Broadcast',
    description:
      'Download broadcast-ready content and go live. Deliver credible, professional news to your listeners with confidence.',
  },
];

const features = [
  {
    icon: Globe,
    title: '3 Languages',
    description: 'All content available in English, Afrikaans & isiXhosa to match your audience.',
  },
  {
    icon: Headphones,
    title: 'Broadcast-Ready Audio',
    description: 'Pre-recorded clips and packages ready to slot straight into your programming.',
  },
  {
    icon: CalendarDays,
    title: 'Daily Content',
    description: 'Fresh news stories delivered every day, 7 days a week, 365 days a year.',
  },
  {
    icon: RadioTower,
    title: 'Hourly Bulletins',
    description: 'News bulletins updated throughout the day so your listeners always hear the latest.',
  },
  {
    icon: LayoutGrid,
    title: 'Personalised for Your Station',
    description: 'Content filtered by language, region & category so you only see what matters.',
  },
  {
    icon: UserPlus,
    title: 'Access for Your Whole Team',
    description: 'Give every presenter and producer their own login to browse and download content.',
  },
];


/* ------------------------------------------------------------------ */
/*  Portal Preview component                                           */
/* ------------------------------------------------------------------ */

function PortalPreview() {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ['Dashboard', 'Stories', 'Bulletins'];

  return (
    <motion.div
      initial={{ y: 0 }}
      animate={{ y: [-3, 3, -3] }}
      transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
      className="max-w-4xl mx-auto"
    >
      <div className="rounded-xl overflow-hidden shadow-2xl border border-zinc-200">
        {/* Browser chrome */}
        <div className="bg-[#272727] px-4 py-3 flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 bg-zinc-700 rounded-md px-3 py-1.5 text-zinc-400 text-xs text-center font-mono">
            portal.newskoop.com
          </div>
        </div>

        {/* Tab bar */}
        <div className="bg-white border-b border-zinc-200 px-4 flex gap-0">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === i
                  ? 'border-[#76BD43] text-[#76BD43]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="p-4 sm:p-6 min-h-[340px] bg-[#f8f8f8]">
          {/* Dashboard Tab */}
          {activeTab === 0 && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 shadow-sm border border-zinc-100">
                <p className="text-sm text-zinc-500">Welcome back</p>
                <p className="text-lg font-bold text-[#272727]">Valley FM</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: '12', label: 'New Stories' },
                  { value: '8', label: 'Bulletins' },
                  { value: '5', label: 'Audio Clips' },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-lg p-3 text-center shadow-sm border border-zinc-100">
                    <p className="text-xl sm:text-2xl font-bold text-[#76BD43]">{s.value}</p>
                    <p className="text-[10px] sm:text-xs text-zinc-400">{s.label}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Categories</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {['Politics', 'Community', 'Sport', 'Business', 'Health', 'Culture'].map((cat) => (
                    <div key={cat} className="bg-white rounded-lg p-2 text-center shadow-sm border border-zinc-100">
                      <p className="text-[10px] sm:text-xs font-medium text-[#272727]">{cat}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Today&apos;s Bulletins</p>
                <div className="space-y-2">
                  {[
                    { time: '06:00', title: 'Morning News Bulletin', langs: ['EN', 'AF'] },
                    { time: '07:00', title: 'Hourly News Update', langs: ['EN'] },
                    { time: '08:00', title: 'Indaba Yasekuseni', langs: ['XH'] },
                  ].map((b) => (
                    <div key={b.time} className="bg-white rounded-lg px-3 py-2 flex items-center justify-between shadow-sm border border-zinc-100">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-[10px] sm:text-xs font-mono text-zinc-400">{b.time}</span>
                        <span className="text-xs sm:text-sm font-medium text-[#272727]">{b.title}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {b.langs.map((l) => (
                          <span key={l} className="text-[9px] sm:text-[10px] font-semibold bg-[#76BD43]/10 text-[#76BD43] px-1.5 py-0.5 rounded">{l}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Stories Tab */}
          {activeTab === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { title: 'Local team wins provincial championship', lang: 'EN', category: 'Sport', hasAudio: true },
                { title: 'Gemeenskapsprojek bring hoop', lang: 'AF', category: 'Community', hasAudio: false },
                { title: 'I-ANC ithembisa utshintsho', lang: 'XH', category: 'Politics', hasAudio: false },
                { title: 'New clinic opens in rural district', lang: 'EN', category: 'Health', hasAudio: true },
              ].map((story) => (
                <div key={story.title} className="bg-white rounded-lg p-4 shadow-sm border border-zinc-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-semibold bg-[#76BD43]/10 text-[#76BD43] px-1.5 py-0.5 rounded">{story.lang}</span>
                    <span className="text-[10px] font-medium bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">{story.category}</span>
                    {story.hasAudio && <Headphones className="h-3 w-3 text-[#76BD43] ml-auto" />}
                  </div>
                  <p className="text-sm font-medium text-[#272727] leading-snug">{story.title}</p>
                </div>
              ))}
            </div>
          )}

          {/* Bulletins Tab */}
          {activeTab === 2 && (
            <div className="space-y-2">
              {[
                { time: '06:00', title: 'Morning News Bulletin', langs: ['EN', 'AF'] },
                { time: '07:00', title: 'Hourly News Update', langs: ['EN'] },
                { time: '08:00', title: 'Indaba Yasekuseni', langs: ['XH'] },
                { time: '09:00', title: 'News on the Hour', langs: ['EN', 'AF'] },
                { time: '10:00', title: 'Nuusflits', langs: ['AF'] },
              ].map((b) => (
                <div key={b.time} className="bg-white rounded-lg px-3 sm:px-4 py-3 flex items-center justify-between shadow-sm border border-zinc-100">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <span className="text-xs sm:text-sm font-mono text-zinc-400 w-10 sm:w-12">{b.time}</span>
                    <span className="text-xs sm:text-sm font-medium text-[#272727]">{b.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {b.langs.map((l) => (
                      <span key={l} className="text-[9px] sm:text-[10px] font-semibold bg-[#76BD43]/10 text-[#76BD43] px-1.5 py-0.5 rounded">{l}</span>
                    ))}
                    <div className="ml-1 sm:ml-2 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-[#76BD43]">
                      <Play className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Homepage() {
  return (
    <Layout transparent>
      <div className="min-h-screen bg-white font-sans">
        {/* ========================================================== */}
        {/*  1. HERO — Full viewport with staggered entrance           */}
        {/* ========================================================== */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background image */}
          <div
            className="absolute inset-0 bg-no-repeat bg-cover bg-center scale-105"
            style={{ backgroundImage: 'url(/images/nk-hero.png)' }}
          />
          {/* Gradient overlay — darker at center for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#272727]/80 via-[#272727]/70 to-[#272727]/90" />

          {/* Staggered content */}
          <motion.div
            variants={heroStagger}
            initial="hidden"
            animate="visible"
            className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20"
          >
            <motion.p
              variants={heroChild}
              className="inline-block text-[#76BD43] font-semibold text-xs sm:text-sm tracking-[0.2em] uppercase mb-5 border border-[#76BD43]/30 rounded-full px-5 py-1.5"
            >
              South Africa&apos;s Content Agency for Radio
            </motion.p>

            <motion.h1
              variants={heroChild}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 tracking-tight leading-[1.1]"
            >
              Powering Community
              <br />
              Radio with <span className="text-[#76BD43]">Credible News</span>
            </motion.h1>

            <motion.p
              variants={heroChild}
              className="text-zinc-300 mb-10 max-w-2xl mx-auto text-base sm:text-lg lg:text-xl leading-relaxed"
            >
              We source, create, and produce quality news and audio content
              for community radio stations — in English, Afrikaans, and isiXhosa.
            </motion.p>

            <motion.div
              variants={heroChild}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <a
                href="#contact"
                className="group inline-flex items-center justify-center gap-2 rounded-lg bg-[#76BD43] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#76BD43]/25 hover:bg-[#68a83b] transition-all"
              >
                Get News for Your Station
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#services"
                className="inline-flex items-center justify-center rounded-lg border-2 border-white/25 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/10 hover:border-white/40 transition-all"
              >
                Our Services
              </a>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.a
            href="#stats"
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1"
          >
            <span className="text-white/40 text-[10px] uppercase tracking-widest">Scroll</span>
            <ChevronDown className="h-6 w-6 text-white/50" />
          </motion.a>
        </section>

        {/* ========================================================== */}
        {/*  2. STATS BAR                                              */}
        {/* ========================================================== */}
        <section id="stats" className="bg-[#272727] py-16 lg:py-20 border-t border-white/5">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-8"
            >
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  variants={fadeUp}
                  transition={{ duration: 0.5 }}
                  className={`text-center relative ${
                    i < stats.length - 1
                      ? 'lg:after:absolute lg:after:right-0 lg:after:top-1/2 lg:after:-translate-y-1/2 lg:after:h-12 lg:after:w-px lg:after:bg-white/10'
                      : ''
                  }`}
                >
                  <p className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-[#76BD43] leading-none">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-zinc-400 text-xs sm:text-sm uppercase tracking-[0.15em] font-medium">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ========================================================== */}
        {/*  3. PORTAL PREVIEW                                         */}
        {/* ========================================================== */}
        <section className="bg-white py-24 lg:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Your Station Portal"
              title="See What You Get"
              subtitle="An intuitive content portal designed for radio stations — browse stories, download bulletins, and play audio in seconds."
            />
            <PortalPreview />
          </div>
        </section>

        {/* ========================================================== */}
        {/*  4. SERVICES                                               */}
        {/* ========================================================== */}
        <section id="services" className="bg-[#f5f5f5] py-24 lg:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="What We Offer"
              title="Professional Content Services"
              subtitle="Everything your station needs to deliver credible, engaging news to your community — all from one trusted source."
            />

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
            >
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <motion.div
                    key={service.title}
                    variants={fadeUp}
                    transition={{ duration: 0.5 }}
                    className="group"
                  >
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 h-full flex flex-col border border-zinc-100 hover:border-[#76BD43]/20">
                      {/* Image */}
                      <div className="relative h-52 overflow-hidden">
                        <Image
                          src={service.image}
                          alt={service.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                        {/* Gradient overlay for depth */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                        {/* Icon badge */}
                        <div className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#76BD43] shadow-lg shadow-[#76BD43]/30 ring-2 ring-white/20">
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      {/* Content */}
                      <div className="p-6 flex-1 flex flex-col">
                        <h3 className="text-lg font-bold text-[#272727] mb-2 group-hover:text-[#76BD43] transition-colors">
                          {service.title}
                        </h3>
                        <p className="text-zinc-500 text-sm leading-relaxed flex-1">
                          {service.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ========================================================== */}
        {/*  5. FEATURES GRID                                          */}
        {/* ========================================================== */}
        <section className="bg-[#f5f5f5] py-24 lg:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Platform Features"
              title="Built for Radio"
              subtitle="Powerful tools designed specifically for community radio stations."
            />

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
            >
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    variants={fadeUp}
                    transition={{ duration: 0.5 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100 hover:shadow-lg hover:border-[#76BD43]/20 transition-all duration-300"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#76BD43]/10 mb-4">
                      <Icon className="h-6 w-6 text-[#76BD43]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#272727] mb-2">{feature.title}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">{feature.description}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ========================================================== */}
        {/*  6. ABOUT / EDITORIAL CREDIBILITY                          */}
        {/* ========================================================== */}
        <section id="about" className="bg-white py-24 lg:py-32 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Text column */}
              <AnimateOnScroll variants={fadeLeft}>
                <p className="text-[#76BD43] font-semibold text-sm tracking-widest uppercase mb-3">
                  About Newskoop
                </p>
                <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-[#272727] mb-2 leading-tight">
                  Your Newsroom Partner
                </h2>
                <div className="h-1 w-12 rounded-full bg-[#76BD43] mb-6" />

                <p className="text-zinc-600 text-base lg:text-lg leading-relaxed mb-4">
                  Based in various parts of the country, Newskoop works with well-known South African
                  journalists and media professionals to bring stations the best quality community,
                  national, and international news.
                </p>
                <p className="text-zinc-600 text-base lg:text-lg leading-relaxed mb-8">
                  Our daily ready-to-air content from Monday to Sunday saves your station time and money.
                  From our user-friendly online portal, stations have everything they need — individual
                  stories, hourly bulletins, and weekly specialty programmes.
                </p>

                <ul className="space-y-4">
                  {aboutBullets.map((bullet) => (
                    <li key={bullet.text} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-[#76BD43] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[#272727] font-semibold block text-[15px]">
                          {bullet.text}
                        </span>
                        <span className="text-zinc-400 text-sm">{bullet.detail}</span>
                      </div>
                    </li>
                  ))}
                </ul>


              </AnimateOnScroll>

              {/* Image column */}
              <AnimateOnScroll variants={fadeRight} delay={0.1}>
                <div className="relative">
                  {/* Decorative background element */}
                  <div className="absolute -top-4 -right-4 w-full h-full rounded-2xl bg-[#76BD43]/10 hidden lg:block" />
                  <Image
                    src="/images/journalists.png"
                    alt="Newskoop journalists across South Africa"
                    width={600}
                    height={420}
                    className="relative w-full rounded-2xl shadow-2xl"
                  />
                </div>
              </AnimateOnScroll>
            </div>
          </div>
        </section>

        {/* ========================================================== */}
        {/*  7. TESTIMONIAL                                            */}
        {/* ========================================================== */}
        <section className="bg-[#272727] py-24 lg:py-32 relative overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <AnimateOnScroll>
              {/* Large decorative quote */}
              <div className="text-[120px] sm:text-[160px] text-[#76BD43]/20 font-serif leading-none select-none mb-[-40px] sm:mb-[-60px]">
                &ldquo;
              </div>

              <blockquote className="text-xl sm:text-2xl lg:text-3xl font-light text-white mb-6 leading-relaxed italic">
                Credible news not only builds trust with listeners,
                <br className="hidden sm:block" />
                it empowers communities.
              </blockquote>

              <div className="mx-auto h-px w-16 bg-[#76BD43] mb-6" />

              <p className="text-zinc-400 text-base sm:text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
                At Newskoop we pride ourselves in providing stations with quality news that serves
                the interests of their communities and provides them with programming that is
                fresh and innovative.
              </p>

              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="absolute -inset-1 rounded-full bg-[#76BD43]/30 blur-sm" />
                  <Image
                    src="/images/kim-nobg.png"
                    alt="Kim du Plessis"
                    width={88}
                    height={88}
                    className="relative h-22 w-22 rounded-full object-cover border-[3px] border-[#76BD43] shadow-xl"
                  />
                </div>
                <div>
                  <p className="text-white font-semibold text-lg tracking-wide">
                    Kim du Plessis
                  </p>
                  <p className="text-[#76BD43] text-sm font-medium">Managing Director</p>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </section>

        {/* ========================================================== */}
        {/*  8. HOW IT WORKS                                           */}
        {/* ========================================================== */}
        <section className="bg-[#f5f5f5] py-24 lg:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Getting Started"
              title="How It Works"
              subtitle="Three simple steps to bring professional news content to your radio station."
            />

            <div className="relative">
              {/* Connecting line (desktop only) */}
              <div className="hidden md:block absolute top-[2.25rem] left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px border-t-2 border-dashed border-[#76BD43]/25" />

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12"
              >
                {steps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={step.title}
                      variants={fadeUp}
                      transition={{ duration: 0.5 }}
                      className="text-center"
                    >
                      <div className="relative inline-flex flex-col items-center">
                        {/* Step icon */}
                        <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-[#76BD43] shadow-lg shadow-[#76BD43]/20 mb-6 ring-4 ring-[#f5f5f5]">
                          <Icon className="h-7 w-7 text-white" />
                          <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#272727] text-[11px] font-bold text-white ring-2 ring-[#f5f5f5]">
                            {step.number}
                          </span>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-[#272727] mb-3">
                        {step.title}
                      </h3>
                      <p className="text-zinc-500 text-sm leading-relaxed max-w-xs mx-auto">
                        {step.description}
                      </p>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ========================================================== */}
        {/*  9. FINAL CTA                                              */}
        {/* ========================================================== */}
        <section className="relative py-24 lg:py-28 overflow-hidden">
          {/* Background image with green overlay */}
          <div
            className="absolute inset-0 bg-no-repeat bg-cover bg-center"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=1600&q=80)' }}
          />
          <div className="absolute inset-0 bg-[#76BD43]/90" />
          {/* Decorative elements */}
          <div className="absolute top-[-80px] right-[-80px] h-64 w-64 rounded-full bg-white/[0.07]" />
          <div className="absolute bottom-[-60px] left-[-60px] h-48 w-48 rounded-full bg-white/[0.07]" />
          <div className="absolute top-1/3 left-[15%] h-24 w-24 rounded-full bg-white/[0.04]" />
          <div className="absolute bottom-1/4 right-[20%] h-16 w-16 rounded-full bg-white/[0.04]" />
          {/* Subtle diagonal stripe */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, white 10px, white 11px)' }} />

          <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
            <AnimateOnScroll>
              <p className="text-white/70 font-semibold text-sm tracking-widest uppercase mb-4">
                Start Today
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight">
                Ready to Power Your Station?
              </h2>
              <p className="text-white/80 text-base sm:text-lg mb-12 leading-relaxed max-w-xl mx-auto">
                Join 70+ community radio stations across South Africa already using
                Newskoop for credible, ready-to-air news content.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="#contact"
                  className="group inline-flex items-center justify-center gap-2 rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-[#272727] shadow-lg hover:bg-zinc-50 transition-all"
                >
                  Get News for Your Station
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
                <a
                  href="#services"
                  className="inline-flex items-center justify-center rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 hover:border-white/50 transition-all"
                >
                  Our Services
                </a>
              </div>
            </AnimateOnScroll>
          </div>
        </section>
      </div>
    </Layout>
  );
}
