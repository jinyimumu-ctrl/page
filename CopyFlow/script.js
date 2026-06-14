let chunks = []; // 每项 { text: string, breakAfter: boolean }
let index = 0;

const LINEBREAK_SVG = `<span class="linebreak-icon" title="换行"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg></span>`;
const INDENT_HINT = `<span class="indent-hint" title="开头空两格"><span class="indent-rect"></span><span class="indent-rect"></span></span>`;

const pageInput = document.getElementById('pageInput');
const pageTotal = document.getElementById('pageTotal');

/* ---------------- Markdown 清理 ---------------- */
function normalizeMarkdown(text) {
    let lines = text.split('\n');
    let processed = [];

    for (let line of lines) {
        let trimmed = line.trim();

        // 分隔线 --- *** ___ (整行) -> 删除
        if (/^([-*_])(\s*\1){2,}\s*$/.test(trimmed)) {
            continue;
        }

        // 标题 # ## ### -> 去掉前缀
        trimmed = trimmed.replace(/^#{1,6}\s+/, '');
        // 引用 >
        trimmed = trimmed.replace(/^>\s?/, '');
        // 列表标记 -, *, +, 数字./数字、
        trimmed = trimmed.replace(/^([-*+]|\d+[.、])\s+/, '');

        processed.push(trimmed);
    }

    text = processed.join('\n');

    text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');      // 图片
    text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');        // 链接
    text = text.replace(/`([^`]+)`/g, '$1');                    // 行内代码
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');              // 加粗 **
    text = text.replace(/__([^_]+)__/g, '$1');                  // 加粗 __
    text = text.replace(/~~([^~]+)~~/g, '$1');                  // 删除线
    text = text.replace(/\*([^*\n]+)\*/g, '$1');                // 斜体 *
    text = text.replace(/(?<![\w_])_([^_\n]+)_(?![\w_])/g, '$1'); // 斜体 _

    return text;
}

/* ---------------- 分段与断句 ---------------- */
function splitText(text) {
    text = normalizeMarkdown(text);

    // 仅句末标点触发换行；逗号、顿号、引号等不触发，除非单句达到最大字数
    const breakPunctuation = /[。！？]/;
    const paragraphs = text.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
    let result = [];

    paragraphs.forEach((para, pIdx) => {
        let raw = [];
        let current = "";

        for (let ch of para) {
            current += ch;
            if (current.length >= maxChars) {
                raw.push(current);
                current = "";
            } else if (breakPunctuation.test(ch)) {
                if (current.trim()) raw.push(current.trim());
                current = "";
            }
        }
        if (current.trim()) raw.push(current.trim());

        raw.forEach((b, bIdx) => {
            result.push({
                text: b,
                breakAfter: bIdx === raw.length - 1 && pIdx < paragraphs.length - 1,
                paragraphStart: bIdx === 0
            });
        });
    });

    return result;
}

/* ---------------- 主题切换 ---------------- */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeIconSun').style.display = theme === 'dark' ? 'none' : 'block';
    document.getElementById('themeIconMoon').style.display = theme === 'dark' ? 'block' : 'none';
    localStorage.setItem('copyHelperTheme', theme);
}

function initTheme() {
    const saved = localStorage.getItem('copyHelperTheme');
    if (saved) {
        applyTheme(saved);
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
    }
}

document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('copyHelperTheme')) {
        applyTheme(e.matches ? 'dark' : 'light');
    }
});

/* ---------------- Overlay 动画工具 ---------------- */
function showOverlay(overlay) {
    overlay.classList.remove('hidden');
    // 强制重排后触发进入动画
    overlay.offsetHeight;
    overlay.classList.remove('anim-out');
    overlay.classList.add('anim-in');
}

function hideOverlay(overlay) {
    overlay.classList.remove('anim-in');
    overlay.classList.add('anim-out');
    overlay.addEventListener('animationend', function handler() {
        overlay.removeEventListener('animationend', handler);
        overlay.classList.add('hidden');
        overlay.classList.remove('anim-out');
    }, { once: true });
}

/* ---------------- 设置与关于弹窗 ---------------- */
const settingsOverlay = document.getElementById('settingsOverlay');

document.getElementById('settingsToggle').addEventListener('click', () => {
    showOverlay(settingsOverlay);
});
document.getElementById('settingsClose').addEventListener('click', () => {
    hideOverlay(settingsOverlay);
});
settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) hideOverlay(settingsOverlay);
});
document.getElementById('reEnterBtn').addEventListener('click', () => {
    hideOverlay(settingsOverlay);
    reset();
});

/* ---------------- 用户协议弹窗 ---------------- */
const agreementOverlay = document.getElementById('agreementOverlay');

if (agreementOverlay) {
    document.getElementById('agreementBtn').addEventListener('click', () => {
        showOverlay(agreementOverlay);
    });
    document.getElementById('agreementClose').addEventListener('click', () => {
        hideOverlay(agreementOverlay);
    });
    agreementOverlay.addEventListener('click', (e) => {
        if (e.target === agreementOverlay) hideOverlay(agreementOverlay);
    });
}

/* ---------------- 简约模式 ---------------- */
function applySimpleMode(enabled) {
    document.documentElement.setAttribute('data-simple', enabled ? 'true' : 'false');
    localStorage.setItem('copyHelperSimple', enabled ? '1' : '0');
}

function initSimpleMode() {
    const saved = localStorage.getItem('copyHelperSimple') === '1';
    document.getElementById('simpleModeToggle').checked = saved;
    applySimpleMode(saved);
}

document.getElementById('simpleModeToggle').addEventListener('change', (e) => {
    applySimpleMode(e.target.checked);
});

/* ---------------- 单行最大字数 ---------------- */
let maxChars = 10;

function applyMaxChars(value) {
    maxChars = value;
    localStorage.setItem('copyHelperMaxChars', String(value));
}

function initMaxChars() {
    const saved = parseInt(localStorage.getItem('copyHelperMaxChars'), 10);
    const val = (saved >= 5 && saved <= 50) ? saved : 10;
    document.getElementById('maxCharsInput').value = val;
    applyMaxChars(val);
}

document.getElementById('maxCharsInput').addEventListener('change', (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 5) val = 5;
    if (val > 50) val = 50;
    e.target.value = val;
    applyMaxChars(val);
});

/* ---------------- 点击以递进 ---------------- */
let clickAdvanceEnabled = false;

function applyClickAdvance(enabled) {
    clickAdvanceEnabled = enabled;
    localStorage.setItem('copyHelperClickAdvance', enabled ? '1' : '0');
}

function initClickAdvance() {
    const saved = localStorage.getItem('copyHelperClickAdvance') === '1';
    document.getElementById('clickAdvanceToggle').checked = saved;
    applyClickAdvance(saved);
}

document.getElementById('clickAdvanceToggle').addEventListener('change', (e) => {
    applyClickAdvance(e.target.checked);
});

document.addEventListener('click', (e) => {
    if (!clickAdvanceEnabled) return;
    // 忽略按钮、输入框、链接、设置面板内的点击
    if (e.target.closest('button, input, a, label, #progress, #settingsOverlay, #setupOverlay')) return;
    const setupHidden = document.getElementById('setupOverlay').classList.contains('hidden');
    if (!setupHidden) return;
    if (!settingsOverlay.classList.contains('hidden')) return;
    next();
});

/* ---------------- 移动端检测 ---------------- */
function detectMobile() {
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth <= 600;
    document.body.classList.toggle('mobile-mode', isMobile);
}
window.addEventListener('resize', detectMobile);

/* ---------------- 构建底层原文地图 ---------------- */
function buildBgContent() {
    let html = '';
    chunks.forEach((chunk, i) => {
        html += `<span class="bg-chunk" data-index="${i}">${escapeHtml(chunk.text)}</span>`;
        if (chunk.breakAfter) {
            html += '<br><br>';
        }
    });
    document.getElementById('bgContent').innerHTML = html;
}

/* ---------------- 流程控制 ---------------- */
function start() {
    const text = document.getElementById('inputText').value.trim();
    if (!text) return;

    chunks = splitText(text);
    index = 0;

    buildBgContent();

    hideOverlay(document.getElementById('setupOverlay'));
    document.getElementById('display').style.display = 'block';
    document.getElementById('finished').style.display = 'none';

    pageTotal.textContent = '/' + chunks.length;
    pageInput.style.width = (String(chunks.length).length + 0.2) + 'ch';

    detectMobile();
    update();
}

function update() {
    const prev = document.getElementById('prev');
    const currentLine = document.getElementById('current');
    const currentText = document.getElementById('currentText');
    const next = document.getElementById('next');

    if (index >= chunks.length) {
        document.getElementById('display').style.display = 'none';
        const finished = document.getElementById('finished');
        finished.style.display = 'flex';
        // 完成庆祝动画
        const mark = finished.querySelector('.mark');
        const text = finished.querySelector('.text');
        const sub = finished.querySelector('.sub');
        mark.classList.remove('anim-pop');
        text.classList.remove('anim-up');
        sub.classList.remove('anim-up');
        mark.offsetHeight; // 强制重排
        mark.classList.add('anim-pop');
        text.style.animationDelay = '0.2s';
        text.classList.add('anim-up');
        sub.style.animationDelay = '0.45s';
        sub.classList.add('anim-up');
        return;
    }

    /* ---- 中层主显示 ---- */
    prev.innerHTML = index > 0 ? escapeHtml(chunks[index - 1].text) : '';

    let currentHtml = '';
    if (chunks[index].paragraphStart) {
        currentHtml += INDENT_HINT;
    }
    currentHtml += escapeHtml(chunks[index].text);
    if (chunks[index].breakAfter) {
        currentHtml += LINEBREAK_SVG;
    }
    currentText.innerHTML = currentHtml;

    next.innerHTML = index < chunks.length - 1 ? escapeHtml(chunks[index + 1].text) : '';

    pageInput.value = index + 1;

    // 三行切换动画
    currentLine.classList.remove('line-flash');
    prev.classList.remove('line-anim');
    next.classList.remove('line-anim');
    currentLine.offsetHeight; // 强制重排
    currentLine.classList.add('line-flash');
    prev.classList.add('line-anim');
    next.classList.add('line-anim');

    /* ---- 底层地图：高亮当前句并滚动 ---- */
    const prevActive = document.querySelector('.bg-chunk.active');
    if (prevActive) prevActive.classList.remove('active');

    const activeChunk = document.querySelector(`.bg-chunk[data-index="${index}"]`);
    if (activeChunk) {
        activeChunk.classList.add('active');
        activeChunk.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function next() {
    if (index < chunks.length) {
        index++;
        update();
    }
}

function back() {
    if (index > 0) {
        index--;
        update();
    }
}

function reset() {
    showOverlay(document.getElementById('setupOverlay'));
    document.getElementById('display').style.display = 'none';
    document.getElementById('finished').style.display = 'none';
}

/* ---------------- 页码跳转 ---------------- */
function jumpToPage() {
    const val = parseInt(pageInput.value, 10);
    if (!isNaN(val) && val >= 1 && val <= chunks.length) {
        index = val - 1;
        update();
    } else {
        pageInput.value = index + 1;
    }
    pageInput.blur();
}

pageInput.addEventListener('focus', () => {
    pageInput.select();
});

document.getElementById('progress').addEventListener('click', () => {
    pageInput.focus();
    pageInput.select();
});

pageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        jumpToPage();
    } else if (e.key === 'Escape') {
        e.preventDefault();
        pageInput.value = index + 1;
        pageInput.blur();
    }
});

pageInput.addEventListener('blur', () => {
    pageInput.value = index + 1;
});

/* ---------------- 事件绑定 ---------------- */
document.addEventListener('keydown', (e) => {
    if (e.target && e.target.id === 'pageInput') return; // 输入框自行处理

    if (agreementOverlay && !agreementOverlay.classList.contains('hidden')) {
        if (e.key === 'Escape') {
            e.preventDefault();
            hideOverlay(agreementOverlay);
        }
        return;
    }

    if (!settingsOverlay.classList.contains('hidden')) {
        if (e.key === 'Escape') {
            e.preventDefault();
            hideOverlay(settingsOverlay);
        }
        return; // 设置面板打开时不响应其他快捷键
    }

    const setupHidden = document.getElementById('setupOverlay').classList.contains('hidden');
    if (!setupHidden) return; // 输入弹窗打开时不响应快捷键

    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        next();
    } else if (e.key === 'Backspace' || e.key === 'ArrowLeft') {
        e.preventDefault();
        back();
    } else if (e.key === 'Escape') {
        e.preventDefault();
        reset();
    }
});

document.getElementById('mobileNext').addEventListener('click', next);
document.getElementById('mobileBack').addEventListener('click', back);

/* ---------------- 初始化 ---------------- */
initTheme();
initSimpleMode();
initMaxChars();
initClickAdvance();
detectMobile();
