'use client';

import { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function Homepage() {
  useEffect(() => {
    const handleScroll = () => {
      // setIsScrolled(scrollPosition > 50); // This line was removed as per the edit hint.
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Layout transparent>
      <div className="min-h-screen bg-white font-sans">
        {/* Hero Section */}
        <section className="relative min-h-[800px] pt-32 pb-20 lg:py-32 overflow-hidden flex items-center">
          <div className="absolute inset-0 bg-no-repeat bg-cover bg-center" style={{ backgroundImage: 'url(/images/nk-hero.png)' }} />
          <div className="absolute inset-0 bg-[#272727] opacity-40"></div>
          <div className="relative z-10 text-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight uppercase">
              All Your News Covered
            </h1>
            <div className="w-24 h-1 mx-auto mb-8 bg-[#76BD43]"></div>
            <p className="text-white mb-8 max-w-4xl mx-auto text-lg sm:text-xl">
              Newskoop is a media content agency that sources, creates and produces content for radio. We cover all international, national, provincial and community news. Content produced includes news, finance, and sport produced in both English and Afrikaans, with a selection of content in IsiXhosa.
            </p>
            <Button href="/register" color="primary" className="inline-flex items-center text-lg">
              Register for Newskoop
            </Button>
          </div>
        </section>

        {/* Quote Section */}
        <section className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              {/* Quote mark */}
              <div className="text-8xl text-gray-200 font-serif mb-4">"</div>
              <blockquote className="text-3xl md:text-4xl font-light text-[#272727] mb-4 leading-relaxed">
                Credible news not only builds trust with listeners, it empowers communities.
              </blockquote>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                At Newskoop we pride ourselves in providing stations with quality news that serves 
                the interests of their communities and provides them with programming that is fresh and innovative.
              </p>
              <div className="flex items-center gap-4">
                <Image
                  src="/images/kim-nobg.png"
                  alt="Kim du Plessis"
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-lg object-cover shadow-lg"
                />
                <div>
                  <p className="text-xl font-semibold text-[#272727] leading-tight">Kim du Plessis</p>
                  <p className="text-gray-600 mt-0.5">Managing Director</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Wide Areas of Resources Section */}
        <section className="py-20 bg-[#f5f5f5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="w-16 h-1 mb-6 bg-[#76BD43]"></div>
                <h2 className="text-3xl font-bold mb-6 text-[#272727]">
                  Wide areas of resources
                </h2>
                <p className="text-[#272727] text-lg">
                  Based in various parts of the country, Newskoop works with well-known South African journalists and media professionals to bring stations the best quality Community, National and International news.
                </p>
              </div>
              <div>
                <Image src="/images/journalists.png" alt="Journalists across South Africa" width={600} height={400} className="w-full rounded-lg shadow-lg" />
              </div>
            </div>
          </div>
        </section>

        {/* Perfectly Crafted Content Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1">
                <Image src="/images/editor.png" alt="Content creation process" width={600} height={400} className="w-full rounded-lg shadow-lg" />
              </div>
              <div className="order-1 lg:order-2">
                <div className="w-16 h-1 mb-6 bg-[#76BD43]"></div>
                <h2 className="text-3xl font-bold mb-6 text-[#272727]">
                  Perfectly crafted content
                </h2>
                <p className="text-[#272727] text-lg">
                  Newskoop sources and prepares content and audio in English, Afrikaans and IsiXhosa from credible news resources. We make the content readily available in radio ready format to stations.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Well Produced Radio Shows Section */}
        <section className="py-20 bg-[#f5f5f5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="w-16 h-1 mb-6 bg-[#76BD43]"></div>
                <h2 className="text-3xl font-bold mb-6 text-[#272727]">
                  Well Produced Radio Shows
                </h2>
                <p className="mb-4 text-[#272727] text-lg">
                  Our recorded news, sport and finance reports along with our other daily shows allows flexibility to the station with no news reader or presenter required.
                </p>
                <p className="text-[#272727] text-lg">
                  Our diverse shows offer engaging content to a wide range of listeners.
                </p>
              </div>
              <div>
                <Image src="/images/podcast.png" alt="Radio show production" width={600} height={400} className="w-full rounded-lg shadow-lg" />
              </div>
            </div>
          </div>
        </section>

        {/* Saving Time and Money Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1">
                <Image src="/images/savings.png" alt="Radio station operations" width={600} height={400} className="w-full rounded-lg shadow-lg" />
              </div>
              <div className="order-1 lg:order-2">
                <div className="w-16 h-1 mb-6 bg-[#76BD43]"></div>
                <h2 className="text-3xl font-bold mb-6 text-[#272727]">
                  Saving Your station time and money
                </h2>
                <p className="text-[#272727] text-lg">
                  Newskoop offers daily ready to air content from Monday to Sunday. From our user-friendly online portal, stations have all they need from individual stories, hourly news bulletins to weekly speciality programmes. We are here to support your newsroom and save your station time and money.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-32 bg-[#272727] relative overflow-hidden">
          <div className="relative z-10 text-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold mb-8 text-white tracking-tight uppercase">
              Get The Best News For Your Radio Station
            </h2>
            <p className="mb-12 text-[#f5f5f5] max-w-3xl mx-auto text-lg">
              We provide quality news and content for radio stations, saving you time and resources. Start your free trial today.
            </p>
            <Button href="/register" color="primary" className="inline-flex items-center text-lg">
              Start Free Trial
              <ArrowRight className="ml-2" size={20} />
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
} 