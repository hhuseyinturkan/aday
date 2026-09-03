/**
 * Aday Yönetim Paneli Rotaları
 * Adayın kendi kişisel bilgilerini ve sayfa içeriklerini yönetmesini sağlar.
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { adayGirisKontrol } = require('../middleware/oturumKontrol');
const dosyaYukle = require('../middleware/dosyaYukle');
const {
    veritabaniCalistir,
    veritabaniTekCek,
    veritabaniHepsiniCek
} = require('../veritabani');
const { otomatikCevir } = require('../utils/cevirici');

// Sunucudan resim dosyasını güvenli şekilde silme yardımcı fonksiyonu
function resimSil(resimYolu) {
    if (!resimYolu) return;
    if (typeof resimYolu === 'string' && resimYolu.startsWith('/uploads/')) {
        const tamYol = path.join(__dirname, '../public', resimYolu);
        if (fs.existsSync(tamYol)) {
            try {
                fs.unlinkSync(tamYol);
            } catch (hata) {
                console.error('Dosya silinirken hata oluştu:', hata);
            }
        }
    }
}

// Aday Giriş Kontrol Middleware'ini Tüm Panel Rotalarında Kullan
router.use(adayGirisKontrol);

// 1. Genel Bakış Dashboard (GET /panel)
router.get('/', async (req, res) => {
    const adayId = req.adayProfili.id;
    try {
        const ziyaretSayisi = await veritabaniTekCek("SELECT COUNT(*) as sayi FROM ziyaretler WHERE aday_id = ?", [adayId]);
        const projeSayisi = await veritabaniTekCek("SELECT COUNT(*) as sayi FROM projeler WHERE aday_id = ?", [adayId]);
        const haberSayisi = await veritabaniTekCek("SELECT COUNT(*) as sayi FROM haberler WHERE aday_id = ?", [adayId]);
        const vaatSayisi = await veritabaniTekCek("SELECT COUNT(*) as sayi FROM vaatler WHERE aday_id = ?", [adayId]);

        res.render('panel/geneller', {
            sayfaAdi: 'geneller',
            istatistikler: {
                ziyaret: ziyaretSayisi.sayi,
                proje: projeSayisi.sayi,
                haber: haberSayisi.sayi,
                vaat: vaatSayisi.sayi
            },
            mesaj: req.query.mesaj || null
        });
    } catch (hata) {
        console.error('Panel genel bakis hatasi:', hata);
        res.status(500).send('Sistem hatasi');
    }
});

// 2. Kişisel Bilgiler (GET & POST /panel/kisisel-bilgiler)
router.get('/kisisel-bilgiler', (req, res) => {
    res.render('panel/kisisel', {
        sayfaAdi: 'kisisel',
        mesaj: req.query.mesaj || null,
        hata: req.query.hata || null
    });
});

router.post('/kisisel-bilgiler', dosyaYukle.fields([
    { name: 'profil_resmi', maxCount: 1 },
    { name: 'kapak_resmi', maxCount: 1 }
]), async (req, res) => {
    const adayId = req.adayProfili.id;
    const { ad, soyad, unvan_tr, unvan_en, il, ilce, kisa_tanitim_tr, kisa_tanitim_en, sil_profil_resmi, sil_kapak_resmi } = req.body;

    try {
        let profilResmiYolu = req.adayProfili.profil_resmi;
        let kapakResmiYolu = req.adayProfili.kapak_resmi;

        // Profil Resmi Silme veya Güncelleme Kontrolü
        if (sil_profil_resmi === '1' || sil_profil_resmi === 'on') {
            resimSil(profilResmiYolu);
            profilResmiYolu = null;
        }

        if (req.files && req.files['profil_resmi']) {
            if (req.adayProfili.profil_resmi) {
                resimSil(req.adayProfili.profil_resmi);
            }
            profilResmiYolu = '/uploads/' + req.files['profil_resmi'][0].filename;
        }

        // Kapak Resmi Silme veya Güncelleme Kontrolü
        if (sil_kapak_resmi === '1' || sil_kapak_resmi === 'on') {
            resimSil(kapakResmiYolu);
            kapakResmiYolu = null;
        }

        if (req.files && req.files['kapak_resmi']) {
            if (req.adayProfili.kapak_resmi) {
                resimSil(req.adayProfili.kapak_resmi);
            }
            kapakResmiYolu = '/uploads/' + req.files['kapak_resmi'][0].filename;
        }

        let cUnvanEn = unvan_en || (unvan_tr ? await otomatikCevir(unvan_tr) : '');
        let cKisaTanitimEn = kisa_tanitim_en || (kisa_tanitim_tr ? await otomatikCevir(kisa_tanitim_tr) : '');

        await veritabaniCalistir(`
            UPDATE aday_profilleri SET
                ad = ?,
                soyad = ?,
                unvan_tr = ?,
                unvan_en = ?,
                il = ?,
                ilce = ?,
                kisa_tanitim_tr = ?,
                kisa_tanitim_en = ?,
                profil_resmi = ?,
                kapak_resmi = ?
            WHERE id = ?
        `, [ad, soyad, unvan_tr, cUnvanEn, il, ilce, kisa_tanitim_tr, cKisaTanitimEn, profilResmiYolu, kapakResmiYolu, adayId]);

        res.redirect('/panel/kisisel-bilgiler?mesaj=bilgiler_guncellendi');
    } catch (hata) {
        console.error('Kişisel bilgiler güncelleme hatası:', hata);
        res.redirect('/panel/kisisel-bilgiler?hata=guncelleme_basarisiz');
    }
});

// Profil Fotoğrafı Tek Tıkla Silme (POST /panel/profil-resmi-sil)
router.post('/profil-resmi-sil', async (req, res) => {
    const adayId = req.adayProfili.id;
    try {
        if (req.adayProfili.profil_resmi) {
            resimSil(req.adayProfili.profil_resmi);
            await veritabaniCalistir("UPDATE aday_profilleri SET profil_resmi = NULL WHERE id = ?", [adayId]);
        }
        res.redirect('/panel/kisisel-bilgiler?mesaj=profil_resmi_silindi');
    } catch (hata) {
        console.error('Profil resmi silme hatası:', hata);
        res.redirect('/panel/kisisel-bilgiler?hata=silme_basarisiz');
    }
});

// Kapak Fotoğrafı Tek Tıkla Silme (POST /panel/kapak-resmi-sil)
router.post('/kapak-resmi-sil', async (req, res) => {
    const adayId = req.adayProfili.id;
    try {
        if (req.adayProfili.kapak_resmi) {
            resimSil(req.adayProfili.kapak_resmi);
            await veritabaniCalistir("UPDATE aday_profilleri SET kapak_resmi = NULL WHERE id = ?", [adayId]);
        }
        res.redirect('/panel/kisisel-bilgiler?mesaj=kapak_resmi_silindi');
    } catch (hata) {
        console.error('Kapak resmi silme hatası:', hata);
        res.redirect('/panel/kisisel-bilgiler?hata=silme_basarisiz');
    }
});

// 3. Öz Geçmiş (GET & POST /panel/ozgecmis)
router.get('/ozgecmis', async (req, res) => {
    const adayId = req.adayProfili.id;
    try {
        const ozgecmis = await veritabaniTekCek("SELECT * FROM ozgecmis WHERE aday_id = ?", [adayId]) || {};
        res.render('panel/ozgecmis', {
            sayfaAdi: 'ozgecmis',
            ozgecmis,
            mesaj: req.query.mesaj || null,
            hata: req.query.hata || null
        });
    } catch (hata) {
        console.error('Özgeçmiş çekme hatası:', hata);
        res.status(500).send('Sistem hatası');
    }
});

router.post('/ozgecmis', async (req, res) => {
    const adayId = req.adayProfili.id;
    const { detayli_ozgecmis_tr, detayli_ozgecmis_en, egitim_bilgileri_tr, egitim_bilgileri_en, calismalar_tr, calismalar_en } = req.body;

    try {
        let cDetayliOzgecmisEn = detayli_ozgecmis_en || (detayli_ozgecmis_tr ? await otomatikCevir(detayli_ozgecmis_tr) : '');
        let cEgitimEn = egitim_bilgileri_en || (egitim_bilgileri_tr ? await otomatikCevir(egitim_bilgileri_tr) : '');
        let cCalismalarEn = calismalar_en || (calismalar_tr ? await otomatikCevir(calismalar_tr) : '');

        await veritabaniCalistir(`
            UPDATE ozgecmis SET
                detayli_ozgecmis_tr = ?,
                detayli_ozgecmis_en = ?,
                egitim_bilgileri_tr = ?,
                egitim_bilgileri_en = ?,
                calismalar_tr = ?,
                calismalar_en = ?
            WHERE aday_id = ?
        `, [detayli_ozgecmis_tr, cDetayliOzgecmisEn, egitim_bilgileri_tr, cEgitimEn, calismalar_tr, cCalismalarEn, adayId]);

        res.redirect('/panel/ozgecmis?mesaj=ozgecmis_guncellendi');
    } catch (hata) {
        console.error('Özgeçmiş güncelleme hatası:', hata);
        res.redirect('/panel/ozgecmis?hata=guncelleme_basarisiz');
    }
});

// 4. Vaatler (GET, POST Ekle, POST Sil)
router.get('/vaatler', async (req, res) => {
    const adayId = req.adayProfili.id;
    try {
        const vaatler = await veritabaniHepsiniCek("SELECT * FROM vaatler WHERE aday_id = ? ORDER BY sira ASC, id ASC", [adayId]);
        res.render('panel/vaatler', {
            sayfaAdi: 'vaatler',
            vaatler,
            mesaj: req.query.mesaj || null,
            hata: req.query.hata || null
        });
    } catch (hata) {
        console.error('Vaatler hatası:', hata);
        res.status(500).send('Sistem hatası');
    }
});

router.post('/vaatler/ekle', async (req, res) => {
    const adayId = req.adayProfili.id;
    const { baslik_tr, baslik_en, aciklama_tr, aciklama_en, sira } = req.body;

    try {
        let cBaslikEn = baslik_en || (baslik_tr ? await otomatikCevir(baslik_tr) : '');
        let cAciklamaEn = aciklama_en || (aciklama_tr ? await otomatikCevir(aciklama_tr) : '');

        await veritabaniCalistir(`
            INSERT INTO vaatler (aday_id, baslik_tr, baslik_en, aciklama_tr, aciklama_en, sira)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [adayId, baslik_tr, cBaslikEn, aciklama_tr, cAciklamaEn, sira || 0]);

        res.redirect('/panel/vaatler?mesaj=vaat_eklendi');
    } catch (hata) {
        console.error('Vaat ekleme hatası:', hata);
        res.redirect('/panel/vaatler?hata=ekleme_basarisiz');
    }
});

router.post('/vaatler/sil/:id', async (req, res) => {
    const adayId = req.adayProfili.id;
    const vaatId = req.params.id;

    try {
        await veritabaniCalistir("DELETE FROM vaatler WHERE id = ? AND aday_id = ?", [vaatId, adayId]);
        res.redirect('/panel/vaatler?mesaj=vaat_silindi');
    } catch (hata) {
        console.error('Vaat silme hatası:', hata);
        res.redirect('/panel/vaatler?hata=silme_basarisiz');
    }
});

// 5. Projeler (GET, POST Ekle, POST Sil)
router.get('/projeler', async (req, res) => {
    const adayId = req.adayProfili.id;
    try {
        const projeler = await veritabaniHepsiniCek("SELECT * FROM projeler WHERE aday_id = ? ORDER BY id DESC", [adayId]);
        res.render('panel/projeler', {
            sayfaAdi: 'projeler',
            projeler,
            mesaj: req.query.mesaj || null,
            hata: req.query.hata || null
        });
    } catch (hata) {
        console.error('Projeler hatası:', hata);
        res.status(500).send('Sistem hatası');
    }
});

router.post('/projeler/ekle', dosyaYukle.single('resim'), async (req, res) => {
    const adayId = req.adayProfili.id;
    const { baslik_tr, baslik_en, aciklama_tr, aciklama_en, tarih, sira } = req.body;

    try {
        let resimYolu = req.file ? '/uploads/' + req.file.filename : null;
        let cBaslikEn = baslik_en || (baslik_tr ? await otomatikCevir(baslik_tr) : '');
        let cAciklamaEn = aciklama_en || (aciklama_tr ? await otomatikCevir(aciklama_tr) : '');

        await veritabaniCalistir(`
            INSERT INTO projeler (aday_id, baslik_tr, baslik_en, aciklama_tr, aciklama_en, resim, tarih, sira)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [adayId, baslik_tr, cBaslikEn, aciklama_tr, cAciklamaEn, resimYolu, tarih, sira || 0]);

        res.redirect('/panel/projeler?mesaj=proje_eklendi');
    } catch (hata) {
        console.error('Proje ekleme hatası:', hata);
        res.redirect('/panel/projeler?hata=ekleme_basarisiz');
    }
});

router.post('/projeler/sil/:id', async (req, res) => {
    const adayId = req.adayProfili.id;
    const projeId = req.params.id;

    try {
        await veritabaniCalistir("DELETE FROM projeler WHERE id = ? AND aday_id = ?", [projeId, adayId]);
        res.redirect('/panel/projeler?mesaj=proje_silindi');
    } catch (hata) {
        console.error('Proje silme hatası:', hata);
        res.redirect('/panel/projeler?hata=silme_basarisiz');
    }
});

// 6. Haberler (GET, POST Ekle, POST Sil)
router.get('/haberler', async (req, res) => {
    const adayId = req.adayProfili.id;
    try {
        const haberler = await veritabaniHepsiniCek("SELECT * FROM haberler WHERE aday_id = ? ORDER BY id DESC", [adayId]);
        res.render('panel/haberler', {
            sayfaAdi: 'haberler',
            haberler,
            mesaj: req.query.mesaj || null,
            hata: req.query.hata || null
        });
    } catch (hata) {
        console.error('Haberler hatası:', hata);
        res.status(500).send('Sistem hatası');
    }
});

router.post('/haberler/ekle', dosyaYukle.single('resim'), async (req, res) => {
    const adayId = req.adayProfili.id;
    const { baslik_tr, baslik_en, ozet_tr, ozet_en, icerik_tr, icerik_en, tarih } = req.body;

    try {
        let resimYolu = req.file ? '/uploads/' + req.file.filename : null;
        let cBaslikEn = baslik_en || (baslik_tr ? await otomatikCevir(baslik_tr) : '');
        let cOzetEn = ozet_en || (ozet_tr ? await otomatikCevir(ozet_tr) : '');
        let cIcerikEn = icerik_en || (icerik_tr ? await otomatikCevir(icerik_tr) : '');

        await veritabaniCalistir(`
            INSERT INTO haberler (aday_id, baslik_tr, baslik_en, ozet_tr, ozet_en, icerik_tr, icerik_en, resim, tarih)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [adayId, baslik_tr, cBaslikEn, ozet_tr, cOzetEn, icerik_tr, cIcerikEn, resimYolu, tarih]);

        res.redirect('/panel/haberler?mesaj=haber_eklendi');
    } catch (hata) {
        console.error('Haber ekleme hatası:', hata);
        res.redirect('/panel/haberler?hata=ekleme_basarisiz');
    }
});

router.post('/haberler/sil/:id', async (req, res) => {
    const adayId = req.adayProfili.id;
    const haberId = req.params.id;

    try {
        await veritabaniCalistir("DELETE FROM haberler WHERE id = ? AND aday_id = ?", [haberId, adayId]);
        res.redirect('/panel/haberler?mesaj=haber_silindi');
    } catch (hata) {
        console.error('Haber silme hatası:', hata);
        res.redirect('/panel/haberler?hata=silme_basarisiz');
    }
});

// 7. Fotoğraf Galerisi (GET, POST Ekle, POST Sil)
router.get('/galeri', async (req, res) => {
    const adayId = req.adayProfili.id;
    try {
        const galeri = await veritabaniHepsiniCek("SELECT * FROM galeri WHERE aday_id = ? ORDER BY id DESC", [adayId]);
        res.render('panel/galeri', {
            sayfaAdi: 'galeri',
            galeri,
            mesaj: req.query.mesaj || null,
            hata: req.query.hata || null
        });
    } catch (hata) {
        console.error('Galeri hatası:', hata);
        res.status(500).send('Sistem hatası');
    }
});

router.post('/galeri/ekle', dosyaYukle.single('resim'), async (req, res) => {
    const adayId = req.adayProfili.id;
    const { baslik_tr, baslik_en, sira } = req.body;

    if (!req.file) {
        return res.redirect('/panel/galeri?hata=resim_secilmedi');
    }

    try {
        let resimYolu = '/uploads/' + req.file.filename;

        await veritabaniCalistir(`
            INSERT INTO galeri (aday_id, resim_yolu, baslik_tr, baslik_en, sira)
            VALUES (?, ?, ?, ?, ?)
        `, [adayId, resimYolu, baslik_tr, baslik_en, sira || 0]);

        res.redirect('/panel/galeri?mesaj=resim_eklendi');
    } catch (hata) {
        console.error('Galeri resim ekleme hatası:', hata);
        res.redirect('/panel/galeri?hata=ekleme_basarisiz');
    }
});

router.post('/galeri/sil/:id', async (req, res) => {
    const adayId = req.adayProfili.id;
    const resimId = req.params.id;

    try {
        await veritabaniCalistir("DELETE FROM galeri WHERE id = ? AND aday_id = ?", [resimId, adayId]);
        res.redirect('/panel/galeri?mesaj=resim_silindi');
    } catch (hata) {
        console.error('Galeri resim silme hatası:', hata);
        res.redirect('/panel/galeri?hata=silme_basarisiz');
    }
});

// 8. Sosyal Medya (GET & POST)
router.get('/sosyal', async (req, res) => {
    const adayId = req.adayProfili.id;
    try {
        const sosyal = await veritabaniTekCek("SELECT * FROM sosyal_medya WHERE aday_id = ?", [adayId]) || {};
        res.render('panel/sosyal', {
            sayfaAdi: 'sosyal',
            sosyal,
            mesaj: req.query.mesaj || null,
            hata: req.query.hata || null
        });
    } catch (hata) {
        console.error('Sosyal medya hatası:', hata);
        res.status(500).send('Sistem hatası');
    }
});

router.post('/sosyal', async (req, res) => {
    const adayId = req.adayProfili.id;
    const { facebook, instagram, twitter, youtube } = req.body;

    try {
        await veritabaniCalistir(`
            UPDATE sosyal_medya SET
                facebook = ?,
                instagram = ?,
                twitter = ?,
                youtube = ?
            WHERE aday_id = ?
        `, [facebook, instagram, twitter, youtube, adayId]);

        res.redirect('/panel/sosyal?mesaj=sosyal_medya_guncellendi');
    } catch (hata) {
        console.error('Sosyal medya güncelleme hatası:', hata);
        res.redirect('/panel/sosyal?hata=guncelleme_basarisiz');
    }
});

// 9. İletişim Bilgileri (GET & POST)
router.get('/iletisim', async (req, res) => {
    const adayId = req.adayProfili.id;
    try {
        const iletisim = await veritabaniTekCek("SELECT * FROM iletisim_bilgileri WHERE aday_id = ?", [adayId]) || {};
        res.render('panel/iletisim', {
            sayfaAdi: 'iletisim',
            iletisim,
            mesaj: req.query.mesaj || null,
            hata: req.query.hata || null
        });
    } catch (hata) {
        console.error('İletişim hatası:', hata);
        res.status(500).send('Sistem hatası');
    }
});

router.post('/iletisim', async (req, res) => {
    const adayId = req.adayProfili.id;
    const { telefon, eposta, adres_tr, adres_en, harita_iframe } = req.body;

    try {
        await veritabaniCalistir(`
            UPDATE iletisim_bilgileri SET
                telefon = ?,
                eposta = ?,
                adres_tr = ?,
                adres_en = ?,
                harita_iframe = ?
            WHERE aday_id = ?
        `, [telefon, eposta, adres_tr, adres_en, harita_iframe, adayId]);

        res.redirect('/panel/iletisim?mesaj=iletisim_guncellendi');
    } catch (hata) {
        console.error('İletişim güncelleme hatası:', hata);
        res.redirect('/panel/iletisim?hata=guncelleme_basarisiz');
    }
});

// 10. Site Ayarları (GET & POST)
router.get('/ayarlar', async (req, res) => {
    const adayId = req.adayProfili.id;
    try {
        const ayarlar = await veritabaniTekCek("SELECT * FROM site_ayarlari WHERE aday_id = ?", [adayId]) || {};
        res.render('panel/ayarlar', {
            sayfaAdi: 'ayarlar',
            ayarlar,
            mesaj: req.query.mesaj || null,
            hata: req.query.hata || null
        });
    } catch (hata) {
        console.error('Site ayarları hatası:', hata);
        res.status(500).send('Sistem hatası');
    }
});

router.post('/ayarlar', dosyaYukle.single('logo_resmi'), async (req, res) => {
    const adayId = req.adayProfili.id;
    const { yayinda_mi, tema_rengi, varsayilan_dil } = req.body;

    try {
        let yayinDurumu = (yayinda_mi === '1' || yayinda_mi === 'on') ? 1 : 0;

        await veritabaniCalistir("UPDATE aday_profilleri SET yayinda_mi = ? WHERE id = ?", [yayinDurumu, adayId]);

        if (req.file) {
            let logoResmiYolu = '/uploads/' + req.file.filename;
            await veritabaniCalistir("UPDATE aday_profilleri SET logo_resmi = ? WHERE id = ?", [logoResmiYolu, adayId]);
        }

        await veritabaniCalistir(`
            UPDATE site_ayarlari SET
                tema_rengi = ?,
                varsayilan_dil = ?
            WHERE aday_id = ?
        `, [tema_rengi || 'kirmizi', varsayilan_dil || 'tr', adayId]);

        res.redirect('/panel/ayarlar?mesaj=ayarlar_guncellendi');
    } catch (hata) {
        console.error('Site ayarları güncelleme hatası:', hata);
        res.redirect('/panel/ayarlar?hata=guncelleme_basarisiz');
    }
});

module.exports = router;
