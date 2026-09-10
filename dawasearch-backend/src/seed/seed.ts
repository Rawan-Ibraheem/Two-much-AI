import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../database/database.module';
import { Medicine } from '../medicines/entities/medicine.entity';
import { Offer } from '../medicines/entities/offer.entity';
import { Pharmacy } from '../medicines/entities/pharmacy.entity';

/**
 * Real Egyptian pharmacy data captured from Talabat storefronts
 * (talabat.com/ar/egypt) on 2026-09-10. Prices are in EGP as listed on that
 * date. This is a point-in-time snapshot for the demo - nothing here is live
 * synced, so prices drift out of date as soon as the pharmacies change them.
 *
 * Each URL is the pharmacy branch's product-category storefront page, i.e. its
 * real online ordering page. Talabat does not expose stable per-product URLs,
 * so a URL lands the user on the category listing for that branch rather than
 * on the exact product row. Do not present these as per-product deep links.
 *
 * Every offer below is real and in stock, with exactly one clearly marked
 * synthetic exception (see SYNTHETIC_DEMO_OFFER).
 */

// Keyed by a short alias so the offer table below stays readable.
const PHARMACIES = {
  elEzaby: {
    name: 'Dr Ahmed El Ezaby Pharmacy — Helwan',
    city: 'Cairo',
    websiteUrl:
      'https://www.talabat.com/ar/egypt/pharmacy/726709/drahmed-el-ezaby-pharmacy-helwan/medicines/common-symptoms?aid=10486',
  },
  beeWell: {
    name: 'Bee Well Pharmacies — Haram, Talbiya',
    city: 'Giza',
    websiteUrl:
      'https://www.talabat.com/ar/egypt/pharmacy/761800/bee-well-pharmacies-haram-talbiya-2/medicines/common-symptoms?aid=7668',
  },
  therapy: {
    name: 'Therapy Pharmacy — Msaken, Masna El Seed',
    city: 'Cairo',
    websiteUrl:
      'https://www.talabat.com/ar/egypt/pharmacy/787087/therapy-pharmacy-msaken-masna-seed/medicines/common-symptoms?aid=7260',
  },
  askar: {
    name: 'Askar Pharmacy — Gadila, Toreel',
    city: 'Cairo',
    websiteUrl:
      'https://www.talabat.com/ar/egypt/pharmacy/727666/askar-pharmacy-gadila-toreel/medicines/common-symptoms?aid=8711',
  },
  alWassal: {
    name: 'Al Wassal Pharmacy — Old Maadi',
    city: 'Cairo',
    websiteUrl:
      'https://www.talabat.com/ar/egypt/grocery/692231/alwassal-pharmacy-maadi-old/medicines/common-symptoms?aid=7595',
  },
} as const;

type PharmacyKey = keyof typeof PHARMACIES;

const MEDICINES = {
  panadolExtra: {
    name: 'Panadol Extra with Optizorb',
    activeIngredient: 'Paracetamol + Caffeine',
    strength: '500mg/65mg',
    form: 'Tablet',
    packageSize: '24 tablets',
  },
  panadolAdvance: {
    name: 'Panadol Advance',
    activeIngredient: 'Paracetamol',
    strength: '500mg',
    form: 'Tablet',
    packageSize: '48 tablets',
  },
  antinal: {
    name: 'Antinal',
    activeIngredient: 'Nifuroxazide',
    strength: '200mg',
    form: 'Capsule',
    packageSize: '24 capsules',
  },
  cetal: {
    name: 'Cetal',
    activeIngredient: 'Paracetamol',
    strength: '500mg',
    form: 'Tablet',
    packageSize: '20 tablets',
  },
} as const;

type MedicineKey = keyof typeof MEDICINES;

interface SeedOffer {
  medicine: MedicineKey;
  pharmacy: PharmacyKey;
  price: number;
  available?: boolean;
  synthetic?: boolean;
}

/**
 * Real listings and EGP prices. A pharmacy is absent from a medicine's list
 * because that branch genuinely does not list that pack size - not because the
 * data is incomplete.
 */
const REAL_OFFERS: SeedOffer[] = [
  // Panadol Extra with Optizorb, 24 tablets.
  // El Ezaby Helwan does not list this exact pack size.
  { medicine: 'panadolExtra', pharmacy: 'beeWell', price: 58.0 },
  { medicine: 'panadolExtra', pharmacy: 'therapy', price: 58.0 },
  { medicine: 'panadolExtra', pharmacy: 'askar', price: 67.0 },
  { medicine: 'panadolExtra', pharmacy: 'alWassal', price: 58.0 },

  // Panadol Advance, 48 tablets. Askar does not list this.
  { medicine: 'panadolAdvance', pharmacy: 'elEzaby', price: 92.0 },
  { medicine: 'panadolAdvance', pharmacy: 'beeWell', price: 87.4 },
  { medicine: 'panadolAdvance', pharmacy: 'therapy', price: 92.0 },
  { medicine: 'panadolAdvance', pharmacy: 'alWassal', price: 92.0 },

  // Antinal, 24 capsules. Carried by all five.
  { medicine: 'antinal', pharmacy: 'elEzaby', price: 52.0 },
  { medicine: 'antinal', pharmacy: 'beeWell', price: 49.4 },
  { medicine: 'antinal', pharmacy: 'therapy', price: 52.0 },
  { medicine: 'antinal', pharmacy: 'askar', price: 60.0 },
  { medicine: 'antinal', pharmacy: 'alWassal', price: 52.0 },

  // Cetal, 20 tablets. Bee Well and Al Wassal do not list it - narrower
  // footprint than the others, which is realistic.
  { medicine: 'cetal', pharmacy: 'elEzaby', price: 24.0 },
  { medicine: 'cetal', pharmacy: 'therapy', price: 24.0 },
  { medicine: 'cetal', pharmacy: 'askar', price: 28.0 },
];

/**
 * SYNTHETIC - NOT REAL SOURCE DATA.
 *
 * Askar does not actually list Panadol Advance. This fabricated row exists
 * only so the `available: false` code path stays demoable on the frontend
 * (greyed-out "currently unavailable" styling). Delete it if the demo should
 * contain exclusively real data.
 */
const SYNTHETIC_DEMO_OFFER: SeedOffer = {
  medicine: 'panadolAdvance',
  pharmacy: 'askar',
  price: 95.0,
  available: false,
  synthetic: true,
};

const OFFERS: SeedOffer[] = [...REAL_OFFERS, SYNTHETIC_DEMO_OFFER];

async function seed() {
  const dataSource = new DataSource(buildDataSourceOptions());
  await dataSource.initialize();

  // FK-safe order, so re-running never leaves orphaned offers behind.
  await dataSource.createQueryBuilder().delete().from(Offer).execute();
  await dataSource.createQueryBuilder().delete().from(Medicine).execute();
  await dataSource.createQueryBuilder().delete().from(Pharmacy).execute();

  const pharmacyRepo = dataSource.getRepository(Pharmacy);
  const medicineRepo = dataSource.getRepository(Medicine);
  const offerRepo = dataSource.getRepository(Offer);

  const pharmacyKeys = Object.keys(PHARMACIES) as PharmacyKey[];
  const savedPharmacies = await pharmacyRepo.save(
    pharmacyKeys.map((key) => pharmacyRepo.create(PHARMACIES[key])),
  );
  const pharmacyByKey = new Map(
    pharmacyKeys.map((key, index) => [key, savedPharmacies[index]]),
  );

  const medicineKeys = Object.keys(MEDICINES) as MedicineKey[];
  const savedMedicines = await medicineRepo.save(
    medicineKeys.map((key) => medicineRepo.create(MEDICINES[key])),
  );
  const medicineByKey = new Map(
    medicineKeys.map((key, index) => [key, savedMedicines[index]]),
  );

  const offers = OFFERS.map((seedOffer) => {
    const medicine = medicineByKey.get(seedOffer.medicine);
    const pharmacy = pharmacyByKey.get(seedOffer.pharmacy);
    if (!medicine || !pharmacy) {
      throw new Error(
        `Bad seed row: ${seedOffer.medicine} @ ${seedOffer.pharmacy}`,
      );
    }
    return offerRepo.create({
      medicineId: medicine.id,
      pharmacyId: pharmacy.id,
      price: seedOffer.price.toFixed(2),
      available: seedOffer.available ?? true,
      // Storefront category page for the branch, not a per-product deep link.
      sourceUrl: pharmacy.websiteUrl,
    });
  });
  await offerRepo.save(offers);

  const syntheticCount = OFFERS.filter((o) => o.synthetic).length;
  console.log(
    `Seeded ${savedPharmacies.length} pharmacies, ${savedMedicines.length} medicines, ${offers.length} offers.`,
  );
  console.log(
    `  Source: real Talabat storefront listings (EGP), captured 2026-09-10.`,
  );
  console.log(`  Pharmacies: ${savedPharmacies.map((p) => p.name).join(' | ')}`);
  console.log(`  Medicines:  ${savedMedicines.map((m) => m.name).join(' | ')}`);
  console.log(
    `  Offers: ${REAL_OFFERS.length} real, ${syntheticCount} synthetic (available: false demo row).`,
  );

  await dataSource.destroy();
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
