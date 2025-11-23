require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function tamirEt() {
    try {
        await client.connect();
        console.log("✅ Veritabanına bağlanıldı. Tamirat başlıyor...");

        // 1. DERS YORUMLARI TABLOSU (Hata veren yer burasıydı)
        await client.query(`
            CREATE TABLE IF NOT EXISTS ders_yorumlari (
                id SERIAL PRIMARY KEY,
                ders_kodu TEXT NOT NULL,
                ders_adi TEXT,
                kullanici_adi TEXT,
                yorum_metni TEXT NOT NULL,
                tarih TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("🔨 'ders_yorumlari' tablosu kontrol edildi/oluşturuldu.");

        // 2. FORUM TABLOSU (Anonim ve Sorular için)
        await client.query(`
            CREATE TABLE IF NOT EXISTS forum (
                id SERIAL PRIMARY KEY,
                tur TEXT NOT NULL, 
                ust_id INTEGER DEFAULT 0,
                kullanici_adi TEXT,
                mesaj TEXT NOT NULL,
                tarih TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("🔨 'forum' tablosu kontrol edildi/oluşturuldu.");

        // 3. YURT YORUMLARI TABLOSU
        await client.query(`
            CREATE TABLE IF NOT EXISTS yurt_yorumlari (
                id SERIAL PRIMARY KEY,
                yurt_adi TEXT NOT NULL,
                yorum_metni TEXT NOT NULL,
                kullanici_adi TEXT,
                tarih TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("🔨 'yurt_yorumlari' tablosu kontrol edildi/oluşturuldu.");

        // 4. İLETİŞİM TABLOSU
        await client.query(`
            CREATE TABLE IF NOT EXISTS iletisim_mesajlari (
                id SERIAL PRIMARY KEY,
                mesaj TEXT NOT NULL,
                tarih TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("🔨 'iletisim_mesajlari' tablosu kontrol edildi/oluşturuldu.");

        console.log("\n🎉 TÜM TABLOLAR HAZIR! ARTIK HATA ALMAZSIN.");

    } catch (e) {
        console.error("❌ HATA:", e);
    } finally {
        client.end();
    }
}

tamirEt();