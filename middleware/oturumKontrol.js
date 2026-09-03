/**
 * Oturum ve Yetkilendirme Kontrol Middleware Dosyasi
 * Aday ve Super Admin oturumlarinin guvenligini saglar.
 */

const { veritabaniTekCek } = require('../veritabani');

// Aday paneline erisim kontrolu
async function adayGirisKontrol(req, res, next) {
    if (!req.session || !req.session.kullanici) {
        return res.redirect('/giris?hata=oturum_gerekli');
    }

    if (req.session.kullanici.rol !== 'aday') {
        return res.redirect('/giris?hata=yetkisiz_erisim');
    }

    try {
        // Kullanicinin güncel durumunu veritabanindan sorgula
        const kullanici = await veritabaniTekCek(
            "SELECT * FROM kullanicilar WHERE id = ?",
            [req.session.kullanici.id]
        );

        if (!kullanici || kullanici.durum !== 'aktif') {
            req.session.destroy();
            return res.redirect('/giris?hata=hesap_onayli_degil');
        }

        // Aday profilini cek ve req nesnesine ekle
        const adayProfili = await veritabaniTekCek(
            "SELECT * FROM aday_profilleri WHERE kullanici_id = ?",
            [kullanici.id]
        );

        req.kullanici = kullanici;
        req.adayProfili = adayProfili;
        res.locals.oturumAday = adayProfili;
        res.locals.oturumKullanici = kullanici;

        next();
    } catch (hata) {
        console.error('Aday giris kontrol hatasi:', hata);
        return res.redirect('/giris?hata=sistem_hatasi');
    }
}

// Super Admin paneline erisim kontrolu
async function superAdminGirisKontrol(req, res, next) {
    if (!req.session || !req.session.kullanici) {
        return res.redirect('/yonetim/giris?hata=oturum_gerekli');
    }

    if (req.session.kullanici.rol !== 'super_admin') {
        return res.redirect('/yonetim/giris?hata=yetkisiz_erisim');
    }

    res.locals.oturumKullanici = req.session.kullanici;
    next();
}

module.exports = {
    adayGirisKontrol,
    superAdminGirisKontrol
};
