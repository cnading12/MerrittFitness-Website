export interface Event {
  id: string;
  title: string;
  date: string; // ISO format: YYYY-MM-DD
  time: string; // e.g., "7:00 PM"
  endTime?: string; // Optional end time
  description: string;
  imageUrl: string;
  imagePosition?: string; // CSS object-position value, e.g., "center top", "center 30%"
  imageFit?: 'cover' | 'contain'; // CSS object-fit value, defaults to 'cover'
  ticketUrl?: string; // Optional - omit for free events
  ticketLabel?: string; // Custom label for ticket button, defaults to "Get Tickets"
  whatsappUrl?: string; // Optional WhatsApp group invite link
  instagramHandle?: string; // Without @ symbol
  facebookHandle?: string; // Without @ symbol
  practitionerName?: string;
  recurrence?: string; // e.g., "Every Thursday", "First Saturday of every month"
  endDate?: string; // Optional ISO date — for recurring events, the last day occurrences should appear
  sessionDates?: string[]; // Optional explicit list of session dates (ISO) for a fixed multi-session series with irregular spacing
  hideOccurrenceDates?: boolean; // Hide the per-date chip list on the card (the recurrence banner still shows the schedule)
}

// Add your events here - events with dates in the past will be automatically filtered out
export const events: Event[] = [
  // ============ RECURRING: SUNDAY MORNING SERVICE ============
  {
    id: "sunday-morning-service",
    title: "Sunday Morning Service",
    date: "2026-04-26",
    time: "7:30 AM",
    endTime: "12:30 PM",
    description: "Join this welcoming Sunday morning service held in our beautiful historic sanctuary. While Merritt Wellness is a non-denominational space open to all practices and beliefs, we're honored to host this lovely congregation each week. All are welcome.",
    imageUrl: "/images/events/community/group.webp",
    recurrence: "Every Sunday"
  },

  // ============ RECURRING: SUNDAY AFTERNOON SERVICE ============
  {
    id: "sunday-afternoon-service",
    title: "Sunday Afternoon Service",
    date: "2026-04-26",
    time: "1:00 PM",
    endTime: "4:00 PM",
    description: "“The Upper Room is a bilingual church that seeks to awaken hearts towards God, unite the church and develop disciples for the cause of Christ. We are a warm and grounded community where faith is strengthened and lives are transformed by the presence of the living God. At the Upper Room you don’t have to have it all together to belong here. This is a community where you can truly connect and grow.”",
    imageUrl: "/images/events/community/pator-tate.jpeg",
    practitionerName: "Pastor Tate",
    recurrence: "Every Sunday"
  },

  // ============ PAST: FULL CIRCLE DANCE (ENDED MAY 14, 2026) ============
  {
    id: "full-circle-dance",
    title: "Full Circle Dance",
    date: "2026-04-30",
    endDate: "2026-05-14",
    time: "4:00 PM",
    endTime: "6:30 PM",
    description: "Full Circle Dance offered a heart-centered dance experience for our youngest movers ages 2-8. Led by Genoa, these weekly classes helped little dancers explore movement, build confidence, and grow through joy in our bright, welcoming historic space. The final class was held May 14, 2026.",
    imageUrl: "/images/events/dance/kids.jpg",
    instagramHandle: "fullcircledancecolorado",
    practitionerName: "Genoa",
    recurrence: "Every Thursday"
  },

  // ============ RECURRING: FULL MIND BODY SPIRIT COUNSELING (BASEMENT STUDIO OFFICE) ============
  {
    id: "full-mind-body-spirit-counseling",
    title: "Somatic Therapy with Full Mind Body Spirit Counseling",
    date: "2026-07-06",
    time: "Mon & Wed 10:00 AM – 8:00 PM · Fri 10:00 AM – 4:00 PM",
    description: "Please note: these are private one-on-one and couples therapy sessions held in Cayla's studio office on the lower level of Merritt Wellness — not gatherings in the main hall. \"Healing doesn't always begin with words. Sometimes it starts with noticing — a tension you carry, an emotion just beneath the surface, a way of moving through the world that no longer fits. Dance/Movement Therapy is the psychotherapeutic use of dance, movement, body awareness, and embodied communication, to foster healing and wellness. The wisdom you're looking for is already within you. My work is simply to help you find your way back to it!\" Cayla Chambers MA, LPC, R-DMT is a Dance/Movement Therapist offering somatic therapy for individuals and couples 18+. She is EMDR trained, PACT Level 1 couples therapy trained, and RYT 200. Cayla is in office Mondays and Wednesdays 10 AM – 8 PM and Fridays 10 AM – 4 PM. Learn more and book a free 15-minute consultation!",
    imageUrl: "/images/event-banners/Cayla-Headshot.jpg",
    imagePosition: "center 30%",
    ticketUrl: "https://www.fullmindbodyspiritcounseling.com/",
    ticketLabel: "Book a Free Consultation",
    instagramHandle: "full.mind.body.spirit",
    practitionerName: "Cayla Chambers MA, LPC, R-DMT",
    recurrence: "Every Monday, Wednesday & Friday",
    hideOccurrenceDates: true
  },

  // ============ GROUND & FLOW: CHAKRA-INSPIRED VINYASA SERIES (AUG–SEP 2026) ============
  {
    id: "ground-and-flow-chakra-vinyasa-2026",
    title: "Ground & Flow: A Chakra-Inspired Vinyasa Series",
    date: "2026-08-21",
    sessionDates: ["2026-08-21", "2026-08-28", "2026-09-18"],
    time: "9:30 AM",
    endTime: "10:30 AM",
    description: "A 7-week Chakra inspired Vinyasa series exploring movement, breath, and embodied awareness. Each week focuses on one chakra through mindful movement, breathwork, and meditation, supporting balance and self-discovery. Upcoming Friday sessions: August 21 — Grounded, August 28 — Creative, and September 18 — Confident, with additional dates to be announced. Open to all levels! Bring a mat, water bottle, and journal — props will be provided. Facilitated by Cayla Chambers MA, LPC, R-DMT, RYT 200.",
    imageUrl: "/images/event-banners/Cayla-Headshot.jpg",
    imagePosition: "center 30%",
    ticketUrl: "https://www.fullmindbodyspiritcounseling.com/movement-medicine",
    ticketLabel: "Register",
    instagramHandle: "full.mind.body.spirit",
    practitionerName: "Cayla Chambers MA, LPC, R-DMT, RYT 200"
  },

  // ============ RECURRING: SLOANS LAKE CITIZENS GROUP ============
  {
    id: "sloans-lake-citizens-group",
    title: "Sloans Lake Citizens Group",
    date: "2026-05-21",
    time: "6:00 PM",
    endTime: "8:00 PM",
    description: "A monthly gathering of the Sloans Lake Citizens Group, hosted in our historic sanctuary. Neighbors come together to discuss local updates, community initiatives, and ways to strengthen our area. Free and open to all who care about the Sloans Lake neighborhood.",
    imageUrl: "/images/events/community/food.webp",
    recurrence: "Third Thursday of every month"
  },

  {
  id: "tantra-speed-date-mar-2026",
  title: "Tantra Speed Date",
  date: "2026-03-07",
  time: "5:30 PM",
  endTime: "9:00 PM",
  description: "Tired of swiping? Try a whole new dating experience—it's like yoga for your love life! Led by Stephanie Miller, this popular monthly gathering brings together singles for an evening of connection, movement, and meaningful conversations in our beautiful historic sanctuary. Use our ticket link for 10% OFF!",
  imageUrl: "/images/events/community/tantra.webp",
  ticketUrl: "https://www.eventbrite.com/e/tantra-speed-date-denver-meet-singles-speed-dating-tickets-1914191862389?discount=MERRITT10",
  instagramHandle: "tantra_speed_date",
  practitionerName: "Stephanie Miller"
},

  // ============ SOUND IMMERSION WITH THE HARMONIC QUINTESSENCE ============
  {
    id: "sound-immersion-harmonic-quintessence-jul-2026",
    title: "Sound Immersion with the Harmonic Quintessence",
    date: "2026-07-28",
    time: "7:00 PM",
    description: "Join us for a deeply restorative evening of sound, healing, and connection at Merritt Wellness Center at Sloan's Lake. Experience a unique Sound Immersion created by five talented sound practitioners working together to weave a rich tapestry of healing vibrations. Through gongs, crystal singing bowls, metal bowls, drums, chimes, flutes, and sacred instruments, you will be invited into a space of relaxation, reflection, and energetic renewal. As the sounds surround you, allow yourself to release stress, quiet the mind, and reconnect with the wisdom within. This immersive experience is designed to support balance, peace, and a deeper connection to yourself and the present moment. Following the immersion, guests are invited to enjoy tea and connect with our sacred community. Come as you are. Leave feeling grounded, refreshed, and renewed.",
    imageUrl: "/images/event-banners/Sound Immersion Event Header 2026.png",
    imageFit: "contain",
    ticketUrl: "https://link.automationonamission.com/widget/bookings/sound-immersion-hq",
    ticketLabel: "Reserve Your Space"
  },

  // ============ PAST: YOGA WITH TERRI STAFFORD (ENDED JUNE 5, 2026) ============
  {
    id: "terri-stafford-yoga",
    title: "Yoga with Terri Stafford",
    date: "2026-04-03",
    endDate: "2026-06-05",
    time: "7:00 PM",
    endTime: "8:00 PM",
    description: "Join Terri Stafford for a monthly yoga experience in our beautiful historic sanctuary. $35 per person — limited space available. Reserve your spot via Venmo. Please include the number of people and date in your Venmo notes. Bring a mat, towel, and water bottle. Blocks and bolsters are welcome but not necessary.",
    imageUrl: "/images/events/community/Terri-Event.JPG",
    instagramHandle: "mandalagobeyond",
    practitionerName: "Terri Stafford",
    recurrence: "First Friday of every month"
  },

  // ============ RECURRING: MILE HIGH QUALCHATA ============
  {
    id: "mile-high-qualchata",
    title: "Mile High Qualchata",
    date: "2026-08-05",
    time: "6:30 PM",
    endTime: "8:30 PM",
    description: "Join Mile High Qualchata for weekly salsa and bachata classes every Wednesday from 6:30-8:30PM: one hour of salsa and one hour of bachata. Our goal is to teach you the basics of social dancing so that you can feel confident joining Denver's growing social dance scene across many amazing venues in the city. By the end, you'll have a working knowledge of social dancing within these dance styles, and will be able to go to any dance function and move confidently with a partner! $5 per class. Please note: classes are taking a break for the month of July and will resume in August.",
    imageUrl: "/images/events/dance/Ricky.JPG",
    imageFit: "contain",
    ticketUrl: "https://www.paypal.com/qrcodes/venmocs/03688acd-e9cd-4d15-a2c0-0a3ee4a1ecd8?created=1772574619.18876&printed=1",
    ticketLabel: "Pay via Venmo",
    whatsappUrl: "https://chat.whatsapp.com/ChIgscJQQdaHlxzbVU89FA?mode=gi_t",
    instagramHandle: "milehigh_qualchata",
    practitionerName: "Mile High Qualchata",
    recurrence: "Every Wednesday"
  },

  // ============ MILE HIGH QUALCHATA SOCIALS ============
  {
    id: "qualchata-social-mar-06",
    title: "Mile High Qualchata Social",
    date: "2026-03-06",
    time: "7:00 PM",
    endTime: "11:00 PM",
    description: "Queer, BPIOC, Straight Friendly and Open to everyone. Join Mile High Qualchata for a Latin dance social! Practice your salsa and bachata moves in a fun, welcoming environment. Open to all levels.",
    imageUrl: "/images/events/community/Qualchata.webp",
    ticketUrl: "https://www.paypal.com/qrcodes/venmocs/03688acd-e9cd-4d15-a2c0-0a3ee4a1ecd8?created=1772574619.18876&printed=1",
    ticketLabel: "Pay via Venmo",
    whatsappUrl: "https://chat.whatsapp.com/ChIgscJQQdaHlxzbVU89FA?mode=gi_t",
    instagramHandle: "milehigh_qualchata",
    practitionerName: "Mile High Qualchata"
  },
  {
    id: "qualchata-social-mar-20",
    title: "Mile High Qualchata Social",
    date: "2026-03-20",
    time: "7:00 PM",
    endTime: "11:00 PM",
    description: "Queer, BPIOC, Straight Friendly and Open to everyone. Join Mile High Qualchata for a Latin dance social! Practice your salsa and bachata moves in a fun, welcoming environment. Open to all levels.",
    imageUrl: "/images/events/community/Qualchata.webp",
    ticketUrl: "https://www.paypal.com/qrcodes/venmocs/03688acd-e9cd-4d15-a2c0-0a3ee4a1ecd8?created=1772574619.18876&printed=1",
    ticketLabel: "Pay via Venmo",
    whatsappUrl: "https://chat.whatsapp.com/ChIgscJQQdaHlxzbVU89FA?mode=gi_t",
    instagramHandle: "milehigh_qualchata",
    practitionerName: "Mile High Qualchata"
  },
  {
    id: "qualchata-social-apr-10",
    title: "Mile High Qualchata Social",
    date: "2026-04-10",
    time: "7:00 PM",
    endTime: "11:00 PM",
    description: "Queer, BPIOC, Straight Friendly and Open to everyone. Join Mile High Qualchata for a Latin dance social! Practice your salsa and bachata moves in a fun, welcoming environment. Open to all levels.",
    imageUrl: "/images/events/community/Qualchata.webp",
    ticketUrl: "https://www.paypal.com/qrcodes/venmocs/03688acd-e9cd-4d15-a2c0-0a3ee4a1ecd8?created=1772574619.18876&printed=1",
    ticketLabel: "Pay via Venmo",
    whatsappUrl: "https://chat.whatsapp.com/ChIgscJQQdaHlxzbVU89FA?mode=gi_t",
    instagramHandle: "milehigh_qualchata",
    practitionerName: "Mile High Qualchata"
  },
  {
    id: "qualchata-social-apr-24",
    title: "Mile High Qualchata Social",
    date: "2026-04-24",
    time: "7:00 PM",
    endTime: "11:00 PM",
    description: "Queer, BPIOC, Straight Friendly and Open to everyone. Join Mile High Qualchata for a Latin dance social! Practice your salsa and bachata moves in a fun, welcoming environment. Open to all levels.",
    imageUrl: "/images/events/community/Qualchata.webp",
    ticketUrl: "https://www.paypal.com/qrcodes/venmocs/03688acd-e9cd-4d15-a2c0-0a3ee4a1ecd8?created=1772574619.18876&printed=1",
    ticketLabel: "Pay via Venmo",
    whatsappUrl: "https://chat.whatsapp.com/ChIgscJQQdaHlxzbVU89FA?mode=gi_t",
    instagramHandle: "milehigh_qualchata",
    practitionerName: "Mile High Qualchata"
  },

  // ============ RECURRING: SLOW FLOW + NERVOUS SYSTEM RESET ============
  {
    id: "slow-flow-nervous-system-reset",
    title: "Slow Flow + Nervous System Reset",
    date: "2026-05-05",
    time: "10:00 AM",
    endTime: "11:00 AM",
    description: "Experience the connection between body, breath, and awareness in a weekly all-levels class that teaches you tools and techniques to maintain steadiness in a busy world. What you need: Yoga Mat, Block, Blanket, Strap. Cost: $15 suggested donation (Venmo or Cash).",
    imageUrl: "/images/events/yoga/Kristen-Boyle.png",
    imageFit: "contain",
    instagramHandle: "Kris10ami",
    practitionerName: "Kristen Boyle",
    recurrence: "Every Tuesday"
  },

  // ============ RECURRING: SINGLE MOMS THRIVE ============
  {
    id: "single-moms-thrive",
    title: "Single Moms Thrive",
    date: "2026-05-07",
    time: "10:00 AM",
    endTime: "11:00 AM",
    description: "A Yoga Practice for Single Moms. The community you've been craving. Learn tools and techniques to stay steady among all challenges. Feel the relief from true Self Care. You are not alone. Recommended: Yoga Mat, Block, Blanket, Strap. $15 suggested donation (Venmo @iamkris10 or Cash).",
    imageUrl: "/images/events/yoga/Kristen-Boyle.png",
    imageFit: "contain",
    instagramHandle: "Kris10ami",
    practitionerName: "Kristen Boyle",
    recurrence: "Every Thursday"
  },

  // ============ MARCH 2026 ============
  {
    id: "full-moon-breathwork-mar-2026",
    title: "Full Moon Holosomatic Breathwork",
    date: "2026-03-03",
    time: "6:00 PM",
    endTime: "8:00 PM",
    description: "Where neuroscience meets spirit. Your nervous system holds the map to your deepest healing. Through conscious breathwork and movement under the full moon's energy, we activate your body's innate wisdom to rewire neural pathways, release stored tension, and awaken dormant vitality. All experience levels welcome. $40 per person.",
    imageUrl: "/images/events/community/jules.webp",
    ticketUrl: "https://www.eventbrite.com/e/full-moon-holosomatic-breathwork-tickets-1982967711806",
    instagramHandle: "SomaticJules",
    practitionerName: "Juliana Stoddart"
  },

  // ============ RECURRING: WESTERN WISH SECOND SUNDAYS SHOWCASE ============
  {
    id: "western-wish-second-sundays-apr-2026",
    title: "Second Sundays Showcase: Songwriters' Round",
    date: "2026-04-12",
    time: "6:00 PM",
    description: "WesternWish Productions & KRFC 88.9 FM present Second Sundays Showcase: Songwriters' Round — an intimate evening of music and storytelling featuring three independent original musicians: Abigael Elizabeth, Sam McManus, and Sid Williamson. Doors at 5:30 PM, show at 6:00 PM.",
    imageUrl: "/images/events/western-wish/Western-Wish-April.png",
    ticketUrl: "https://www.tickettailor.com/events/westernwishproductions/2050830",
    instagramHandle: "westernwishproductions",
    practitionerName: "WesternWish Productions"
  },
  {
    id: "western-wish-second-sundays-may-2026",
    title: "Second Sundays Showcase: Songwriters' Round",
    date: "2026-05-10",
    time: "6:00 PM",
    description: "WesternWish Productions & KRFC 88.9 FM present Second Sundays Showcase: Songwriters' Round — an intimate, listening room-style evening where independent musicians share original songs and the stories behind them. Doors at 5:30 PM, show at 6:00 PM.",
    imageUrl: "/images/events/western-wish/Western-Wish.png",
    ticketUrl: "https://www.westernwish.com/events",
    instagramHandle: "westernwishproductions",
    practitionerName: "WesternWish Productions"
  },
  {
    id: "western-wish-second-sundays-jun-2026",
    title: "Second Sundays Showcase: Songwriters' Round",
    date: "2026-06-14",
    time: "6:00 PM",
    description: "WesternWish Productions & KRFC 88.9 FM present Second Sundays Showcase: Songwriters' Round — an intimate evening of music and storytelling featuring three independent original musicians: Tony Meade, Haley Harkin, and Garden District (duo). Doors at 5:30 PM, show at 6:00 PM. Use code MERRITT15 for 15% off tickets.",
    imageUrl: "/images/events/western-wish/June.png",
    imageFit: "contain",
    ticketUrl: "https://www.tickettailor.com/events/westernwishproductions/2053136",
    instagramHandle: "westernwishproductions",
    practitionerName: "WesternWish Productions"
  },
  {
    id: "western-wish-second-sundays",
    title: "Second Sundays Showcase",
    date: "2026-07-12",
    time: "6:00 PM",
    description: "An intimate, listening room-style event series where independent musicians share original songs and the stories behind them in a supportive acoustic setting. Doors at 5:30 PM, show at 6:00 PM.",
    imageUrl: "/images/events/western-wish/Western-Wish.png",
    ticketUrl: "https://www.westernwish.com/events",
    instagramHandle: "westernwishproductions",
    practitionerName: "WesternWish Productions",
    recurrence: "Second Sunday of every month"
  },

  // ============ JULY 2026 ============
  {
    id: "sacred-pause-breathwork-jul-2026",
    title: "A Sacred Pause: A Christ-Centered Breathwork Gathering for Women",
    date: "2026-07-19",
    time: "5:00 PM",
    description: "Transformational breathwork is a beautiful practice that helps us slow down, quiet the noise, release what our bodies have been carrying, and become more present to God, ourselves, and others. While breathwork is practiced in many different ways, these gatherings are intentionally Christ-centered. My hope is that this becomes a monthly place for women to pause, breathe, reconnect, and remember they are deeply loved. Hosted by Julie Roebken, certified trauma-informed breathwork facilitator. Doors open at 4:45 PM — come early to find your spot and get settled. $25 registration, with 20% going to Re-fined, a local nonprofit supporting women impacted by sexual exploitation. For more info: julie@mindfulhaus.com, 303-717-4442, or www.mindfulhaus.com.",
    imageUrl: "/images/event-banners/Julie_headshot2.jpeg",
    imagePosition: "center 20%",
    ticketUrl: "https://mindfulhaus.as.me/JulyGathering",
    ticketLabel: "Register",
    practitionerName: "Julie Roebken"
  },
  {
    id: "holosomatic-breathwork-jul-08-2026",
    title: "Holosomatic Breathwork",
    date: "2026-07-08",
    time: "6:00 PM",
    endTime: "8:00 PM",
    description: "Anxiety. Looping thoughts. Self-doubt. Harmful patterns. None of that is your true nature. Holosomatic Breathwork cuts through all of it. Through breath, movement, and sound, your body becomes the guide—back to the truth of who you are, back to the one who knows exactly what you need, what you want, what you're here for. This is body-led healing, and it will change everything. Doors open at 5:50 PM. All experience levels welcome. $40 per person.",
    imageUrl: "/images/events/community/jules.webp",
    ticketUrl: "https://somaticjules.com/events/",
    instagramHandle: "SomaticJules",
    practitionerName: "Juliana Stoddart"
  },
  {
    id: "foundations-healthy-back-donna-farhi-jul-2026",
    title: "Foundations of a Healthy Back: A Yoga Intensive with Donna Farhi",
    date: "2026-07-10",
    sessionDates: ["2026-07-10", "2026-07-11", "2026-07-12", "2026-07-13", "2026-07-14"],
    time: "10:00 AM",
    endTime: "5:00 PM",
    description: "Internationally renowned yoga teacher and author Donna Farhi returns to Colorado for Foundations of a Healthy Back, an immersive five-day intensive for dedicated students and teachers. Explore a whole-body approach to spinal health, posture, core stability, and pain-free practice through experiential learning and accessible anatomy. This is Donna's only Western Hemisphere teaching engagement in 2026. The intensive runs July 10–14, 2026. Daily start and end times vary — please click the registration link or follow @myevolition on Instagram and Facebook for the full day-by-day schedule. Sign language interpretation will be provided. For questions, contact Tiffany Bucknam at tiffany@myevolition.com.",
    imageUrl: "/images/event-banners/Foundations of a Healthy Back Banner image.jpg",
    ticketUrl: "https://www.myevolition.com/donna-farhi-intensive-2026",
    ticketLabel: "Register",
    instagramHandle: "myevolition",
    facebookHandle: "myevolition",
    practitionerName: "Donna Farhi"
  },

  // ============ JUNE 2026 ============
  {
    id: "soften-unwind-yin-massage-sound-bath-jun-2026",
    title: "Soften & Unwind: A Restorative Evening",
    date: "2026-06-28",
    time: "6:00 PM",
    endTime: "8:30 PM",
    description: "Join us for a special event designed to calm your nervous system and invite deep relaxation. Hosted by Anissa M. Cordova, PhD (Psychotherapist, Emotional Resilience Coach, Sound Bath Facilitator) and Courtney Greth, LMT (End-of-Life Doula, Reiki Practitioner, Biodynamic Craniosacral Therapist). Courtney will guide gentle yin yoga, with optional individualized massage offered to a limited number of participants. The evening will flow into a soothing sound bath led by Anissa, with reiki gently woven throughout to support your rest.",
    imageUrl: "/images/events/yoga/Recenter (202).jpg",
    imagePosition: "center 30%",
    ticketUrl: "https://www.recentertherapeuticmassage.com",
    ticketLabel: "Reserve Your Spot",
    instagramHandle: "recenterdenver",
    practitionerName: "Anissa M. Cordova & Courtney Greth"
  },
  {
    id: "boy-mom-play-and-learn-2026",
    title: "Boy Mom Play & Learn",
    date: "2026-06-18",
    sessionDates: ["2026-06-18", "2026-06-25", "2026-07-09", "2026-07-16"],
    time: "9:00 AM",
    description: "A small group led by Dr. Steph Bono (licensed psychologist + fellow boy mom) for moms in the thick of raising toddler boys (approx. 1-3 years old). Over 4 sessions, you'll tackle common toddlerhood challenges, learn how to nurture emotional intelligence in boys, and connect with other boy moms. A toddler or baby is welcome to join but not required. Sessions are held Thursday mornings starting June 18. Spots are limited — save yours and learn more at evergrowpsych.com/boymom.",
    imageUrl: "/images/events/community/Boy-Mom.png",
    imageFit: "contain",
    ticketUrl: "https://evergrowpsych.com/boymom",
    ticketLabel: "Save Your Spot",
    instagramHandle: "evergrowpsychology",
    practitionerName: "Dr. Steph Bono"
  },
  {
    id: "channel-one-sound-system-jun-2026",
    title: "Channel One Sound System",
    date: "2026-06-07",
    time: "6:00 PM",
    endTime: "10:00 PM",
    description: "Pomegranate Sounds presents Channel One Sound System featuring Mikey Dread & Ras Sherby, live at Merritt Wellness. A legendary night of roots reggae and dub culture brought to Denver by Pomegranate Sounds & Friends — with sets from The Groove Thief, Mister Niño, Ras Drew (One Drum), Slim, and DJ Soul Rock. Food & vendors by Denver Doubles, Pom Vinyl Shop, and Exodus Art. Tickets: $20 early bird, $30 supporters, $35 at the door.",
    imageUrl: "/images/events/community/Channel One Sound System June 7, 2026.png",
    imageFit: "contain",
    ticketUrl: "https://theticketing.co/e/pschannelone",
    practitionerName: "Pomegranate Sounds"
  },
  {
    id: "holosomatic-breathwork-jun-2026",
    title: "Holosomatic Breathwork",
    date: "2026-06-18",
    time: "6:00 PM",
    endTime: "8:00 PM",
    description: "Anxiety. Looping thoughts. Self-doubt. Harmful patterns. None of that is your true nature. Holosomatic Breathwork cuts through all of it. Through breath, movement, and sound, your body becomes the guide—back to the truth of who you are, back to the one who knows exactly what you need, what you want, what you're here for. This is body-led healing, and it will change everything. Doors open at 5:50 PM. All experience levels welcome. $40 per person.",
    imageUrl: "/images/events/community/jules.webp",
    ticketUrl: "https://www.eventbrite.com/e/1989422503261?aff=oddtdtcreator",
    instagramHandle: "SomaticJules",
    practitionerName: "Juliana Stoddart"
  },

  // ============ MAY 2026 ============
  {
    id: "create-your-own-life-shaman-oyun-may-2026",
    title: "Create Your Own Life — Live Without Self-Destruction",
    date: "2026-05-09",
    time: "5:00 PM",
    endTime: "7:00 PM",
    description: "Join Shaman Abay Oyun for a live gathering featuring energy cleansing, practices to awaken your inner power, and guidance to gain clarity in your path. You will leave feeling inner strength, a bright flow of energy, and an inner breakthrough. Master Oyun has spent 34 years helping people in 38 countries. For more information & registration, contact +1 212 256 1366.",
    imageUrl: "/images/events/community/shamen.JPEG",
    imageFit: "contain",
    practitionerName: "Shaman Abay Oyun"
  },
  {
    id: "holosomatic-breathwork-may-2026",
    title: "Holosomatic Breathwork",
    date: "2026-05-13",
    time: "6:00 PM",
    endTime: "8:00 PM",
    description: "Anxiety. Looping thoughts. Self-doubt. Harmful patterns. None of that is your true nature. Holosomatic Breathwork cuts through all of it. Through breath, movement, and sound, your body becomes the guide—back to the truth of who you are, back to the one who knows exactly what you need, what you want, what you're here for. This is body-led healing, and it will change everything. Doors open at 5:50 PM. All experience levels welcome. $40 per person.",
    imageUrl: "/images/events/community/jules.webp",
    ticketUrl: "https://somaticjules.com/events/",
    instagramHandle: "SomaticJules",
    practitionerName: "Juliana Stoddart"
  },
  {
    id: "soften-unwind-yin-massage-sound-bath-may-2026",
    title: "Soften & Unwind: A Restorative Evening",
    date: "2026-05-21",
    time: "7:00 PM",
    endTime: "8:30 PM",
    description: "Join us for a special event designed to calm your nervous system and invite deep relaxation. Hosted by Anissa M. Cordova, PhD (Psychotherapist, Emotional Resilience Coach, Sound Bath Facilitator) and Courtney Greth, LMT (End-of-Life Doula, Reiki Practitioner, Biodynamic Craniosacral Therapist). Courtney will guide gentle yin yoga, with optional individualized massage offered to a limited number of participants. The evening will flow into a soothing sound bath led by Anissa, with reiki gently woven throughout to support your rest.",
    imageUrl: "/images/events/yoga/May 21 Yin Massage Sound Bath.jpg",
    imageFit: "contain",
    ticketUrl: "https://www.recentertherapeuticmassage.com",
    ticketLabel: "Reserve Your Spot",
    practitionerName: "Anissa M. Cordova & Courtney Greth"
  },

  // ============ APRIL 2026 ============
  {
    id: "holosomatic-breathwork-apr-2026",
    title: "Holosomatic Breathwork",
    date: "2026-04-14",
    time: "6:00 PM",
    endTime: "8:00 PM",
    description: "Most of us live almost entirely from the neck up—with overthinking, second-guessing, and cut off from the deeper intelligence the body has been holding all along. Holosomatic Breathwork changes that. Using rhythmic breathing, intentional movement, and vocal toning, you'll shift your physiology, move beyond ordinary awareness, and feel, maybe for the first time, what it's like to trust yourself from the inside out. Doors open at 5:50 PM. All experience levels welcome. Early bird tickets $30, regular tickets $40.",
    imageUrl: "/images/events/community/jules.webp",
    ticketUrl: "https://www.eventbrite.com/e/holosomatic-breathwork-w-somatic-jules-tickets-1984462260040?aff=oddtdtcreator&utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQMMjU2MjgxMDQwNTU4AAGnlUBR1fkYzUxHBo7mFjVMmv9NOEx0URAtzQSvvQiC1qGiLTe8S0ql7N8wFak_aem_ZmFrZWR1bW15MTZieXRlcw",
    instagramHandle: "SomaticJules",
    practitionerName: "Juliana Stoddart"
  }
];