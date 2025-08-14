// ===== تبديل الرؤية بين الدردشة والترجمة =====
const chatApp = document.getElementById('chatApp');
const translatorApp = document.getElementById('translatorApp');
document.getElementById('tabChat').onclick = () => { chatApp.hidden = false; translatorApp.hidden = true; };
document.getElementById('tabTranslate').onclick = () => { chatApp.hidden = true; translatorApp.hidden = false; };

// ===== عناصر الترجمة =====
const sourceEl  = document.getElementById('czSource');
const targetEl  = document.getElementById('czTarget');
const providerEl = document.getElementById('czProvider');
const chapterEl  = document.getElementById('czChapterName');

// ===== استدعاء API للخادم (باستخدام التوكن المخزّن من تسجيل الدخول) =====
const API_BASE = window.API_BASE_URL || ''; // إن كنت تضبطها في script.js اتركها فارغة هنا
function getToken() { return localStorage.getItem('token'); }
async function api(path, bodyObj) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
    },
    body: JSON.stringify(bodyObj || {})
  });
  return res.json();
}

// ===== زر "ترجمة" =====
document.getElementById('czTranslateBtn').onclick = async () => {
  const source = (sourceEl.value || '').trim();
  if (!source) return alert('اكتب النص الإنجليزي أولًا.');
  if (!getToken()) return alert('سجّل الدخول أولًا.');

  // المسرد: نحفظه محليًا ببساطة (يمكن نقله للخادم لاحقًا)
  const g = JSON.parse(localStorage.getItem('chatZeus_glossary') || '{"manual_terms":[],"extracted_terms":[]}');
  const glossary = [...(g.manual_terms || []), ...(g.extracted_terms || [])];

  const res = await api('/api/translate', {
    provider: providerEl.value || 'gemini',
    source,
    chapterName: chapterEl.value || '',
    glossary
  });

  if (res?.translation) targetEl.value = res.translation;
  else alert('تعذّرت الترجمة، حاول مجددًا.');
};

// ===== حفظ فصل محليًا =====
document.getElementById('czSaveChapterBtn').onclick = () => {
  const chapters = JSON.parse(localStorage.getItem('chatZeus_chapters') || '[]');
  chapters.unshift({
    name: chapterEl.value || 'فصل بلا اسم',
    en: sourceEl.value || '',
    ar: targetEl.value || '',
    ts: Date.now()
  });
  localStorage.setItem('chatZeus_chapters', JSON.stringify(chapters));
  alert('تم الحفظ محليًا.');
};

// ===== المسرد: إضافة/عرض بسيطة =====
document.getElementById('czAddTermBtn').onclick = () => {
  const en = (document.getElementById('czTermEn').value || '').trim();
  const ar = (document.getElementById('czTermAr').value || '').trim();
  if (!en || !ar) return alert('أدخل المصطلح باللغتين.');
  const g = JSON.parse(localStorage.getItem('chatZeus_glossary') || '{"manual_terms":[],"extracted_terms":[]}');
  g.manual_terms = [{ en, ar }, ...(g.manual_terms || [])];
  localStorage.setItem('chatZeus_glossary', JSON.stringify(g));
  renderGlossary();
};

function renderGlossary() {
  const g = JSON.parse(localStorage.getItem('chatZeus_glossary') || '{"manual_terms":[],"extracted_terms":[]}');
  const rows = [...(g.manual_terms||[]), ...(g.extracted_terms||[])]
    .map(t => `<tr><td>${t.en}</td><td>${t.ar}</td></tr>`).join('');
  document.getElementById('czGlossaryTable').innerHTML =
    `<tr><th>EN</th><th>AR</th></tr>${rows || ''}`;
}
renderGlossary();
