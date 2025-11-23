const { Client } = require('pg');

// 👇 LİNKİ BURAYA YAPIŞTIR 👇
const RAILWAY_URL = "postgresql://neondb_owner:npg_fY9ENjC4ltSi@ep-shiny-cell-ahxs7e70-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"; 

async function kontrolEt() {
    const client = new Client({ connectionString: RAILWAY_URL, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        console.log("✅ Bağlandı. Tıp Fakültesi aranıyor...\n");

        // 1. Adında "Tıp" geçen tüm bölümleri bulalım (Tam adını öğrenmek için)
        const bolumler = await client.query("SELECT DISTINCT bolum FROM dersler WHERE bolum LIKE '%Tıp%'");
        
        if (bolumler.rows.length === 0) {
            console.log("❌ HATA: Veritabanında 'Tıp' isminde HİÇBİR BÖLÜM YOK.");
        } else {
            console.log("🔎 Bulunan Bölüm İsimleri:");
            bolumler.rows.forEach(r => console.log(`   -> "${r.bolum}"`));

            // 2. Bulunan ilk ismin derslerini sayalım
            const tamIsim = bolumler.rows[0].bolum;
            const dersler = await client.query("SELECT count(*) FROM dersler WHERE bolum = $1", [tamIsim]);
            console.log(`\n📊 "${tamIsim}" içinde kayıtlı ders sayısı: ${dersler.rows[0].count}`);
        }

    } catch (e) { console.error(e); } finally { await client.end(); }
}
kontrolEt();