import Logo from '../shared/Logo';
import { Phone, Mail, MapPin } from 'lucide-react';
import { Container } from '../ui/container';
import { Text } from '../ui/text';
import { Link } from '../ui/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#76BD43]/10">
      <Container className="py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <Link href="/">
              <Logo className="h-16" variant="full" />
            </Link>
          </div>
          <div className="col-span-1">
            <Text variant="title-sm" className="flex items-center gap-2 text-[#272727]">
              <Phone className="h-5 w-5" />
              Contact Us
            </Text>
            <div className="mt-2">
              <Link href="tel:0218305238" variant="secondary" className="hover:text-[#76BD43]">
                021 830 5238
              </Link>
            </div>
          </div>
          <div className="col-span-1">
            <Text variant="title-sm" className="flex items-center gap-2 text-[#272727]">
              <Mail className="h-5 w-5" />
              Email
            </Text>
            <div className="mt-2 space-y-1">
              <Link href="mailto:info@newskoop.com" variant="secondary" className="hover:text-[#76BD43] block">
                info@newskoop.com
              </Link>
              <Link href="mailto:support@newskoop.com" variant="secondary" className="hover:text-[#76BD43] block">
                support@newskoop.com
              </Link>
            </div>
          </div>
          <div className="col-span-1">
            <Text variant="title-sm" className="flex items-center gap-2 text-[#272727]">
              <MapPin className="h-5 w-5" />
              Address
            </Text>
            <Text variant="sm" className="mt-2 text-gray-600">
              No. 1 Bridgeways, Bridgeways Precinct<br />
              Century City, Cape Town, 7441<br />
              P.O Box 51152, V & A Waterfront<br />
              8002, South Africa
            </Text>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-[#76BD43]/10">
          <Text variant="sm" className="text-center text-gray-600">
            © {new Date().getFullYear()} Newskoop. All rights reserved.
          </Text>
        </div>
      </Container>
    </footer>
  );
} 