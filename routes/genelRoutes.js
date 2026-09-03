/**
 * Genel Rotalar (Kayıt, Giriş, Çıkış ve Kamusal Aday Tanıtım Sayfası)
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const {
    veritabaniCalistir,
    veritabaniTekCek,
    veritabaniHepsiniCek
} = require('../veritabani');

// Türkçe metni URL uyumlu slug yapısına dönüştürme fonksiyonu
function metniSlugaDonustur(metin) {
    let trHarfler = {
        'ç': 'c', 'Ç': 'c',
        'ğ': 'g', 'Ğ': 'g',
        'ı': 'i', 'İ': 'i',
        'ö': 'o', 'Ö': 'o',
        'ş': 's', 'Ş': 's',
        'ü': 'u', 'Ü': 'u'
    };
    let slug = metin.replace(/[çÇğĞıİöÖşŞüÜ]/g, (harf) => trHarfler[harf] || harf);
    return slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

// Ana Sayfa Yönlendirmesi
router.get('/', async (req, res) => {
    try {
        // Sistemdeki aktif ve yayında olan adayları getir
        const adaylar = await veritabaniHepsiniCek(`
            SELECT ap.* FROM aday_profilleri ap
            JOIN kullanicilar k ON ap.kullanici_id = k.id
            WHERE k.durum = 'aktif' AND ap.yayinda_mi = 1
            ORDER BY ap.id DESC
        `);
        res.render('ana_sayfa', { adaylar, mesaj: req.query.mesaj || null, hata: req.query.hata || null });
    } catch (hata) {
        console.error('Ana sayfa hatasi:', hata);
        res.status(500).send('Sistem hatasi olustu.');
    }
});

// Kayıt Sayfası (GET)
router.get('/kayit', (req, res) => {
    res.render('kayit', { hata: req.query.hata || null, mesaj: req.query.mesaj || null });
});

// Kayıt İşlemi (POST)
router.post('/kayit', async (req, res) => {
    const { ad, soyad, eposta, telefon, il, ilce, sifre, sifreTekrar } = req.body;

    // Girdi doğrulamaları
    if (!ad || !soyad || !eposta || !telefon || !il || !ilce || !sifre || !sifreTekrar) {
        return res.redirect('/kayit?hata=lutfen_tum_alanlari_doldurun');
    }

    if (sifre !== sifreTekrar) {
        return res.redirect('/kayit?hata=sifreler_eslesmiyor');
    }

    if (sifre.length < 6) {
        return res.redirect('/kayit?hata=sifre_en_az_6_karakter_olmalidir');
    }

    try {
        // E-posta mükerrerlik kontrolü
        const mevcutKullanici = await veritabaniTekCek("SELECT id FROM kullanicilar WHERE eposta = ?", [eposta.toLowerCase().trim()]);
        if (mevcutKullanici) {
            return res.redirect('/kayit?hata=bu_eposta_zaten_kayitli');
        }

        // Şifreyi bcrypt ile şifrele
        const sifreHash = await bcrypt.hash(sifre, 10);

        // Kullanıcıyı ekle (durum: onay_bekliyor)
        const kullaniciSonuc = await veritabaniCalistir(
            "INSERT INTO kullanicilar (eposta, sifre, rol, durum) VALUES (?, ?, 'aday', 'onay_bekliyor')",
            [eposta.toLowerCase().trim(), sifreHash]
        );

        const kullaniciId = kullaniciSonuc.lastID;

        // Benzersiz Slug Oluştur
        let temelSlug = metniSlugaDonustur(`${ad}-${soyad}`);
        let slug = temelSlug;
        let sayac = 1;

        while (await veritabaniTekCek("SELECT id FROM aday_profilleri WHERE slug = ?", [slug])) {
            slug = `${temelSlug}-${sayac}`;
            sayac++;
        }

        // Aday profilini ekle
        const adaySonuc = await veritabaniCalistir(
            "INSERT INTO aday_profilleri (kullanici_id, slug, ad, soyad, il, ilce) VALUES (?, ?, ?, ?, ?, ?)",
            [kullaniciId, slug, ad.trim(), soyad.trim(), il.trim(), ilce.trim()]
        );

        const adayId = adaySonuc.lastID;

        // Bağımlı varsayılan boş tabloları oluştur
        await veritabaniCalistir("INSERT INTO ozgecmis (aday_id) VALUES (?)", [adayId]);
        await veritabaniCalistir("INSERT INTO sosyal_medya (aday_id) VALUES (?)", [adayId]);
        await veritabaniCalistir("INSERT INTO iletisim_bilgileri (aday_id, telefon, eposta) VALUES (?, ?, ?)", [adayId, telefon.trim(), eposta.trim()]);
        await veritabaniCalistir("INSERT INTO site_ayarlari (aday_id) VALUES (?)", [adayId]);

        res.redirect('/giris?mesaj=kayit_basarili_onay_bekliyor');
    } catch (hata) {
        console.error('Kayıt oluşturma hatası:', hata);
        res.redirect('/kayit?hata=kayit_sirasinda_bir_hata_olustu');
    }
});

// Giriş Sayfası (GET)
router.get('/giris', (req, res) => {
    res.render('giris', { hata: req.query.hata || null, mesaj: req.query.mesaj || null });
});

// Giriş İşlemi (POST)
router.post('/giris', async (req, res) => {
    const { eposta, sifre } = req.body;

    if (!eposta || !sifre) {
        return res.redirect('/giris?hata=lutfen_eposta_ve_sifrenizi_girin');
    }

    try {
        const kullanici = await veritabaniTekCek("SELECT * FROM kullanicilar WHERE eposta = ?", [eposta.toLowerCase().trim()]);
        if (!kullanici) {
            return res.redirect('/giris?hata=gecersiz_eposta_veya_sifre');
        }

        // Şifre doğrulama
        const sifreDogruMu = await bcrypt.compare(sifre, kullanici.sifre);
        if (!sifreDogruMu) {
            return res.redirect('/giris?hata=gecersiz_eposta_veya_sifre');
        }

        // Durum Kontrolü
        if (kullanici.durum === 'onay_bekliyor') {
            return res.redirect('/giris?hata=hesabiniz_henuz_onaylanmadi');
        }

        if (kullanici.durum === 'pasif') {
            return res.redirect('/giris?hata=hesabiniz_pasife_alinmistir');
        }

        // Oturumu Başlat
        req.session.kullanici = {
            id: kullanici.id,
            eposta: kullanici.eposta,
            rol: kullanici.rol
        };

        if (kullanici.rol === 'super_admin') {
            return res.redirect('/yonetim');
        }

        return res.redirect('/panel');
    } catch (hata) {
        console.error('Giriş hatası:', hata);
        res.redirect('/giris?hata=giris_sirasinda_bir_hata_olustu');
    }
});

// Çıkış İşlemi (GET)
router.get('/cikis', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/giris?mesaj=cikis_yapildi');
    });
});

// Kamusal Aday Tanıtım Sayfası (GET /aday/:slug)
router.get('/aday/:slug', async (req, res) => {
    const slug = req.params.slug;

    try {
        const aday = await veritabaniTekCek(`
            SELECT ap.*, k.durum FROM aday_profilleri ap
            JOIN kullanicilar k ON ap.kullanici_id = k.id
            WHERE ap.slug = ?
        `, [slug]);

        if (!aday) {
            return res.status(404).render('hata', { mesaj: 'Aday bulunamadı.' });
        }

        // Yayında mı ve Aktif mi kontrolü
        if (aday.durum !== 'aktif' || aday.yayinda_mi !== 1) {
            return res.render('hata', { mesaj: 'Bu aday tanıtım sitesi geçici olarak yayında değildir.' });
        }

        // Ziyareti kaydet
        const ipAdresi = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        await veritabaniCalistir("INSERT INTO ziyaretler (aday_id, ip_adresi) VALUES (?, ?)", [aday.id, ipAdresi]);

        // Adaya ait tüm detayları çek
        const ozgecmis = await veritabaniTekCek("SELECT * FROM ozgecmis WHERE aday_id = ?", [aday.id]) || {};
        const vaatler = await veritabaniHepsiniCek("SELECT * FROM vaatler WHERE aday_id = ? ORDER BY sira ASC, id ASC", [aday.id]);
        const projeler = await veritabaniHepsiniCek("SELECT * FROM projeler WHERE aday_id = ? ORDER BY sira ASC, id DESC", [aday.id]);
        const haberler = await veritabaniHepsiniCek("SELECT * FROM haberler WHERE aday_id = ? ORDER BY id DESC", [aday.id]);
        const galeri = await veritabaniHepsiniCek("SELECT * FROM galeri WHERE aday_id = ? ORDER BY sira ASC, id DESC", [aday.id]);
        const sosyal = await veritabaniTekCek("SELECT * FROM sosyal_medya WHERE aday_id = ?", [aday.id]) || {};
        const iletisim = await veritabaniTekCek("SELECT * FROM iletisim_bilgileri WHERE aday_id = ?", [aday.id]) || {};
        const ayarlar = await veritabaniTekCek("SELECT * FROM site_ayarlari WHERE aday_id = ?", [aday.id]) || {};

        res.render('aday/tanitim', {
            aday,
            ozgecmis,
            vaatler,
            projeler,
            haberler,
            galeri,
            sosyal,
            iletisim,
            ayarlar
        });
    } catch (hata) {
        console.error('Aday tanıtım sayfası hatası:', hata);
        res.status(500).render('hata', { mesaj: 'Aday tanıtım sayfası yüklenirken bir hata oluştu.' });
    }
});

module.exports = router;
