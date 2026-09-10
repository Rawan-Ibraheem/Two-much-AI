const apiUrl = 'http://localhost:3000';
const searchForm = document.querySelector('#search-form');
const resultsElement = document.querySelector('#results');
const statusElement = document.querySelector('#status');
const coverageButton = document.querySelector('#coverage-button');
const coverageElement = document.querySelector('#coverage');
const locationButton = document.querySelector('#location-button');
const locationStatus = document.querySelector('#location-status');
let userLocation = null;

function setStatus(message, state = '') {
  statusElement.textContent = message;
  statusElement.dataset.state = state;
}

function selectedMedicineIds() {
  return [...document.querySelectorAll('input[name="medicine"]:checked')].map((input) => input.value);
}

function renderResults(results) {
  resultsElement.replaceChildren();
  if (results.length === 0) {
    resultsElement.innerHTML = '<p class="empty">No matching medicines found.</p>';
    coverageButton.disabled = true;
    return;
  }

  for (const medicine of results) {
    const card = document.createElement('article');
    card.className = 'medicine-card';
    card.innerHTML = `
      <label class="medicine-select">
        <input type="checkbox" name="medicine" value="${medicine.id}">
        <span>Select for branch coverage</span>
      </label>
      <h2>${medicine.name}</h2>
      <p>${medicine.ingredient} · ${medicine.form} · pack of ${medicine.packageSize}</p>
      <ul>${medicine.offers.map((offer) => `
        <li><strong>${offer.pharmacy}</strong>, ${offer.branch}: ${offer.price} ${offer.currency}
          <span class="availability ${offer.available ? 'is-available' : 'is-unavailable'}">${offer.available ? 'Available' : 'Unavailable'}</span>
        </li>`).join('')}</ul>`;
    resultsElement.append(card);
  }
  coverageButton.disabled = false;
}

async function search(event) {
  event.preventDefault();
  setStatus('Searching...');
  coverageElement.replaceChildren();
  const formData = new FormData(searchForm);
  const params = new URLSearchParams({
    q: formData.get('q'),
    sort: formData.get('sort'),
    availableOnly: document.querySelector('#available-only').checked ? 'true' : 'false'
  });
  if (userLocation) {
    params.set('lat', userLocation.latitude);
    params.set('lon', userLocation.longitude);
  }

  try {
    const response = await fetch(`${apiUrl}/api/medicines?${params}`);
    if (!response.ok) throw new Error('Search request failed.');
    const body = await response.json();
    renderResults(body.results);
    setStatus(`${body.count} result${body.count === 1 ? '' : 's'} found.`);
  } catch (error) {
    renderResults([]);
    setStatus(error.message, 'error');
  }
}

function useLocation() {
  if (!navigator.geolocation) {
    locationStatus.textContent = 'Location is not supported by this browser';
    return;
  }
  locationStatus.textContent = 'Requesting location...';
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      userLocation = { latitude: coords.latitude, longitude: coords.longitude };
      locationStatus.textContent = 'Location enabled for nearest results';
      setStatus('Location enabled. Search to calculate distances from you.');
    },
    () => {
      locationStatus.textContent = 'Location permission was not granted';
      setStatus('Location was not enabled. Search still works without it.', 'error');
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
  );
}

async function findCoverage() {
  const items = selectedMedicineIds();
  if (items.length === 0) {
    setStatus('Select at least one medicine first.', 'error');
    return;
  }
  setStatus('Checking branch coverage...');
  try {
    const response = await fetch(`${apiUrl}/api/search/coverage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Coverage request failed.');
    coverageElement.innerHTML = `<h2>Branch coverage</h2>${body.candidates.map((candidate) => `
      <article class="coverage-card ${candidate.complete ? 'is-complete' : ''}">
        <strong>${candidate.pharmacy}, ${candidate.branch}</strong>
        <span>${candidate.complete ? 'Complete' : `Missing ${candidate.missingMedicineIds.length} medicine(s)`}</span>
        <span>${candidate.totalPrice} EGP total · ${candidate.distanceKm} km away</span>
      </article>`).join('')}`;
    setStatus('Coverage results updated.');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

searchForm.addEventListener('submit', search);
coverageButton.addEventListener('click', findCoverage);
locationButton.addEventListener('click', useLocation);