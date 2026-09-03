/**
 * AK Parti Aday Tanıtım Sistemi - Ana Sunucu Dosyası
 * Express.js yapılandırması, oturum yönetimi, şablon motoru (EJS) ve rota tanımlamaları.
 */

const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

// Veritabanı ve Tablo Oluşturma Modülünü Yükle
require('./veritabani');

// Router ve Middleware Tanımlamaları
const domainKontrol = require('./middleware/domainKontrol');
const genelRoutes = require('./routes/genelRoutes');
const panelRoutes = require('./routes/panelRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// EJS Şablon Motoru Yapılandırması
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Statik Dosyalar (CSS, JS, Resimler)
app.use(express.static(path.join(__dirname, 'public')));

// Gövde (Body) Çözümleyicileri
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Kullanıcı Oturumu (Session) Yapılandırması
app.use(session({
    secret: process.env.OTURUM_GIZLI_ANAHTAR || 'akparti_aday_tanitim_gizli_anahtari_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // Prodüksiyonda HTTPS varsa true yapılmalıdır
        maxAge: 24 * 60 * 60 * 1000 // 1 Gün geçerli
    }
}));

// Domain ve Subdomain Kontrol Middleware'i
app.use(domainKontrol);

// Global Şablon Değişkenleri (Her EJS dosyasında erişilebilir)
app.use((req, res, next) => {
    res.locals.kullanici = req.session ? req.session.kullanici : null;
    res.locals.isSuperAdminDomain = req.isSuperAdminDomain;
    res.locals.isAdayPanelDomain = req.isAdayPanelDomain;
    res.locals.isTanitimDomain = req.isTanitimDomain;
    next();
});

// Rotaların Bağlanması
app.use('/', genelRoutes);
app.use('/panel', panelRoutes);
app.use('/yonetim', superAdminRoutes);

// 404 Sayfa Bulunamadı Yakalayıcısı
app.use((req, res) => {
    res.status(404).render('hata', { mesaj: 'Aradığınız sayfa bulunamadı.' });
});

// Hata İşleyici Middleware
app.use((hata, req, res, next) => {
    console.error('Sunucu Hatası:', hata);
    res.status(500).render('hata', { mesaj: 'Sunucuda beklenmeyen bir hata oluştu.' });
});

// Sunucuyu Başlatma
app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(` AK Parti Aday Tanıtım Sistemi Çalışıyor!`);
    console.log(` Port: ${PORT}`);
    console.log(` Yerel Adres: http://localhost:${PORT}`);
    console.log(` Aday Paneli: http://localhost:${PORT}/panel`);
    console.log(` Süper Admin: http://localhost:${PORT}/yonetim`);
    console.log(`===================================================`);
});
