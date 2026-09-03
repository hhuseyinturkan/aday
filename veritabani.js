/**
 * Veritabani Yapilandirma ve Baslatma Dosyasi
 * Bu dosya SQLite veritabanina baglanir, gerekli tablolari olusturur
 * ve varsayilan super admin kullanicisini ekler.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Veritabani dosyasinin yolu
const veritabaniYolu = path.join(__dirname, 'veritabani.sqlite');

// SQLite baglantisi olusturma
const veritabani = new sqlite3.Database(veritabaniYolu, (hata) => {
    if (hata) {
        console.error('Veritabanina baglanirken hata olustu:', hata.message);
    } else {
        console.log('SQLite veritabanina basariyla baglanildi.');
    }
});

// Veritabani sorgu yardimci fonksiyonlari (Promise yapisi ile async/await kullanimi icin)
function veritabaniCalistir(sql, parametreler = []) {
    return new Promise((resolve, reject) => {
        veritabani.run(sql, parametreler, function (hata) {
            if (hata) reject(hata);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

function veritabaniTekCek(sql, parametreler = []) {
    return new Promise((resolve, reject) => {
        veritabani.get(sql, parametreler, (hata, satir) => {
            if (hata) reject(hata);
            else resolve(satir);
        });
    });
}

function veritabaniHepsiniCek(sql, parametreler = []) {
    return new Promise((resolve, reject) => {
        veritabani.all(sql, parametreler, (hata, satirlar) => {
            if (hata) reject(hata);
            else resolve(satirlar);
        });
    });
}

// Tablolari olusturma fonksiyonu
async function tablolariOlustur() {
    try {
        // Yabanci anahtar (Foreign Key) destegini ac
        await veritabaniCalistir("PRAGMA foreign_keys = ON;");

        // 1. Kullanicilar Tablosu
        await veritabaniCalistir(`
            CREATE TABLE IF NOT EXISTS kullanicilar (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                eposta TEXT UNIQUE NOT NULL,
                sifre TEXT NOT NULL,
                rol TEXT NOT NULL DEFAULT 'aday',
                durum TEXT NOT NULL DEFAULT 'onay_bekliyor',
                olusturma_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Aday Profilleri Tablosu
        await veritabaniCalistir(`
            CREATE TABLE IF NOT EXISTS aday_profilleri (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kullanici_id INTEGER NOT NULL UNIQUE,
                slug TEXT UNIQUE NOT NULL,
                ad TEXT NOT NULL,
                soyad TEXT NOT NULL,
                unvan_tr TEXT,
                unvan_en TEXT,
                il TEXT NOT NULL,
                ilce TEXT NOT NULL,
                kisa_tanitim_tr TEXT,
                kisa_tanitim_en TEXT,
                profil_resmi TEXT,
                kapak_resmi TEXT,
                logo_resmi TEXT,
                yayinda_mi INTEGER DEFAULT 1,
                olusturma_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (kullanici_id) REFERENCES kullanicilar (id) ON DELETE CASCADE
            )
        `);

        // 3. Ozgecmis Tablosu
        await veritabaniCalistir(`
            CREATE TABLE IF NOT EXISTS ozgecmis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                aday_id INTEGER NOT NULL UNIQUE,
                detayli_ozgecmis_tr TEXT,
                detayli_ozgecmis_en TEXT,
                egitim_bilgileri_tr TEXT,
                egitim_bilgileri_en TEXT,
                calismalar_tr TEXT,
                calismalar_en TEXT,
                FOREIGN KEY (aday_id) REFERENCES aday_profilleri (id) ON DELETE CASCADE
            )
        `);

        // 4. Vaatler Tablosu
        await veritabaniCalistir(`
            CREATE TABLE IF NOT EXISTS vaatler (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                aday_id INTEGER NOT NULL,
                baslik_tr TEXT NOT NULL,
                baslik_en TEXT,
                aciklama_tr TEXT,
                aciklama_en TEXT,
                sira INTEGER DEFAULT 0,
                FOREIGN KEY (aday_id) REFERENCES aday_profilleri (id) ON DELETE CASCADE
            )
        `);

        // 5. Projeler Tablosu
        await veritabaniCalistir(`
            CREATE TABLE IF NOT EXISTS projeler (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                aday_id INTEGER NOT NULL,
                baslik_tr TEXT NOT NULL,
                baslik_en TEXT,
                aciklama_tr TEXT,
                aciklama_en TEXT,
                resim TEXT,
                tarih TEXT,
                sira INTEGER DEFAULT 0,
                FOREIGN KEY (aday_id) REFERENCES aday_profilleri (id) ON DELETE CASCADE
            )
        `);

        // 6. Haberler Tablosu
        await veritabaniCalistir(`
            CREATE TABLE IF NOT EXISTS haberler (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                aday_id INTEGER NOT NULL,
                baslik_tr TEXT NOT NULL,
                baslik_en TEXT,
                ozet_tr TEXT,
                ozet_en TEXT,
                icerik_tr TEXT,
                icerik_en TEXT,
                resim TEXT,
                tarih TEXT,
                FOREIGN KEY (aday_id) REFERENCES aday_profilleri (id) ON DELETE CASCADE
            )
        `);

        // 7. Galeri Tablosu
        await veritabaniCalistir(`
            CREATE TABLE IF NOT EXISTS galeri (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                aday_id INTEGER NOT NULL,
                resim_yolu TEXT NOT NULL,
                baslik_tr TEXT,
                baslik_en TEXT,
                sira INTEGER DEFAULT 0,
                FOREIGN KEY (aday_id) REFERENCES aday_profilleri (id) ON DELETE CASCADE
            )
        `);

        // 8. Sosyal Medya Tablosu
        await veritabaniCalistir(`
            CREATE TABLE IF NOT EXISTS sosyal_medya (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                aday_id INTEGER NOT NULL UNIQUE,
                facebook TEXT,
                instagram TEXT,
                twitter TEXT,
                youtube TEXT,
                FOREIGN KEY (aday_id) REFERENCES aday_profilleri (id) ON DELETE CASCADE
            )
        `);

        // 9. Iletisim Bilgileri Tablosu
        await veritabaniCalistir(`
            CREATE TABLE IF NOT EXISTS iletisim_bilgileri (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                aday_id INTEGER NOT NULL UNIQUE,
                telefon TEXT,
                eposta TEXT,
                adres_tr TEXT,
                adres_en TEXT,
                harita_iframe TEXT,
                FOREIGN KEY (aday_id) REFERENCES aday_profilleri (id) ON DELETE CASCADE
            )
        `);

        // 10. Site Ayarlari Tablosu
        await veritabaniCalistir(`
            CREATE TABLE IF NOT EXISTS site_ayarlari (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                aday_id INTEGER NOT NULL UNIQUE,
                tema_rengi TEXT DEFAULT 'kirmizi',
                varsayilan_dil TEXT DEFAULT 'tr',
                FOREIGN KEY (aday_id) REFERENCES aday_profilleri (id) ON DELETE CASCADE
            )
        `);

        // 11. Ziyaretler Tablosu
        await veritabaniCalistir(`
            CREATE TABLE IF NOT EXISTS ziyaretler (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                aday_id INTEGER NOT NULL,
                ip_adresi TEXT,
                tarih DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (aday_id) REFERENCES aday_profilleri (id) ON DELETE CASCADE
            )
        `);

        console.log('Tum SQLite tablolari basariyla kontrol edildi/olusturuldu.');

        // Varsayilan Super Admin Hesabi Olusturma veya Guncelleme
        const adminEposta = process.env.SUPER_ADMIN_EPOSTA || 'admin@akparti.org.tr';
        const adminSifre = process.env.SUPER_ADMIN_SIFRE || '1234';
        const sifreHash = await bcrypt.hash(adminSifre, 10);

        const mevcutAdmin = await veritabaniTekCek("SELECT * FROM kullanicilar WHERE rol = 'super_admin'");
        if (!mevcutAdmin) {
            await veritabaniCalistir(
                "INSERT INTO kullanicilar (eposta, sifre, rol, durum) VALUES (?, ?, 'super_admin', 'aktif')",
                [adminEposta, sifreHash]
            );
            console.log(`Ilk Super Admin hesabi olusturuldu: ${adminEposta} / Sifre: ${adminSifre}`);
        } else {
            await veritabaniCalistir(
                "UPDATE kullanicilar SET eposta = ?, sifre = ? WHERE id = ?",
                [adminEposta, sifreHash, mevcutAdmin.id]
            );
            console.log(`Super Admin hesabi guncellendi: ${adminEposta} / Sifre: ${adminSifre}`);
        }

    } catch (hata) {
        console.error('Tablo olusturma hatasi:', hata.message);
    }
}

// Veritabani baslatma fonksiyonunu cagir
tablolariOlustur();

module.exports = {
    veritabani,
    veritabaniCalistir,
    veritabaniTekCek,
    veritabaniHepsiniCek
};
