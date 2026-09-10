// Branch-level directory for the demo catalog.
//
// Coordinates are the real approximate locations of these Cairo/Giza districts,
// so distance ranking is genuinely computed rather than hardcoded. Hotlines are
// the pharmacies' public call-centre numbers. Availability and price, however,
// are demo data - see `verificationStatus`.
const { pharmacySources } = require('./pharmacy-sources');

const branches = {
  'El Ezaby: Dokki': {
    pharmacy: 'El Ezaby',
    branch: 'Dokki',
    city: 'Giza',
    governorate: 'Giza',
    latitude: 30.0381,
    longitude: 31.2118,
    phone: '19600',
    sourceId: 'el-ezaby'
  },
  'Seif Pharmacy: Mohandessin': {
    pharmacy: 'Seif Pharmacy',
    branch: 'Mohandessin',
    city: 'Giza',
    governorate: 'Giza',
    latitude: 30.0488,
    longitude: 31.2016,
    phone: '19199',
    sourceId: 'seif'
  },
  '19011 Pharmacy: Agouza': {
    pharmacy: '19011 Pharmacy',
    branch: 'Agouza',
    city: 'Giza',
    governorate: 'Giza',
    latitude: 30.0309,
    longitude: 31.2152,
    phone: '19011',
    sourceId: '19011'
  }
};

function branchKey(pharmacy, branch) {
  return `${pharmacy}: ${branch}`;
}

function getBranch(pharmacy, branch) {
  return branches[branchKey(pharmacy, branch)] || null;
}

function mapsUrl(record) {
  if (!record) return null;
  const query = encodeURIComponent(`${record.pharmacy} ${record.branch}, ${record.city}, Egypt`);
  return `https://www.google.com/maps/search/?api=1&query=${query}&center=${record.latitude},${record.longitude}`;
}

/**
 * Public-facing branch metadata attached to every offer. `verificationStatus`
 * stays 'unverified' while the connectors are inactive so the UI can never
 * present demo stock as freshly verified.
 */
function describeBranch(pharmacy, branch) {
  const record = getBranch(pharmacy, branch);
  if (!record) return null;
  const source = pharmacySources.find((candidate) => candidate.id === record.sourceId);
  return {
    city: record.city,
    governorate: record.governorate,
    latitude: record.latitude,
    longitude: record.longitude,
    phone: record.phone,
    mapsUrl: mapsUrl(record),
    pharmacyUrl: source?.websiteUrl || null,
    sourceId: record.sourceId,
    sourceStatus: source?.status || 'unknown',
    verificationStatus: 'unverified'
  };
}

module.exports = { branches, branchKey, getBranch, describeBranch, mapsUrl };
