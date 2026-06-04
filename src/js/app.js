DATA_1.forEach((d, i) => { d.n = i + 1; d.sem = 1; });
DATA_2.forEach((d, i) => { d.n = i + 1; d.sem = 2; });
const DATA = [...DATA_1, ...DATA_2];

let activeSem = 0;
let activeTag = 'Все';
let searchQuery = '';
let openId = null;

// Semester switcher
const semRow = document.getElementById('semRow');
[{ label: '1 семестр', val: 1 }, { label: '2 семестр', val: 2 }].forEach(({ label, val }) => {
    const btn = document.createElement('button');
    btn.className = 'sem-btn';
    btn.textContent = label;
    btn.addEventListener('click', () => {
        activeSem = activeSem === val ? 0 : val;
        document.querySelectorAll('.sem-btn').forEach(b => b.classList.remove('active'));
        if (activeSem === val) btn.classList.add('active');
        activeTag = 'Все';
        buildTags();
        render();
    });
    semRow.appendChild(btn);
});

// Build topic tags (filtered by active semester)
const tagsRow = document.getElementById('tagsRow');

function buildTags() {
    const pool = activeSem ? DATA.filter(d => d.sem === activeSem) : DATA;
    const tags = ['Все', ...new Set(pool.map(d => d.tag))];
    tagsRow.innerHTML = '';
    tags.forEach(t => {
        const el = document.createElement('div');
        el.className = 'tag' + (t === activeTag ? ' active' : '');
        el.textContent = t;
        el.addEventListener('click', () => {
            activeTag = t;
            document.querySelectorAll('.tag').forEach(x => x.classList.remove('active'));
            el.classList.add('active');
            render();
        });
        tagsRow.appendChild(el);
    });
}

buildTags();

// Search
const searchInput = document.getElementById('searchInput');
const clearBtn = document.getElementById('clearBtn');

searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim().toLowerCase();
    clearBtn.classList.toggle('visible', searchQuery.length > 0);
    render();
});

clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearBtn.classList.remove('visible');
    render();
    searchInput.focus();
});

function highlight(text, q) {
    if (!q) return text;
    return text.replace(
        new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
        '<mark>$1</mark>'
    );
}

function formatAnswer(text) {
    const blocks = [];
    // Вырезаем $$ и $ блоки, экранируем < > внутри них
    text = text.replace(/\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$/g, match => {
        const key = `%%BLOCK_${blocks.length}%%`;
        const fixed = match.replace(/</g, '\\lt ').replace(/>/g, '\\gt ');
        blocks.push(fixed);
        return key;
    });
    // Заменяем переносы строк в тексте
    text = text.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
    // Возвращаем блоки
    blocks.forEach((block, i) => {
        text = text.replace(`%%BLOCK_${i}%%`, block);
    });
    return text;
}

function render() {
    const list = document.getElementById('list');
    const counter = document.getElementById('counter');

    const items = DATA.filter(d =>
        (!activeSem || d.sem === activeSem) &&
        (activeTag === 'Все' || d.tag === activeTag) &&
        (!searchQuery || d.question.toLowerCase().includes(searchQuery))
    );

    counter.textContent = items.length + ' / ' + DATA.length;

    if (!items.length) {
        list.innerHTML = `
        <div class="empty">
            <div class="empty-icon">🔍</div>
            <div class="empty-text">Ничего не найдено</div>
        </div>`;
        return;
    }

    list.innerHTML = items.map(d => {
        const isGraph = d.answer === '__GRAPH__';
        const bodyContent = isGraph ? buildGraphCard(d.id) : `
            <div class="card-answer">
                <div class="answer-label">Определение</div>
                <div class="answer-text" id="ans-${d.id}">${formatAnswer(d.answer)}</div>
            </div>`;
        return `
    <div class="card ${openId === d.id ? 'open' : ''}" data-id="${d.id}">
        <div class="card-header" onclick="toggle(${d.id})">
            <div class="card-badge">${d.n}</div>
            <div class="card-question">${highlight(d.question, searchQuery)}</div>
            <div class="card-chevron">›</div>
        </div>
        <div class="card-body">${bodyContent}</div>
    </div>`;
    }).join('');

    if (openId) {
        setTimeout(() => typeset(openId), 150);
    }
}

function buildGraphCard(id) {
    const cardId = 'gc-' + id;
    const items = GRAPHS.map((g, i) => `
        <div class="graph-item ${i === 0 ? 'active' : ''}" data-graph="${g.id}">${g.label}</div>
    `).join('');
    return `
        <div class="graph-card-inner" id="${cardId}">
            <div class="graph-topbar">
                <span class="graph-current-label">${GRAPHS[0].label}</span>
                <button class="graph-burger">☰ Выбрать</button>
            </div>
            <canvas id="graph-canvas-${cardId}" width="320" height="240" style="width:100%;border-radius:8px;display:block;"></canvas>
            <div class="graph-overlay"></div>
            <div class="graph-sheet" id="graph-sheet-${cardId}">
                <div class="graph-sheet-title">Функция</div>
                ${items}
            </div>
        </div>`;
}

function typeset(id) {
    if (!window.MathJax) return;
    const el = document.getElementById('ans-' + id);
    if (el) MathJax.typesetPromise([el]).catch(() => {});
}

function toggle(id) {
    const wasOpen = openId === id;
    openId = wasOpen ? null : id;
    render();
    if (!wasOpen) {
        setTimeout(() => {
            typeset(id);
            // init graph card if needed
            const d = DATA.find(x => x.id === id);
            if (d && d.answer === '__GRAPH__') {
                initGraphCard('gc-' + id);
            }
            const card = document.querySelector(`[data-id="${id}"]`);
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 150);
    }
}

render();
