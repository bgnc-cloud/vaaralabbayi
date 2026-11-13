# Home page images (`index.html`)

Drop photos into this folder using **exactly** these file names. The page already
has a slot for each one. If a file is missing, that slot hides itself and the card
looks the same as it does without images, so you can add photos one at a time.

## Rules

- Format: **JPG only** (`.jpg`, lowercase extension).
- Size: **under 150 KB** per file. Export at about 75–80% JPEG quality.
- Shape: **16:9** (landscape). Use the exact pixel size below. Images are cropped
  to fill the slot (`object-fit: cover`), so off-ratio photos lose their edges.
- File names are case-sensitive on the live server: use them exactly as written.
- A logo may be in the photo. Use photos you own or are licensed to use.
- Keep the main subject (and any logo) near the centre; edges may be cropped on some screens.

## What we offer: 6 cards, 800 × 450 px (16:9)

| File | Card |
|---|---|
| `offer-fmcg.jpg` | FMCG |
| `offer-groceries.jpg` | Groceries |
| `offer-home-needs.jpg` | Home Needs |
| `offer-electronics.jpg` | Electronics |
| `offer-clothing.jpg` | Clothing & Footwear |
| `offer-footwear.jpg` | Footwear |

## How it works: 4 steps, 640 × 360 px (16:9)

| File | Step |
|---|---|
| `step-1-plan.jpg` | 1. Choose Your Plan |
| `step-2-store.jpg` | 2. Your Digital Store |
| `step-3-order.jpg` | 3. Order Anytime |
| `step-4-delivery.jpg` | 4. Doorstep Delivery |

## Hero background (optional): 1920 × 1080 px (16:9)

| File | Where |
|---|---|
| `hero-bg.jpg` | Behind the top banner. It sits under the blue gradient (about 88% opacity), so only a hint of it shows. Choose a calm, uncluttered photo. |

## Alt text

Alt text (English and Telugu) is already written in `index.html` for each slot
(`alt`, `data-alt-en`, `data-alt-te`). If a photo shows something different from
the description, update those three attributes so screen-reader users hear
what is actually in the picture.
