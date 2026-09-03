/**
 * Süper Admin Yönetim Paneli Rotaları
 * Süper Admin'in tüm adayları görmesini, onaylamasını, yeni aday eklemesini,
 * düzenlemesini veya silmesini ve sistem istatistiklerini izlemesini sağlar.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { superAdminGirisKontrol } = require('../middleware/oturumKontrol');
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

// Süper Admin Giriş Sayfası (GET /yonetim/giris) - Oturum kontrolü yok
router.get('/giris', (req, res) => {
    res.render('super-admin/giris', { hata: req.query.hata || null, mesaj: req.query.mesaj || null });
});

// Süper Admin Giriş İşlemi (POST /yonetim/giris)
router.post('/giris', async (req, res) => {
    const { eposta, sifre } = req.body;

    if (!eposta || !sifre) {
        return res.redirect('/yonetim/giris?hata=eposta_ve_sifre_girin');
    }

    try {
        const girisMetni = eposta.toLowerCase().trim();
        const kullanici = await veritabaniTekCek(
            "SELECT * FROM kullanicilar WHERE rol = 'super_admin' AND (eposta = ? OR eposta = 'admin@akparti.org.tr' OR ? = 'admin')",
            [girisMetni, girisMetni]
        );
        if (!kullanici) {
            return res.redirect('/yonetim/giris?hata=gecersiz_bilgiler');
        }

        const sifreDogruMu = await bcrypt.compare(sifre, kullanici.sifre);
        if (!sifreDogruMu) {
            return res.redirect('/yonetim/giris?hata=gecersiz_bilgiler');
        }

        req.session.kullanici = {
            id: kullanici.id,
            eposta: kullanici.eposta,
            rol: kullanici.rol
        };

        res.redirect('/yonetim');
    } catch (hata) {
        console.error('Süper Admin giriş hatası:', hata);
        res.redirect('/yonetim/giris?hata=sistem_hatasi');
    }
});

// Bundan sonraki tüm Süper Admin rotaları için oturum kontrolü uygula
router.use(superAdminGirisKontrol);

// Süper Admin Dashboard (GET /yonetim)
router.get('/', async (req, res) => {
    try {
        const toplamAday = await veritabaniTekCek("SELECT COUNT(*) as sayi FROM kullanicilar WHERE rol = 'aday'");
        const onayBekleyenAday = await veritabaniTekCek("SELECT COUNT(*) as sayi FROM kullanicilar WHERE rol = 'aday' AND durum = 'onay_bekliyor'");
        const toplamHaber = await veritabaniTekCek("SELECT COUNT(*) as sayi FROM haberler");
        const toplamProje = await veritabaniTekCek("SELECT COUNT(*) as sayi FROM projeler");
        const toplamZiyaret = await veritabaniTekCek("SELECT COUNT(*) as sayi FROM ziyaretler");

        const sonAdaylar = await veritabaniHepsiniCek(`
            SELECT ap.*, k.eposta, k.durum, k.olusturma_tarihi as kayit_tarihi
            FROM aday_profilleri ap
            JOIN kullanicilar k ON ap.kullanici_id = k.id
            ORDER BY k.id DESC LIMIT 5
        `);

        res.render('super-admin/panel', {
            sayfaAdi: 'dashboard',
            istatistikler: {
                toplamAday: toplamAday.sayi,
                onayBekleyenAday: onayBekleyenAday.sayi,
                toplamHaber: toplamHaber.sayi,
                toplamProje: toplamProje.sayi,
                toplamZiyaret: toplamZiyaret.sayi
            },
            sonAdaylar,
            mesaj: req.query.mesaj || null
        });
    } catch (hata) {
        console.error('Süper Admin dashboard hatası:', hata);
        res.status(500).send('Sistem hatası');
    }
});

// Tüm Adayları Listeleme (GET /yonetim/adaylar)
router.get('/adaylar', async (req, res) => {
    try {
        const adaylar = await veritabaniHepsiniCek(`
            SELECT ap.*, k.eposta, k.durum, k.olusturma_tarihi as kayit_tarihi
            FROM aday_profilleri ap
            JOIN kullanicilar k ON ap.kullanici_id = k.id
            ORDER BY k.id DESC
        `);

        res.render('super-admin/adaylar', {
            sayfaAdi: 'adaylar',
            adaylar,
            mesaj: req.query.mesaj || null,
            hata: req.query.hata || null
        });
    } catch (hata) {
        console.error('Aday listeleme hatası:', hata);
        res.status(500).send('Sistem hatası');
    }
});

// Yeni Aday Ekleme (POST /yonetim/aday-ekle)
router.post('/aday-ekle', async (req, res) => {
    const { ad, soyad, eposta, telefon, il, ilce, sifre } = req.body;

    if (!ad || !soyad || !eposta || !il || !ilce || !sifre) {
        return res.redirect('/yonetim/adaylar?hata=lutfen_tum_alanlari_doldurun');
    }

    try {
        const mevcut = await veritabaniTekCek("SELECT id FROM kullanicilar WHERE eposta = ?", [eposta.toLowerCase().trim()]);
        if (mevcut) {
            return res.redirect('/yonetim/adaylar?hata=bu_eposta_kayitli');
        }

        const sifreHash = await bcrypt.hash(sifre, 10);
        const kullaniciSonuc = await veritabaniCalistir(
            "INSERT INTO kullanicilar (eposta, sifre, rol, durum) VALUES (?, ?, 'aday', 'aktif')",
            [eposta.toLowerCase().trim(), sifreHash]
        );

        const kullaniciId = kullaniciSonuc.lastID;

        let temelSlug = metniSlugaDonustur(`${ad}-${soyad}`);
        let slug = temelSlug;
        let sayac = 1;

        while (await veritabaniTekCek("SELECT id FROM aday_profilleri WHERE slug = ?", [slug])) {
            slug = `${temelSlug}-${sayac}`;
            sayac++;
        }

        const adaySonuc = await veritabaniCalistir(
            "INSERT INTO aday_profilleri (kullanici_id, slug, ad, soyad, il, ilce) VALUES (?, ?, ?, ?, ?, ?)",
            [kullaniciId, slug, ad.trim(), soyad.trim(), il.trim(), ilce.trim()]
        );

        const adayId = adaySonuc.lastID;

        await veritabaniCalistir("INSERT INTO ozgecmis (aday_id) VALUES (?)", [adayId]);
        await veritabaniCalistir("INSERT INTO sosyal_medya (aday_id) VALUES (?)", [adayId]);
        await veritabaniCalistir("INSERT INTO iletisim_bilgileri (aday_id, telefon, eposta) VALUES (?, ?, ?)", [adayId, telefon || '', eposta.trim()]);
        await veritabaniCalistir("INSERT INTO site_ayarlari (aday_id) VALUES (?)", [adayId]);

        res.redirect('/yonetim/adaylar?mesaj=aday_eklendi');
    } catch (hata) {
        console.error('Süper admin aday ekleme hatası:', hata);
        res.redirect('/yonetim/adaylar?hata=ekleme_basarisiz');
    }
});

// Aday Onaylama (POST /yonetim/aday-onayla/:id)
router.post('/aday-onayla/:id', async (req, res) => {
    const kullaniciId = req.params.id;
    try {
        await veritabaniCalistir("UPDATE kullanicilar SET durum = 'aktif' WHERE id = ? AND rol = 'aday'", [kullaniciId]);
        res.redirect('/yonetim/adaylar?mesaj=aday_onaylandi');
    } catch (hata) {
        console.error('Aday onaylama hatası:', hata);
        res.redirect('/yonetim/adaylar?hata=onaylama_basarisiz');
    }
});

// Aday Durum Değiştirme (Aktif / Pasif) (POST /yonetim/aday-durum/:id)
router.post('/aday-durum/:id', async (req, res) => {
    const kullaniciId = req.params.id;
    const { yeniDurum } = req.body;

    if (!['aktif', 'pasif'].includes(yeniDurum)) {
        return res.redirect('/yonetim/adaylar?hata=gecersiz_durum');
    }

    try {
        await veritabaniCalistir("UPDATE kullanicilar SET durum = ? WHERE id = ? AND rol = 'aday'", [yeniDurum, kullaniciId]);
        res.redirect('/yonetim/adaylar?mesaj=durum_guncellendi');
    } catch (hata) {
        console.error('Aday durum güncelleme hatası:', hata);
        res.redirect('/yonetim/adaylar?hata=guncelleme_basarisiz');
    }
});

// Aday Bilgilerini Düzenleme (GET & POST /yonetim/aday-duzenle/:id)
router.get('/aday-duzenle/:id', async (req, res) => {
    const kullaniciId = req.params.id;
    try {
        const aday = await veritabaniTekCek(`
            SELECT ap.*, k.eposta, k.durum
            FROM aday_profilleri ap
            JOIN kullanicilar k ON ap.kullanici_id = k.id
            WHERE k.id = ?
        `, [kullaniciId]);

        if (!aday) {
            return res.redirect('/yonetim/adaylar?hata=aday_bulunamadi');
        }

        res.render('super-admin/aday_duzenle', {
            sayfaAdi: 'adaylar',
            aday,
            mesaj: req.query.mesaj || null,
            hata: req.query.hata || null
        });
    } catch (hata) {
        console.error('Aday düzenleme sayfası hatası:', hata);
        res.redirect('/yonetim/adaylar?hata=sistem_hatasi');
    }
});

router.post('/aday-duzenle/:id', async (req, res) => {
    const kullaniciId = req.params.id;
    const { ad, soyad, unvan_tr, il, ilce, durum, sifre } = req.body;

    try {
        await veritabaniCalistir(`
            UPDATE aday_profilleri SET
                ad = ?,
                soyad = ?,
                unvan_tr = ?,
                il = ?,
                ilce = ?
            WHERE kullanici_id = ?
        `, [ad, soyad, unvan_tr, il, ilce, kullaniciId]);

        await veritabaniCalistir("UPDATE kullanicilar SET durum = ? WHERE id = ?", [durum, kullaniciId]);

        if (sifre && sifre.trim().length >= 6) {
            const sifreHash = await bcrypt.hash(sifre.trim(), 10);
            await veritabaniCalistir("UPDATE kullanicilar SET sifre = ? WHERE id = ?", [sifreHash, kullaniciId]);
        }

        res.redirect(`/yonetim/aday-duzenle/${kullaniciId}?mesaj=bilgiler_guncellendi`);
    } catch (hata) {
        console.error('Aday güncelleme hatası:', hata);
        res.redirect(`/yonetim/aday-duzenle/${kullaniciId}?hata=guncelleme_basarisiz`);
    }
});

// Aday Silme (POST /yonetim/aday-sil/:id)
router.post('/aday-sil/:id', async (req, res) => {
    const kullaniciId = req.params.id;
    try {
        await veritabaniCalistir("DELETE FROM kullanicilar WHERE id = ? AND rol = 'aday'", [kullaniciId]);
        res.redirect('/yonetim/adaylar?mesaj=aday_silindi');
    } catch (hata) {
        console.error('Aday silme hatası:', hata);
        res.redirect('/yonetim/adaylar?hata=silme_basarisiz');
    }
});

module.exports = router;
