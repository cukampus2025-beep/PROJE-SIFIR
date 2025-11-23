require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function tabloKur() {
    try {
        await client.connect();
        // Sadece senin göreceğin mesajlar tablosu
        await client.query(`
            CREATE TABLE IF NOT EXISTS iletisim_mesajlari (
                id SERIAL PRIMARY KEY,
                mesaj TEXT NOT NULL,
                tarih TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ 'iletisim_mesajlari' tablosu kuruldu! Mesajlar buraya düşecek.");
    } catch (e) {
        console.error("Hata:", e);
    } finally {
        client.end();
    }
}

tabloKur();