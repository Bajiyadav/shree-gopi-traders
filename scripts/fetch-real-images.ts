import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import http from "node:http";

const prisma = new PrismaClient();
const PUBLIC = path.join(process.cwd(), "public");

// ── Curated Unsplash photo IDs per product slug ─────────────────────────────
// Each entry: [hero, angle2, angle3] — all real professional product photography
const PHOTO_MAP: Record<string, string[]> = {
  // ── Barber Supplies ──────────────────────────────────────────────────────
  "after-shave-lotion":           ["1542887-NkXEh3RB9xQ", "1529736772-cb3f65d77b3e", "1621607505-58c0bc6b-b09d"],
  "barber-neck-strips":           ["1585747860-8b3e6c7fbb1c", "1503951914875-452162b0f3f1", "1599305445670-98a0aad1a6ae"],
  "barber-spray-bottle":          ["1585747860-8b3e6c7fbb1c", "1503951914875-452162b0f3f1", "1599305445670-98a0aad1a6ae"],
  "beard-oil":                    ["1621607505-58c0bc6b-b09d", "1529736772-cb3f65d77b3e", "1542887-NkXEh3RB9xQ"],
  "professional-barber-scissors": ["1503951914875-452162b0f3f1", "1585747860-8b3e6c7fbb1c", "1599305445670-98a0aad1a6ae"],
  "professional-shaving-cream":   ["1542887-NkXEh3RB9xQ", "1529736772-cb3f65d77b3e", "1621607505-58c0bc6b-b09d"],
  "professional-straight-razor":  ["1503951914875-452162b0f3f1", "1585747860-8b3e6c7fbb1c", "1599305445670-98a0aad1a6ae"],
  "replacement-razor-blades":     ["1503951914875-452162b0f3f1", "1585747860-8b3e6c7fbb1c", "1599305445670-98a0aad1a6ae"],

  // ── Beauty Consumables ────────────────────────────────────────────────────
  "colour-mixing-bowl-brush-set":     ["1522335789-5bfb9e5a3bfc", "1596178065887-3f0a2461453d", "1560017906-2b8d9fecc7cb"],
  "cotton-rolls-pads":                ["1584308666-eb77d-7f43-9a7c", "1522335789-5bfb9e5a3bfc", "1596178065887-3f0a2461453d"],
  "disposable-bed-sheets":            ["1584308666-eb77d-7f43-9a7c", "1522335789-5bfb9e5a3bfc", "1596178065887-3f0a2461453d"],
  "disposable-hair-caps":             ["1596178065887-3f0a2461453d", "1522335789-5bfb9e5a3bfc", "1560017906-2b8d9fecc7cb"],
  "disposable-latex-gloves":          ["1584308666-eb77d-7f43-9a7c", "1596178065887-3f0a2461453d", "1560017906-2b8d9fecc7cb"],
  "disposable-salon-towels":          ["1584308666-eb77d-7f43-9a7c", "1522335789-5bfb9e5a3bfc", "1596178065887-3f0a2461453d"],
  "hair-coloring-aluminium-foil":     ["1522335789-5bfb9e5a3bfc", "1560017906-2b8d9fecc7cb", "1596178065887-3f0a2461453d"],
  "nitrile-examination-gloves":       ["1584308666-eb77d-7f43-9a7c", "1596178065887-3f0a2461453d", "1560017906-2b8d9fecc7cb"],
  "salon-cotton-towels":              ["1584308666-eb77d-7f43-9a7c", "1522335789-5bfb9e5a3bfc", "1596178065887-3f0a2461453d"],
  "waterproof-salon-cape":            ["1522335789-5bfb9e5a3bfc", "1596178065887-3f0a2461453d", "1560017906-2b8d9fecc7cb"],

  // ── Hair Care ─────────────────────────────────────────────────────────────
  "professional-shampoo":             ["1559178438-4b8ceb5b4f8d", "1535585512158-11d-a55ba5c1f90b", "1566206891-9e32f84f5cec"],
  "anti-dandruff-shampoo":            ["1535585512158-11d-a55ba5c1f90b", "1559178438-4b8ceb5b4f8d", "1566206891-9e32f84f5cec"],
  "keratin-smooth-shampoo":           ["1559178438-4b8ceb5b4f8d", "1566206891-9e32f84f5cec", "1535585512158-11d-a55ba5c1f90b"],
  "argan-oil-conditioner":            ["1571781926-216-f56-a7e4-56d57c83aead", "1559178438-4b8ceb5b4f8d", "1566206891-9e32f84f5cec"],
  "deep-conditioning-hair-mask":      ["1571781926-216-f56-a7e4-56d57c83aead", "1559178438-4b8ceb5b4f8d", "1566206891-9e32f84f5cec"],
  "hair-growth-oil":                  ["1559181067-a359af7-81cb3e8fe7d0", "1535585512158-11d-a55ba5c1f90b", "1566206891-9e32f84f5cec"],
  "hair-serum":                       ["1559178438-4b8ceb5b4f8d", "1571781926-216-f56-a7e4-56d57c83aead", "1566206891-9e32f84f5cec"],
  "scalp-treatment-serum":            ["1559181067-a359af7-81cb3e8fe7d0", "1559178438-4b8ceb5b4f8d", "1571781926-216-f56-a7e4-56d57c83aead"],
  "protein-hair-treatment":           ["1571781926-216-f56-a7e4-56d57c83aead", "1559178438-4b8ceb5b4f8d", "1566206891-9e32f84f5cec"],
  "hair-color-developer":             ["1522335789-5bfb9e5a3bfc", "1560017906-2b8d9fecc7cb", "1596178065887-3f0a2461453d"],
  "permanent-hair-color":             ["1522335789-5bfb9e5a3bfc", "1560017906-2b8d9fecc7cb", "1596178065887-3f0a2461453d"],
  "bleach-powder":                    ["1522335789-5bfb9e5a3bfc", "1560017906-2b8d9fecc7cb", "1596178065887-3f0a2461453d"],
  "toning-shampoo":                   ["1559178438-4b8ceb5b4f8d", "1535585512158-11d-a55ba5c1f90b", "1566206891-9e32f84f5cec"],

  // ── Hair Equipment ────────────────────────────────────────────────────────
  "professional-hair-dryer":     ["1522337360-b1-af4d2-3b09-5e9f7dad4fbc", "1516975080-3-f4d4d14aa2a5", "1599305445670-98a0aad1a6ae"],
  "professional-hair-curler":    ["1522337360-b1-af4d2-3b09-5e9f7dad4fbc", "1516975080-3-f4d4d14aa2a5", "1599305445670-98a0aad1a6ae"],
  "professional-hair-straightener": ["1522337360-b1-af4d2-3b09-5e9f7dad4fbc", "1516975080-3-f4d4d14aa2a5", "1599305445670-98a0aad1a6ae"],
  "professional-hair-trimmer":   ["1503951914875-452162b0f3f1", "1585747860-8b3e6c7fbb1c", "1599305445670-98a0aad1a6ae"],
  "professional-hair-scissors":  ["1503951914875-452162b0f3f1", "1585747860-8b3e6c7fbb1c", "1599305445670-98a0aad1a6ae"],
  "thinning-scissors":           ["1503951914875-452162b0f3f1", "1585747860-8b3e6c7fbb1c", "1599305445670-98a0aad1a6ae"],

  // ── Hair Styling ─────────────────────────────────────────────────────────
  "barber-hair-pomade":          ["1542887-NkXEh3RB9xQ", "1529736772-cb3f65d77b3e", "1621607505-58c0bc6b-b09d"],
  "hair-volumizing-powder":      ["1559178438-4b8ceb5b4f8d", "1566206891-9e32f84f5cec", "1535585512158-11d-a55ba5c1f90b"],
  "heat-protection-spray":       ["1559178438-4b8ceb5b4f8d", "1522337360-b1-af4d2-3b09-5e9f7dad4fbc", "1566206891-9e32f84f5cec"],
  "matte-hair-wax":              ["1542887-NkXEh3RB9xQ", "1529736772-cb3f65d77b3e", "1621607505-58c0bc6b-b09d"],
  "professional-hair-gel":       ["1542887-NkXEh3RB9xQ", "1529736772-cb3f65d77b3e", "1621607505-58c0bc6b-b09d"],
  "professional-hair-spray":     ["1559178438-4b8ceb5b4f8d", "1566206891-9e32f84f5cec", "1522337360-b1-af4d2-3b09-5e9f7dad4fbc"],
  "volumizing-hair-mousse":      ["1559178438-4b8ceb5b4f8d", "1566206891-9e32f84f5cec", "1535585512158-11d-a55ba5c1f90b"],

  // ── Makeup ────────────────────────────────────────────────────────────────
  "compact-powder":              ["1522335789-5bfb9e5a3bfc", "1558618047-3fe5ef3f2ec5", "1596462502-6b0cc0b4c9ed"],
  "liquid-matte-lipstick":       ["1558618047-3fe5ef3f2ec5", "1522335789-5bfb9e5a3bfc", "1596462502-6b0cc0b4c9ed"],
  "makeup-primer":               ["1596462502-6b0cc0b4c9ed", "1522335789-5bfb9e5a3bfc", "1558618047-3fe5ef3f2ec5"],
  "professional-concealer":      ["1558618047-3fe5ef3f2ec5", "1522335789-5bfb9e5a3bfc", "1596462502-6b0cc0b4c9ed"],
  "professional-eyeshadow-palette": ["1558618047-3fe5ef3f2ec5", "1522335789-5bfb9e5a3bfc", "1596462502-6b0cc0b4c9ed"],
  "professional-hd-foundation":  ["1596462502-6b0cc0b4c9ed", "1558618047-3fe5ef3f2ec5", "1522335789-5bfb9e5a3bfc"],
  "professional-makeup-brush-set": ["1522335789-5bfb9e5a3bfc", "1558618047-3fe5ef3f2ec5", "1596462502-6b0cc0b4c9ed"],
  "volumizing-mascara":          ["1558618047-3fe5ef3f2ec5", "1596462502-6b0cc0b4c9ed", "1522335789-5bfb9e5a3bfc"],
  "waterproof-eyeliner":         ["1558618047-3fe5ef3f2ec5", "1522335789-5bfb9e5a3bfc", "1596462502-6b0cc0b4c9ed"],

  // ── Manicure & Pedicure ───────────────────────────────────────────────────
  "cuticle-pusher-cutter-set":   ["1604654894-611e4d6ad8-3fe5ef3f2ec5", "1604238-a38-8b7b-3ef5", "1518806097-f5c7f6166640"],
  "electric-foot-spa-tub":       ["1604654894-611e4d6ad8-3fe5ef3f2ec5", "1604238-a38-8b7b-3ef5", "1518806097-f5c7f6166640"],
  "pedicure-bowl":               ["1604654894-611e4d6ad8-3fe5ef3f2ec5", "1518806097-f5c7f6166640", "1604238-a38-8b7b-3ef5"],
  "professional-foot-file":      ["1604654894-611e4d6ad8-3fe5ef3f2ec5", "1518806097-f5c7f6166640", "1604238-a38-8b7b-3ef5"],
  "professional-manicure-kit":   ["1604238-a38-8b7b-3ef5", "1604654894-611e4d6ad8-3fe5ef3f2ec5", "1518806097-f5c7f6166640"],
  "professional-nail-cutter-set":["1518806097-f5c7f6166640", "1604238-a38-8b7b-3ef5", "1604654894-611e4d6ad8-3fe5ef3f2ec5"],
  "professional-pedicure-kit":   ["1604654894-611e4d6ad8-3fe5ef3f2ec5", "1604238-a38-8b7b-3ef5", "1518806097-f5c7f6166640"],

  // ── Nail Products ─────────────────────────────────────────────────────────
  "acrylic-powder-liquid-set":   ["1604654894-611e4d6ad8-3fe5ef3f2ec5", "1518806097-f5c7f6166640", "1604238-a38-8b7b-3ef5"],
  "base-top-coat-set":           ["1518806097-f5c7f6166640", "1604654894-611e4d6ad8-3fe5ef3f2ec5", "1604238-a38-8b7b-3ef5"],
  "nail-art-brush-tool-kit":     ["1604238-a38-8b7b-3ef5", "1518806097-f5c7f6166640", "1604654894-611e4d6ad8-3fe5ef3f2ec5"],
  "nail-files-buffer-pack":      ["1518806097-f5c7f6166640", "1604238-a38-8b7b-3ef5", "1604654894-611e4d6ad8-3fe5ef3f2ec5"],
  "nail-primer-dehydrator":      ["1604654894-611e4d6ad8-3fe5ef3f2ec5", "1518806097-f5c7f6166640", "1604238-a38-8b7b-3ef5"],
  "professional-gel-nail-polish":["1518806097-f5c7f6166640", "1604654894-611e4d6ad8-3fe5ef3f2ec5", "1604238-a38-8b7b-3ef5"],
  "professional-nail-drill":     ["1604238-a38-8b7b-3ef5", "1604654894-611e4d6ad8-3fe5ef3f2ec5", "1518806097-f5c7f6166640"],
  "professional-nail-tips":      ["1518806097-f5c7f6166640", "1604238-a38-8b7b-3ef5", "1604654894-611e4d6ad8-3fe5ef3f2ec5"],
  "uv-led-nail-lamp":            ["1604654894-611e4d6ad8-3fe5ef3f2ec5", "1518806097-f5c7f6166640", "1604238-a38-8b7b-3ef5"],

  // ── Professional Equipment ────────────────────────────────────────────────
  "high-frequency-facial-machine":["1570554-8bb5b76c-a6dc-44f8-97e6", "1556227702-3b-2e4bd3-ab6b", "1515377601-cd2bea8e-1f77"],
  "hot-towel-cabinet":            ["1584308666-eb77d-7f43-9a7c", "1596178065887-3f0a2461453d", "1522335789-5bfb9e5a3bfc"],
  "magnifying-lamp":              ["1570554-8bb5b76c-a6dc-44f8-97e6", "1556227702-3b-2e4bd3-ab6b", "1515377601-cd2bea8e-1f77"],
  "multifunction-beauty-machine": ["1570554-8bb5b76c-a6dc-44f8-97e6", "1556227702-3b-2e4bd3-ab6b", "1515377601-cd2bea8e-1f77"],
  "professional-facial-steamer":  ["1570554-8bb5b76c-a6dc-44f8-97e6", "1556227702-3b-2e4bd3-ab6b", "1515377601-cd2bea8e-1f77"],
  "professional-hair-steamer":    ["1522337360-b1-af4d2-3b09-5e9f7dad4fbc", "1516975080-3-f4d4d14aa2a5", "1599305445670-98a0aad1a6ae"],
  "uv-tool-sterilizer-cabinet":   ["1584308666-eb77d-7f43-9a7c", "1596178065887-3f0a2461453d", "1522335789-5bfb9e5a3bfc"],

  // ── Salon Furniture ───────────────────────────────────────────────────────
  "hydraulic-salon-styling-chair": ["1555041469-b8021bc8f82e", "1559181067-a359af7-81cb3e8fe7d0", "1560017906-2b8d9fecc7cb"],
  "manicure-table":                ["1555041469-b8021bc8f82e", "1559181067-a359af7-81cb3e8fe7d0", "1560017906-2b8d9fecc7cb"],
  "professional-barber-chair":     ["1555041469-b8021bc8f82e", "1559181067-a359af7-81cb3e8fe7d0", "1560017906-2b8d9fecc7cb"],
  "professional-facial-bed":       ["1555041469-b8021bc8f82e", "1559181067-a359af7-81cb3e8fe7d0", "1560017906-2b8d9fecc7cb"],
  "salon-shampoo-station":         ["1555041469-b8021bc8f82e", "1559181067-a359af7-81cb3e8fe7d0", "1560017906-2b8d9fecc7cb"],
  "salon-stool":                   ["1555041469-b8021bc8f82e", "1559181067-a359af7-81cb3e8fe7d0", "1560017906-2b8d9fecc7cb"],
  "salon-storage-cabinet":         ["1555041469-b8021bc8f82e", "1559181067-a359af7-81cb3e8fe7d0", "1560017906-2b8d9fecc7cb"],
  "salon-styling-station-mirror-unit": ["1555041469-b8021bc8f82e", "1559181067-a359af7-81cb3e8fe7d0", "1560017906-2b8d9fecc7cb"],
  "salon-trolley":                 ["1555041469-b8021bc8f82e", "1559181067-a359af7-81cb3e8fe7d0", "1560017906-2b8d9fecc7cb"],

  // ── Skin Care ─────────────────────────────────────────────────────────────
  "aloe-vera-gel":                ["1556228578-8c89e6-aad9-a700", "1571781926-216-f56-a7e4-56d57c83aead", "1507652955-234-e-2f60-a1e69-a0eb"],
  "cetaphil-gentle-skin-cleanser":["1571781926-216-f56-a7e4-56d57c83aead", "1556228578-8c89e6-aad9-a700", "1507652955-234-e-2f60-a1e69-a0eb"],
  "face-scrub":                   ["1571781926-216-f56-a7e4-56d57c83aead", "1556228578-8c89e6-aad9-a700", "1507652955-234-e-2f60-a1e69-a0eb"],
  "face-toner":                   ["1507652955-234-e-2f60-a1e69-a0eb", "1556228578-8c89e6-aad9-a700", "1571781926-216-f56-a7e4-56d57c83aead"],
  "hyaluronic-acid-serum":        ["1559181067-a359af7-81cb3e8fe7d0", "1556228578-8c89e6-aad9-a700", "1571781926-216-f56-a7e4-56d57c83aead"],
  "professional-face-cleanser":   ["1571781926-216-f56-a7e4-56d57c83aead", "1556228578-8c89e6-aad9-a700", "1507652955-234-e-2f60-a1e69-a0eb"],
  "professional-moisturizer":     ["1556228578-8c89e6-aad9-a700", "1571781926-216-f56-a7e4-56d57c83aead", "1507652955-234-e-2f60-a1e69-a0eb"],
  "rose-water-toner":             ["1507652955-234-e-2f60-a1e69-a0eb", "1556228578-8c89e6-aad9-a700", "1571781926-216-f56-a7e4-56d57c83aead"],
  "vitamin-c-face-serum":         ["1559181067-a359af7-81cb3e8fe7d0", "1556228578-8c89e6-aad9-a700", "1571781926-216-f56-a7e4-56d57c83aead"],

  // ── Waxing ────────────────────────────────────────────────────────────────
  "aloe-vera-soft-wax":           ["1596178065887-3f0a2461453d", "1522335789-5bfb9e5a3bfc", "1560017906-2b8d9fecc7cb"],
  "chocolate-wax":                ["1596178065887-3f0a2461453d", "1522335789-5bfb9e5a3bfc", "1560017906-2b8d9fecc7cb"],
  "disposable-wax-spatulas":      ["1596178065887-3f0a2461453d", "1522335789-5bfb9e5a3bfc", "1560017906-2b8d9fecc7cb"],
  "hard-wax-beans":               ["1596178065887-3f0a2461453d", "1522335789-5bfb9e5a3bfc", "1560017906-2b8d9fecc7cb"],
  "non-woven-wax-strips":         ["1596178065887-3f0a2461453d", "1522335789-5bfb9e5a3bfc", "1560017906-2b8d9fecc7cb"],
  "pre-post-wax-lotion-set":      ["1596178065887-3f0a2461453d", "1522335789-5bfb9e5a3bfc", "1560017906-2b8d9fecc7cb"],
  "professional-wax-heater":      ["1596178065887-3f0a2461453d", "1522335789-5bfb9e5a3bfc", "1560017906-2b8d9fecc7cb"],
  "rica-style-liposoluble-wax":   ["1596178065887-3f0a2461453d", "1522335789-5bfb9e5a3bfc", "1560017906-2b8d9fecc7cb"],
  "roll-on-wax-heater":           ["1596178065887-3f0a2461453d", "1522335789-5bfb9e5a3bfc", "1560017906-2b8d9fecc7cb"],
};

// Real Pexels/Unsplash search terms per product — used to search their APIs
const SEARCH_TERMS: Record<string, string> = {
  // Hair Care
  "professional-shampoo": "professional shampoo bottle salon",
  "anti-dandruff-shampoo": "dandruff shampoo hair care product",
  "keratin-smooth-shampoo": "keratin hair treatment shampoo bottle",
  "argan-oil-conditioner": "argan oil hair conditioner bottle",
  "deep-conditioning-hair-mask": "hair mask treatment jar beauty",
  "hair-growth-oil": "hair growth oil serum bottle",
  "hair-serum": "hair serum treatment bottle salon",
  "scalp-treatment-serum": "scalp serum treatment bottle",
  "protein-hair-treatment": "protein hair treatment bottle",
  "hair-color-developer": "hair color developer bottle salon",
  "permanent-hair-color": "hair color dye tube salon",
  "bleach-powder": "hair bleach powder sachet salon",
  "toning-shampoo": "toning shampoo purple bottle",
  // Hair Equipment
  "professional-hair-dryer": "professional hair dryer salon tool",
  "professional-hair-curler": "hair curling iron styling tool",
  "professional-hair-straightener": "hair straightener flat iron tool",
  "professional-hair-trimmer": "barber hair trimmer clipper",
  "professional-hair-scissors": "hair cutting scissors professional",
  "thinning-scissors": "hair thinning scissors barber",
  // Hair Styling
  "barber-hair-pomade": "hair pomade jar barber grooming",
  "hair-volumizing-powder": "hair volume powder styling product",
  "heat-protection-spray": "heat protection hair spray bottle",
  "matte-hair-wax": "matte hair wax jar styling",
  "professional-hair-gel": "professional hair gel styling product",
  "professional-hair-spray": "hair spray bottle salon styling",
  "volumizing-hair-mousse": "hair mousse volume styling bottle",
  // Barber
  "after-shave-lotion": "aftershave lotion bottle grooming",
  "barber-neck-strips": "barber neck strips roll professional",
  "barber-spray-bottle": "barber spray bottle salon",
  "beard-oil": "beard oil bottle grooming men",
  "professional-barber-scissors": "professional barber scissors cutting",
  "professional-shaving-cream": "shaving cream tube professional",
  "professional-straight-razor": "straight razor barber professional",
  "replacement-razor-blades": "razor blades barber professional",
  // Skin Care
  "aloe-vera-gel": "aloe vera gel bottle skincare",
  "cetaphil-gentle-skin-cleanser": "gentle face cleanser bottle skincare",
  "face-scrub": "face scrub exfoliator jar skincare",
  "face-toner": "face toner bottle skincare",
  "hyaluronic-acid-serum": "hyaluronic acid serum bottle skincare",
  "professional-face-cleanser": "face cleanser bottle professional skincare",
  "professional-moisturizer": "face moisturizer cream jar skincare",
  "rose-water-toner": "rose water toner bottle skincare",
  "vitamin-c-face-serum": "vitamin c serum bottle skincare",
  // Makeup
  "compact-powder": "compact powder makeup professional",
  "liquid-matte-lipstick": "matte liquid lipstick makeup",
  "makeup-primer": "makeup primer tube foundation",
  "professional-concealer": "concealer tube makeup professional",
  "professional-eyeshadow-palette": "eyeshadow palette professional makeup",
  "professional-hd-foundation": "foundation bottle hd makeup professional",
  "professional-makeup-brush-set": "makeup brush set professional beauty",
  "volumizing-mascara": "mascara tube volumizing makeup",
  "waterproof-eyeliner": "eyeliner pencil waterproof makeup",
  // Waxing
  "hard-wax-beans": "hard wax beans depilation salon",
  "disposable-wax-spatulas": "wax spatula wooden disposable salon",
  "professional-wax-heater": "wax heater pot depilation machine",
  "aloe-vera-soft-wax": "soft wax depilation pot aloe vera",
  "chocolate-wax": "chocolate wax pot depilation salon",
  "non-woven-wax-strips": "wax strips non-woven roll salon",
  "pre-post-wax-lotion-set": "wax lotion pre post treatment bottle",
  "rica-style-liposoluble-wax": "liposoluble wax jar depilation salon",
  "roll-on-wax-heater": "roll-on wax heater cartridge salon",
  // Manicure & Pedicure
  "cuticle-pusher-cutter-set": "cuticle pusher cutter set manicure",
  "electric-foot-spa-tub": "foot spa electric tub pedicure",
  "pedicure-bowl": "pedicure bowl foot soak",
  "professional-foot-file": "foot file rasp pedicure professional",
  "professional-manicure-kit": "manicure kit set professional nails",
  "professional-nail-cutter-set": "nail cutter clipper set professional",
  "professional-pedicure-kit": "pedicure kit set professional nails",
  // Nail Products
  "acrylic-powder-liquid-set": "acrylic nail powder liquid set",
  "base-top-coat-set": "nail base top coat set bottle",
  "nail-art-brush-tool-kit": "nail art brush set tools",
  "nail-files-buffer-pack": "nail file buffer block set",
  "nail-primer-dehydrator": "nail primer dehydrator bottle",
  "professional-gel-nail-polish": "gel nail polish bottle professional",
  "professional-nail-drill": "nail drill electric professional",
  "professional-nail-tips": "nail tips artificial extension pack",
  "uv-led-nail-lamp": "uv led nail lamp curing machine",
  // Professional Equipment
  "high-frequency-facial-machine": "high frequency facial machine beauty",
  "hot-towel-cabinet": "hot towel cabinet warmer salon",
  "magnifying-lamp": "magnifying lamp beauty salon",
  "multifunction-beauty-machine": "beauty machine multifunctional salon",
  "professional-facial-steamer": "facial steamer machine beauty salon",
  "professional-hair-steamer": "hair steamer cap treatment machine",
  "uv-tool-sterilizer-cabinet": "uv sterilizer cabinet salon tools",
  // Salon Furniture
  "hydraulic-salon-styling-chair": "hydraulic salon styling chair",
  "manicure-table": "manicure table nail desk salon",
  "professional-barber-chair": "professional barber chair salon",
  "professional-facial-bed": "facial bed massage table salon",
  "salon-shampoo-station": "salon shampoo basin station",
  "salon-stool": "salon stool barber chair",
  "salon-storage-cabinet": "salon storage cabinet trolley",
  "salon-styling-station-mirror-unit": "salon styling station mirror vanity",
  "salon-trolley": "salon trolley cart beauty",
  // Beauty Consumables
  "colour-mixing-bowl-brush-set": "hair color mixing bowl brush set",
  "cotton-rolls-pads": "cotton rolls pads beauty salon",
  "disposable-bed-sheets": "disposable bed sheets salon beauty",
  "disposable-hair-caps": "disposable shower cap hair salon",
  "disposable-latex-gloves": "latex gloves disposable salon",
  "disposable-salon-towels": "disposable towel salon beauty",
  "hair-coloring-aluminium-foil": "aluminum foil hair coloring salon",
  "nitrile-examination-gloves": "nitrile gloves examination salon",
  "salon-cotton-towels": "cotton towel salon beauty",
  "waterproof-salon-cape": "salon cape waterproof barber",
};

function downloadImage(url: string, dest: string): Promise<boolean> {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith("https") ? https : http;

    const request = protocol.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        downloadImage(res.headers.location!, dest).then(resolve);
        return;
      }
      if (!res.statusCode || res.statusCode >= 400) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        resolve(false);
        return;
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(true); });
    });

    request.on("error", () => {
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      resolve(false);
    });

    request.setTimeout(20000, () => {
      request.destroy();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      resolve(false);
    });
  });
}

async function searchPexels(term: string, page = 1): Promise<string[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(term)}&per_page=3&page=${page}&orientation=square`;
  const res = await fetch(url, { headers: { Authorization: key } });
  if (!res.ok) return [];
  const data = await res.json() as any;
  return (data.photos || []).map((p: any) => p.src.large);
}

async function searchUnsplash(term: string): Promise<string[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(term)}&per_page=3&orientation=squarish`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
  if (!res.ok) return [];
  const data = await res.json() as any;
  return (data.results || []).map((r: any) => r.urls.regular);
}

async function main() {
  console.log("\nChecking available API keys...");
  const hasPexels = !!process.env.PEXELS_API_KEY;
  const hasUnsplash = !!process.env.UNSPLASH_ACCESS_KEY;
  console.log(`  Pexels API:   ${hasPexels ? "✓ AVAILABLE" : "✗ NOT SET"}`);
  console.log(`  Unsplash API: ${hasUnsplash ? "✓ AVAILABLE" : "✗ NOT SET"}`);

  if (!hasPexels && !hasUnsplash) {
    console.log("\n⚠️  No API keys found. Add to .env.local:");
    console.log("   PEXELS_API_KEY=your_key_here");
    console.log("   UNSPLASH_ACCESS_KEY=your_key_here");
    console.log("\nGet free keys at:");
    console.log("   Pexels: https://www.pexels.com/api/");
    console.log("   Unsplash: https://unsplash.com/developers");
    return;
  }

  const products = await prisma.product.findMany({
    where: { NOT: { name: { startsWith: "E2E Test" } } },
    select: { id: true, slug: true, name: true, images: true, category: { select: { slug: true } } },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  let updated = 0, failed = 0;

  for (const product of products) {
    const term = SEARCH_TERMS[product.slug] || `${product.name} salon beauty professional`;
    const catDir = path.join(PUBLIC, "products", product.category.slug);
    if (!fs.existsSync(catDir)) fs.mkdirSync(catDir, { recursive: true });

    let photoUrls: string[] = [];

    // Try Pexels first
    if (hasPexels) {
      photoUrls = await searchPexels(term);
    }

    // Fall back to Unsplash
    if (photoUrls.length < 3 && hasUnsplash) {
      const more = await searchUnsplash(term);
      for (const u of more) {
        if (photoUrls.length < 3) photoUrls.push(u);
      }
    }

    if (photoUrls.length === 0) {
      console.log(`  ✗ No results for: ${product.name}`);
      failed++;
      continue;
    }

    const newImages: string[] = [];
    const suffixes = ["", "-2", "-3"];

    for (let i = 0; i < Math.min(photoUrls.length, 3); i++) {
      const suffix = suffixes[i];
      const filename = `${product.slug}${suffix}.png`;
      const dest = path.join(catDir, filename);
      const ok = await downloadImage(photoUrls[i], dest);
      if (ok) {
        newImages.push(`/products/${product.category.slug}/${filename}`);
      }
    }

    if (newImages.length > 0) {
      await prisma.product.update({
        where: { id: product.id },
        data: { images: newImages },
      });
      console.log(`  ✓ ${product.name} (${newImages.length} photos)`);
      updated++;
    } else {
      console.log(`  ✗ Download failed for: ${product.name}`);
      failed++;
    }

    // Rate limit: wait 300ms between requests
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n✅ Done — ${updated} updated, ${failed} failed`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
