const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// --- AYARLAR ---
const GIZLI_ANAHTAR = "cukurova_cok_gizli_anahtar_123";
const GMAIL_USER = "cukampus2025@gmail.com"; 
const GMAIL_PASS = "ncqd wqwe zohx hrsi"; 
const DATABASE_URL = "postgresql://neondb_owner:npg_fY9ENjC4ltSi@ep-shiny-cell-ahxs7e70-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

client.connect().then(() => console.log("✅ Veritabanı Bağlandı!")).catch(err => console.error("❌ Bağlantı Hatası:", err));

// --- ENDPOINTLER ---

app.get('/', (req, res) => {
    res.send("Backend Çalışıyor! Çukurova Kampüs API");
});

app.post('/kod-gonder', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email.endsWith('@ogr.cu.edu.tr')) return res.status(400).json({ error: "Sadece @ogr.cu.edu.tr maili kabul edilir." });
        const userCheck = await client.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userCheck.rows.length > 0) return res.status(400).json({ error: "Bu mail zaten kayıtlı." });
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60000);
        await client.query("DELETE FROM verification_codes WHERE email = $1", [email]); 
        await client.query("INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, $3)", [email, code, expiresAt]);
        await transporter.sendMail({ from: '"Çukurova Kampüs" <'+GMAIL_USER+'>', to: email, subject: 'Onay Kodu: ' + code, text: `Kodun: ${code}` });
        res.json({ success: true, message: "Kod gönderildi." });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "Mail sunucusu hatası." }); 
    }
});

app.post('/kayit-tamamla', async (req, res) => {
    try {
        const { email, password, nickname, code } = req.body;
        const kodCheck = await client.query("SELECT * FROM verification_codes WHERE email = $1", [email]);
        if (kodCheck.rows.length === 0) return res.status(400).json({ error: "Kod bulunamadı." });
        const kayit = kodCheck.rows[0];
        if (kayit.code !== code) return res.status(400).json({ error: "Hatalı kod!" });
        
        const nickCheck = await client.query("SELECT * FROM users WHERE nickname = $1", [nickname]);
        if (nickCheck.rows.length > 0) return res.status(400).json({ error: "Bu takma ad dolu." });
        
        const hash = await bcrypt.hash(password, 10);
        await client.query("INSERT INTO users (email, password, nickname, role) VALUES ($1, $2, $3, 'ogrenci')", [email, hash, nickname]);
        await client.query("DELETE FROM verification_codes WHERE email = $1", [email]); 
        res.json({ success: true, message: "Kayıt başarılı!" });
    } catch (err) { res.status(500).json({ error: "Kayıt hatası." }); }
});

app.post('/giris', async (req, res) => {
    try {
        const { email, password } = req.body;
        const userResult = await client.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userResult.rows.length === 0) return res.status(400).json({ error: "Kullanıcı bulunamadı." });
        const user = userResult.rows[0];
        if (user.is_banned) return res.status(403).json({ error: "⛔ Banlandınız." });
        if (!await bcrypt.compare(password, user.password)) return res.status(400).json({ error: "Şifre yanlış." });
        const token = jwt.sign({ id: user.id, nickname: user.nickname, role: user.role }, GIZLI_ANAHTAR, { expiresIn: '30d' });
        res.json({ success: true, token, user: { nickname: user.nickname, role: user.role } });
    } catch (err) { res.status(500).json({ error: "Giriş hatası." }); }
});

app.get('/bolumler', async (req, res) => { const r = await client.query('SELECT DISTINCT fakulte, bolum FROM dersler ORDER BY fakulte, bolum'); res.json(r.rows); });
app.get('/hocalar', async (req, res) => { 
    try {
        const r = await client.query("SELECT DISTINCT hoca_adi FROM dersler WHERE hoca_adi IS NOT NULL AND hoca_adi != 'Belirtilmemiş' ORDER BY hoca_adi"); 
        res.json(r.rows); 
    } catch(e) { res.json([]); }
});
app.get('/dersler/:bolum', async (req, res) => { const r = await client.query('SELECT * FROM dersler WHERE bolum = $1', [req.params.bolum]); res.json(r.rows); });
app.get('/hoca-dersleri/:hoca', async (req, res) => { const r = await client.query('SELECT * FROM dersler WHERE hoca_adi = $1', [req.params.hoca]); res.json(r.rows); });
app.get('/toplam-yorum-sayisi', async (req, res) => { 
    try {
        const q = `SELECT (SELECT COUNT(*) FROM ders_yorumlari) + (SELECT COUNT(*) FROM yurt_yorumlari) + (SELECT COUNT(*) FROM forum) as toplam`; 
        const r = await client.query(q); 
        res.json({ toplam: parseInt(r.rows[0].toplam) }); 
    } catch { res.json({ toplam: 0 }); }
});

app.get('/ders-yorumlari/:kod', async (req, res) => { const r = await client.query('SELECT * FROM ders_yorumlari WHERE ders_kodu = $1 ORDER BY tarih DESC', [req.params.kod]); res.json(r.rows); });
app.post('/ders-yorum-ekle', async (req, res) => { await client.query('INSERT INTO ders_yorumlari (ders_kodu, ders_adi, kullanici_adi, yorum_metni) VALUES ($1, $2, $3, $4)', [req.body.ders_kodu, req.body.ders_adi, req.body.kullanici_adi, req.body.yorum_metni]); res.json({ success: true }); });
app.get('/yurt-yorumlari/:yurt', async (req, res) => { const r = await client.query('SELECT * FROM yurt_yorumlari WHERE yurt_adi = $1 ORDER BY tarih DESC', [req.params.yurt]); res.json(r.rows); });
app.post('/yurt-yorum-ekle', async (req, res) => { await client.query('INSERT INTO yurt_yorumlari (yurt_adi, yorum_metni, kullanici_adi) VALUES ($1, $2, $3)', [req.body.yurt_adi, req.body.yorum_metni, req.body.kullanici_adi]); res.json({ success: true }); });
app.post('/iletisim-gonder', async (req, res) => { await client.query('INSERT INTO iletisim_mesajlari (mesaj) VALUES ($1)', [req.body.mesaj]); res.json({ success: true }); });
app.get('/forum/:tur', async (req, res) => { const ana = await client.query('SELECT * FROM forum WHERE tur = $1 AND ust_id = 0 ORDER BY tarih DESC', [req.params.tur]); const cev = await client.query('SELECT * FROM forum WHERE tur = $1 AND ust_id != 0 ORDER BY tarih ASC', [req.params.tur]); const sonuc = ana.rows.map(s => ({ ...s, cevaplar: cev.rows.filter(c => c.ust_id === s.id) })); res.json(sonuc); });
app.post('/forum-ekle', async (req, res) => { await client.query('INSERT INTO forum (tur, ust_id, kullanici_adi, mesaj) VALUES ($1, $2, $3, $4)', [req.body.tur, req.body.ust_id||0, req.body.kullanici_adi, req.body.mesaj]); res.json({ success: true }); });

app.get('/admin/tum-veriler', async (req, res) => {
    try {
        const d = await client.query('SELECT * FROM ders_yorumlari ORDER BY tarih DESC LIMIT 50');
        const y = await client.query('SELECT * FROM yurt_yorumlari ORDER BY tarih DESC LIMIT 50');
        const f = await client.query('SELECT * FROM forum ORDER BY tarih DESC LIMIT 50');
        const m = await client.query('SELECT * FROM iletisim_mesajlari ORDER BY tarih DESC');
        res.json({ ders: d.rows, yurt: y.rows, forum: f.rows, mesajlar: m.rows });
    } catch(e) { res.status(500).json({error:"Hata"}); }
});
app.delete('/admin/sil/:tur/:id', async (req, res) => {
    try {
        const { tur, id } = req.params;
        let tablo = "";
        if (tur === 'ders') tablo = "ders_yorumlari";
        else if (tur === 'yurt') tablo = "yurt_yorumlari";
        else if (tur === 'forum') tablo = "forum";
        else if (tur === 'mesaj') tablo = "iletisim_mesajlari";
        if (!tablo) return res.status(400).json({ error: "Hatalı tür" });
        await client.query(`DELETE FROM ${tablo} WHERE id = $1`, [id]);
        res.json({ success: true, message: "Silindi" });
    } catch (e) { res.status(500).json({ error: "Silinemedi" }); }
});
app.post('/admin/banla', async (req, res) => {
    await client.query("UPDATE users SET is_banned = true WHERE nickname = $1", [req.body.nickname]);
    res.json({ success: true });
});
app.post('/yorum-sil', async (req, res) => {
    try {
        const { tur, id, kullanici_adi } = req.body;
        let tablo = tur === 'ders' ? "ders_yorumlari" : tur === 'yurt' ? "yurt_yorumlari" : "forum";
        const kontrol = await client.query(`SELECT * FROM ${tablo} WHERE id = $1`, [id]);
        if(kontrol.rows.length > 0) {
            if(kontrol.rows[0].kullanici_adi === kullanici_adi || kullanici_adi === 'baraykanat') {
                await client.query(`DELETE FROM ${tablo} WHERE id = $1`, [id]);
                res.json({ success: true });
            } else { res.status(403).json({ error: "Yetkisiz." }); }
        } else { res.status(404).json({ error: "Yok." }); }
    } catch (e) { res.status(500).json({ error: "Hata." }); }
});

// --- PORT AYARI (BURASI DEĞİŞTİ) ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda çalışıyor!`));