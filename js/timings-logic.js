// Timings Logic for exploring mp3quran ayat timings

let allReciters = [];
let selectedReciter = null;
let selectedSurah = null;

const surahNames = [
    "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس",
    "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه",
    "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم",
    "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر",
    "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق",
    "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة",
    "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج",
    "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس",
    "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد",
    "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات",
    "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر",
    "المسد", "الإخلاص", "الفلق", "الناس"
];

document.addEventListener('DOMContentLoaded', () => {
    fetchReciters();

    document.getElementById('reciter-search').addEventListener('input', (e) => {
        filterReciters(e.target.value);
    });
});

async function fetchReciters() {
    try {
        const res = await fetch('https://www.mp3quran.net/api/v3/reciters?language=ar');
        const data = await res.json();
        allReciters = data.reciters;
        renderReciters(allReciters);
    } catch (e) {
        document.getElementById('reciters-list').innerHTML = `<div class="error">فشل تحميل القراء</div>`;
    }
}

function renderReciters(list) {
    const container = document.getElementById('reciters-list');
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">لا يوجد نتائج</div>';
        return;
    }

    list.forEach(r => {
        const card = document.createElement('div');
        card.className = 'glass-panel reciter-card animate-fade';
        card.innerHTML = `
            <i class="fa-solid fa-user-tie"></i>
            <h4 style="font-size: 0.9rem;">${r.name}</h4>
        `;
        card.onclick = () => selectReciter(r);
        container.appendChild(card);
    });
}

function filterReciters(query) {
    const filtered = allReciters.filter(r => r.name.includes(query));
    renderReciters(filtered);
}

function selectReciter(reciter) {
    selectedReciter = reciter;
    document.getElementById('selected-reciter-name').innerText = `القارئ: ${reciter.name}`;
    showSection('surahs');
    renderSurahIndex();
}

function renderSurahIndex() {
    const container = document.getElementById('surahs-list');
    container.innerHTML = '';

    surahNames.forEach((name, index) => {
        const num = index + 1;
        const card = document.createElement('div');
        card.className = 'glass-panel surah-card animate-fade';
        card.innerHTML = `
            <span style="font-size: 0.7rem; opacity: 0.5;">${num}</span>
            <h4 class="arabic-text">${name}</h4>
        `;
        card.onclick = () => selectSurah(num, name);
        container.appendChild(card);
    });
}

async function selectSurah(num, name) {
    selectedSurah = { num, name };
    document.getElementById('selected-surah-reciter').innerText = `القارئ: ${selectedReciter.name}`;
    document.getElementById('selected-surah-name').innerText = `سورة ${name}`;
    showSection('timings');
    fetchTimings(num);
}

async function fetchTimings(surahNum) {
    const container = document.getElementById('timings-results');
    container.innerHTML = '<div class="loading">جاري جلب التوقيتات لـ ' + selectedReciter.name + '...</div>';

    try {
        const res = await fetch(`https://mp3quran.net/api/ayat_timing?surah=${surahNum}&read=${selectedReciter.id}`);
        const timings = await res.json();

        if (!timings || timings.length === 0) {
            container.innerHTML = `
                <div class="loading" style="color: #ff6b6b;">
                    <i class="fa-solid fa-circle-exclamation" style="font-size: 2rem; margin-bottom: 15px; display: block;"></i>
                    عذراً، لا تتوفر بيانات توقيت لهذا القارئ لهذه السورة في الـ API.
                </div>`;
            return;
        }

        let html = `
            <div class="timing-row timing-header">
                <span>الآية</span>
                <span>المسار البرمجي</span>
                <span>البداية (ث)</span>
                <span>النهاية (ث)</span>
            </div>
        `;

        timings.forEach(t => {
            html += `
                <div class="timing-row animate-fade">
                    <span style="color: var(--accent); font-weight: bold;">${t.ayah}</span>
                    <span style="font-size: 0.7rem; opacity: 0.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t.polygon.substring(0, 20)}...</span>
                    <span>${(t.start_time / 1000).toFixed(2)}</span>
                    <span>${(t.end_time / 1000).toFixed(2)}</span>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<div class="loading">خطأ في الاتصال بالـ API</div>`;
    }
}

function showSection(id) {
    document.querySelectorAll('.view-section').forEach(s => s.style.display = 'none');
    document.getElementById(`${id}-section`).style.display = 'block';
    window.scrollTo(0, 0);
}
