// ✨ الرابط الأساسي والثابت للخادم الخلفي على Railway
const API_BASE_URL = 'https://chatzeus-production.up.railway.app';

// ===============================================
// المتغيرات العامة
// ===============================================
let currentUser = null;
let currentChatId = null;
let chats = {};

// ✨ 1. الإعدادات الافتراضية الثابتة (لا تتغير أبدًا) ✨
const defaultSettings = {
  provider: 'gemini',
  model: 'gemini-1.5-flash',
  temperature: 0.7,
  geminiApiKeys: [],
  openrouterApiKeys: [],
  customProviders: [],
  customModels: [],
  customPrompt: '',
  apiKeyRetryStrategy: 'sequential',
  fontSize: 18,
  theme: 'theme-black',  

// 🚩 وضع التطبيق
  activeMode: 'chat', // 'chat' | 'team'
  // ⚙️ إعدادات وضع الفريق (عام، ليس للبرمجة فقط)
  team: {
    coordinator: { provider: 'gemini', model: 'gemini-1.5-pro', name: 'الوكيل' },
    members: [],
    turnStyle: 'sequential' // 'sequential' | 'parallel' (لاحقًا)
  },

  // 🔎 إعدادات التصفح الجديدة
  enableWebBrowsing: true,
  browsingMode: 'gemini',      // 'gemini' | 'proxy'
  showSources: true,
  dynamicThreshold: 0.3        // 0..1 — كلما زادت كان النموذج أقل ميلاً للبحث
};

// ✨ 2. الإعدادات الحالية التي ستتغير (تبدأ كنسخة من الافتراضية) ✨
let settings = { ...defaultSettings };

// Provider configurations
const providers = {
    gemini: {
        name: 'Google Gemini',
        models: [
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
            { id: 'gemini-pro', name: 'Gemini Pro' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }
        ]
    },
    openrouter: {
        name: 'OpenRouter',
        models: [
            { id: 'google/gemma-2-9b-it:free', name: 'Google: Gemma 2 9B (مجاني)' },
            { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek: R1 (مجاني)' },
            { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen: Qwen3 Coder (مجاني)' },
            { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Meta: Llama 3.2 3B (مجاني)' },
            { id: 'microsoft/phi-3-mini-128k-instruct:free', name: 'Microsoft: Phi-3 Mini (مجاني)' },
            { id: 'huggingfaceh4/zephyr-7b-beta:free', name: 'Hugging Face: Zephyr 7B (مجاني)' }
        ]
    },
    // ✨✨ الإضافة المطلوبة: Puter.js كمزود رئيسي ✨✨
    puter: {
        name: 'Puter.js (Serverless)',
        models: [
            { id: 'gpt-5-nano', name: 'GPT-5 Nano' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
            { id: 'o1-mini', name: 'Opus 1 Mini (o1-mini)' },
            { id: 'dall-e-3', name: 'DALL-E 3 (Image Gen)' },
            { id: 'gpt-5', name: 'GPT-5' },
            { id: 'gpt-4o', name: 'GPT-4o' },
        ]
    }
    // سيتم إضافة المزودين المخصصين ديناميكياً كما هو معمول به حاليًا
};


// File type detection and icons system
const fileTypeConfig = {
    // Programming files
    js: { icon: 'fab fa-js-square', color: 'file-icon-js', type: 'كود JavaScript' },
    html: { icon: 'fab fa-html5', color: 'file-icon-html', type: 'ملف HTML' },
    css: { icon: 'fab fa-css3-alt', color: 'file-icon-css', type: 'ملف CSS' },
    php: { icon: 'fab fa-php', color: 'file-icon-php', type: 'كود PHP' },
    py: { icon: 'fab fa-python', color: 'file-icon-python', type: 'كود Python' },
    java: { icon: 'fab fa-java', color: 'file-icon-java', type: 'كود Java' },
    cpp: { icon: 'fas fa-code', color: 'file-icon-cpp', type: 'كود C++' },
    c: { icon: 'fas fa-code', color: 'file-icon-cpp', type: 'كود C' },
    cs: { icon: 'fas fa-code', color: 'file-icon-csharp', type: 'كود C#' },
    rb: { icon: 'fas fa-gem', color: 'file-icon-ruby', type: 'كود Ruby' },

    // Data files
    json: { icon: 'fas fa-brackets-curly', color: 'file-icon-json', type: 'ملف JSON' },
    xml: { icon: 'fas fa-code', color: 'file-icon-xml', type: 'ملف XML' },
    csv: { icon: 'fas fa-table', color: 'file-icon-csv', type: 'ملف CSV' },
    yaml: { icon: 'fas fa-file-code', color: 'file-icon-yaml', type: 'ملف YAML' },
    yml: { icon: 'fas fa-file-code', color: 'file-icon-yaml', type: 'ملف YAML' },
    sql: { icon: 'fas fa-database', color: 'file-icon-sql', type: 'ملف SQL' },

    // Text files
    txt: { icon: 'fas fa-file-alt', color: 'file-icon-txt', type: 'ملف نصي' },
    md: { icon: 'fab fa-markdown', color: 'file-icon-md', type: 'ملف Markdown' },
    log: { icon: 'fas fa-file-medical-alt', color: 'file-icon-log', type: 'ملف سجل' },
    readme: { icon: 'fas fa-info-circle', color: 'file-icon-md', type: 'ملف تعليمات' },

    // Config files
    env: { icon: 'fas fa-cog', color: 'file-icon-config', type: 'ملف تكوين' },
    config: { icon: 'fas fa-cog', color: 'file-icon-config', type: 'ملف تكوين' },
    ini: { icon: 'fas fa-cog', color: 'file-icon-config', type: 'ملف تكوين' },
    gitignore: { icon: 'fab fa-git-alt', color: 'file-icon-config', type: 'ملف Git' }
};

// Streaming state management
let streamingState = {
    isStreaming: false,
    currentMessageId: null,
    streamController: null,
    currentText: '',
    streamingElement: null,
    lightningElement: null,
    hasStartedTyping: false
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // ✨ معالجة التوكن عند العودة من صفحة جوجل ✨
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
        console.log("Token found in URL, saving to localStorage.");
        localStorage.setItem('authToken', token);
        // تنظيف الرابط من التوكن لأسباب أمنية
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    initializeTheme();
    updateCustomProviders(); // تحديث المزودين المخصصين
    updateSendButton();
    initializeEventListeners();
    displayChatHistory();
    updateProviderUI();

    if (currentChatId && chats[currentChatId]) {
  document.getElementById('welcomeScreen').classList.add('hidden');
  document.getElementById('messagesContainer').classList.remove('hidden');
  displayMessages();

  // ✅ بعد رسم التاريخ: طبّق تحويل "المصادر" دائماً حتى لو تحميل chat_stream.js تأخر
  (function waitAndUpgradeSources() {
    const applyUpgrade = () => {
      try {
        // الدالة ستُعرَّف في chat_stream.js
        window.upgradeSourcesInHistory && window.upgradeSourcesInHistory();
      } catch (_) {}

      // راقب تغيّرات منطقة الرسائل بعمق كي لا يرجع الأسلوب البدائي أبداً
      const area = document.getElementById('messagesArea');
      if (area && !area.__sourcesObserver) {
        const obs = new MutationObserver(() => {
          // لا نتدخل أثناء البث الحيّ
          if (window.streamingState && streamingState.isStreaming) return;
          try { window.upgradeSourcesInHistory && window.upgradeSourcesInHistory(); } catch (_) {}
        });
        // 👈 مراقبة شاملة داخل الشجرة أيضاً
        obs.observe(area, { childList: true, subtree: true });
        area.__sourcesObserver = obs;
      }
    };

    // إن كانت الدالة جاهزة الآن، طبّق فوراً بعد render
    if (typeof window.upgradeSourcesInHistory === 'function') {
      setTimeout(applyUpgrade, 0);
      return;
    }

    // غير جاهزة؟ انتظر حتى يُحمَّل chat_stream.js ثم طبّق مرة واحدة
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (typeof window.upgradeSourcesInHistory === 'function') {
        clearInterval(timer);
        setTimeout(applyUpgrade, 0);
      } else if (tries > 50) { // ~5 ثوانٍ مهلة أمان
        clearInterval(timer);
      }
    }, 100);
  })();
}

// ✨ التحقق من حالة المستخدم ✨
checkUserStatus();
// ===== ثبات الشاشة على iOS عند فتح الكيبورد =====
try {
  const root = document.documentElement;
  const mainShell = document.querySelector('main') || document.body;
  function applyViewportFix() {
    if (window.visualViewport) {
      const vh = window.visualViewport.height;
      root.style.setProperty('--vhpx', `${vh}px`);
      // إن أردت استخدامه في CSS: height: var(--vhpx);
    }
  }
  applyViewportFix();
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', applyViewportFix);
    window.visualViewport.addEventListener('scroll', applyViewportFix);
  }

const input = document.getElementById('messageInput');
const area  = document.getElementById('messagesArea');

function scrollToBottom(force = false) {
  if (!area) return;
  const nearBottom = (area.scrollHeight - area.scrollTop - area.clientHeight) < 60;
  if (force || nearBottom) {
    area.scrollTop = area.scrollHeight;
  }
}

if (input && area) {
  // عند التركيز: انزل لآخر الرسائل، وثبّت الشاشة (لا تُحرّك window)
  input.addEventListener('focus', () => {
    setTimeout(() => scrollToBottom(true), 50);
  });

  // أثناء الكتابة أو تمدد الـ textarea
  input.addEventListener('input', () => {
    // إعادة ضبط ارتفاع الـ textarea لديك موجودة؛ بعدها ننزل لأسفل
    setTimeout(() => scrollToBottom(), 0);
  });
}

// تحدّث ارتفاع الشاشة ديناميكياً مع الكيبورد (موجود لديك، نضيف عليه تمرير للأسفل)
function applyViewportFix() {
  if (window.visualViewport) {
    const vh = window.visualViewport.height;
    document.documentElement.style.setProperty('--vhpx', `${vh}px`);
    scrollToBottom(); // حافظ على الرؤية أسفل عند تغيّر الارتفاع
  }
}
applyViewportFix();
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', applyViewportFix);
  window.visualViewport.addEventListener('scroll', applyViewportFix);
}
} catch (_) {}

// قياس ارتفاع شريط الإدخال وتحديث متغيّر CSS --footer-h
const footerEl = document.querySelector('.footer-input');

function updateFooterHeightVar(){
  const h = footerEl ? Math.ceil(footerEl.getBoundingClientRect().height) : 88;
  // الفوتر يعتبر لاصقاً على الشاشات الصغيرة فقط (حسب CSS)
  const isStickyViewport = window.matchMedia('(max-width: 768px)').matches;
  const value = isStickyViewport ? h : 0;
  document.documentElement.style.setProperty('--footer-h', value + 'px');
}

// أول تحديث ثم عند تغيّر القياسات
updateFooterHeightVar();
window.addEventListener('resize', updateFooterHeightVar);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', updateFooterHeightVar);
  window.visualViewport.addEventListener('scroll', updateFooterHeightVar);
}
if (window.ResizeObserver && footerEl) {
  new ResizeObserver(updateFooterHeightVar).observe(footerEl);
}

// ===== خلفية زيوس =====
const bgCanvas = document.getElementById('bgCanvas');
const bgSelect = document.getElementById('bgStyleSelect');

function applyBg(style) {
  if (!bgCanvas) return;
  bgCanvas.classList.remove('bg-calm','bg-storm','flash');
  bgCanvas.classList.add(style === 'storm' ? 'bg-storm' : 'bg-calm');
  localStorage.setItem('bgStyle', style);
}

// تحميل الخيار المحفوظ
applyBg(localStorage.getItem('bgStyle') || 'calm');

// من الإعدادات
if (bgSelect) {
  bgSelect.value = localStorage.getItem('bgStyle') || 'calm';
  bgSelect.addEventListener('change', e => applyBg(e.target.value));
}

// ومضات برق خفيفة عند وصول رسالة جديدة من المساعد
function zeusFlash() {
  if (!bgCanvas || !bgCanvas.classList.contains('bg-storm')) return;
  bgCanvas.classList.add('flash');
  setTimeout(() => bgCanvas.classList.remove('flash'), 1800);
}
});  // نهاية DOMContentLoaded

// ===========================
// تبديل وضع التطبيق (دردشة/فريق)
// ===========================
function switchMode(mode) {
  try {
    // 1) ثبّت القيمة
    const next = (mode === 'team') ? 'team' : 'chat';
    if (settings.activeMode === next) return;
    
    console.log(`Switching mode from ${settings.activeMode} to ${next}`);
    settings.activeMode = next;

    // 2) تمييز الأزرار
    const chatBtn = document.getElementById('btnModeChat');
    const teamBtn = document.getElementById('btnModeTeam');
    if (chatBtn && teamBtn) {
      chatBtn.classList.toggle('btn-primary', next === 'chat');
      chatBtn.classList.toggle('btn-secondary', next !== 'chat');
      teamBtn.classList.toggle('btn-primary', next === 'team');
      teamBtn.classList.toggle('btn-secondary', next !== 'team');
      chatBtn.setAttribute('aria-pressed', String(next === 'chat'));
      teamBtn.setAttribute('aria-pressed', String(next === 'team'));
    }

    // 3) تحديث العناوين وأزرار الواجهة
    const headerTitle = document.querySelector('.header-title');
    if (headerTitle) headerTitle.textContent = (next === 'team')
      ? 'غرف زيوس (وضع الفريق)'
      : 'شات زيوس';

    const newBtn = document.querySelector('#sidebar button[onclick="startNewChat()"]');
    if (newBtn) {
      newBtn.innerHTML = (next === 'team')
        ? '<i class="fas fa-plus ml-2"></i>غرفة جديدة'
        : '<i class="fas fa-plus ml-2"></i>محادثة جديدة';
    }

    // 4) تحديث قائمة التاريخ
    if (typeof displayChatHistory === 'function') displayChatHistory();

    // 5) إذا كانت المحادثة المعروضة حالياً من وضع آخر -> اخفِها
    if (currentChatId && chats[currentChatId] && ((chats[currentChatId].mode || 'chat') !== next)) {
      currentChatId = null;
      const msgArea = document.getElementById('messagesArea');
      if (msgArea) msgArea.innerHTML = '';
      document.getElementById('messagesContainer').classList.add('hidden');
      document.getElementById('welcomeScreen').classList.remove('hidden');
    }

    // 6) حفظ الإعدادات مع التأكد من وجود إعدادات الفريق
    if (!settings.team) {
      settings.team = {
        coordinator: { provider: 'gemini', model: 'gemini-1.5-pro', name: 'الوكيل' },
        members: [],
        turnStyle: 'sequential'
      };
    }
    
    if (typeof saveSettingsToDB === 'function') {
      saveSettingsToDB().catch(err => console.error('Error saving mode switch:', err));
    }

  } catch (e) {
    console.error('switchMode error:', e);
  }
}

// دالة للتحقق من حالة وضع الفريق
function isTeamMode() {
    return settings.activeMode === 'team';
}

// دالة للتحقق من وجود أعضاء الفريق
function hasTeamMembers() {
    return settings.team && 
           Array.isArray(settings.team.members) && 
           settings.team.members.length > 0;
}