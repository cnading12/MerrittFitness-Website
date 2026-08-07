# Venue photo library review — August 2026

Every image in `public/images/events/venue/` was reviewed for the site
restructure. Selected images were cropped (letterboxing removed), resized, and
compressed into `public/images/pages/` via `scripts/process-venue-images.mjs`;
originals are untouched. "True resolution" is the measured image content after
removing any letterbox bands, with EXIF orientation applied.

**Selection criteria:** hero use requires a true long edge of 1200px or more;
frames were rejected for structural posts bisecting the subject, the projector
screen lowered over the rose window, foreground clutter (equipment, service
items, fire extinguishers), heavy motion blur or noise, watermarks, and
designed graphics that are not venue photography.

| File | Folder | True resolution | Verdict | Reason / use |
|---|---|---|---|---|
| church-1.jpg | church | 3024x4032 | SELECTED (hero) | /weddings hero; also concerts + congregations galleries and the shared OG image. Signature rose-window interior. Blank screen hangs below (not over) the window |
| church-2.jpg | church | 3024x4032 | SELECTED (hero) | /private-events hero + weddings gallery. Cleanest interior in the library |
| coffee-shop.jpg | church | 4032x3024 | SELECTED | Cafe lounge shot for concerts + congregations. Duplicates: wedding/9-coffee-shop.jpg, wellness/9-lounge.jpg |
| community.JPG | church | 2048x1536 | SELECTED | Congregations page only (in-use). Lowered blank screen and coats on chairs keep it off other pages |
| event-space-1.png | church | 4032x3024 | REJECTED | Projector screen lowered in front of the rose window showing a TV news broadcast; ping-pong table mid-frame |
| event-space-2.png | church | 3226x3024 after crop | SELECTED | Congregations gallery, after cropping the left ~20% to remove a blurred foreground intrusion and screen edge |
| outside-2.jpg | church | 4032x3024 | SELECTED | Congregations gallery (summer exterior). Sun flare and parked cars noted; filler tier. Duplicate: wedding/3-outside-2.jpg |
| outside5.jpeg | church | 2048x1142 | SELECTED (hero) | /studio hero (shows both buildings and signage); weddings gallery. Duplicates: concerts/7-outside.jpeg, dance/10.jpeg, wellness/10-outside.jpeg |
| pator-tate.jpeg | church | 1600x900 | REJECTED | Camera tripod and subwoofer fill the left third; blurred audience heads across the bottom |
| 1-Aisle-Walk - Edited.jpg | wedding | 1080x707 | SELECTED | Weddings gallery (black-and-white recessional). Below hero resolution |
| 2-Pose.JPG | wedding | 1462x2047 | SELECTED | Weddings gallery (couple at cake table under floral arch) |
| 3-outside-2.jpg | wedding | 4032x3024 | duplicate | Byte-identical to church/outside-2.jpg |
| 4-church.jpg | wedding | 3024x4032 | duplicate | Byte-identical to church/church-2.jpg |
| 5-Setup.JPG | wedding | 1152x2047 | SELECTED | Weddings gallery (head table and tiered cake). Slight tilt noted |
| 6-church.jpg | wedding | 3024x4032 | duplicate | Byte-identical to church/church-1.jpg |
| 7-Wedding.jpg | wedding | 1230x960 | REJECTED | Structural post bisects the ceremony and cuts across the stained glass; fire extinguisher visible |
| 8-Get-Ready.PNG | wedding | 1010x1093 after crop | SELECTED | Weddings gallery + studio page (stone-walled downstairs suite). Letterbox band cropped; gallery-only resolution |
| 9-coffee-shop.jpg | wedding | 4032x3024 | duplicate | Byte-identical to church/coffee-shop.jpg |
| 10-Celebration - Edited.jpg | wedding | 1080x649 | SELECTED | Weddings gallery, homepage feature card, and weddings OG share image. Would be the hero if it were higher resolution |
| 12-Food.JPG | wedding | 1536x2048 | REJECTED | Foil chafing trays fill the foreground; fire extinguisher on the wall behind the bride |
| 1-Western-Wish.JPEG | concerts | 4000x3000 | SELECTED (hero) | /concerts hero: performers under the fully visible rose window with a live audience |
| 2-PS.jpeg | concerts | 3072x4096 | SELECTED | Concerts gallery (packed dance floor). Heavy warm grade noted. Duplicate: dance/4.1.jpeg |
| 3-WW.JPEG | concerts | 3400x3000 after crop | SELECTED | Concerts gallery, after cropping a camera tripod off the left edge |
| 4-PS.jpeg | concerts | 3265x2667 | REJECTED | Visible photographer watermark rendered on the image; unusable without a licensed clean copy |
| 5-church.jpg | concerts | 3024x4032 | duplicate | Byte-identical to church/church-1.jpg |
| 6-lounge.png | concerts | 4032x3024 | not selected | Clean lounge alternate, but redundant with coffee-shop.jpg and has a ping-pong table at rear. Duplicate: dance/7.png |
| 7-outside.jpeg | concerts | 2048x1142 | duplicate | Byte-identical to church/outside5.jpeg |
| hero.webp | art | 1600x1200 | SELECTED | Art-shows gallery (show in progress on round tables) |
| hero-2.webp | art | 1170x862 | SELECTED | Art-shows gallery (visitors browsing). Below hero resolution |
| Karen-1.webp | art | 1920x1440 | SELECTED | Art-shows gallery (partition-wall hang). Faint projector light spill noted |
| Karen-2.webp | art | 1920x1440 | SELECTED | Art-shows gallery (paintings over pews). Light stain on center pew noted |
| Karen-3.webp | art | 1920x1440 | SELECTED (hero) | /art-shows hero: artwork, pews, floor, and three stained-glass windows in one clean frame |
| Karen-4.webp | art | 1920x1440 | SELECTED | Art-shows gallery (widest view of the vaulted hall during a show) |
| 1.JPG | dance | 4240x2832 | SELECTED (hero) | /class-partnerships hero: class mid-step under string lights |
| 2.JPG | dance | 2048x1536 | SELECTED | Concerts gallery (tango under projected starry ceiling). Duplicate: Event-2.JPG |
| 3.JPG | dance | 4240x2832 | SELECTED | Class-partnerships gallery (close, energetic class frame). Duplicate: Ricky.JPG |
| 4.1.jpeg | dance | 3072x4096 | duplicate | Byte-identical to concerts/2-PS.jpeg |
| 4.jpg | dance | 5712x4284 | not selected | Posed ~30-person group photo; charming but wrong tone for marketing pages |
| 5.JPG | dance | 4240x2832 | SELECTED | Class-partnerships gallery: the only frame showing the rollaway mirror in use. Small wall extinguisher noted |
| 6.JPG | dance | 1536x2048 | REJECTED | Central couple heavily motion-blurred; fire extinguisher on the left wall. Duplicate: Event-1.JPG |
| 7.png | dance | 4032x3024 | duplicate | Byte-identical to concerts/6-lounge.png |
| 9.HEIC | dance | 3024x4032 | SELECTED | Converted from HEIC. Congregations gallery (hall with projection screen below the rose window) |
| 10.jpeg | dance | 2048x1142 | duplicate | Byte-identical to church/outside5.jpeg |
| Event-1.JPG | dance | 1536x2048 | duplicate | Byte-identical to dance/6.JPG (rejected) |
| Event-2.JPG | dance | 2048x1536 | duplicate | Byte-identical to dance/2.JPG |
| Ricky.JPG | dance | 4240x2832 | duplicate | Byte-identical to dance/3.JPG |
| 1.JPG | martial-arts | 1284x1596 | not selected | Posed class photo, soft phone quality; 4.JPG covers the discipline better |
| 4.JPG | martial-arts | 1284x1677 | SELECTED | Class-partnerships gallery: grappling practice on the full-coverage mat. Gallery-only resolution |
| 1-breathwork-in-action.webp | wellness | 1600x1067 | SELECTED | Class-partnerships gallery. Duplicate: breathwork-in-action.webp |
| 2-event.png | wellness | 3024x4032 | not selected | Atmospheric sound-bath scene, but the three foreground figures are visibly motion-blurred |
| 2.webp | wellness | 1920x1239 | SELECTED | Class-partnerships gallery (large restorative class). Personal items along the left edge noted |
| 3-yoga-class.webp | wellness | 1600x1200 | not selected | Dim candlelit frame facing the lowered screen; weaker than the selected class shots. Duplicate: yoga-class.webp |
| 4-breathwork-class.webp | wellness | 1600x1067 | not selected | Out-of-focus railing bars cut across the right quarter of the frame. Duplicate: breathwork-class.webp |
| 5-event-4.JPG | wellness | 810x1080 | not selected | Striking rose-window mood shot, but below hero resolution with noisy shadows |
| 6.JPEG | wellness | 1200x1600 | REJECTED | Structural post bisects the room, screen lowered under the rose window, stacked chairs and flipchart at rear |
| 7-mats.jpg | wellness | 3441x2568 | SELECTED | Class-partnerships gallery: the definitive full-coverage floor mat shot |
| 9-lounge.jpg | wellness | 4032x3024 | duplicate | Byte-identical to church/coffee-shop.jpg |
| 10-outside.jpeg | wellness | 2048x1142 | duplicate | Byte-identical to church/outside5.jpeg |
| Kristen-Boyle.png | wellness | 931x586 | REJECTED | Instagram screenshot with carousel UI, not venue photography (still used as an event banner on What's On) |
| Recenter (202).jpg | wellness | 4116x6180 | REJECTED | Off-site practitioner portrait; not the venue (still used as an event banner on What's On) |
| Single Moms Thrive.JPEG | wellness | 1046x1234 after crop | REJECTED | Designed event flyer with rendered text, not venue photography |
| breathwork-class.webp | wellness | 1600x1067 | duplicate | Byte-identical to 4-breathwork-class.webp |
| breathwork-in-action.webp | wellness | 1600x1067 | duplicate | Byte-identical to 1-breathwork-in-action.webp |
| church-2.HEIC | wellness | 3024x4032 | SELECTED (hero) | Converted from HEIC. /congregations hero: the cleanest empty-hall frame in the library |
| church-3.HEIC | wellness | 3024x4032 | REJECTED | Projector screen lowered directly over the lower half of the rose window |
| shavasana.webp | wellness | 900x1174 after crop | REJECTED | Severely underexposed and noisy; below hero resolution |
| yoga-class.webp | wellness | 1600x1200 | duplicate | Byte-identical to 3-yoga-class.webp |

## Missing photos — the shot list (updated Aug 2026)

All "photo coming soon" placeholder slots have been removed from the live
pages ahead of launch; this list is now the only record of what to shoot or
collect. When a photo lands, process it with
`scripts/process-venue-images.mjs` (which now preserves color profiles) and
place it on the page.

- **Weddings**: reception setup with round tables; detail shots (florals,
  place settings, signage); dusk exterior with the windows lit; couple
  portrait outside the building. A full-resolution export of
  `10-Celebration - Edited.jpg` from the photographer would sharpen the
  weddings hero, which currently runs from a 1080px file. (The two
  ceremony-arch photos added Aug 2026 are in the gallery.)
- **Celebrations of life / parties**: no photography exists. Their cards on
  /private-events temporarily borrow venue shots (seated semicircle,
  dance-floor crowd); replace when real events are shot. Corporate now uses
  the real networking photo from `co-work/Networking.jpg`.
- **Studio & Workspace**: the flex studio photo is still missing (its section
  stays text-only); dedicated desk and private office photos arrived Aug 2026
  and are live on /studio.
- **Color-critical re-uploads**: original camera exports of
  `hero/Sound-event.JPG`, `hero/Sound-Event2.JPG`, `hero/outside3.webp`,
  `hero/outside5.webp` (homepage hero), and `hero/1.webp` would let the
  pipeline restore their true colors; their current files carry no color
  profile and no original survives.

## What the folders still need

- **wedding/**: no reception-with-round-tables shot, no detail shots
  (florals, place settings), no dusk exterior, no couple portrait outside the
  building. The weddings page carries labeled placeholder slots for all four.
  Both edited celebration shots are only ~1080px; a full-resolution export
  from the photographer would let one become the hero.
- **concerts/**: one usable wide crowd shot and one stage shot; a clean
  landscape stage image without tripods or projected slides would upgrade the
  hero. The watermarked frame needs a licensed clean copy to be usable.
- **martial-arts/**: two phone-quality images. Any sharp action photography
  would strengthen the class-partnerships page.
- **congregations**: only one true in-use service photo (community.JPG), and
  it has a lowered blank screen in frame. A service photographed with the
  screen raised would be the natural hero.
- **No photography exists** for celebrations of life, parties/milestones, or
  corporate events; those stay prose-only on /private-events until shot.
- ~45 MB of byte-identical duplicate files exist across the venue folders
  (see "duplicate" rows); they are harmless but could be pruned.
