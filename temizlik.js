const { Client } = require('pg');

// 👇👇👇 RAILWAY LİNKİNİ BURAYA YAPIŞTIR 👇👇👇
const RAILWAY_URL = "postgresql://neondb_owner:npg_fY9ENjC4ltSi@ep-shiny-cell-ahxs7e70-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"; 
// 👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆

async function temizle() {
    const client = new Client({ connectionString: RAILWAY_URL, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        console.log("🛁 Temizlik başlıyor...");

        // BU KOMUT SİHİRLİDİR:
        // Tüm bölüm isimlerinin sağındaki ve solundaki boşlukları siler.
        // "Tıp " -> "Tıp" olur.
        await client.query("UPDATE dersler SET bolum = TRIM(bolum)");
        await client.query("UPDATE dersler SET fakulte = TRIM(fakulte)");

        console.log("✨ PIRIL PIRIL OLDU! Tüm boşluklar temizlendi.");

    } catch (e) { 
        console.error("Hata:", e); 
    } finally { 
        await client.end(); 
    }
}

temizle();