/**
 * Dosya Yukleme (Multer) Middleware Dosyasi
 * Resim yuklemelerini guvenli bir sekilde public/uploads klasorune kaydeder.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Yukleme klasorunun varligini kontrol et, yoksa olustur
const yuklemeDizini = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(yuklemeDizini)) {
    fs.mkdirSync(yuklemeDizini, { recursive: true });
}

// Depolama ayarları
const depolama = multer.diskStorage({
    destination: function (req, dosya, cb) {
        cb(null, yuklemeDizini);
    },
    filename: function (req, dosya, cb) {
        // Benzersiz dosya adi olusturma: uzanti + zaman damgasi + rastgele sayi
        const benzersizEk = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const dosyaUzantisi = path.extname(dosya.originalname).toLowerCase();
        cb(null, 'resim-' + benzersizEk + dosyaUzantisi);
    }
});

// Dosya turu ve guvenlik filtresi (Yalnizca JPG, JPEG, PNG ve WEBP)
const dosyaFiltresi = (req, dosya, cb) => {
    const izinVerilenUzantilar = /jpeg|jpg|png|webp/;
    const izinVerilenMimeTurleri = /image\/jpeg|image\/jpg|image\/png|image\/webp/;

    const uzantiKontrol = izinVerilenUzantilar.test(path.extname(dosya.originalname).toLowerCase());
    const mimeKontrol = izinVerilenMimeTurleri.test(dosya.mimetype);

    if (uzantiKontrol && mimeKontrol) {
        cb(null, true);
    } else {
        cb(new Error('Yalnizca JPG, JPEG, PNG veya WEBP formatinda resim yukleyebilirsiniz!'), false);
    }
};

// Multer yukleme yapılandırması (Maksimum 5MB)
const dosyaYukle = multer({
    storage: depolama,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: dosyaFiltresi
});

module.exports = dosyaYukle;
