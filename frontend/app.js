const apiUrl = 'http://localhost:3000';
const searchForm = document.querySelector('#search-form');
const resultsElement = document.querySelector('#results');
const statusElement = document.querySelector('#status');
const coverageButton = document.querySelector('#coverage-button');
const coverageElement = document.querySelector('#coverage');
const locationButton = document.querySelector('#location-button');
const locationStatus = document.querySelector('#location-status');
const demoLocationButton = document.querySelector('#demo-location-button');
const latitudeInput = document.querySelector('#latitude');
const longitudeInput = document.querySelector('#longitude');
const researchStatus = document.querySelector('#research-status');
const researchResults = document.querySelector('#research-results');
const receiptFileInput = document.querySelector('#receipt-file');
const ocrTextInput = document.querySelector('#ocr-text');
const analyzeButton = document.querySelector('#analyze-button');
const ocrStatus = document.querySelector('#ocr-status');
const ocrReview = document.querySelector('#ocr-review');
const confirmOcrButton = document.querySelector('#confirm-ocr-button');
let userLocation = null;

function setStatus(message, state = '') {
  statusElement.textContent = message;
  statusElement.dataset.state = state;
}

function selectedMedicineIds() {
  return [...document.querySelectorAll('input[name="medicine"]:checked')].map((input) => input.value);
}

function selectedOcrMedicineIds() {
  return [...document.querySelectorAll('input[name="ocr-medicine"]:checked')].map((input) => input.value);
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
    if (userLocation) await researchNearby();
  } catch (error) {
    renderResults([]);
    setStatus(error.message, 'error');
  }
}

function useLocation() {
  if (!navigator.geolocation) {
    locationStatus.textContent = 'GPS unavailable; enter a location below';
    return;
  }
  locationStatus.textContent = 'Requesting location...';
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      userLocation = { latitude: coords.latitude, longitude: coords.longitude };
      latitudeInput.value = userLocation.latitude.toFixed(6);
      longitudeInput.value = userLocation.longitude.toFixed(6);
      locationStatus.textContent = 'Location enabled for nearest results';
      setStatus('Location enabled. Checking nearby pharmacy sources...');
      if (document.querySelector('#query').value.trim()) {
        search(new Event('submit')).then(researchNearby);
      }
    },
    () => {
      locationStatus.textContent = 'GPS unavailable; enter a location below';
      setStatus('GPS was not available. You can use a demo or manual location.');
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
  );
}

function useManualLocation(latitude, longitude, label) {
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);
  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)
    || parsedLatitude < -90 || parsedLatitude > 90
    || parsedLongitude < -180 || parsedLongitude > 180) {
    setStatus('Enter a valid latitude and longitude.', 'error');
    return;
  }
  userLocation = { latitude: parsedLatitude, longitude: parsedLongitude };
  latitudeInput.value = parsedLatitude;
  longitudeInput.value = parsedLongitude;
  locationStatus.textContent = `${label} enabled for nearby research`;
  setStatus('Location enabled. Search to calculate nearby availability.');
  if (document.querySelector('#query').value.trim()) {
    search(new Event('submit')).then(researchNearby);
  }
}

function renderResearch(body) {
  researchStatus.textContent = `${body.results.length} medicine result${body.results.length === 1 ? '' : 's'} checked within ${body.radiusKm} km. ${body.sourcePolicy}`;
  researchResults.replaceChildren();
  for (const result of body.results) {
    const card = document.createElement('article');
    card.className = 'research-card';
    card.innerHTML = `<h3>${result.medicineName}</h3>${result.offers.map((offer) => `
      <p><strong>${offer.pharmacy}, ${offer.branch}</strong> · ${offer.price} ${offer.currency} · ${offer.distanceKm} km
        <span class="availability ${offer.available ? 'is-available' : 'is-unavailable'}">${offer.available ? 'Available' : 'Unavailable'}</span>
        <br><small>${offer.source.verificationStatus} · checked ${new Date(offer.checkedAt).toLocaleTimeString()}</small>
        <br><a class="source-link" href="${offer.source.websiteUrl}" target="_blank" rel="noreferrer">Visit pharmacy website</a>
      </p>`).join('')}`;
    researchResults.append(card);
  }
}

async function researchNearby() {
  if (!userLocation) return;
  const query = document.querySelector('#query').value.trim();
  researchStatus.textContent = 'Checking nearby pharmacy sources...';
  try {
    const response = await fetch(`${apiUrl}/api/research/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, location: userLocation, radiusKm: 10 })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Pharmacy research failed.');
    renderResearch(body);
    setStatus('Nearby pharmacy research completed.');
  } catch (error) {
    researchStatus.textContent = error.message;
    setStatus('Pharmacy research failed.', 'error');
  }
}

async function findCoverage() {
  const items = selectedMedicineIds();
  await findCoverageForItems(items, 'Checking branch coverage...');
}

async function findCoverageForItems(items, loadingMessage) {
  if (items.length === 0) {
    setStatus('Select at least one medicine first.', 'error');
    return;
  }
  setStatus(loadingMessage);
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

function renderOcrReview(body) {
  ocrReview.replaceChildren();
  if (!body.requests.length) {
    ocrReview.innerHTML = '<p class="empty">No catalog medicines were extracted. Review the unmatched lines manually.</p>';
    confirmOcrButton.disabled = true;
    return;
  }
  ocrReview.innerHTML = `<p class="review-note">Review the extracted list before searching. Matching confidence is not prescription validation.</p>
    ${body.requests.map((request) => `<label class="ocr-item">
      <input type="checkbox" name="ocr-medicine" value="${request.medicineId}" checked>
      <span><strong>${request.name}</strong><small>${request.rawText} · ${(request.confidence * 100).toFixed(0)}% match · review required</small></span>
    </label>`).join('')}
    ${body.unmatchedLines.length ? `<p class="unmatched"><strong>Unmatched lines:</strong> ${body.unmatchedLines.join(' | ')}</p>` : ''}`;
  confirmOcrButton.disabled = false;
}

async function analyzeReceipt() {
  const file = receiptFileInput.files[0];
  let text = ocrTextInput.value.trim();
  let imageBase64 = null;
  let mimeType = 'text/plain';
  let filename = 'pasted-receipt.txt';
  if (file) {
    filename = file.name;
    mimeType = file.type || 'application/octet-stream';
    if (mimeType === 'text/plain' || mimeType === 'application/json' || file.name.endsWith('.txt') || file.name.endsWith('.json')) {
      text = await file.text();
    } else {
      imageBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(new Error('Could not read receipt image.'));
        reader.readAsDataURL(file);
      });
      text = 'Image receipt submitted for local OCR.';
    }
  }
  if (!text) {
    ocrStatus.textContent = 'Choose a text receipt or paste receipt text first.';
    return;
  }
  ocrStatus.textContent = 'Analyzing receipt...';
  try {
    const response = await fetch(`${apiUrl}/api/ocr/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, mimeType, text, imageBase64 })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Receipt analysis failed.');
    ocrStatus.textContent = `${body.analysisStatus}. Confirm the extracted medicines below.`;
    renderOcrReview(body);
  } catch (error) {
    ocrReview.replaceChildren();
    confirmOcrButton.disabled = true;
    ocrStatus.textContent = error.message;
  }
}

async function confirmOcrMedicines() {
  await findCoverageForItems(selectedOcrMedicineIds(), 'Searching for one branch with the confirmed medicines...');
}

searchForm.addEventListener('submit', search);
coverageButton.addEventListener('click', findCoverage);
analyzeButton.addEventListener('click', analyzeReceipt);
confirmOcrButton.addEventListener('click', confirmOcrMedicines);
locationButton.addEventListener('click', useLocation);
demoLocationButton.addEventListener('click', () => useManualLocation(30.038, 31.212, 'Demo location'));
latitudeInput.addEventListener('change', () => {
  if (latitudeInput.value && longitudeInput.value) {
    useManualLocation(latitudeInput.value, longitudeInput.value, 'Manual location');
  }
});
longitudeInput.addEventListener('change', () => {
  if (latitudeInput.value && longitudeInput.value) {
    useManualLocation(latitudeInput.value, longitudeInput.value, 'Manual location');
  }
});