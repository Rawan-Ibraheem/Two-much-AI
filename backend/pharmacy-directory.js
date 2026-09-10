// Branch-level directory for the demo catalog.
//
// Coordinates are approximate locations of these Alexandria districts,
// so distance ranking is genuinely computed rather than hardcoded. Hotlines are
// the pharmacies' public call-centre numbers. Availability and price, however,
// are demo data - see `verificationStatus`.
const { pharmacySources } = require('./pharmacy-sources');

const branches = {
  'El Ezaby: Smouha': {
    pharmacy: 'El Ezaby',
    branch: 'Smouha',
    city: 'Alexandria',
    governorate: 'Alexandria',
    latitude: 31.2150,
    longitude: 29.9550,
    phone: '19600',
    sourceId: 'el-ezaby'
  },
  'Seif Pharmacy: Sidi Gaber': {
    pharmacy: 'Seif Pharmacy',
    branch: 'Sidi Gaber',
    city: 'Alexandria',
    governorate: 'Alexandria',
    latitude: 31.2440,
    longitude: 29.9660,
    phone: '19199',
    sourceId: 'seif'
  },
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
    // Null until a real street address is on record - the frontend renders it
    // only when present, so nothing is invented to fill the field.
    address: record.address ?? null,
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
