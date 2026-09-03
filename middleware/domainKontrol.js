/**
 * Domain ve Subdomain Kontrol Middleware Dosyasi
 * Bu dosya gelen isteklerin hangi domain veya subdomain uzerinden geldigini denetler.
 * Gelistirme modunda localhost uzerinden test edilmesine olanak tanir.
 */

require('dotenv').config();

function domainKontrol(req, res, next) {
    const host = req.headers.host || '';
    const gelistirmeModu = process.env.GELISTIRME_MODU === 'true';

    const domainTanitim = process.env.DOMAIN_TANITIM || 'localhost';
    const domainPanel = process.env.DOMAIN_PANEL || 'panel.localhost';
    const domainYonetim = process.env.DOMAIN_YONETIM || 'yonetim.localhost';

    // Istek atan host bilgisini incele (port numarasini temizle)
    const mevcutHost = host.split(':')[0].toLowerCase();

    req.isSuperAdminDomain = (mevcutHost === domainYonetim.toLowerCase());
    req.isAdayPanelDomain = (mevcutHost === domainPanel.toLowerCase());
    req.isTanitimDomain = (mevcutHost === domainTanitim.toLowerCase());

    // Gelistirme modunda localhost uzerinden direkt path kontrolune izin ver
    if (gelistirmeModu) {
        if (req.path.startsWith('/yonetim')) {
            req.isSuperAdminDomain = true;
        } else if (req.path.startsWith('/panel')) {
            req.isAdayPanelDomain = true;
        }
    }

    next();
}

module.exports = domainKontrol;
