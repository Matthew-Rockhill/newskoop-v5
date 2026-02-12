import Logo from '../shared/Logo';
import { Phone, Mail, MapPin } from 'lucide-react';

const quickLinks = [
  { label: 'Services', href: '#services' },
  { label: 'About Us', href: '#about' },
  { label: 'Contact', href: '#contact' },
  { label: 'Login', href: '/login' },
];

const serviceLinks = [
  'News Stories',
  'Radio Bulletins',
  'Radio Shows',
  'Audio Content',
];

export default function Footer() {
  return (
    <footer id="contact" className="bg-[#272727] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1: Logo + Tagline */}
          <div>
            <Logo className="h-12 mb-4" variant="transparent-white" />
            <p className="text-zinc-400 text-sm leading-relaxed">
              South Africa&apos;s content agency for community radio. Powering stations with credible news, bulletins, and audio content.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-zinc-400 text-sm hover:text-[#76BD43] transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Services */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Services</h3>
            <ul className="space-y-2">
              {serviceLinks.map((service) => (
                <li key={service}>
                  <span className="text-zinc-400 text-sm">{service}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Phone className="h-4 w-4 mt-0.5 shrink-0 text-[#76BD43]" />
                <a href="tel:0218305238" className="text-zinc-400 text-sm hover:text-white transition-colors">
                  021 830 5238
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-0.5 shrink-0 text-[#76BD43]" />
                <div className="space-y-1">
                  <a href="mailto:info@newskoop.com" className="text-zinc-400 text-sm hover:text-white transition-colors block">
                    info@newskoop.com
                  </a>
                  <a href="mailto:support@newskoop.com" className="text-zinc-400 text-sm hover:text-white transition-colors block">
                    support@newskoop.com
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-[#76BD43]" />
                <p className="text-zinc-400 text-sm leading-relaxed">
                  No. 1 Bridgeways, Bridgeways Precinct<br />
                  Century City, Cape Town, 7441<br />
                  South Africa
                </p>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-zinc-500 text-sm">
            &copy; {new Date().getFullYear()} Newskoop. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-zinc-500 text-sm hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-zinc-500 text-sm hover:text-white transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
