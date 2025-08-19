// --- Helpers ---
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const UI = {
  length: $('#length'),
  lengthVal: $('#lengthVal'),
  count: $('#count'),
  countVal: $('#countVal'),
  lower: $('#lower'),
  upper: $('#upper'),
  digits: $('#digits'),
  symbols: $('#symbols'),
  noAmbiguous: $('#noAmbiguous'),
  ensureAllSets: $('#ensureAllSets'),
  generateBtn: $('#generateBtn'),
  copyAllBtn: $('#copyAllBtn'),
  status: $('#status'),
  grid: $('#grid'),
  empty: $('#emptyState'),
  strength: $('#strengthHint'),
  tpl: $('#pwCardTpl')
};

const CHARS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?/~'
};

const AMBIGUOUS = new Set(['0','O','o','1','l','I']);

const getRandomInt = (maxExclusive) => {
  const arr = new Uint32Array(1);
  window.crypto.getRandomValues(arr);
  return arr[0] % maxExclusive;
};

const pick = (str) => str[getRandomInt(str.length)];

function buildPool(opts) {
  let pool = '';
  if (opts.lower) pool += CHARS.lower;
  if (opts.upper) pool += CHARS.upper;
  if (opts.digits) pool += CHARS.digits;
  if (opts.symbols) pool += CHARS.symbols;
  if (opts.noAmbiguous) {
    pool = [...pool].filter(c => !AMBIGUOUS.has(c)).join('');
  }
  return pool;
}

function ensureAtLeastOneOfEach(selectedSets, pool, length) {
  const chars = [];
  selectedSets.forEach(set => {
    const source = set === 'lower' ? CHARS.lower
                 : set === 'upper' ? CHARS.upper
                 : set === 'digits' ? CHARS.digits
                 : CHARS.symbols;
    const filtered = $('#noAmbiguous').checked
      ? [...source].filter(c => !AMBIGUOUS.has(c)).join('')
      : source;
    chars.push(pick(filtered));
  });
  while (chars.length < length) chars.push(pick(pool));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function estimateStrength(len, setsCount) {
  const perChar = setsCount >= 4 ? 6.5 : setsCount === 3 ? 6 : setsCount === 2 ? 5 : 4.7;
  const bits = Math.round(len * perChar);
  if (bits >= 90) return `Sehr stark (~${bits} Bits)`;
  if (bits >= 70) return `Stark (~${bits} Bits)`;
  if (bits >= 50) return `Okay (~${bits} Bits)`;
  return `Schwach (< ${Math.max(40, bits)} Bits)`;
}

function renderPasswords(list) {
  UI.grid.innerHTML = '';
  list.forEach(pw => {
    const node = UI.tpl.content.cloneNode(true);
    const pwEl = $('.pw', node);
    const copyBtn = $('.copy', node);
    pwEl.textContent = pw;
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pw);
        toast('Kopiert ✅');
      } catch {
        toast('Kopieren fehlgeschlagen 🙃');
      }
    });
    UI.grid.appendChild(node);
  });
  UI.empty.classList.toggle('hidden', list.length > 0);
}

function toast(msg) {
  UI.status.textContent = msg;
  setTimeout(() => UI.status.textContent = '', 1800);
}

const syncLabels = () => {
  UI.lengthVal.textContent = UI.length.value;
  UI.countVal.textContent = UI.count.value;
  const sets = ['lower','upper','digits','symbols'].filter(k => UI[k].checked).length;
  UI.strength.textContent = estimateStrength(parseInt(UI.length.value,10), sets);
};

UI.length.addEventListener('input', syncLabels);
UI.count.addEventListener('input', syncLabels);
['lower','upper','digits','symbols','noAmbiguous','ensureAllSets']
  .forEach(id => UI[id].addEventListener('change', syncLabels));
syncLabels();

async function generate() {
  const length = parseInt(UI.length.value, 10);
  const count = parseInt(UI.count.value, 10);
  const opts = {
    lower: UI.lower.checked,
    upper: UI.upper.checked,
    digits: UI.digits.checked,
    symbols: UI.symbols.checked,
    noAmbiguous: UI.noAmbiguous.checked,
    ensureAllSets: UI.ensureAllSets.checked,
  };

  const selectedSets = Object.entries(opts)
    .filter(([k,v]) => v && ['lower','upper','digits','symbols'].includes(k))
    .map(([k]) => k);
  if (selectedSets.length === 0) {
    toast('Bro… wähl wenigstens eine Zeichenart aus.');
    return;
  }

  const pool = buildPool(opts);
  if (!pool.length) {
    toast('Mit den aktuellen Optionen bleibt nichts übrig 🤡');
    return;
  }

  UI.generateBtn.disabled = true;
  UI.copyAllBtn.disabled = true;

  const artificial = Math.min(3000, 8 * count + 2 * length);
  UI.status.textContent = 'Generiere…';

  const out = [];
  for (let i = 0; i < count; i++) {
    if (opts.ensureAllSets && selectedSets.length <= length) {
      out.push(ensureAtLeastOneOfEach(selectedSets, pool, length));
    } else {
      let pw = '';
      for (let j = 0; j < length; j++) pw += pick(pool);
      out.push(pw);
    }
  }

  await new Promise(res => setTimeout(res, artificial));
  renderPasswords(out);

  UI.generateBtn.disabled = false;
  UI.copyAllBtn.disabled = false;
  UI.status.textContent = `Fertig in ~${artificial} ms`;
}

UI.generateBtn.addEventListener('click', generate);

UI.copyAllBtn.addEventListener('click', async () => {
  const texts = $$('.pw').map(el => el.textContent);
  if (!texts.length) {
    toast('Brudi… da ist nix zum Kopieren. Erst generieren.');
    return;
  }
  try {
    await navigator.clipboard.writeText(texts.join('\\n'));
    toast('Alle kopiert ✅');
  } catch {
    toast('Kopieren gescheitert 😪');
  }
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') generate();
});
