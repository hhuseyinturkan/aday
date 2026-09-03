/**
 * AK Parti Aday Tanıtım Sistemi - İstemci Tarafı JavaScript Dosyası
 * Tema (Aydınlık/Karanlık) değişimi, Dil (TR/EN) geçişi ve Mobil menü kontrolü.
 */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. TEMA İŞLEMLERİ (Aydınlık / Karanlık Mod)
    // ==========================================
    const kayitliTema = localStorage.getItem('sistem_temasi') || 'light';
    temayiUygula(kayitliTema);

    const temaButonlari = document.querySelectorAll('.tema-degistir-btn');
    temaButonlari.forEach(btn => {
        btn.addEventListener('click', () => {
            const mevcutTema = document.documentElement.getAttribute('data-theme') || 'light';
            const yeniTema = mevcutTema === 'dark' ? 'light' : 'dark';
            temayiUygula(yeniTema);
            localStorage.setItem('sistem_temasi', yeniTema);
        });
    });

    function temayiUygula(tema) {
        document.documentElement.setAttribute('data-theme', tema);
        const temaMetinleri = document.querySelectorAll('.tema-durum-metni');
        temaMetinleri.forEach(el => {
            el.textContent = tema === 'dark' ? '☀️ Aydınlık' : '🌙 Karanlık';
        });
    }

    // ==========================================
    // 2. DİL İŞLEMLERİ (Türkçe / İngilizce)
    // ==========================================
    const kayitliDil = localStorage.getItem('sistem_dili') || 'tr';
    diliUygula(kayitliDil);

    const dilButonlari = document.querySelectorAll('.dil-degistir-btn');
    dilButonlari.forEach(btn => {
        btn.addEventListener('click', () => {
            const mevcutDil = localStorage.getItem('sistem_dili') || 'tr';
            const yeniDil = mevcutDil === 'tr' ? 'en' : 'tr';
            diliUygula(yeniDil);
            localStorage.setItem('sistem_dili', yeniDil);
        });
    });

    function diliUygula(dil) {
        // data-tr ve data-en attribute'u taşıyan elemanları güncelle
        const dilElemanlari = document.querySelectorAll('[data-tr][data-en]');
        dilElemanlari.forEach(el => {
            if (dil === 'en') {
                const enMetin = el.getAttribute('data-en');
                if (enMetin && enMetin.trim() !== '') {
                    el.textContent = enMetin;
                }
            } else {
                const trMetin = el.getAttribute('data-tr');
                if (trMetin) {
                    el.textContent = trMetin;
                }
            }
        });

        // .lang-tr ve .lang-en sınıflarını kontrol et
        const trBloqlari = document.querySelectorAll('.lang-tr');
        const enBloqlari = document.querySelectorAll('.lang-en');

        if (dil === 'en') {
            trBloqlari.forEach(b => b.style.display = 'none');
            enBloqlari.forEach(b => b.style.display = 'block');
        } else {
            trBloqlari.forEach(b => b.style.display = 'block');
            enBloqlari.forEach(b => b.style.display = 'none');
        }

        const dilEtiketleri = document.querySelectorAll('.dil-etiket-metni');
        dilEtiketleri.forEach(el => {
            el.textContent = dil === 'tr' ? 'EN' : 'TR';
        });
    }

    // ==========================================
    // 3. MOBİL MENÜ KONTROLÜ
    // ==========================================
    const mobilMenubtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobilMenubtn && navLinks) {
        mobilMenubtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
});
