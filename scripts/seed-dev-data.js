"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting development database seeding...');
    // Create some radio stations
    console.log('\n📻 Creating Radio Stations...');
    const radioStations = [
        {
            name: 'Cape Town Community Radio',
            description: 'Serving the Western Cape community with local news and music',
            province: client_1.Province.WESTERN_CAPE,
            contactNumber: '+27 21 123 4567',
            contactEmail: 'info@capetownradio.co.za',
            website: 'https://capetownradio.co.za',
            allowedLanguages: ['English', 'Afrikaans'],
            allowedReligions: ['Christian', 'Muslim', 'Neutral'],
            blockedCategories: [], // No blocked categories
        },
        {
            name: 'Johannesburg Metro FM',
            description: 'Urban contemporary radio for Gauteng province',
            province: client_1.Province.GAUTENG,
            contactNumber: '+27 11 987 6543',
            contactEmail: 'contact@jmetrofm.co.za',
            website: 'https://jmetrofm.co.za',
            allowedLanguages: ['English', 'Xhosa'],
            allowedReligions: ['Christian', 'Neutral'],
            blockedCategories: [], // No blocked categories
        },
        {
            name: 'Eastern Cape Voice',
            description: 'Local news and community updates for the Eastern Cape',
            province: client_1.Province.EASTERN_CAPE,
            contactNumber: '+27 41 555 7890',
            contactEmail: 'news@ecvoice.co.za',
            allowedLanguages: ['English', 'Xhosa'],
            allowedReligions: ['Christian', 'Neutral'],
            blockedCategories: [], // No blocked categories
        },
        {
            name: 'Durban Waves',
            description: 'Coastal radio bringing KwaZulu-Natal together',
            province: client_1.Province.KWAZULU_NATAL,
            contactNumber: '+27 31 444 2233',
            contactEmail: 'hello@durbanwaves.co.za',
            website: 'https://durbanwaves.co.za',
            allowedLanguages: ['English', 'Afrikaans'],
            allowedReligions: ['Christian', 'Muslim', 'Neutral'],
            blockedCategories: [], // No blocked categories
        },
        {
            name: 'Free State Radio Network',
            description: 'Agricultural and community news for rural Free State',
            province: client_1.Province.FREE_STATE,
            contactNumber: '+27 51 333 1122',
            contactEmail: 'info@fsradio.co.za',
            allowedLanguages: ['English', 'Afrikaans'],
            allowedReligions: ['Christian', 'Neutral'],
            blockedCategories: [], // No blocked categories
        }
    ];
    const createdStations = [];
    for (const stationData of radioStations) {
        try {
            // Check if station already exists
            const existingStation = await prisma.station.findFirst({
                where: { name: stationData.name }
            });
            const station = existingStation ? existingStation : await prisma.station.create({
                data: {
                    name: stationData.name,
                    description: stationData.description,
                    province: stationData.province,
                    contactNumber: stationData.contactNumber,
                    contactEmail: stationData.contactEmail,
                    website: stationData.website,
                    allowedLanguages: stationData.allowedLanguages,
                    allowedReligions: stationData.allowedReligions,
                    blockedCategories: stationData.blockedCategories,
                    isActive: true,
                    hasContentAccess: true,
                },
            });
            createdStations.push(station);
            console.log(`✅ Radio Station created/updated: ${station.name} (${station.province})`);
        }
        catch (error) {
            console.error(`❌ Failed to create station ${stationData.name}:`, error);
        }
    }
    // Create radio users for each station
    console.log('\n👤 Creating Radio Users...');
    for (const station of createdStations) {
        try {
            const hashedPassword = await bcryptjs_1.default.hash('RadioUser123!', 12);
            const email = `radio@${station.name.toLowerCase().replace(/\s+/g, '')}.co.za`;
            const user = await prisma.user.upsert({
                where: { email },
                update: {
                    password: hashedPassword,
                    radioStationId: station.id,
                    isActive: true,
                },
                create: {
                    email,
                    firstName: station.name.split(' ')[0],
                    lastName: 'Radio User',
                    password: hashedPassword,
                    userType: client_1.UserType.RADIO,
                    radioStationId: station.id,
                    isActive: true,
                },
            });
            console.log(`✅ Radio User created/updated: ${user.email} for ${station.name}`);
        }
        catch (error) {
            console.error(`❌ Failed to create radio user for ${station.name}:`, error);
        }
    }
    // Get existing categories and tags
    console.log('\n📂 Fetching existing categories and tags...');
    const categories = await prisma.category.findMany({
        where: { level: 1 }
    });
    const languageTags = await prisma.tag.findMany({
        where: { category: client_1.TagCategory.LANGUAGE }
    });
    const religionTags = await prisma.tag.findMany({
        where: { category: client_1.TagCategory.RELIGION }
    });
    // Get existing authors (staff users)
    const authors = await prisma.user.findMany({
        where: {
            userType: client_1.UserType.STAFF,
            staffRole: { in: [client_1.StaffRole.JOURNALIST, client_1.StaffRole.SUB_EDITOR, client_1.StaffRole.EDITOR] }
        }
    });
    if (authors.length === 0) {
        console.log('❌ No staff users found. Please run user seeding first.');
        return;
    }
    // Create published stories
    console.log('\n📰 Creating Published Stories...');
    const storyTemplates = [
        {
            title: 'Local Municipality Announces New Water Infrastructure Project',
            category: 'News Stories',
            content: `<h2>Major Infrastructure Development Planned</h2>
        <p>The local municipality has announced a comprehensive water infrastructure development project aimed at improving water access for rural communities. The R50 million project is expected to begin in the next quarter and will benefit over 10,000 residents.</p>
        <p>Mayor Sarah Johnson stated, "This project represents our commitment to ensuring every citizen has access to clean, reliable water. We have secured funding and are ready to begin construction immediately."</p>
        <p>The project includes the installation of new pipelines, upgraded pumping stations, and the construction of three new reservoirs. Community leaders have welcomed the announcement, noting that water shortages have been a persistent challenge in the area.</p>
        <p>Construction is expected to be completed within 18 months, with the first phase targeting the most affected areas. Local contractors will be prioritized for employment opportunities.</p>`,
            tags: ['English', 'Christian'],
        },
        {
            title: 'Breaking: Provincial Sports Teams Advance to National Championships',
            category: 'Sports',
            content: `<h2>Historic Achievement for Local Athletes</h2>
        <p>In a stunning display of athletic prowess, three provincial sports teams have qualified for the upcoming national championships, marking the first time in over a decade that the province will be represented across multiple disciplines.</p>
        <p>The rugby, netball, and athletics teams all secured their spots following exceptional performances in the regional qualifiers held last weekend. Coach Maria van der Merwe commented, "Our athletes have shown incredible dedication and skill. This achievement belongs to the entire community."</p>
        <p>The national championships will be held in Johannesburg next month, with over 2,000 athletes from across the country participating. Local businesses have already begun fundraising efforts to support the teams' travel and accommodation costs.</p>
        <p>Training camps are being organized to ensure our representatives are in peak condition for the competition. The community is rallying behind their athletes with unprecedented support.</p>`,
            tags: ['English', 'Neutral'],
        },
        {
            title: 'Economic Growth Drives New Job Creation in Manufacturing Sector',
            category: 'Finance',
            content: `<h2>Manufacturing Boom Creates Employment Opportunities</h2>
        <p>The provincial manufacturing sector has experienced remarkable growth, with new job openings increasing by 35% compared to the same period last year. This growth is attributed to increased investment in local production facilities and favorable economic policies.</p>
        <p>Dr. Michael Khoza, Economic Development Director, explained, "We're seeing unprecedented interest from both local and international investors. Our strategic location and skilled workforce make us an attractive destination for manufacturing operations."</p>
        <p>Major companies have announced expansion plans, with textile, automotive parts, and food processing industries leading the charge. The developments are expected to create over 3,000 new jobs in the next year alone.</p>
        <p>Skills development programs are being established to ensure local residents can take advantage of these opportunities. Training centers are being equipped with modern machinery to prepare workers for the evolving industrial landscape.</p>`,
            tags: ['English', 'Neutral'],
        },
        {
            title: 'Community Health Initiative Launches Mobile Clinic Services',
            category: 'News Stories',
            content: `<h2>Healthcare Access Improved for Rural Communities</h2>
        <p>A groundbreaking mobile health clinic initiative has been launched to serve remote rural communities, bringing essential healthcare services directly to residents who previously had limited access to medical care.</p>
        <p>The program, funded through a partnership between the provincial health department and international donors, will operate five fully-equipped mobile units covering a radius of 200 kilometers.</p>
        <p>Dr. Nomsa Mthembu, Provincial Health Director, stated, "This initiative will provide basic healthcare, preventive services, and health education to communities that have been underserved. Our goal is to ensure healthcare equity across the province."</p>
        <p>Each mobile unit is staffed with qualified nurses, a general practitioner, and community health workers. Services include vaccinations, chronic disease management, maternal care, and health screenings.</p>`,
            tags: ['English', 'Christian'],
        },
        {
            title: 'Oorheersing van Plaaslike Sokkerspan in Streekskompetisie',
            category: 'Sports',
            content: `<h2>Historiese Oorwinning vir Plaaslike Sokker</h2>
        <p>Die plaaslike sokkerspan het 'n merkwaardige prestasie behaal deur die streekskompetisie te wen met 'n perfekte rekord van twintig oorwinnings uit twintig wedstryde. Hierdie uitstaande prestasie het die gemeenskap saamgebring om hul span te ondersteun.</p>
        <p>Afrigter Pieter Rossouw het gesê: "Hierdie seuns het ongelooflike toewyding getoon. Hulle het dag en nag geoefen om hierdie droom waar te maak."</p>
        <p>Die span sal nou deelneem aan die nasionale kampioenskappe waar hulle sal kompeteer teen die beste spanne in die land. Die hele gemeenskap is trots op hierdie uitstaande prestasie.</p>
        <p>Fondsinsameling is reeds aan die gang om die span se reis na die nasionale kampioenskappe te befonds. Plaaslike besighede het reeds hul ondersteuning toegesê.</p>`,
            tags: ['Afrikaans', 'Christian'],
        },
        {
            title: 'Technology Hub Opens to Foster Innovation and Entrepreneurship',
            category: 'Speciality',
            content: `<h2>New Innovation Center Launched</h2>
        <p>A state-of-the-art technology hub has officially opened its doors, providing local entrepreneurs and tech enthusiasts with access to modern facilities, mentorship programs, and networking opportunities.</p>
        <p>The facility, located in the city center, features co-working spaces, high-speed internet, 3D printing capabilities, and conference rooms. It aims to bridge the digital divide and foster technological innovation in the region.</p>
        <p>CEO of the Technology Development Agency, Dr. Priya Patel, remarked, "This hub represents our commitment to building a knowledge-based economy. We want to nurture the next generation of tech entrepreneurs right here in our community."</p>
        <p>The opening ceremony attracted over 200 attendees, including established business leaders, students, and aspiring entrepreneurs. Several startup companies have already registered for incubation programs.</p>`,
            tags: ['English', 'Neutral'],
        },
        {
            title: 'Emergency Services Respond to Flooding, Community Shows Resilience',
            category: 'News Bulletins',
            content: `<h2>Flood Response Demonstrates Community Spirit</h2>
        <p>Following heavy rainfall that caused flooding in low-lying areas, emergency services and community volunteers worked together to ensure resident safety and provide immediate assistance to affected families.</p>
        <p>Fire Chief Robert Ntuli reported, "Our teams responded within minutes and successfully evacuated 45 families from at-risk areas. The community's cooperation was exemplary, and no injuries were reported."</p>
        <p>Temporary shelters were established at community centers, with local organizations providing meals, blankets, and essential supplies. The disaster management team is coordinating cleanup efforts.</p>
        <p>Weather services predict clearing conditions over the next 48 hours, allowing affected residents to begin returning to their homes safely.</p>`,
            tags: ['English', 'Neutral'],
        },
        {
            title: 'Cultural Festival Celebrates Heritage and Brings Communities Together',
            category: 'Speciality',
            content: `<h2>Annual Heritage Festival Draws Record Crowds</h2>
        <p>The annual cultural heritage festival has concluded with record-breaking attendance, showcasing the rich diversity of local traditions, music, dance, and cuisine. Over 15,000 visitors participated in the three-day celebration.</p>
        <p>Festival coordinator Thandiwe Makhanya expressed her joy: "This year's festival truly captured the spirit of our community. We saw families from all backgrounds coming together to celebrate our shared heritage."</p>
        <p>Highlights included traditional dance performances, craft exhibitions, food stalls representing various cultures, and live music performances by local artists. Educational workshops taught visitors about local history and traditions.</p>
        <p>The economic impact was significant, with local vendors reporting strong sales and hotels reaching full capacity. Plans are already underway for next year's festival.</p>`,
            tags: ['English', 'Christian'],
        }
    ];
    const createdStories = [];
    for (const [index, template] of storyTemplates.entries()) {
        try {
            const category = categories.find(c => c.name === template.category);
            const author = authors[index % authors.length];
            if (!category) {
                console.log(`⚠️ Category ${template.category} not found, skipping story`);
                continue;
            }
            // Create the story
            const story = await prisma.story.create({
                data: {
                    title: template.title,
                    slug: template.title.toLowerCase()
                        .replace(/[^a-z0-9\s-]/g, '')
                        .replace(/\s+/g, '-')
                        .replace(/-+/g, '-')
                        .substring(0, 100) + `-${Date.now()}`,
                    content: template.content,
                    status: client_1.StoryStatus.PUBLISHED,
                    language: template.tags.includes('Afrikaans') ? client_1.StoryLanguage.AFRIKAANS : client_1.StoryLanguage.ENGLISH,
                    authorId: author.id,
                    categoryId: category.id,
                    publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
                    publishedBy: author.id,
                },
            });
            // Add tags to the story
            for (const tagName of template.tags) {
                const tag = [...languageTags, ...religionTags].find(t => t.name === tagName);
                if (tag) {
                    await prisma.storyTag.create({
                        data: {
                            storyId: story.id,
                            tagId: tag.id,
                        },
                    });
                }
            }
            createdStories.push(story);
            console.log(`✅ Story created: ${story.title} (${story.language})`);
        }
        catch (error) {
            console.error(`❌ Failed to create story ${template.title}:`, error);
        }
    }
    // Create some news bulletins (shorter content)
    console.log('\n📢 Creating News Bulletins...');
    const bulletinTemplates = [
        {
            title: 'Weather Alert: Strong Winds Expected This Afternoon',
            content: `<p><strong>WEATHER BULLETIN:</strong> The meteorological office has issued a warning for strong winds expected between 2 PM and 8 PM today. Winds may reach up to 60 km/h with possible localized damage to temporary structures.</p>
        <p>Residents are advised to secure loose items and avoid outdoor activities during peak wind hours. Emergency services are on standby.</p>`,
            tags: ['English', 'Neutral'],
        },
        {
            title: 'Traffic Update: Main Road Construction Begins Monday',
            content: `<p><strong>TRAFFIC NOTICE:</strong> Major road construction on Main Street will begin Monday morning at 6 AM. Expect significant delays during peak hours throughout the week.</p>
        <p>Alternative routes via Church Street and Park Avenue are recommended. Construction is expected to complete by Friday evening.</p>`,
            tags: ['English', 'Neutral'],
        },
        {
            title: 'Community Meeting: Library Expansion Plans',
            content: `<p><strong>PUBLIC NOTICE:</strong> A community meeting will be held Thursday at 7 PM in the town hall to discuss the proposed library expansion project.</p>
        <p>Residents are encouraged to attend and share their input on the proposed plans. Light refreshments will be provided.</p>`,
            tags: ['English', 'Christian'],
        },
        {
            title: 'Verkeerswaarskuwing: Padwerke op Hoofstraat',
            content: `<p><strong>VERKEERSBULLETIN:</strong> Grootskaalse padwerke op Hoofstraat begin Maandagoggend om 6 uur. Motoriste moet beduidende vertragings verwag gedurende spitsure.</p>
        <p>Alternatiewe roetes via Kerkstraat en Parklaan word aanbeveel. Konstruksie sal na verwagting Vrydagaand voltooi wees.</p>`,
            tags: ['Afrikaans', 'Neutral'],
        }
    ];
    const bulletinCategory = categories.find(c => c.name === 'News Bulletins');
    if (bulletinCategory) {
        for (const [index, template] of bulletinTemplates.entries()) {
            try {
                const author = authors[index % authors.length];
                const bulletin = await prisma.story.create({
                    data: {
                        title: template.title,
                        slug: template.title.toLowerCase()
                            .replace(/[^a-z0-9\s-]/g, '')
                            .replace(/\s+/g, '-')
                            .replace(/-+/g, '-')
                            .substring(0, 100) + `-${Date.now()}-${index}`,
                        content: template.content,
                        status: client_1.StoryStatus.PUBLISHED,
                        language: template.tags.includes('Afrikaans') ? client_1.StoryLanguage.AFRIKAANS : client_1.StoryLanguage.ENGLISH,
                        authorId: author.id,
                        categoryId: bulletinCategory.id,
                        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last 7 days
                        publishedBy: author.id,
                    },
                });
                // Add tags to the bulletin
                for (const tagName of template.tags) {
                    const tag = [...languageTags, ...religionTags].find(t => t.name === tagName);
                    if (tag) {
                        await prisma.storyTag.create({
                            data: {
                                storyId: bulletin.id,
                                tagId: tag.id,
                            },
                        });
                    }
                }
                console.log(`✅ Bulletin created: ${bulletin.title} (${bulletin.language})`);
            }
            catch (error) {
                console.error(`❌ Failed to create bulletin ${template.title}:`, error);
            }
        }
    }
    console.log('\n🎉 Development database seeding completed!');
    console.log('📊 Summary:');
    console.log(`   - ${createdStations.length} Radio Stations`);
    console.log(`   - ${createdStations.length} Radio Users`);
    console.log(`   - ${createdStories.length} Published Stories`);
    console.log(`   - ${bulletinTemplates.length} News Bulletins`);
    console.log(`   - Multiple languages: English & Afrikaans`);
    console.log(`   - Various categories: News Stories, Sports, Finance, Speciality, News Bulletins`);
}
main()
    .catch((e) => {
    console.error('❌ Development seeding failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
