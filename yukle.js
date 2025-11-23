const fs = require('fs');
const { Client } = require('pg');

// 👇👇👇 NEON LİNKİNİ BU TIRNAKLARIN İÇİNE YAPIŞTIR 👇👇👇
const NEON_URL = "postgresql://neondb_owner:npg_fY9ENjC4ltSi@ep-shiny-cell-ahxs7e70-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
// 👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆

async function yukle() {
    if (NEON_URL.includes("BURAYA")) {
        console.error("❌ HATA: Linki yapıştırmadın canım! Kodu aç ve Neon linkini ekle.");
        return;
    }

    console.log("🔌 Veritabanına bağlanılıyor...");
    
    const client = new Client({
        connectionString: NEON_URL,
        ssl: { rejectUnauthorized: false } // Neon için gerekli ayar
    });

    try {
        await client.connect();
        console.log("✅ Bağlantı başarılı!");

        console.log("🔨 Tablo sıfırdan oluşturuluyor...");
        // Temiz başlangıç için eski tabloyu silip yenisini açıyoruz
        await client.query(`DROP TABLE IF EXISTS dersler;`);
        await client.query(`
            CREATE TABLE dersler (
                id SERIAL PRIMARY KEY,
                fakulte TEXT,
                bolum TEXT,
                ders_kodu TEXT,
                ders_adi TEXT,
                hoca_adi TEXT
            );
        `);

        console.log("📂 veri.json okunuyor...");
        const rawData = fs.readFileSync('veri.json', 'utf-8');
        const dersler = JSON.parse(rawData);

        console.log(`🚀 Toplam ${dersler.length} adet ders yükleniyor...`);
        console.log("☕ Bu işlem 1-2 dakika sürebilir. Bekle...");

        for (const ders of dersler) {
            await client.query(
                `INSERT INTO dersler (fakulte, bolum, ders_kodu, ders_adi, hoca_adi) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    ders.fakulte,
                    ders.bolum,
                    ders.ders_kodu,
                    ders.ders_adi,
                    ders.hoca_adi
                ]
            );
        }

        console.log("\n🎉🎉🎉 BÜYÜK ZAFER! TÜM VERİLER VERİTABANINA YÜKLENDİ! 🎉🎉🎉");

    } catch (err) {
        console.error("❌ KRİTİK HATA:", err);
    } finally {
        await client.end();
    }
}

yukle();