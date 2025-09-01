// app.js
'use strict';

/* Small helpers */
const $ = (sel, root = document) => (root || document).querySelector(sel);
const $$ = (sel, root = document) => [...(root || document).querySelectorAll(sel)];

/* -------------------------
   UI / Data rendering funcs
   -------------------------*/

function generateUserList(users) {
  const userList = document.querySelector('.user-list');
  if (!userList) return console.warn('generateUserList: .user-list not found');
  userList.innerHTML = ''; // clear before render

  users.forEach(({ user, id }) => {
    const li = document.createElement('li');
    li.className = 'user-item';
    li.dataset.id = id;
    li.textContent = `${user.lastname}, ${user.firstname}`;
    userList.appendChild(li);
  });
}

function populateForm(data) {
  if (!data) return;
  const { user, id } = data;
  const setVal = (sel, val) => {
    const el = $(sel);
    if (el) el.value = val ?? '';
  };
  setVal('#userID', id);
  setVal('#firstname', user.firstname);
  setVal('#lastname', user.lastname);
  setVal('#address', user.address);
  setVal('#city', user.city);
  setVal('#email', user.email);
}

function renderPortfolio(user, stocks) {
  const portfolioWrap = document.querySelector('.portfolio-list');
  if (!portfolioWrap) return console.warn('renderPortfolio: .portfolio-list not found');
  portfolioWrap.innerHTML = '';

  const portfolio = user.portfolio || [];
  portfolio.forEach(({ symbol, owned }) => {
    const row = document.createElement('div');
    row.className = 'portfolio-row';

    const symbolEl = document.createElement('p');
    symbolEl.className = 'portfolio-symbol';
    symbolEl.textContent = symbol;

    const sharesEl = document.createElement('p');
    sharesEl.className = 'portfolio-shares';
    sharesEl.textContent = owned;

    const viewBtn = document.createElement('button');
    viewBtn.className = 'view-stock';
    viewBtn.dataset.symbol = symbol;
    viewBtn.textContent = 'View';

    row.append(symbolEl, sharesEl, viewBtn);
    portfolioWrap.appendChild(row);
  });
}

function viewStock(symbol, stocks) {
  if (!symbol) return;
  const stockArea = document.querySelector('.stock-form');
  if (!stockArea) return console.warn('viewStock: .stock-form not found');

  const stock = (stocks || []).find(s => s.symbol == symbol);
  if (!stock) {
    stockArea.textContent = 'Stock not found';
    return;
  }

  // Safely set fields if they exist
  const setText = (sel, txt) => {
    const el = $(sel);
    if (el) el.textContent = txt ?? '';
  };
  setText('#stockName', stock.name ?? stock.company ?? stock.symbol);
  setText('#stockSector', stock.sector ?? '');
  setText('#stockIndustry', stock.subIndustry ?? stock.industry ?? '');
  setText('#stockAddress', stock.address ?? '');

  const logo = $('#logo');
  if (logo) {
    // logos/<SYMBOL>.svg is expected in the repo; if not, this is harmless
    logo.src = `logos/${symbol}.svg`;
    logo.alt = `${symbol} logo`;
  }
}

/* -------------------------
   Data modification funcs
   -------------------------*/

function saveUser(users, stocks) {
  const id = $('#userID')?.value;
  if (!id) return console.warn('saveUser: no user selected');

  const u = users.find(x => String(x.id) === String(id));
  if (!u) return console.warn('saveUser: user not found');

  // update fields
  u.user.firstname = $('#firstname')?.value ?? u.user.firstname;
  u.user.lastname = $('#lastname')?.value ?? u.user.lastname;
  u.user.address = $('#address')?.value ?? u.user.address;
  u.user.city = $('#city')?.value ?? u.user.city;
  u.user.email = $('#email')?.value ?? u.user.email;

  // re-render list and keep active state
  generateUserList(users);
  const li = document.querySelector(`.user-item[data-id="${id}"]`);
  if (li) {
    $$('.user-list .active').forEach(n => n.classList.remove('active'));
    li.classList.add('active');
  }
}

function deleteUser(users, stocks) {
  const id = $('#userID')?.value;
  if (!id) return console.warn('deleteUser: no user selected');

  const idx = users.findIndex(x => String(x.id) === String(id));
  if (idx === -1) return console.warn('deleteUser: user not found');

  users.splice(idx, 1);

  // clear selection + portfolio + stock display
  const form = $('#user-form') || document.querySelector('form');
  if (form) form.reset();
  const portfolioWrap = document.querySelector('.portfolio-list');
  if (portfolioWrap) portfolioWrap.innerHTML = '';
  const stockArea = document.querySelector('.stock-form');
  if (stockArea) stockArea.innerHTML = '';

  generateUserList(users);
}

/* -------------------------
   Boot / wiring
   -------------------------*/

document.addEventListener('DOMContentLoaded', () => {
  // parse the JSON strings included by the repo's data/*.js script tags
  let stocksData = [];
  let userData = [];
  try {
    stocksData = typeof stockContent !== 'undefined' ? JSON.parse(stockContent) : [];
  } catch (err) {
    console.error('Failed to parse stockContent. Is data/stocks-complete.js included correctly?', err);
  }
  try {
    userData = typeof userContent !== 'undefined' ? JSON.parse(userContent) : [];
  } catch (err) {
    console.error('Failed to parse userContent. Is data/users.js included correctly?', err);
  }

  // initial render
  generateUserList(userData);

  // -------- event delegation: user list clicks --------
  const userListEl = document.querySelector('.user-list');
  if (userListEl) {
    userListEl.addEventListener('click', (e) => {
      const li = e.target.closest('li.user-item');
      if (!li) return;
      const id = li.dataset.id;

      // active styling
      $$('.user-list .active').forEach(n => n.classList.remove('active'));
      li.classList.add('active');

      const user = userData.find(u => String(u.id) === String(id));
      if (!user) return;
      populateForm(user);
      renderPortfolio(user, stocksData);
    });
  }

  // -------- event delegation: portfolio view buttons --------
  const portfolioWrap = document.querySelector('.portfolio-list');
  if (portfolioWrap) {
    portfolioWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-symbol]');
      if (!btn) return;
      const symbol = btn.dataset.symbol;
      viewStock(symbol, stocksData);
    });
  }

  // -------- save & delete wiring (attempt multiple fallbacks for IDs) --------
  const saveBtn = document.querySelector('#saveButton, #save, button[type="submit"], [data-action="save-user"]');
  const deleteBtn = document.querySelector('#deleteButton, #deleteUser, #delete, [data-action="delete-user"]');

  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      saveUser(userData, stocksData);
    });
  } else {
    // if there's no explicit save button, listen for form submit
    const form = document.querySelector('#user-form') || document.querySelector('form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveUser(userData, stocksData);
      });
    }
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      deleteUser(userData, stocksData);
    });
  }

  // helpful dev info
  console.info('Dashboard initialized. Users:', userData.length, 'Stocks:', stocksData.length);
});