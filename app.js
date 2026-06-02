const races = [
  { id: "monaco", round: "Round 6", name: "Monaco Grand Prix", circuit: "Circuit de Monaco", date: "05-07 Jun", country: "Monaco", status: "Open" },
  { id: "barcelona", round: "Round 7", name: "Barcelona-Catalunya Grand Prix", circuit: "Circuit de Barcelona-Catalunya", date: "12-14 Jun", country: "Spain", status: "Open" },
  { id: "austrian", round: "Round 8", name: "Austrian Grand Prix", circuit: "Red Bull Ring", date: "26-28 Jun", country: "Austria", status: "Opening soon" },
  { id: "british", round: "Round 9", name: "British Grand Prix", circuit: "Silverstone Circuit", date: "03-05 Jul", country: "Great Britain", status: "Opening soon" },
  { id: "belgian", round: "Round 10", name: "Belgian Grand Prix", circuit: "Circuit de Spa-Francorchamps", date: "17-19 Jul", country: "Belgium", status: "Scheduled" },
  { id: "hungarian", round: "Round 11", name: "Hungarian Grand Prix", circuit: "Hungaroring", date: "24-26 Jul", country: "Hungary", status: "Scheduled" },
];

const drivers = [
  { name: "George Russell", team: "Mercedes" },
  { name: "Kimi Antonelli", team: "Mercedes" },
  { name: "Charles Leclerc", team: "Ferrari" },
  { name: "Lewis Hamilton", team: "Ferrari" },
  { name: "Lando Norris", team: "McLaren" },
  { name: "Oscar Piastri", team: "McLaren" },
  { name: "Max Verstappen", team: "Red Bull Racing" },
  { name: "Isack Hadjar", team: "Red Bull Racing" },
  { name: "Pierre Gasly", team: "Alpine" },
  { name: "Franco Colapinto", team: "Alpine" },
  { name: "Liam Lawson", team: "Racing Bulls" },
  { name: "Arvid Lindblad", team: "Racing Bulls" },
  { name: "Esteban Ocon", team: "Haas" },
  { name: "Oliver Bearman", team: "Haas" },
  { name: "Carlos Sainz", team: "Williams" },
  { name: "Alexander Albon", team: "Williams" },
  { name: "Nico Hulkenberg", team: "Audi" },
  { name: "Gabriel Bortoleto", team: "Audi" },
  { name: "Sergio Perez", team: "Cadillac" },
  { name: "Valtteri Bottas", team: "Cadillac" },
  { name: "Fernando Alonso", team: "Aston Martin" },
  { name: "Lance Stroll", team: "Aston Martin" },
];

const weights = [
  { position: "P1", win: 100, lose: 40 },
  { position: "P2", win: 85, lose: 35 },
  { position: "P3", win: 72, lose: 30 },
  { position: "P4", win: 60, lose: 26 },
  { position: "P5", win: 50, lose: 22 },
  { position: "P6", win: 42, lose: 19 },
  { position: "P7", win: 35, lose: 16 },
  { position: "P8", win: 29, lose: 14 },
  { position: "P9", win: 24, lose: 12 },
  { position: "P10", win: 20, lose: 10 },
];

const walletPackages = [
  { id: "starter", points: 2500, usdAmount: 25 },
  { id: "pro", points: 10000, usdAmount: 100 },
  { id: "high-roller", points: 25000, usdAmount: 250 },
];

const tiers = [
  { id: "gotry", name: "GoTry", range: "10-99", min: 10, max: 99, fee: 0.1, cap: 2 },
  { id: "gowin", name: "GoWin", range: "100-999", min: 100, max: 999, fee: 0.15, cap: 5 },
  { id: "gobig", name: "GoBig", range: "1,000+", min: 1000, max: Infinity, fee: 0.2, cap: 10 },
];

const PROTECTED_ROUTES = new Set(["wallet"]);

let activeRaceId = races[0].id;
let predictions = Array(10).fill("");
let entryStep = "amount";
let toastTimer = null;
let authMode = "login";
let currentUser = null;
let resetToken = "";

const pages = document.querySelectorAll("[data-page]");
const routeLinks = document.querySelectorAll("[data-route-link]");
const authToggle = document.querySelector("#authToggle");
const accountOverview = document.querySelector("#accountOverview");
const accountAuthPanel = document.querySelector("#accountAuthPanel");
const accountPageName = document.querySelector("#accountPageName");
const accountPageEmail = document.querySelector("#accountPageEmail");
const accountPageStatus = document.querySelector("#accountPageStatus");
const accountOpenWallet = document.querySelector("#accountOpenWallet");
const accountLogout = document.querySelector("#accountLogout");
const dashboardRace = document.querySelector("#dashboardRace");
const dashboardRaceMeta = document.querySelector("#dashboardRaceMeta");
const dashboardBalance = document.querySelector("#dashboardBalance");
const raceList = document.querySelector("#raceList");
const selectedRound = document.querySelector("#selectedRound");
const selectedRaceTitle = document.querySelector("#selectedRaceTitle");
const selectedRaceMeta = document.querySelector("#selectedRaceMeta");
const selectedRaceStats = document.querySelector("#selectedRaceStats");
const entryRaceTitle = document.querySelector("#entryRaceTitle");
const entryInput = document.querySelector("#entryInput");
const tierName = document.querySelector("#tierName");
const tierStrip = document.querySelector("#tierStrip");
const rulesTiers = document.querySelector("#rulesTiers");
const predictionGrid = document.querySelector("#predictionGrid");
const entrySteps = document.querySelectorAll("[data-entry-step]");
const stepDots = document.querySelectorAll("[data-step-dot]");
const filledCount = document.querySelector("#filledCount");
const summaryRace = document.querySelector("#summaryRace");
const summaryTier = document.querySelector("#summaryTier");
const summaryStake = document.querySelector("#summaryStake");
const summaryFee = document.querySelector("#summaryFee");
const summaryReturn = document.querySelector("#summaryReturn");
const walletPageBalance = document.querySelector("#walletPageBalance");
const entriesList = document.querySelector("#entriesList");
const walletPackagesEl = document.querySelector("#walletPackages");
const paymentMethodsList = document.querySelector("#paymentMethodsList");
const walletTransactionsList = document.querySelector("#walletTransactionsList");
const paymentMethodForm = document.querySelector("#paymentMethodForm");
const cardholderName = document.querySelector("#cardholderName");
const cardBrand = document.querySelector("#cardBrand");
const cardLast4 = document.querySelector("#cardLast4");
const cardExpMonth = document.querySelector("#cardExpMonth");
const cardExpYear = document.querySelector("#cardExpYear");
const weightsEl = document.querySelector("#weights");
const toast = document.querySelector("#toast");
const showLogin = document.querySelector("#showLogin");
const showSignup = document.querySelector("#showSignup");
const showReset = document.querySelector("#showReset");
const authMessage = document.querySelector("#authMessage");
const loginForm = document.querySelector("#loginForm");
const signupForm = document.querySelector("#signupForm");
const resetRequestForm = document.querySelector("#resetRequestForm");
const resetConfirmForm = document.querySelector("#resetConfirmForm");
const loginEmail = document.querySelector("#loginEmail");
const loginPassword = document.querySelector("#loginPassword");
const signupName = document.querySelector("#signupName");
const signupEmail = document.querySelector("#signupEmail");
const signupPassword = document.querySelector("#signupPassword");
const resetEmail = document.querySelector("#resetEmail");
const resetPassword = document.querySelector("#resetPassword");
const triggerVerifyRequest = document.querySelector("#triggerVerifyRequest");
const backToLoginLink = document.querySelector("#backToLoginLink");

function format(value) {
  return Math.round(value).toLocaleString("en-US");
}

function activeRace() {
  return races.find((race) => race.id === activeRaceId) || races[0];
}

function entryAmount() {
  return Math.max(0, Number(entryInput.value) || 0);
}

function activeTier() {
  const amount = entryAmount();
  return tiers.find((tier) => amount >= tier.min && amount <= tier.max) || tiers[0];
}

function selectedDrivers() {
  return predictions.filter(Boolean);
}

function hasEntryForActiveRace() {
  const raceName = activeRace().name;
  return accountState().entries.some((entry) => entry.race === raceName);
}

function isLoggedIn() {
  return Boolean(currentUser);
}

function accountState() {
  return currentUser || { name: "Guest", email: "Sign in required", balance: 0, entries: [], paymentMethods: [], walletTransactions: [] };
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.error || "Request failed.");
    error.status = response.status;
    error.code = payload?.code || "";
    throw error;
  }

  return payload;
}

function showAuthMessage(message, previewUrl = "") {
  authMessage.hidden = false;
  authMessage.innerHTML = previewUrl
    ? `${message}<br><a href="${previewUrl}" target="_blank" rel="noopener noreferrer">Open development email link</a>`
    : message;
}

function clearAuthMessage() {
  authMessage.hidden = true;
  authMessage.textContent = "";
}

function goTo(route) {
  const requested = document.querySelector(`[data-page="${route}"]`) ? route : "dashboard";
  const safeRoute = !isLoggedIn() && PROTECTED_ROUTES.has(requested) ? "account" : requested;

  pages.forEach((page) => page.classList.toggle("is-active", page.dataset.page === safeRoute));
  routeLinks.forEach((link) => link.classList.toggle("is-active", link.dataset.routeLink === safeRoute));

  if (window.location.hash.replace("#", "") !== safeRoute) {
    history.pushState(null, "", `#${safeRoute}`);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setEntryStep(step) {
  entryStep = step;
  entrySteps.forEach((section) => section.classList.toggle("is-active", section.dataset.entryStep === step));
  stepDots.forEach((dot) => dot.classList.toggle("is-active", dot.dataset.stepDot === step));
}

function setAuthMode(mode) {
  authMode = mode;
  showLogin.classList.toggle("is-active", mode === "login");
  showSignup.classList.toggle("is-active", mode === "signup");
  showReset.classList.toggle("is-active", mode === "reset-request" || mode === "reset-confirm");
  loginForm.classList.toggle("is-active", mode === "login");
  signupForm.classList.toggle("is-active", mode === "signup");
  resetRequestForm.classList.toggle("is-active", mode === "reset-request");
  resetConfirmForm.classList.toggle("is-active", mode === "reset-confirm");
}

function renderAuthChrome() {
  authToggle.dataset.state = isLoggedIn() ? "signed-in" : "signed-out";
  authToggle.setAttribute("aria-label", isLoggedIn() ? "Open account" : "Open login");
  authToggle.title = isLoggedIn() ? "Account" : "Log in";
}

function renderAccountPage() {
  const state = accountState();
  const loggedIn = isLoggedIn();

  accountOverview.hidden = !loggedIn;
  accountPageName.textContent = state.name;
  accountPageEmail.textContent = state.email;
  accountPageStatus.textContent = loggedIn
    ? state.emailVerified
      ? "Verified"
      : "Unverified"
    : "Signed out";
}

function renderDashboard() {
  const race = activeRace();
  dashboardRace.textContent = race.name;
  dashboardRaceMeta.textContent = `${race.circuit} · ${race.date}`;
  dashboardBalance.textContent = `${format(accountState().balance)} points`;
}

function renderRaces() {
  raceList.innerHTML = races
    .map(
      (race) => `
        <article class="race-page-card ${race.id === activeRaceId ? "is-active" : ""}">
          <div>
            <p class="eyebrow">${race.round} · ${race.status}</p>
            <h2>${race.name}</h2>
            <p>${race.circuit} · ${race.country}</p>
          </div>
          <div class="race-card-footer">
            <strong>${race.date}</strong>
            <button class="secondary-button" type="button" data-open-race="${race.id}">Open</button>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderSelectedRace() {
  const race = activeRace();

  selectedRound.textContent = `${race.round} · ${race.status}`;
  selectedRaceTitle.textContent = race.name;
  selectedRaceMeta.textContent = `${race.circuit} · ${race.country} · ${race.date}`;
  selectedRaceStats.innerHTML = `
    <div><span>Market</span><strong>P1-P10 exact order</strong></div>
    <div><span>Minimum correct</span><strong>4 positions</strong></div>
    <div><span>Entry status</span><strong>${race.status}</strong></div>
  `;
}

function tierMarkup() {
  const active = activeTier();

  return tiers
    .map(
      (tier) => `
        <button class="tier-card ${tier.id === active.id ? "is-active" : ""}" type="button" data-tier="${tier.id}" aria-pressed="${tier.id === active.id}">
          <span>${tier.name}</span>
          <strong>${tier.range}</strong>
          <small>${Math.round(tier.fee * 100)}% fee · ${tier.cap}x cap</small>
        </button>
      `,
    )
    .join("");
}

function renderTiers() {
  const active = activeTier();

  tierName.textContent = active.name;
  tierStrip.innerHTML = tierMarkup();
  rulesTiers.innerHTML = tiers
    .map(
      (tier) => `
        <div class="tier-card static-tier">
          <span>${tier.name}</span>
          <strong>${tier.range}</strong>
          <small>${Math.round(tier.fee * 100)}% fee · ${tier.cap}x cap</small>
        </div>
      `,
    )
    .join("");
}

function renderPredictions() {
  const selected = selectedDrivers();
  const options = drivers
    .map((driver) => `<option value="${driver.name}">${driver.name} · ${driver.team}</option>`)
    .join("");

  predictionGrid.innerHTML = weights
    .map(
      (weight, index) => `
        <label class="position-row">
          <span class="position-rank">${weight.position}</span>
          <select data-position="${index}">
            <option value="">Select driver</option>
            ${options}
          </select>
          <small>+${weight.win} / -${weight.lose}</small>
        </label>
      `,
    )
    .join("");

  predictionGrid.querySelectorAll("select").forEach((select, index) => {
    select.value = predictions[index];
    Array.from(select.options).forEach((option) => {
      if (!option.value || option.value === select.value) return;
      option.disabled = selected.includes(option.value);
    });
  });
}

function renderWeights() {
  weightsEl.innerHTML = weights
    .map(
      (weight) => `
        <div>
          <span>${weight.position}</span>
          <strong>+${weight.win}</strong>
          <small>-${weight.lose}</small>
        </div>
      `,
    )
    .join("");
}

function renderSummary() {
  const race = activeRace();
  const amount = entryAmount();
  const tier = activeTier();
  const fee = amount * tier.fee;
  const selected = selectedDrivers().length;
  const state = accountState();

  entryRaceTitle.textContent = race.name;
  filledCount.textContent = `${selected}/10`;
  summaryRace.textContent = race.name;
  summaryTier.textContent = tier.name;
  summaryStake.textContent = format(amount);
  summaryFee.textContent = format(fee);
  summaryReturn.textContent = format(amount * tier.cap);
  walletPageBalance.textContent = `${format(state.balance)} points`;
}

function renderEntries() {
  const state = accountState();

  if (!state.entries.length) {
    entriesList.innerHTML = '<div class="empty-state">No reserved entries yet.</div>';
    return;
  }

  entriesList.innerHTML = state.entries
    .map(
      (entry) => `
        <article class="entry-card">
          <strong>${entry.race}</strong>
          <span>${entry.tier} · ${format(entry.amount)} points</span>
          <small>${new Date(entry.createdAt).toLocaleString()}</small>
        </article>
      `,
    )
    .join("");
}

function renderWalletPackages() {
  const state = accountState();
  const defaultMethod = state.paymentMethods.find((method) => method.isDefault);

  walletPackagesEl.innerHTML = walletPackages
    .map(
      (pkg) => `
        <article class="wallet-package-card">
          <span>$${format(pkg.usdAmount)}</span>
          <strong>${format(pkg.points)} points</strong>
          <small>${defaultMethod ? `Default: ${defaultMethod.brand} •••• ${defaultMethod.last4}` : "Add a payment method first"}</small>
          <button class="primary-button compact-action" type="button" data-buy-points="${pkg.id}" ${defaultMethod ? "" : "disabled"}>Buy Points</button>
        </article>
      `,
    )
    .join("");
}

function renderPaymentMethods() {
  const state = accountState();

  if (!state.paymentMethods.length) {
    paymentMethodsList.innerHTML = '<div class="empty-state">No payment methods yet.</div>';
    return;
  }

  paymentMethodsList.innerHTML = state.paymentMethods
    .map(
      (method) => `
        <article class="payment-method-card ${method.isDefault ? "is-default" : ""}">
          <div>
            <strong>${method.brand} •••• ${method.last4}</strong>
            <span>${method.cardholder} · ${String(method.expMonth).padStart(2, "0")}/${method.expYear}</span>
          </div>
          <div class="payment-method-actions">
            ${method.isDefault ? '<span class="quiet-pill">Default</span>' : `<button class="secondary-button compact-action" type="button" data-default-method="${method.id}">Make Default</button>`}
            <button class="secondary-button compact-action" type="button" data-remove-method="${method.id}">Remove</button>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderWalletTransactions() {
  const state = accountState();

  if (!state.walletTransactions.length) {
    walletTransactionsList.innerHTML = '<div class="empty-state">No wallet activity yet.</div>';
    return;
  }

  walletTransactionsList.innerHTML = state.walletTransactions
    .map(
      (tx) => `
        <article class="wallet-transaction-card">
          <div>
            <strong>${tx.description}</strong>
            <span>${tx.paymentMethod || tx.kind.replaceAll("_", " ")}</span>
          </div>
          <div class="wallet-transaction-meta">
            <strong class="${tx.pointsDelta >= 0 ? "is-positive" : "is-negative"}">${tx.pointsDelta >= 0 ? "+" : ""}${format(tx.pointsDelta)} pt</strong>
            <small>${tx.usdAmount ? `$${format(tx.usdAmount)}` : new Date(tx.createdAt).toLocaleString()}</small>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderAll() {
  renderAuthChrome();
  renderAccountPage();
  renderDashboard();
  renderRaces();
  renderSelectedRace();
  renderTiers();
  renderPredictions();
  renderWeights();
  renderSummary();
  renderEntries();
  renderWalletPackages();
  renderPaymentMethods();
  renderWalletTransactions();
  setEntryStep(entryStep);
  setAuthMode(authMode);
}

function setTierFromClick(tierId) {
  const tier = tiers.find((item) => item.id === tierId);
  if (!tier) return;
  entryInput.value = String(tier.min);
  renderTiers();
  renderSummary();
}

function resetEntryFlow() {
  predictions = Array(10).fill("");
  entryStep = "amount";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

async function syncSession() {
  try {
    const payload = await api("/api/auth/session", { method: "GET" });
    currentUser = payload.user;
    renderAll();
    return currentUser;
  } catch {
    currentUser = null;
    renderAll();
    return null;
  }
}

async function loginUser(email, password) {
  clearAuthMessage();
  try {
    const payload = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    });
    currentUser = payload.user;
    resetEntryFlow();
    renderAll();
    goTo("dashboard");
    showToast("Signed in.");
  } catch (error) {
    if (error.code === "EMAIL_NOT_VERIFIED") {
      showAuthMessage("This account is not verified yet. Use the verification button below to send a fresh email.");
    }
    showToast(error.message);
  }
}

async function signupUser(name, email, password) {
  clearAuthMessage();
  try {
    const payload = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        password,
      }),
    });
    setAuthMode("login");
    loginEmail.value = email.trim();
    showAuthMessage(payload.message, payload.devPreviewUrl || "");
    showToast("Account created.");
  } catch (error) {
    showToast(error.message);
  }
}

async function logoutUser() {
  try {
    await api("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
  } catch {
    // Keep local state cleanup even when logout request fails.
  }

  currentUser = null;
  resetEntryFlow();
  renderAll();
  goTo("account");
  showToast("Signed out.");
}

async function addPaymentMethod() {
  try {
    const payload = await api("/api/wallet/payment-methods", {
      method: "POST",
      body: JSON.stringify({
        cardholder: cardholderName.value.trim(),
        brand: cardBrand.value,
        last4: cardLast4.value.trim(),
        expMonth: Number(cardExpMonth.value),
        expYear: Number(cardExpYear.value),
      }),
    });
    currentUser = payload.user;
    paymentMethodForm.reset();
    renderAll();
    showToast("Payment method added.");
  } catch (error) {
    showToast(error.message);
  }
}

async function setDefaultPaymentMethod(methodId) {
  try {
    const payload = await api(`/api/wallet/payment-methods/${methodId}/default`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    currentUser = payload.user;
    renderAll();
    showToast("Default payment method updated.");
  } catch (error) {
    showToast(error.message);
  }
}

async function removePaymentMethod(methodId) {
  try {
    const payload = await api(`/api/wallet/payment-methods/${methodId}`, {
      method: "DELETE",
      body: JSON.stringify({}),
    });
    currentUser = payload.user;
    renderAll();
    showToast("Payment method removed.");
  } catch (error) {
    showToast(error.message);
  }
}

async function buyPoints(packageId) {
  const state = accountState();
  const pkg = walletPackages.find((item) => item.id === packageId);
  const defaultMethod = state.paymentMethods.find((method) => method.isDefault);

  if (!pkg || !defaultMethod) {
    showToast("Add a default payment method first.");
    return;
  }

  try {
    const payload = await api("/api/wallet/top-up", {
      method: "POST",
      body: JSON.stringify({
        points: pkg.points,
        usdAmount: pkg.usdAmount,
        paymentMethodId: defaultMethod.id,
      }),
    });
    currentUser = payload.user;
    renderAll();
    showToast(`${format(pkg.points)} points added.`);
  } catch (error) {
    showToast(error.message);
  }
}

async function requestVerification(email) {
  clearAuthMessage();
  try {
    const payload = await api("/api/auth/verify-email/request", {
      method: "POST",
      body: JSON.stringify({ email: email.trim() }),
    });
    showAuthMessage(payload.message, payload.devPreviewUrl || "");
    showToast("Verification request sent.");
  } catch (error) {
    showToast(error.message);
  }
}

async function requestPasswordReset(email) {
  clearAuthMessage();
  try {
    const payload = await api("/api/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email: email.trim() }),
    });
    showAuthMessage(payload.message, payload.devPreviewUrl || "");
    showToast("Password reset request sent.");
  } catch (error) {
    showToast(error.message);
  }
}

async function confirmPasswordReset(password) {
  clearAuthMessage();
  try {
    const payload = await api("/api/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify({
        token: resetToken,
        password,
      }),
    });
    resetToken = "";
    setAuthMode("login");
    showAuthMessage(payload.message);
    showToast("Password updated.");
    const url = new URL(window.location.href);
    url.searchParams.delete("reset");
    history.replaceState(null, "", `${url.pathname}${url.search}#account`);
  } catch (error) {
    showToast(error.message);
  }
}

async function handleAuthActionsFromUrl() {
  const url = new URL(window.location.href);
  const verifyToken = url.searchParams.get("verify");
  const reset = url.searchParams.get("reset");

  if (verifyToken) {
    try {
      const payload = await api("/api/auth/verify-email/confirm", {
        method: "POST",
        body: JSON.stringify({ token: verifyToken }),
      });
      currentUser = payload.user;
      renderAll();
      url.searchParams.delete("verify");
      history.replaceState(null, "", `${url.pathname}${url.search}#dashboard`);
      goTo("dashboard");
      showToast("Email verified.");
      return;
    } catch (error) {
      setAuthMode("login");
      showAuthMessage(error.message);
      showToast(error.message);
      url.searchParams.delete("verify");
      history.replaceState(null, "", `${url.pathname}${url.search}#account`);
    }
  }

  if (reset) {
    resetToken = reset;
    setAuthMode("reset-confirm");
    showAuthMessage("Set your new password below to finish the reset.");
    goTo("account");
  }
}

document.addEventListener("click", (event) => {
  const goButton = event.target.closest("[data-go]");
  if (goButton) {
    if (goButton.dataset.go === "entry") setEntryStep("amount");
    goTo(goButton.dataset.go);
    return;
  }

  const raceButton = event.target.closest("[data-open-race]");
  if (raceButton) {
    activeRaceId = raceButton.dataset.openRace;
    renderAll();
    goTo("race-detail");
    return;
  }

  const tierButton = event.target.closest("[data-tier]");
  if (tierButton) {
    setTierFromClick(tierButton.dataset.tier);
    return;
  }

  const buyButton = event.target.closest("[data-buy-points]");
  if (buyButton) {
    buyPoints(buyButton.dataset.buyPoints);
    return;
  }

  const defaultMethodButton = event.target.closest("[data-default-method]");
  if (defaultMethodButton) {
    setDefaultPaymentMethod(defaultMethodButton.dataset.defaultMethod);
    return;
  }

  const removeMethodButton = event.target.closest("[data-remove-method]");
  if (removeMethodButton) {
    removePaymentMethod(removeMethodButton.dataset.removeMethod);
  }
});

window.addEventListener("hashchange", () => {
  goTo(window.location.hash.replace("#", "") || "dashboard");
});

showLogin.addEventListener("click", () => {
  clearAuthMessage();
  setAuthMode("login");
});

showSignup.addEventListener("click", () => {
  clearAuthMessage();
  setAuthMode("signup");
});

showReset.addEventListener("click", () => {
  clearAuthMessage();
  setAuthMode("reset-request");
});

triggerVerifyRequest.addEventListener("click", async () => {
  await requestVerification(loginEmail.value);
});

backToLoginLink.addEventListener("click", () => {
  clearAuthMessage();
  setAuthMode("login");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await loginUser(loginEmail.value, loginPassword.value);
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await signupUser(signupName.value, signupEmail.value, signupPassword.value);
});

resetRequestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await requestPasswordReset(resetEmail.value);
});

resetConfirmForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await confirmPasswordReset(resetPassword.value);
});

paymentMethodForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await addPaymentMethod();
});

authToggle.addEventListener("click", async () => {
  goTo("account");
});

accountOpenWallet.addEventListener("click", () => {
  goTo("wallet");
});

accountLogout.addEventListener("click", async () => {
  await logoutUser();
});

entryInput.addEventListener("input", () => {
  renderTiers();
  renderSummary();
});

predictionGrid.addEventListener("change", (event) => {
  const select = event.target.closest("select[data-position]");
  if (!select) return;
  predictions[Number(select.dataset.position)] = select.value;
  renderPredictions();
  renderSummary();
});

document.querySelector("#clearBoard").addEventListener("click", () => {
  predictions = Array(10).fill("");
  renderPredictions();
  renderSummary();
});

document.querySelector("#continueToPrediction").addEventListener("click", () => {
  const amount = entryAmount();
  const state = accountState();

  if (hasEntryForActiveRace()) {
    showToast("Only one entry is allowed for this race.");
    return;
  }

  if (amount < 10) {
    showToast("Minimum entry is 10 points.");
    return;
  }

  if (amount > state.balance) {
    showToast("Not enough demo points in the account.");
    return;
  }

  setEntryStep("prediction");
});

document.querySelector("#backToAmount").addEventListener("click", () => {
  setEntryStep("amount");
});

document.querySelector("#continueToReview").addEventListener("click", () => {
  if (selectedDrivers().length < 10) {
    showToast("Complete all P1-P10 positions before review.");
    return;
  }

  renderSummary();
  setEntryStep("review");
});

document.querySelector("#backToPrediction").addEventListener("click", () => {
  setEntryStep("prediction");
});

document.querySelector("#reserveEntry").addEventListener("click", async () => {
  const amount = entryAmount();
  const tier = activeTier();

  if (!currentUser) {
    showToast("Log in before reserving an entry.");
    goTo("account");
    return;
  }

  if (hasEntryForActiveRace()) {
    showToast("Only one entry is allowed for this race.");
    goTo("wallet");
    return;
  }

  if (amount < 10) {
    showToast("Minimum entry is 10 points.");
    return;
  }

  if (selectedDrivers().length < 10) {
    showToast("Complete all P1-P10 positions before reserving.");
    return;
  }

  try {
    const payload = await api("/api/entries", {
      method: "POST",
      body: JSON.stringify({
        race: activeRace().name,
        tier: tier.name,
        amount,
        predictions,
      }),
    });
    currentUser = payload.user;
    resetEntryFlow();
    renderAll();
    showToast("Entry reserved.");
    goTo("wallet");
  } catch (error) {
    if (error.status === 401) {
      currentUser = null;
      renderAll();
      goTo("account");
    }
    showToast(error.message);
  }
});

document.querySelector("#resetDemo").addEventListener("click", async () => {
  if (!currentUser) {
    goTo("account");
    return;
  }

  try {
    const payload = await api("/api/wallet/reset", {
      method: "POST",
      body: JSON.stringify({}),
    });
    currentUser = payload.user;
    resetEntryFlow();
    renderAll();
    showToast("Wallet reset.");
  } catch (error) {
    if (error.status === 401) {
      currentUser = null;
      renderAll();
      goTo("account");
    }
    showToast(error.message);
  }
});

renderAll();
await syncSession();
await handleAuthActionsFromUrl();
goTo(window.location.hash.replace("#", "") || "dashboard");
