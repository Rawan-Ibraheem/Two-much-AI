export interface PharmacyOffer {
  id: string;
  pharmacyName: string;
  branchName: string;
  price: number;
  available: boolean;
  distanceKm: number;
  lastChecked: string;
  url: string;
  phone: string;
}

export interface MedicineProduct {
  id: string;
  name: string;
  arabicName: string;
  activeIngredient: string;
  strength: string;
  dosageForm: string;
  packSize: string;
  tags: string[];
  offers: PharmacyOffer[];
}

export const MOCK_MEDICINES: MedicineProduct[] = [
  {
    id: "panadol-extra",
    name: "Panadol Extra",
    arabicName: "بانادول إكسترا",
    activeIngredient: "Paracetamol 500mg + Caffeine 65mg",
    strength: "500mg / 65mg",
    dosageForm: "Film-coated Tablets",
    packSize: "24 Tablets",
    tags: ["panadol", "extra", "بانادول", "اكسترا", "paracetamol", "headache", "صداع", "banadol", "panadol extra"],
    offers: [
      {
        id: "ez-1",
        pharmacyName: "El Ezaby (العزبي)",
        branchName: "Smouha Branch",
        price: 85,
        available: true,
        distanceKm: 1.2,
        lastChecked: "5 mins ago",
        url: "https://elezabypharmacy.com",
        phone: "19600",
      },
      {
        id: "roshdy-1",
        pharmacyName: "Roshdy (رشدي)",
        branchName: "Loran Branch",
        price: 88,
        available: true,
        distanceKm: 2.1,
        lastChecked: "12 mins ago",
        url: "https://roshdy.com",
        phone: "19661",
      },
      {
        id: "19011-1",
        pharmacyName: "19011 Pharmacies",
        branchName: "Sidi Gaber Branch",
        price: 92,
        available: true,
        distanceKm: 3.4,
        lastChecked: "25 mins ago",
        url: "https://19011.com",
        phone: "19011",
      },
      {
        id: "seif-1",
        pharmacyName: "Seif Pharmacies (سيف)",
        branchName: "Roushdy Branch",
        price: 95,
        available: false,
        distanceKm: 4.8,
        lastChecked: "2 hours ago",
        url: "https://seif-pharmacies.com",
        phone: "19199",
      },
    ],
  },
  {
    id: "panadol-cold-flu",
    name: "Panadol Cold & Flu Day",
    arabicName: "بانادول كولد أند فلو داي",
    activeIngredient: "Paracetamol + Phenylephrine + Caffeine",
    strength: "500mg",
    dosageForm: "Caplets",
    packSize: "24 Caplets",
    tags: ["panadol", "cold", "flu", "بانادول", "برد", "احتقان", "green", "banadol"],
    offers: [
      {
        id: "misr-1",
        pharmacyName: "Misr Pharmacies (مصر)",
        branchName: "Ibrahimia Branch",
        price: 78,
        available: true,
        distanceKm: 1.5,
        lastChecked: "18 mins ago",
        url: "https://misr-pharmacies.com",
        phone: "19110",
      },
      {
        id: "ez-2",
        pharmacyName: "El Ezaby (العزبي)",
        branchName: "Stanley Branch",
        price: 82,
        available: true,
        distanceKm: 2.8,
        lastChecked: "30 mins ago",
        url: "https://elezabypharmacy.com",
        phone: "19600",
      },
    ],
  },
  {
    id: "congestal",
    name: "Congestal Tablets",
    arabicName: "كونجستال أقراص",
    activeIngredient: "Paracetamol 650mg + Chlorpheniramine + Pseudoephedrine",
    strength: "650mg / 4mg / 60mg",
    dosageForm: "Tablets",
    packSize: "20 Tablets",
    tags: ["congestal", "كونجستال", "flu", "برد", "رشح", "paracetamol"],
    offers: [
      {
        id: "roshdy-2",
        pharmacyName: "Roshdy (رشدي)",
        branchName: "Mansheya Branch",
        price: 45,
        available: true,
        distanceKm: 1.9,
        lastChecked: "8 mins ago",
        url: "https://roshdy.com",
        phone: "19661",
      },
      {
        id: "ez-3",
        pharmacyName: "El Ezaby (العزبي)",
        branchName: "Camp Caesar Branch",
        price: 45,
        available: true,
        distanceKm: 2.3,
        lastChecked: "14 mins ago",
        url: "https://elezabypharmacy.com",
        phone: "19600",
      },
      {
        id: "19011-2",
        pharmacyName: "19011 Pharmacies",
        branchName: "Glim Branch",
        price: 50,
        available: false,
        distanceKm: 5.1,
        lastChecked: "1 hour ago",
        url: "https://19011.com",
        phone: "19011",
      },
    ],
  },
  {
    id: "augmentin-1g",
    name: "Augmentin 1g",
    arabicName: "أوجمنتين 1 جم",
    activeIngredient: "Amoxicillin 875mg + Clavulanic Acid 125mg",
    strength: "1000mg",
    dosageForm: "Film-coated Tablets",
    packSize: "14 Tablets",
    tags: ["augmentin", "اوجمنتين", "أوجمنتين", "antibiotic", "مضاد حيوي"],
    offers: [
      {
        id: "ez-4",
        pharmacyName: "El Ezaby (العزبي)",
        branchName: "Smouha Branch",
        price: 135,
        available: true,
        distanceKm: 1.2,
        lastChecked: "4 mins ago",
        url: "https://elezabypharmacy.com",
        phone: "19600",
      },
      {
        id: "seif-2",
        pharmacyName: "Seif Pharmacies (سيف)",
        branchName: "Sporting Branch",
        price: 135,
        available: false,
        distanceKm: 3.1,
        lastChecked: "50 mins ago",
        url: "https://seif-pharmacies.com",
        phone: "19199",
      },
    ],
  },
];