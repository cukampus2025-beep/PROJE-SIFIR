require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function tabloKur() {
    try {
        await client.connect();
        console.log("✅ Veritabanına bağlanıldı.");

        await client.query(`
            CREATE TABLE IF NOT EXISTS yurt_yorumlari (
                id SERIAL PRIMARY KEY,
                yurt_adi TEXT NOT NULL,
                yorum_metni TEXT NOT NULL,
                tarih TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("🔨 'yurt_yorumlari' tablosu başarıyla kuruldu!");
    } catch (e) {
        console.error("Hata:", e);
    } finally {
        client.end();
    }
}

tabloKur();