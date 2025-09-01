function createStreamingMessage(sender = 'assistant') {
    const messageId = Date.now().toString();
    const messagesArea = document.getElementById('messagesArea');

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-bubble message-${sender} streaming-message`;
    messageDiv.id = `message-${messageId}`;

    messageDiv.innerHTML = `
        <div class="message-content" id="content-${messageId}" style="position: relative;">
            <i class="fas fa-bolt lightning-cursor waiting" id="lightning-${messageId}"></i>
        </div>
    `;

    messagesArea.appendChild(messageDiv);
    scrollToBottom();

    streamingState.currentMessageId = messageId;
    streamingState.streamingElement = document.getElementById(`content-${messageId}`);
    streamingState.currentText = '';
    streamingState.isStreaming = true;
    streamingState.lightningElement = document.getElementById(`lightning-${messageId}`);
    streamingState.hasStartedTyping = false;
// ✨ الجديد: ثبت المحادثة التي بدأ فيها البث
    streamingState.chatId = currentChatId;

// زر الإرسال يتحول فوراً إلى "إيقاف"
    updateSendButton();

    return messageId;
}

/**
 * يحول سلسلة نصية إلى HTML مع تأثير متدرج على كل "كلمة" للحفاظ على تشكيل العربية.
 * @param {string} text
 * @param {number} [delayStep=0.15]
 * @returns {string}
 */
function createAnimatedWords(text, delayStep = 0.15) {
  const parts = (text || '').split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    // نص قصير: أعده كما هو مع span واحدة (بدون تقطيع الحروف)
    return `<span class="word" style="animation-delay:${delayStep}s;">${text}</span>`;
  }
  let delay = 0;
  return parts.map((word) => {
    delay += delayStep;
    return `<span class="word" style="animation-delay:${delay}s;">${word}</span>`;
  }).join(' ');
}

// === عرض رسالة البحث في الويب مع البرق المتحرك ===
function createWebSearchMessage() {
  const messageId = Date.now().toString() + '_search';
  const messagesArea = document.getElementById('messagesArea');

  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-bubble message-assistant streaming-message web-search-message';
  messageDiv.id = `message-${messageId}`;

  // نص متحرك كلمة-بكلمة (يحافظ على اتصال الحروف العربية)
const animatedText = createAnimatedWords('جاري البحث في الويب');

  messageDiv.innerHTML = `
    <div class="web-search-container">
      <div class="search-text">
        ${animatedText}
        <div class="search-dots">
          <div class="search-dot"></div>
          <div class="search-dot"></div>
          <div class="search-dot"></div>
        </div>
      </div>
      <i class="fas fa-bolt search-lightning"></i>
    </div>
  `;

  messagesArea.appendChild(messageDiv);
  scrollToBottom();

  return messageDiv.id;
}

// === إزالة رسالة البحث ===
function removeWebSearchMessage(messageId) {
  if (!messageId) return;
  const id = messageId.startsWith('message-') ? messageId : `message-${messageId}`;
  const messageElement = document.getElementById(id);
  if (messageElement) messageElement.remove();
}

// === ضعها هنا: بعد createStreamingMessage() وقبل appendToStreamingMessage() ===
function placeLightningAtEnd(container, lightning) {
  if (!container || !lightning) return;

  // التقط آخر عنصر نصّي مناسب:
  const candidates = container.querySelectorAll(
    'p, li, h1, h2, h3, h4, h5, h6, blockquote p'
  );

  let target = null;
  for (let i = candidates.length - 1; i >= 0; i--) {
    const el = candidates[i];
    if (el.textContent && el.textContent.trim().length > 0) {
      target = el;
      break;
    }
  }

  // إن لم نجد مرشحًا، ألحِق بالحاوية كحل أخير
  (target || container).appendChild(lightning);
}

function appendToStreamingMessage(text, isComplete = false) {
    if (!streamingState.isStreaming) return;

    // نجمع النص دائمًا
    streamingState.currentText += text;

    // إذا لم يكن لدينا عنصر DOM (مثلاً لأننا بدّلنا المحادثة)
    // ونعود الآن إلى نفس المحادثة التي يجري فيها البث،
    // نعيد إنشاء الفقاعة وربط العنصر مرة أخرى.
    if (!streamingState.streamingElement) {
        const weAreOnTheStreamingChat =
            currentChatId && streamingState.chatId && currentChatId === streamingState.chatId;

        if (weAreOnTheStreamingChat) {
            // إعادة إرفاق فقاعة البث في هذه المحادثة
            const messageId = streamingState.currentMessageId;
            const messagesArea = document.getElementById('messagesArea');

            // أنشئ غلاف الرسالة يدويًا (نسخة مبسطة من createStreamingMessage بدون إعادة ضبط الحالة)
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-bubble message-assistant streaming-message`;
            messageDiv.id = `message-${messageId}`;
            messageDiv.innerHTML = `
              <div class="message-content" id="content-${messageId}" style="position: relative;">
                  <i class="fas fa-bolt lightning-cursor" id="lightning-${messageId}"></i>
              </div>
            `;
            messagesArea.appendChild(messageDiv);
            streamingState.streamingElement = document.getElementById(`content-${messageId}`);
            streamingState.lightningElement = document.getElementById(`lightning-${messageId}`);
            streamingState.hasStartedTyping = false;
        }
    }

    // إن لم يتوفر عنصر بعد (لأننا في محادثة أخرى)، نكتفي بتجميع النص ونؤجل العرض
    if (!streamingState.streamingElement) {
        if (isComplete) completeStreamingMessage();
        return;
    }

    // تحويل البرق من وضع الانتظار إلى وضع الكتابة عند وصول أول نص
    if (!streamingState.hasStartedTyping && text && text.trim()) {
        streamingState.hasStartedTyping = true;
        if (streamingState.lightningElement) {
            streamingState.lightningElement.classList.remove('waiting');
            streamingState.lightningElement.classList.add('typing');
        }
    }

    // الآن نحدّث الـ DOM
    const renderedContent = marked.parse(streamingState.currentText);
    
    // إزالة البرق مؤقتاً قبل تحديث المحتوى
    let lightningElement = streamingState.lightningElement;
    if (lightningElement && lightningElement.parentNode) {
        lightningElement.parentNode.removeChild(lightningElement);
    }
    
    streamingState.streamingElement.innerHTML = renderedContent;

// إعادة إدراج البرق في نهاية النص إذا لم يكتمل البث
if (!isComplete && lightningElement) {
    placeLightningAtEnd(streamingState.streamingElement, lightningElement);
    streamingState.lightningElement = lightningElement;
}

    streamingState.streamingElement.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
        addCodeHeader(block.parentElement);
    });

    smoothScrollToBottom();

    if (isComplete) {
        completeStreamingMessage();
    }
}

// ===== دوالّ جديدة توضع فوق completeStreamingMessage() =====
// === [جديد] فتح خارجي موثوق حتى على iOS (يحل مشكلة عدم فتح الروابط) ===
function openExternal(url) {
  try {
    const w = window.open(url, '_blank', 'noopener'); // محاولة مباشرة
    if (w && typeof w.focus === 'function') w.focus();

    // احتياطي لو منع المتصفح window.open
    if (!w) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  } catch (_) {
    // آخر حل: افتح في نفس الصفحة
    location.href = url;
  }
}

// === [جديد] تحقّق بسيط: هل النص دومين؟ ===
function looksLikeDomain(text) {
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test((text || '').trim());
}

// === [جديد/موسّع] فكّ الروابط الملتفّة (Google/Vertex/MSN/Reddit/LinkedIn/Twitter/Facebook...) ===
function unwrapUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname;

    const isWrapper =
      /vertexaisearch\.cloud\.google\.com$/.test(host) ||
      /news\.google\.com$/.test(host) ||
      /\.google\./.test(host) ||
      /^t\.co$/.test(host) ||
      /^lnkd\.in$/.test(host) ||
      /^l\.facebook\.com$/.test(host) ||
      /^lm\.facebook\.com$/.test(host) ||
      /^go\.microsoft\.com$/.test(host) ||
      /^r\.msn\.com$/.test(host) ||
      /^out\.reddit\.com$/.test(host);

    if (isWrapper) {
      const real =
        u.searchParams.get('url')   ||
        u.searchParams.get('u')     ||
        u.searchParams.get('q')     ||
        u.searchParams.get('target')||
        u.searchParams.get('to')    ||
        u.searchParams.get('dest')  || '';
      if (real) return new URL(real).toString();
    }
    return u.toString();
  } catch { return rawUrl; }
}

// === [جديد/موسّع] تحويل Markdown إلى روابط مرتّبة مع إزالة تكرار الدومين + Favicon صحيح ===
function parseMarkdownLinks(md) {
  const seen = new Set();
  const items = [];

  md.split('\n').forEach(line => {
    const l = line.trim();
    if (!l.startsWith('- [')) return;

    const m = l.match(/^\-\s+\[(.+?)\]\((https?:\/\/[^\s)]+)\)/);
    if (!m) return;

    const rawTitle = (m[1] || '').trim();
    const rawUrl   = m[2];

    const url = unwrapUrl(rawUrl);
    const domain = (looksLikeDomain(rawTitle) ? rawTitle : (new URL(url)).hostname)
      .replace(/^www\./,'')
      .toLowerCase();

    if (seen.has(domain)) return;    // إزالة التكرار مع الحفاظ على أول ظهور (أسلوب GPT)
    seen.add(domain);

    const title   = rawTitle || domain; // fallback للعنوان إذا كان فارغًا
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    items.push({ title, url, domain, favicon });
  });

  return items;
}

// === [جديد/محدّث] شريط الأيقونات أسفل الرسالة + زر "المصادر" ===
function createSourcesInlineBar(containerEl, links) {
  if (!links || links.length === 0) return;

  const preview = links.slice(0, 3); // بعد dedupe
  const wrapper = document.createElement('div');
  wrapper.className = 'sources-inline';

  const icons = document.createElement('div');
  icons.className = 'sources-icons';
  icons.innerHTML = preview.map(l => `
    <a class="source-icon" href="${l.url}" target="_blank" rel="noopener"
       onclick="event.preventDefault(); event.stopPropagation(); openExternal('${l.url.replace(/'/g, "\\'")}');">
      <img src="${l.favicon}" alt="${l.domain}" loading="lazy">
    </a>
  `).join('');
  wrapper.appendChild(icons);

  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.className = 'sources-open-btn';
  openBtn.textContent = 'المصادر';
  openBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    openSourcesModal(links);
  });
  wrapper.appendChild(openBtn);

  containerEl.appendChild(wrapper);
}

// === [جديد/محدّث] نافذة "اقتباسات" بأسلوب GPT + RTL + فتح مضمون على iOS ===
function openSourcesModal(links) {
  // حافظ على ترتيب الظهور كما هو (بعد إزالة التكرار)
  const normalized = links.map(l => {
    const title = (l.title && l.title.trim()) || l.domain; // fallback أقوى
    return { ...l, title };
  });

  const modal = document.createElement('div');
  modal.className = 'gpt-modal-overlay';
  modal.innerHTML = `
    <div class="gpt-modal" dir="rtl">
      <div class="gpt-modal-top-pill"></div>
      <div class="gpt-modal-header">
        <div class="gpt-modal-title">اقتباسات</div>
        <button class="gpt-modal-close" aria-label="إغلاق">&times;</button>
      </div>
      <div class="gpt-modal-body">
        ${normalized.map(item => `
          <a class="gpt-source-item" href="${item.url}" target="_blank" rel="noopener"
             onclick="event.preventDefault(); openExternal('${item.url.replace(/'/g, "\\'")}');">
            <div class="gpt-source-title-line">
              <img class="gpt-favicon" src="${item.favicon}" alt="">
              <span class="gpt-source-title">${escapeHtml(((item.title && item.title.trim()) || item.domain))}</span>
            </div>
            <div class="gpt-source-subline">
              <span class="gpt-source-domain">${escapeHtml(item.domain)}</span>
              <span class="gpt-source-badge" aria-hidden="true"></span>
            </div>
          </a>
        `).join('')}
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.gpt-modal-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
}

// ✅ جديد: ترقية عرض "المصادر" في الرسائل المحمّلة من التاريخ (بعد التحديث/الرجوع)
function upgradeSourcesInHistory(root = document) {
  // لو المستخدم عطّل إظهار المصادر، نظّف أي بقايا للقسم البدائي أو الشريط وانهِ
  if (typeof settings !== 'undefined' && settings.showSources === false) {
    root.querySelectorAll('.chat-bubble.message-assistant .message-content').forEach(c => {
      Array.from(c.querySelectorAll('p')).forEach(p => {
        const t = (p.textContent || '').trim();
        if (/^🔍?\s*المصادر:?$/.test(t)) {
          const ul = p.nextElementSibling;
          if (ul && ul.tagName && ul.tagName.toLowerCase() === 'ul') ul.remove();
          p.remove();
        }
      });
      const inline = c.parentElement && c.parentElement.querySelector('.sources-inline');
      if (inline) inline.remove();
    });
    return;
  }

  // حوّل كل رسالة مساعد (سواء بالتعليق المخفي أو الشكل البدائي) إلى الشريط الجميل
  root.querySelectorAll('.chat-bubble.message-assistant').forEach(bubble => {
    if (bubble.dataset.sourcesUpgraded === '1') return; // لا تعالجها مرتين
    if (bubble.querySelector('.sources-inline')) {
      bubble.dataset.sourcesUpgraded = '1';
      return;
    }
    const contentEl = bubble.querySelector('.message-content');
    if (!contentEl) return;

    // ✨ أولاً: دعم التعليق المخفي <!--SOURCES_MD ... END_SOURCES_MD-->
    let sourcesMd = "";
    const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_COMMENT, null);
    let node;
    while ((node = walker.nextNode())) {
      const txt = node.nodeValue || "";
      if (txt.includes("SOURCES_MD")) {
        const m = txt.match(/SOURCES_MD\s*([\s\S]*?)\s*END_SOURCES_MD/);
        if (m && m[1]) {
          sourcesMd = m[1].trim();
        }
        node.parentNode && node.parentNode.removeChild(node); // نظّف التعليق
        break;
      }
    }

    if (sourcesMd) {
      const links = [];
      const seen = new Set();
      // حلّل الماركداون البسيط: - [title](url)
      sourcesMd.split("\n").forEach(line => {
        const match = line.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/);
        if (match) {
          try {
            const url = unwrapUrl(match[2]);
            const u = new URL(url);
            const domain = u.hostname.replace(/^www\./, "").toLowerCase();
            if (seen.has(domain)) return;
            seen.add(domain);
            const title = match[1].trim() || domain;
            const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
            links.push({ title, url, domain, favicon });
          } catch (_) { /* تجاهل روابط غير صالحة */ }
        }
      });
      if (links.length > 0) {
        createSourcesInlineBar(bubble, links);
        bubble.dataset.sourcesUpgraded = '1';
      }
      return; // ✅ لا نكمل للمنطق القديم
    }

    // ✨ ثانياً: fallback (الكود القديم للفقرة UL)
    const headerP = Array.from(contentEl.querySelectorAll('p'))
      .find(p => {
        const txt = (p.textContent || '').trim();
        return /^🔍?\s*المصادر:?$/.test(txt);
      });
    if (!headerP) return;

    const listEl = headerP.nextElementSibling;
    if (!listEl || (listEl.tagName || '').toLowerCase() !== 'ul') return;

    // استخرج الروابط من عناصر القائمة
    const seen = new Set();
    const links = [];
    listEl.querySelectorAll('li a[href]').forEach(a => {
      try {
        const url = unwrapUrl(a.getAttribute('href'));
        const u = new URL(url);
        const domain = u.hostname.replace(/^www\./, '').toLowerCase();
        if (seen.has(domain)) return;
        seen.add(domain);
        const title = (a.textContent || '').trim() || domain;
        const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        links.push({ title, url, domain, favicon });
      } catch (_) { /* تجاهل روابط غير صالحة */ }
    });

    // احذف القسم البدائي
    listEl.remove();
    headerP.remove();

    // ابنِ الشريط الجميل في نفس الفقاعة
    if (links.length > 0) {
      createSourcesInlineBar(bubble, links);
      bubble.dataset.sourcesUpgraded = '1';
    }
  });
}

window.upgradeSourcesInHistory = upgradeSourcesInHistory;

// ====== بعد (نسخة جديدة بالكامل) ======
function completeStreamingMessage() {
  if (!streamingState.isStreaming) return;

  const messageElement = document.getElementById(`message-${streamingState.currentMessageId}`);
  if (messageElement) {
    // إزالة مؤشّر البث
    const indicator = messageElement.querySelector('.streaming-indicator');
    if (indicator) indicator.remove();
    messageElement.classList.remove('streaming-message');

    // فصل المتن عن قسم **🔍 المصادر:**
    const fullText = streamingState.currentText || '';
    const splitToken = '\n**🔍 المصادر:**\n';
    let mainText = fullText, sourcesMd = '';

    const idx = fullText.indexOf(splitToken);
    if (idx !== -1) {
      mainText  = fullText.slice(0, idx);
      sourcesMd = fullText.slice(idx + splitToken.length);
    }

    // عرض المتن فقط داخل الفقاعة
    const contentEl = messageElement.querySelector('.message-content');
    if (contentEl) {
      contentEl.innerHTML = marked.parse(mainText);
      contentEl.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
        addCodeHeader(block.parentElement);
      });
    }

    // أزرار (نسخ/إعادة توليد) تعمل على "المتن" فقط
    addMessageActions(messageElement, mainText);

    // ✅ شريط معاينة + نافذة كروت للمصادر (بدون زر إظهار/إخفاء القديم)
    if (sourcesMd.trim()) {
      const links = parseMarkdownLinks(sourcesMd); // يستخدم Regex Markdown القياسي
      if (links.length > 0) {
        createSourcesInlineBar(messageElement, links); // بطاقات صغيرة + زر "المصادر"
      }
    }
  }

  // ✨ تجهيز نص الرسالة بدون الشكل البدائي
  let mainText = streamingState.currentText || '';
  let sourcesComment = '';

  // إذا كان النص يحتوي على جزء "🔍 المصادر:" نحوله لتعليق HTML مخفي
  const sourcesMatch = mainText.match(/(\*\*🔍 المصادر:\*\*[\s\S]*)/);
  if (sourcesMatch) {
    sourcesComment = `\n\n<!--SOURCES_MD\n${sourcesMatch[1]}\nEND_SOURCES_MD-->`;
    mainText = mainText.replace(sourcesMatch[0], '').trim(); // نحذف الجزء البدائي من النص
  }

  // حفظ الرسالة في المحادثة الصحيحة (بدون الشكل البدائي)
  const targetChatId = streamingState.chatId;
  if (targetChatId && chats[targetChatId] && (mainText || '')) {
    const now = Date.now();
    chats[targetChatId].messages.push({
      role: 'assistant',
      content: mainText + sourcesComment, // ← نص نظيف + تعليق مخفي
      timestamp: now
    });
    chats[targetChatId].updatedAt = now;
    chats[targetChatId].order = now;
  }

  // إعادة الضبط
  streamingState.isStreaming = false;
  streamingState.currentMessageId = null;
  streamingState.streamingElement = null;
  streamingState.currentText = '';
  streamingState.streamController = null;
  streamingState.chatId = null;
  streamingState.lightningElement = null;
  streamingState.hasStartedTyping = false;

  saveCurrentChat(targetChatId);
  scrollToBottom();
}

// ==============================
// بث وضع الفريق: تفكيك الدفق
// ==============================

// علامات الفصل المقترحة التي سيرسلها الخادم لاحقًا:
//   ⟦AGENT:BEGIN|<name>|<role>⟧
//   ⟦AGENT:END⟧
//
// إن لم تصل هذه العلامات، يعود العرض تلقائيًا إلى فقاعة واحدة (السلوك الحالي).

const teamStreaming = {
  buffer: '',
  activeAgent: null,   // { messageId, name, role, text }
  chatId: null
};

// عدّاد للألوان
let agentCounter = 0;

function createAgentStreamingMessage(name, role) {
  agentCounter++;
  const colorClass = `agent-color-${(agentCounter % 4) + 1}`; // 4 ألوان تتكرر

  const messagesArea = document.getElementById('messagesArea');
  const messageId = 'agent-' + Date.now().toString();
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-bubble message-assistant streaming-message ${colorClass}`;
  messageDiv.id = `message-${messageId}`;

  messageDiv.innerHTML = `
    <div class="flex items-center gap-2 text-xs opacity-75 mb-1">
      <i class="fas fa-users-cog"></i>
      <span>${escapeHtml(name)} <span class="opacity-60">(${escapeHtml(role)})</span></span>
    </div>
    <div class="message-content" id="content-${messageId}" style="position: relative;">
      <i class="fas fa-bolt lightning-cursor waiting" id="lightning-${messageId}"></i>
    </div>
  `;

  messagesArea.appendChild(messageDiv);
  scrollToBottom();

  teamStreaming.activeAgent = { 
    messageId, 
    name, 
    role, 
    text: '',
    lightningElement: document.getElementById(`lightning-${messageId}`),
    hasStartedTyping: false
  };
  if (!teamStreaming.chatId) teamStreaming.chatId = currentChatId;
}

function appendToActiveAgent(text) {
  const a = teamStreaming.activeAgent;
  if (!a) {
    // لا يوجد «عضو» نشط: استخدم الفقاعة العامة الحالية للحفاظ على تجربة مقبولة
    appendToStreamingMessage(text);
    return;
  }
  a.text += text;

  const contentEl = document.getElementById(`content-${a.messageId}`);
  if (!contentEl) return;

  // تحويل البرق من وضع الانتظار إلى وضع الكتابة عند وصول أول نص
  if (!a.hasStartedTyping && text && text.trim()) {
    a.hasStartedTyping = true;
    if (a.lightningElement) {
      a.lightningElement.classList.remove('waiting');
      a.lightningElement.classList.add('typing');
    }
  }

  // إزالة البرق مؤقتاً قبل تحديث المحتوى
  let lightningElement = a.lightningElement;
  if (lightningElement && lightningElement.parentNode) {
    lightningElement.parentNode.removeChild(lightningElement);
  }

  contentEl.innerHTML = marked.parse(a.text);

// إعادة إدراج البرق في نهاية النص
if (lightningElement) {
  placeLightningAtEnd(contentEl, lightningElement);
  a.lightningElement = lightningElement;
}

  contentEl.querySelectorAll('pre code').forEach(block => {
    hljs.highlightElement(block);
    addCodeHeader(block.parentElement);
  });

  smoothScrollToBottom();
}

function completeActiveAgent() {
  const a = teamStreaming.activeAgent;
  if (!a) return;
  const msgEl = document.getElementById(`message-${a.messageId}`);
  if (msgEl) {
    const indicator = msgEl.querySelector('.streaming-indicator');
    if (indicator) indicator.remove();
    msgEl.classList.remove('streaming-message');
  }

  // خزّن نص العضو داخل سجلّ المحادثة (نفس chatId الذي نحفظ فيه البث العام)
  const targetChatId = teamStreaming.chatId || currentChatId;
  if (targetChatId && chats[targetChatId] && (a.text || '')) {
    const now = Date.now();
    chats[targetChatId].messages.push({
      role: 'assistant',
      content: `### ${a.name} (${a.role})\n\n${a.text}`,
      timestamp: now
    });
    chats[targetChatId].updatedAt = now;
    chats[targetChatId].order = now;
  }

  teamStreaming.activeAgent = null;
}

function processTeamChunk(chunk) {
  // إن لم تُضبط العلامات من الخادم، نُمرّر الدفق كما هو إلى الفقاعة العامة
  if (!chunk.includes('⟦AGENT:BEGIN|') && !chunk.includes('⟦AGENT:END⟧')) {
    appendToActiveAgent(chunk); // إن وُجد «عضو» نشط سنلصق له، وإلا نعتمد الفقاعة العامة
    return;
  }

  teamStreaming.buffer += chunk;

  // عالجًا التتابعات المحتملة (قد تصل BEGIN/END داخل نفس الـchunk)
  let changed = true;
  while (changed) {
    changed = false;

    // 1) BEGIN
    const beginIdx = teamStreaming.buffer.indexOf('⟦AGENT:BEGIN|');
    if (beginIdx !== -1) {
      // انقل أي نص سابق للعضو الحالي/الفقاعة العامة
      const pre = teamStreaming.buffer.slice(0, beginIdx);
      if (pre) appendToActiveAgent(pre);

      // استخرج الهيدر: ⟦AGENT:BEGIN|name|role⟧
      const closeIdx = teamStreaming.buffer.indexOf('⟧', beginIdx);
      if (closeIdx !== -1) {
        const header = teamStreaming.buffer.slice(beginIdx + '⟦AGENT:BEGIN|'.length, closeIdx);
        const [name, role] = header.split('|');
        // ابدأ رسالة عضو جديدة (وأغلق السابقة إن وُجدت)
        if (teamStreaming.activeAgent) completeActiveAgent();
        createAgentStreamingMessage(name || 'عضو', role || 'عضو فريق');

        // احذف الرأس من المخبأ
        teamStreaming.buffer = teamStreaming.buffer.slice(closeIdx + 1);
        changed = true;
        continue;
      }
    }

    // 2) END
    const endIdx = teamStreaming.buffer.indexOf('⟦AGENT:END⟧');
    if (endIdx !== -1) {
      const body = teamStreaming.buffer.slice(0, endIdx);
      if (body) appendToActiveAgent(body);
      completeActiveAgent();
      teamStreaming.buffer = teamStreaming.buffer.slice(endIdx + '⟦AGENT:END⟧'.length);
      changed = true;
      continue;
    }
  }
}

function finalizeTeamStreaming() {
  // صبّ أي بقايا
  if (teamStreaming.buffer) {
    appendToActiveAgent(teamStreaming.buffer);
    teamStreaming.buffer = '';
  }
  // أغلق العضو الأخير
  completeActiveAgent();

  // إعادة تعيين متغيرات الفريق
  teamStreaming.activeAgent = null;
  teamStreaming.chatId = null;
  teamStreaming.buffer = '';

  // أغلق حالة البث العامة أيضًا
  if (streamingState.isStreaming) {
    streamingState.isStreaming = false;
    streamingState.currentMessageId = null;
    streamingState.streamingElement = null;
    streamingState.currentText = '';
    streamingState.streamController = null;
    streamingState.chatId = null;
    
    // تحديث زر الإرسال
    updateSendButton();
    
    // حفظ المحادثة
    if (teamStreaming.chatId || currentChatId) {
      saveCurrentChat(teamStreaming.chatId || currentChatId);
    }
  }
}

function smoothScrollToBottom() {
    const messagesArea = document.getElementById('messagesArea');
    messagesArea.scrollTo({
        top: messagesArea.scrollHeight,
        behavior: 'smooth'
    });
}

async function sendMessage() {

    if (streamingState.isStreaming) { 
        cancelStreaming('new-send'); 
        return; 
    }

    // التحقق من إعدادات الفريق في وضع الفريق
    if (settings.activeMode === 'team' && !validateTeamSettings()) {
        return;
    }

    // ⚠️ في حال تغيّر المعرّف بعد حفظ سابق
    if (currentChatId && !chats[currentChatId]) {
        const latest = Object.values(chats).sort((a,b)=>(b.order||0)-(a.order||0))[0];
        currentChatId = latest ? latest._id : null;
    }

    const input = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const fileInput = document.getElementById('fileInput');

    if (!input.value.trim() && fileInput.files.length === 0) return;

    const message = input.value.trim();
    const files = Array.from(fileInput.files);

    // The API key check is no longer needed on the frontend.
    // The backend will handle API key management.

    console.log('Sending message to backend with provider:', settings.provider, 'model:', settings.model);

    // Disable input during processing
    input.disabled = true;
    sendButton.disabled = true;

    try {
        // Create new chat if needed
        if (!currentChatId) {
            await startNewChat();
        }

        // ✨✨✨ الميزة الجديدة تبدأ هنا ✨✨✨
        // 1. تحقق إذا كانت هذه هي الرسالة الأولى في المحادثة الحالية
        if (chats[currentChatId] && chats[currentChatId].messages.length === 0 && message) {
            // 2. إذا كانت كذلك، قم بتحديث عنوان المحادثة
            chats[currentChatId].title = message;
            // 3. قم بتحديث قائمة المحادثات فورًا لإظهار الاسم الجديد
            displayChatHistory();
        }
        // ✨✨✨ الميزة الجديدة تنتهي هنا ✨✨✨

        // Process files if any
        let attachments = [];
        if (files.length > 0) {
            attachments = await processAttachedFiles(files);
        }

        // Create user message
        const userMessage = {
  role: 'user',
  content: message,
  attachments: attachments.map(file => ({
    name: file.name,
    size: file.size,
    type: file.type,
    dataType: file.dataType || null,
    mimeType: file.mimeType || file.type || null,
    fileId: file.fileId || null,
    fileUrl: file.fileUrl || null
    // (لا نحفظ base64 في التاريخ حتى لا نضخم التخزين؛ يكفي أنه يُرسل للمساعد الآن)
  })),
  timestamp: Date.now()
};

        // Add user message to chat
        chats[currentChatId].messages.push(userMessage);

        // Display user message with file cards
        displayUserMessage(userMessage);

        // Scroll to show new message
        setTimeout(() => scrollToBottom(), 100);

        // Clear input
        input.value = '';
        clearFileInput();

        // Show welcome screen if hidden
        document.getElementById('welcomeScreen').classList.add('hidden');
        document.getElementById('messagesContainer').classList.remove('hidden');

// ... بعد إنشاء userMessage وعرضه
// نؤجل إنشاء فقاعة البث للنص العادي إلى sendToAIWithStreaming()
// حتى لا يظهر "برق الكتابة" أثناء البحث في الويب.

// (اختياري) لو المستخدم كتب جملة تبدأ بـ "ابحث عبر الانترنت" ولم نغيّر العتبة
if (settings.enableWebBrowsing && /^\\s*ابحث\\s+عبر\\s+الانترنت/i.test(message)) {
  // اجعل العتبة أقل قليلاً لتميل الأداة للبحث
  settings.dynamicThreshold = Math.max(0, Math.min(0.4, settings.dynamicThreshold || 0.6));

}	


// Send to AI with streaming
await sendToAIWithStreaming(chats[currentChatId].messages, attachments);

    } catch (error) {
        console.error('Error sending message:', error);
        showNotification(`حدث خطأ: ${error.message}`, 'error');

        // Complete streaming message with error
        if (streamingState.isStreaming) {
            appendToStreamingMessage('\n\n❌ عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.', true);
        }
    } finally {
        // Re-enable input
        input.disabled = false;
        sendButton.disabled = false;
        updateSendButton();
        input.focus();

        // Data will be saved when streaming completes
    }
}

// التحقق من صحة إعدادات الفريق قبل الإرسال
function validateTeamSettings() {
  if (!settings.team) {
    showNotification('إعدادات الفريق غير موجودة. يرجى إعداد الفريق أولاً.', 'error');
    return false;
  }

  if (!Array.isArray(settings.team.members) || settings.team.members.length === 0) {
    showNotification('يرجى إضافة أعضاء الفريق من الإعدادات قبل البدء.', 'error');
    return false;
  }

  // التحقق من أن كل عضو لديه اسم وموديل
  for (let i = 0; i < settings.team.members.length; i++) {
    const member = settings.team.members[i];
    if (!member.name || !member.name.trim()) {
      showNotification(`العضو رقم ${i + 1} لا يملك اسماً. يرجى تعديل الإعدادات.`, 'error');
      return false;
    }
    if (!member.model || !member.model.trim()) {
      showNotification(`العضو "${member.name}" لا يملك موديل محدد. يرجى تعديل الإعدادات.`, 'error');
      return false;
    }
  }

  return true;
}

function displayUserMessage(message) {
    const messagesArea = document.getElementById('messagesArea');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-bubble message-user';

    let content = `<div class="message-content">${escapeHtml(message.content)}</div>`;

    // Add file cards if there are attachments
    if (message.attachments && message.attachments.length > 0) {
        const fileCards = message.attachments.map(file => createFileCard(file)).join('');
        content += fileCards;
    }

    messageDiv.innerHTML = content;
    messagesArea.appendChild(messageDiv);
    scrollToBottom();
}

// =================== الصق هذا الكود الجديد بالكامل في مكانه ===================

// ----------------------------------------------------------------------------------
// NEW: Functions to communicate with the local backend server
// ----------------------------------------------------------------------------------

async function sendToAIWithStreaming(chatHistory, attachments) {
    const lastUserMsg = (chatHistory || [])
        .slice().reverse().find(m => m.role === 'user')?.content || '';

if (settings.provider === 'puter') {
    // أنشئ فقاعة البث فوراً
    createStreamingMessage();

    try {
        // جهّز الرسائل مع المرفقات
        const messagesForPuter = await buildPuterMessages(chatHistory, attachments);

        // استدعاء Puter.js
        const responseStream = await puter.ai.chat(messagesForPuter, {
            model: settings.model,
            temperature: settings.temperature,
            stream: true
        });

        // معالجة التدفق بالطريقة المحسّنة
        await processPuterStream(responseStream);

    } catch (error) {
        console.error('Error with Puter.js streaming:', error);
        appendToStreamingMessage(`\n\n❌ خطأ من Puter.js: ${error.message}`, true);
    }
    return;
}

    // --- المسار الحالي: استخدام الخادم الخلفي (Gemini, OpenRouter, والمخصصين) ---
    // لا تغييرات هنا، كل الكود التالي هو الكود الأصلي الخاص بك

    // البحث الذكي المتقدم - يحدد تلقائياً إذا كان المستخدم يريد البحث
    function shouldSearch(message) {
        const msg = message.toLowerCase().trim();
        const directSearchTerms = ['ابحث', 'بحث', 'البحث', 'تصفح', 'اعطني معلومات عن', 'ما هي آخر أخبار', 'آخر الأخبار', 'الأخبار الحديثة', 'search', 'browse', 'find information', 'latest news', 'recent news'];
        const timeIndicators = ['اليوم', 'أمس', 'هذا الأسبوع', 'هذا الشهر', 'الآن', 'حالياً', 'مؤخراً', 'جديد', 'حديث', 'متى', 'كم', 'أين', 'today', 'yesterday', 'this week', 'this month', 'now', 'currently', 'recently', 'new', 'recent', 'when', 'how much', 'where'];
        const currentTopics = ['سعر', 'أسعار', 'الأسهم', 'العملة', 'الطقس', 'الأخبار', 'أحداث', 'تحديثات', 'إحصائيات', 'بيانات', 'price', 'prices', 'stock', 'currency', 'weather', 'news', 'events', 'updates', 'statistics', 'data'];
        const hasDirectSearch = directSearchTerms.some(term => msg.includes(term));
        const hasTimeIndicator = timeIndicators.some(term => msg.includes(term));
        const hasCurrentTopic = currentTopics.some(term => msg.includes(term));
        const threshold = settings.dynamicThreshold || 0.6;
        let searchScore = 0;
        if (hasDirectSearch) searchScore += 0.6;
        if (hasTimeIndicator) searchScore += 0.3;
        if (hasCurrentTopic) searchScore += 0.4;
        if (msg.includes('؟') || msg.includes('?')) {
            if (hasTimeIndicator || hasCurrentTopic) searchScore += 0.2;
        }
        return searchScore >= threshold;
    }

    const forceWebBrowsing = settings.enableWebBrowsing && shouldSearch(lastUserMsg);

    // متغير لحفظ معرف رسالة البحث
    let searchMessageId = null;

    if (forceWebBrowsing) {
        // أثناء البحث: أظهر فقط رسالة البحث
        searchMessageId = createWebSearchMessage();
    } else {
        // بدون بحث: أنشئ فقاعة البث مباشرة
        createStreamingMessage();
    }

    // استخراج موضوع البحث بطريقة ذكية
    function extractSearchQuery(text) {
        let cleanText = text
            .replace(/^(ابحث\s+عن\s+|ابحث\s+|بحث\s+عن\s+|قم\s+بالبحث\s+عن\s+|search\s+for\s+|find\s+)/i, '')
            .replace(/^(ما\s+هي\s+|ما\s+هو\s+|what\s+is\s+|what\s+are\s+)/i, '')
            .replace(/\?$/i, '')
            .trim();
        return cleanText || text.trim();
    }

    const searchQuery = forceWebBrowsing ? extractSearchQuery(lastUserMsg) : '';

    const payload = {
        chatHistory,
        history: chatHistory,
        attachments: attachments.map(file => ({
            name: file.name,
            type: file.type,
            size: file.size,
            content: file.content,
            dataType: file.dataType,
            mimeType: file.mimeType
        })),
        settings,
        meta: {
            forceWebBrowsing,
            searchQuery
        }
    };

    try {
        // استدعاء الدالة الجديدة مع تمرير معرف رسالة البحث
        await sendRequestToServer(payload, searchMessageId);
    } catch (error) {
        // إزالة رسالة البحث في حالة الخطأ
        if (searchMessageId) {
            removeWebSearchMessage(searchMessageId);
        }
        console.error('Error sending request to server:', error);
        appendToStreamingMessage(`\n\n❌ حدث خطأ أثناء الاتصال بالخادم: ${error.message}`, true);
    }
}

// دالة لبناء رسائل Puter.js مع دعم المرفقات
async function buildPuterMessages(chatHistory, attachments) {
    const messagesForPuter = [];

    for (const msg of chatHistory) {
        const puterMessage = {
            role: msg.role,
            content: msg.content
        };

        // إضافة المرفقات للرسالة الأخيرة من المستخدم
        if (msg.role === 'user' && msg.attachments && msg.attachments.length > 0) {
            // تحويل المرفقات لصيغة Puter.js
            const puterAttachments = [];
            
            for (const attachment of msg.attachments) {
                if (attachment.dataType === 'image' && attachment.content) {
                    puterAttachments.push({
                        type: 'image',
                        data: `data:${attachment.mimeType || 'image/jpeg'};base64,${attachment.content}`,
                        name: attachment.name
                    });
                } else if (attachment.dataType === 'text' && attachment.content) {
                    // إضافة محتوى النص إلى الرسالة
                    puterMessage.content += `\n\n[ملف: ${attachment.name}]\n${attachment.content}`;
                }
            }
            
            if (puterAttachments.length > 0) {
                puterMessage.attachments = puterAttachments;
            }
        }

        // إضافة المرفقات الجديدة للرسالة الحالية إذا كانت متوفرة
        if (msg.role === 'user' && attachments && attachments.length > 0) {
            const currentAttachments = [];
            
            for (const attachment of attachments) {
                if (attachment.dataType === 'image' && attachment.content) {
                    currentAttachments.push({
                        type: 'image',
                        data: `data:${attachment.mimeType || 'image/jpeg'};base64,${attachment.content}`,
                        name: attachment.name
                    });
                } else if (attachment.dataType === 'text' && attachment.content) {
                    puterMessage.content += `\n\n[ملف: ${attachment.name}]\n${attachment.content}`;
                }
            }
            
            if (currentAttachments.length > 0) {
                puterMessage.attachments = (puterMessage.attachments || []).concat(currentAttachments);
            }
        }

        messagesForPuter.push(puterMessage);
    }

    return messagesForPuter;
}

// دالة مساعدة للتعامل مع استجابة التدفق من Puter.js
async function processPuterStream(responseStream) {
    try {
        // التحقق إذا كانت الاستجابة تحتوي على getReader
        if (responseStream && typeof responseStream.getReader === 'function') {
            const reader = responseStream.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                if (chunk && chunk.trim()) {
                    appendToStreamingMessage(chunk);
                }
            }
        }
        // إذا كانت الاستجابة عبارة عن async iterator
        else if (responseStream && typeof responseStream[Symbol.asyncIterator] === 'function') {
            for await (const part of responseStream) {
                if (part && part.choices && part.choices[0] && part.choices[0].delta) {
                    const content = part.choices[0].delta.content;
                    if (content) {
                        appendToStreamingMessage(content);
                    }
                } else if (part && part.text) {
                    appendToStreamingMessage(part.text);
                } else if (typeof part === 'string') {
                    appendToStreamingMessage(part);
                }
            }
        }
        // إذا كانت الاستجابة مباشرة نص
        else if (typeof responseStream === 'string') {
            // محاكاة التدفق للنص المباشر
            const words = responseStream.split(' ');
            for (let i = 0; i < words.length; i++) {
                appendToStreamingMessage(words[i] + (i < words.length - 1 ? ' ' : ''));
                await new Promise(resolve => setTimeout(resolve, 50)); // تأخير بسيط لمحاكاة التدفق
            }
        }
        
        // إنهاء التدفق
        appendToStreamingMessage('', true);
        
    } catch (error) {
        console.error('Error processing Puter stream:', error);
        appendToStreamingMessage(`\n\n❌ خطأ في معالجة التدفق: ${error.message}`, true);
    }
}

async function sendRequestToServer(payload, searchMessageId = null) {
  try {
    const token = localStorage.getItem('authToken');

    const controller = new AbortController();
    streamingState.streamController = controller;

    const endpoint = (settings.activeMode === 'team')
      ? `${API_BASE_URL}/api/team_chat`
      : `${API_BASE_URL}/api/chat`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server Error:', response.status, errorText);
      throw new Error(`خطأ من الخادم: ${response.status} - ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let firstChunkReceived = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        // عند وصول أول رد من الخادم
        if (!firstChunkReceived) {
          if (searchMessageId) {
            removeWebSearchMessage(searchMessageId);
          }
          if (!streamingState.isStreaming) {
            // ننشئ فقاعة البث هنا (مع البرق العادي)
            createStreamingMessage();
          }
          firstChunkReceived = true;
        }

        if (settings.activeMode === 'team') {
          processTeamChunk(chunk);
        } else {
          appendToStreamingMessage(chunk);
        }
      }

      // إذا لم تصل أي بيانات (رد فارغ)، تأكد من إزالة رسالة البحث
      if (!firstChunkReceived && searchMessageId) {
        removeWebSearchMessage(searchMessageId);
      }

      // اكتمال طبيعي
      if (settings.activeMode === 'team') {
        finalizeTeamStreaming();
      } else {
        appendToStreamingMessage('', true);
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        console.debug('Streaming aborted by user.');
        if (searchMessageId) {
          removeWebSearchMessage(searchMessageId);
        }
        return;
      }
      throw error;

    } finally {
      streamingState.streamController = null;
    }

  } catch (error) {
    if (searchMessageId) {
      removeWebSearchMessage(searchMessageId);
    }
    if (error.name !== 'AbortError') {
      appendToStreamingMessage(`\n\n❌ حدث خطأ أثناء الاتصال بالخادم: ${error.message}`, true);
    }
    throw error;
  }
}

// =================== نهاية الكود الجديد ===================

// Rest of the existing functions (chat management, UI functions, etc.)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    const messagesArea = document.getElementById('messagesArea');
    // التمرير الفوري للأسفل
    messagesArea.scrollTop = messagesArea.scrollHeight;

    // التمرير السلس للأسفل كنسخة احتياطية
    setTimeout(() => {
        messagesArea.scrollTo({
            top: messagesArea.scrollHeight,
            behavior: 'smooth'
        });
    }, 50);
}

function updateSendButton() {
  const input = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendButton');
  const fileInput = document.getElementById('fileInput');

  const hasText = input.value.trim().length > 0;
  const hasFiles = fileInput.files.length > 0;

  // إزالة أي ألوان سابقة
  sendButton.classList.remove(
    'bg-red-600', 'hover:bg-red-700',
    'bg-zeus-accent', 'hover:bg-zeus-accent-hover',
    'bg-gray-600', 'cursor-not-allowed', 'opacity-60'
  );

  if (streamingState.isStreaming) {
    sendButton.disabled = false;
    sendButton.onclick = () => cancelStreaming('button');
    sendButton.innerHTML = '<i class="fas fa-stop"></i>';
    sendButton.classList.add('bg-red-600', 'hover:bg-red-700');
  } else {
    const enabled = hasText || hasFiles;
    sendButton.disabled = !enabled;
    sendButton.onclick = () => sendMessage();
    sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';

    if (enabled) {
      sendButton.classList.add('bg-zeus-accent', 'hover:bg-zeus-accent-hover');
    } else {
      sendButton.classList.add('bg-gray-600', 'cursor-not-allowed', 'opacity-60');
    }
  }
}

// ==== إلغاء البث الحالي ====
function cancelStreaming(reason = 'user') {
  if (!streamingState.isStreaming) return;

  try {
    if (streamingState.streamController) {
      streamingState.streamController.abort(); // يقطع fetch فوراً
    }
  } catch (_) {}

  // إنهاء بصري أنيق مع حفظ ما وصلنا إليه
  appendToStreamingMessage('\n\n⏹️ تم إيقاف التوليد.', true);

  // تحديث الحالة والزر
  streamingState.isStreaming = false;
  streamingState.streamController = null;
  updateSendButton();

  // إشعار اختياري
  showNotification('تم إيقاف التوليد', 'info');
}

// إلغاء عند إغلاق/تحديث الصفحة
window.addEventListener('beforeunload', () => {
  if (streamingState.isStreaming && streamingState.streamController) {
    streamingState.streamController.abort();
  }
});

// اختصار لوحة المفاتيح: Escape يوقف البث
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && streamingState.isStreaming) {
    cancelStreaming('escape');
  }
});

// Chat management functions