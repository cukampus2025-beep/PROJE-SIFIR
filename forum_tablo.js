require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function tabloKur() {
    try {
        await client.connect();
        
        // Forum tablosu (Hem Sorular Hem Anonim için)
        // tur: 'soru' veya 'anonim'
        // ust_id: Eğer bir cevapsa, hangi soruya cevap verildiği (0 ise yeni sorudur)
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
        
        console.log("✅ 'forum' tablosu kuruldu! Soru ve Cevaplar hazır.");
    } catch (e) {
        console.error("Hata:", e);
    } finally {
        client.end();
    }
}

tabloKur();