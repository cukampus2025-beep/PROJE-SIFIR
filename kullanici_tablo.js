require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function tabloKur() {
    try {
        await client.connect();
        console.log("🔌 Veritabanına bağlanıldı...");
        
        // KULLANICI TABLOSU
        // email: Benzersiz olmalı (@cu.edu.tr kontrolünü kodda yapacağız)
        // nickname: Benzersiz olmalı
        // password: Şifre (Gizlenmiş halde tutulacak)
        // role: 'ogrenci' veya 'admin'
        // is_banned: Banlı mı? (Varsayılan hayır)
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                nickname TEXT UNIQUE NOT NULL,
                role TEXT DEFAULT 'ogrenci',
                is_banned BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        console.log("✅ 'users' (Kullanıcılar) tablosu başarıyla kuruldu! Kayıt sistemi için hazır.");
    } catch (e) {
        console.error("❌ Hata:", e);
    } finally {
        client.end();
    }
}

tabloKur();