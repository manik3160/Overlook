# Cloudinary demo (about 2 minutes)

For the Cloudinary judge. Say what she sees, not how it works. Every stop has a **✦ Cloudinary** mark on screen.

**Before the demo**
- Upload a few of your own cleanup-drive photos **with people in them** (smart crop and face blurring show best on people; the Oregon sample photos are aerial with no faces).
- Open each campaign tab once beforehand so the AI-extended card is already made (the first time takes ~6 s).
- Have the Cloudinary console open in a second tab: **Media Library → folder "Overlook"**.
- Run `npm run cloudinary:sync` once if you changed data outside the app.

**1. One upload, many versions (asset page, 20 s)**
Open a verified photo, scroll to **"What Cloudinary made from this photo"**.
> "We uploaded one file. Everything else here, previews, report copy with faces hidden, Instagram and WhatsApp cards, Cloudinary makes on the fly from that one original, which is never changed. Each one has its recipe."
Drag the **"Brightened by Cloudinary AI"** slider.

**2. AI that is honest (Campaign tab, 30 s)**
Scroll to **"AI-extended story card"**.
> "Phone stories are tall, field photos are wide. Instead of cutting the photo, Cloudinary's generative fill paints the edges. The dashed box is the real photo, and the card says 'Edges filled by AI'. We use generative AI to present evidence, never to change it."
Point at **"Smart crop"**: centre crop vs Cloudinary's smart crop.

**3. Faces stay hidden (public story page, 20 s)**
Open the story page, press **"Try to remove the blur"**.
> "Anyone can edit a web address. So public pages never point at the original: Cloudinary stored a copy with faces blurred inside the file. Even with nothing applied, the blur is still there."

**4. Her own Media Library (Cloudinary console, 30 s)**
Media Library → **Overlook** folder → one folder per project. Open a flagged photo's details, then filter by
**"Overlook: flagged for review because" = "Looks like a photo of a screen or print"** (or trust band).
> "Our findings live on the file itself in Cloudinary: trust band, score, reviewer decision, project, the reason it was flagged, AI tags and caption. A team that only uses Cloudinary can find the suspicious photos without opening our app."
Note: with the current sample data only the exact duplicate is in the *Suspicious* band; the other planted problems are *Needs review*, so filter by the flag reason.

**5. Two AIs agree (asset page of the screen photo, 10 s)**
> "Our first AI flagged this as a photo of a laptop screen. Cloudinary AI Vision, asked independently, agrees."

**5b. The photo says where it really is (asset page of `fake-far`, 15 s)**
Scroll to **"Words in the photo"**.
> "Cloudinary read the road signs in this photo: Gachibowli, Narsingi. That's Hyderabad, not the project site in Oregon, which is exactly why it was flagged." Then show the Marathi plot sign on `b-spacing` and search "4x4".

**6. Evidence from anywhere (upload page, 15 s)**
Press **"Import from Google Drive, a link or camera"** (Cloudinary's Upload Widget).
> "Field teams keep photos in Google Drive or send links. Cloudinary imports them directly, and reads each file's location and time itself."

**7. Caught editing the location (optional, 15 s)**
Before the demo run `npm run check-metadata`, or show a flagged photo's audit trace:
> "Cloudinary reads the metadata inside the stored file. If the location sent with the upload doesn't match, the photo is flagged for review."

**8. Video with chapters (a video page, 10 s)**
> "Cloudinary's video player puts a chapter at every key frame we checked, so a reviewer jumps straight to the moment behind each frame's trust score."

**9. Close on the numbers (dashboard, 10 s)**
**"Cloudinary at work"**: files stored, versions made on the fly, AI Vision checks, face-blurred public copies, photos labelled in the library, credits used.
