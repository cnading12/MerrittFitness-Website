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
  practitionerName?: string;
  recurrence?: string; // e.g., "Every Thursday", "First Saturday of every month"
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

  // ============ RECURRING: FULL CIRCLE DANCE ============
  {
    id: "full-circle-dance",
    title: "Full Circle Dance",
    date: "2026-04-30",
    time: "4:00 PM",
    endTime: "6:30 PM",
    description: "Full Circle Dance offers a heart-centered dance experience for our youngest movers ages 2-8. Led by Genoa, these weekly classes help little dancers explore movement, build confidence, and grow through joy in our bright, welcoming historic space.",
    imageUrl: "/images/events/dance/kids.jpg",
    ticketUrl: "https://www.fullcircle.dance/sloans-lake",
    instagramHandle: "fullcircledancecolorado",
    practitionerName: "Genoa",
    recurrence: "Every Thursday"
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

  // ============ RECURRING: YOGA WITH TERRI STAFFORD ============
  {
    id: "terri-stafford-yoga",
    title: "Yoga with Terri Stafford",
    date: "2026-04-03",
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
    date: "2026-03-11",
    time: "6:30 PM",
    endTime: "8:30 PM",
    description: "We will be starting a weekly 8 Week Absolute Beginner Class for salsa and bachata. Join us for two classes each Wednesday at 6:30-8:30PM: one hour of salsa and one hour of bachata. Our goal is to teach you the basics of social dancing so that you can feel confident joining Denver's growing social dance scene across many amazing venues in the city. By the end of the 8 weeks, you should have a basic working knowledge of social dancing within these dance styles, and will be able to go to any dance function and move confidently with a partner! $80 for the full 8-week series ($5 per class). March 11th through May 6th.",
    imageUrl: "/images/events/dance/MHQ.webp",
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
    id: "western-wish-second-sundays",
    title: "Second Sundays Showcase",
    date: "2026-05-10",
    time: "6:00 PM",
    description: "An intimate, listening room-style event series where independent musicians share original songs and the stories behind them in a supportive acoustic setting. Doors at 5:30 PM, show at 6:00 PM.",
    imageUrl: "/images/events/western-wish/Western-Wish.png",
    ticketUrl: "https://www.westernwish.com/events",
    instagramHandle: "westernwishproductions",
    practitionerName: "WesternWish Productions",
    recurrence: "Second Sunday of every month"
  },

  // ============ MAY 2026 ============
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