const { Client } = require('pg');

// 👇👇👇 RAILWAY LINKINI BURAYA YAPIŞTIR 👇👇👇
const RAILWAY_URL = "postgresql://neondb_owner:npg_fY9ENjC4ltSi@ep-shiny-cell-ahxs7e70-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"; 
// 👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆

async function kontrol() {
    const client = new Client({ connectionString: RAILWAY_URL, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        console.log("✅ Veritabanına girildi. Bölümler listeleniyor...\n");

        const res = await client.query('SELECT DISTINCT bolum FROM dersler ORDER BY bolum ASC');
        
        console.log("--- İŞTE VERİTABANINDAKİ BÖLÜM ADLARI ---");
        res.rows.forEach((satir, index) => {
            console.log(`${index + 1}. ${satir.bolum}`);
        });
        console.log("-----------------------------------------");

    } catch (e) { console.error(e); } finally { await client.end(); }
}
kontrol();