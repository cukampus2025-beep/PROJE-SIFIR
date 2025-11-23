const fs = require('fs');

// 1. Dosyayı Oku
console.log("Dosya okunuyor...");
let hamVeri = fs.readFileSync('lastveri.txt', 'utf-8');

// 2. O aradaki ] [ işaretlerini virgülle değiştir
let temizVeri = hamVeri.replace(/\]\s*\[/g, ',');

// 3. Yeni dosyayı kaydet
console.log("Temizleniyor ve kaydediliyor...");
fs.writeFileSync('veri.json', temizVeri);

console.log("✅ İŞLEM TAMAM! 'veri.json' dosyası oluşturuldu.");