const checkedRecently = new Date().toISOString();

const mockMedicines = [
  {
    id: 'amoxicillin-500-21',
    name: 'Amoxicillin 500mg',
    ingredient: 'Amoxicillin 500mg',
    form: 'Capsules',
    packageSize: 21,
    searchTerms: ['amox', 'amoxycillin', 'amoxicilin', 'اموكسيسيلين', 'أموكسيسيلين'],
    offers: [
      { pharmacy: 'El Ezaby', branch: 'Dokki', price: 75, currency: 'EGP', available: true, distanceKm: 1.8, lastChecked: checkedRecently },
      { pharmacy: 'Seif Pharmacy', branch: 'Mohandessin', price: 82, currency: 'EGP', available: true, distanceKm: 3.2, lastChecked: checkedRecently }
    ]
  },
  {
    id: 'augmentin-1g-14',
    name: 'Augmentin 1g',
    ingredient: 'Amoxicillin 875mg + Clavulanic acid 125mg',
    form: 'Tablets',
    packageSize: 14,
    searchTerms: ['augmentin', 'augmentine', 'اوجمنتين', 'أوجمنتين'],
    offers: [
      { pharmacy: 'El Ezaby', branch: 'Dokki', price: 210, currency: 'EGP', available: true, distanceKm: 1.8, lastChecked: checkedRecently },
      { pharmacy: '19011 Pharmacy', branch: 'Agouza', price: 215, currency: 'EGP', available: false, distanceKm: 2.4, lastChecked: checkedRecently }
    ]
  },
  {
    id: 'brufen-400-30',
    name: 'Brufen 400mg',
    ingredient: 'Ibuprofen 400mg',
    form: 'Tablets',
    packageSize: 30,
    searchTerms: ['brufen', 'ibuprofen', 'بروفين', 'ايبوبروفين', 'إيبوبروفين'],
    offers: [
      { pharmacy: 'Seif Pharmacy', branch: 'Mohandessin', price: 65, currency: 'EGP', available: true, distanceKm: 3.2, lastChecked: checkedRecently }
    ]
  },
  {
    id: 'cataflam-50-20',
    name: 'Cataflam 50mg',
    ingredient: 'Diclofenac potassium 50mg',
    form: 'Tablets',
    packageSize: 20,
    searchTerms: ['cataflam', 'diclofenac', 'كاتافلام', 'ديكلوفيناك'],
    offers: [
      { pharmacy: 'El Ezaby', branch: 'Dokki', price: 58, currency: 'EGP', available: true, distanceKm: 1.8, lastChecked: checkedRecently },
      { pharmacy: 'Seif Pharmacy', branch: 'Mohandessin', price: 61, currency: 'EGP', available: true, distanceKm: 3.2, lastChecked: checkedRecently }
    ]
  },
  {
    id: 'voltaren-emulgel-50',
    name: 'Voltaren Emulgel',
    ingredient: 'Diclofenac diethylamine 1.16%',
    form: 'Topical gel',
    packageSize: 50,
    searchTerms: ['voltaren', 'voltarene', 'فولتارين', 'جل فولتارين'],
    offers: [
      { pharmacy: 'El Ezaby', branch: 'Dokki', price: 145, currency: 'EGP', available: true, distanceKm: 1.8, lastChecked: checkedRecently }
    ]
  },
  {
    id: 'flagyl-500-20',
    name: 'Flagyl 500mg',
    ingredient: 'Metronidazole 500mg',
    form: 'Tablets',
    packageSize: 20,
    searchTerms: ['flagyl', 'metronidazole', 'فلاجيل', 'ميترونيدازول'],
    offers: [
      { pharmacy: 'Seif Pharmacy', branch: 'Mohandessin', price: 42, currency: 'EGP', available: true, distanceKm: 3.2, lastChecked: checkedRecently }
    ]
  },
  {
    id: 'nexium-40-14',
    name: 'Nexium 40mg',
    ingredient: 'Esomeprazole 40mg',
    form: 'Tablets',
    packageSize: 14,
    searchTerms: ['nexium', 'esomeprazole', 'نيكسيوم', 'إيزوميبرازول'],
    offers: [
      { pharmacy: 'El Ezaby', branch: 'Dokki', price: 190, currency: 'EGP', available: true, distanceKm: 1.8, lastChecked: checkedRecently },
      { pharmacy: 'Seif Pharmacy', branch: 'Mohandessin', price: 198, currency: 'EGP', available: true, distanceKm: 3.2, lastChecked: checkedRecently }
    ]
  },
  {
    id: 'panadol-advance-24',
    name: 'Panadol Advance',
    ingredient: 'Paracetamol 500mg',
    form: 'Tablets',
    packageSize: 24,
    searchTerms: ['panadol advance', 'بانادول ادفانس', 'بانادول أدفانس', 'paracetamol'],
    offers: [
      { pharmacy: 'El Ezaby', branch: 'Dokki', price: 72, currency: 'EGP', available: true, distanceKm: 1.8, lastChecked: checkedRecently },
      { pharmacy: '19011 Pharmacy', branch: 'Agouza', price: 76, currency: 'EGP', available: true, distanceKm: 2.4, lastChecked: checkedRecently }
    ]
  },
  {
    id: 'claritin-10-10',
    name: 'Claritin 10mg',
    ingredient: 'Loratadine 10mg',
    form: 'Tablets',
    packageSize: 10,
    searchTerms: ['claritin', 'loratadine', 'كلاريتين', 'لوراتادين'],
    offers: [
      { pharmacy: 'Seif Pharmacy', branch: 'Mohandessin', price: 88, currency: 'EGP', available: true, distanceKm: 3.2, lastChecked: checkedRecently }
    ]
  },
  {
    id: 'telfast-180-20',
    name: 'Telfast 180mg',
    ingredient: 'Fexofenadine 180mg',
    form: 'Tablets',
    packageSize: 20,
    searchTerms: ['telfast', 'fexofenadine', 'تلفاست', 'فيكسوفينادين'],
    offers: [
      { pharmacy: 'El Ezaby', branch: 'Dokki', price: 120, currency: 'EGP', available: true, distanceKm: 1.8, lastChecked: checkedRecently }
    ]
  },
  {
    id: 'omeprazole-20-14',
    name: 'Omeprazole 20mg',
    ingredient: 'Omeprazole 20mg',
    form: 'Capsules',
    packageSize: 14,
    searchTerms: ['omeprazole', 'omeprazol', 'اوميبرازول', 'أوميبرازول'],
    offers: [
      { pharmacy: '19011 Pharmacy', branch: 'Agouza', price: 38, currency: 'EGP', available: true, distanceKm: 2.4, lastChecked: checkedRecently }
    ]
  },
  {
    id: 'otrin-adult-15',
    name: 'Otrivin Adult',
    ingredient: 'Xylometazoline hydrochloride 0.1%',
    form: 'Nasal spray',
    packageSize: 15,
    searchTerms: ['otrin', 'otrivin', 'xylometazoline', 'اوترفين', 'زيلوميتازولين'],
    offers: [
      { pharmacy: 'El Ezaby', branch: 'Dokki', price: 55, currency: 'EGP', available: true, distanceKm: 1.8, lastChecked: checkedRecently },
      { pharmacy: 'Seif Pharmacy', branch: 'Mohandessin', price: 59, currency: 'EGP', available: true, distanceKm: 3.2, lastChecked: checkedRecently }
    ]
  }
];

module.exports = { mockMedicines };