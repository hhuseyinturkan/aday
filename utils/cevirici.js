/**
 * Otomatik Türkçe - İngilizce Çeviri Yardımcı Modülü
 * Aday bilgi eklediğinde arka planda metinleri otomatik İngilizceye çevirir.
 */

async function otomatikCevir(metin) {
    if (!metin || typeof metin !== 'string' || metin.trim() === '') {
        return metin || '';
    }

    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(metin.trim())}&langpair=tr|en`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data && data.responseData && data.responseData.translatedText) {
                return data.responseData.translatedText;
            }
        }
    } catch (hata) {
        console.error('Otomatik cevir hatasi:', hata.message);
    }
    return metin;
}

module.exports = { otomatikCevir };
