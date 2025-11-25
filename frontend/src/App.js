import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import './App.css';

// --- BURAYI DEĞİŞTİRDİM: LOCALHOST YAPTIM ---
const API_URL = "http://localhost:5000"; 

// --- GİRİŞ MODALI ---
function GirisModal({ kapali, kapat, tip }) { 
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [nickname, setNickname] = useState(""); const [code, setCode] = useState(""); 
  const [hata, setHata] = useState(""); const [bilgi, setBilgi] = useState(""); const [kayitAsama, setKayitAsama] = useState(1);

  useEffect(() => { if(kapali) { setKayitAsama(1); setHata(""); setBilgi(""); setCode(""); } }, [kapali]);
  if (kapali) return null;

  const girisYap = async () => {
    setHata(""); setBilgi("");
    try { const res = await fetch(`${API_URL}/giris`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email, password}) }); const data = await res.json(); if (!data.success) setHata(data.error); else { setBilgi("✅ Giriş başarılı! Yönlendiriliyorsunuz..."); localStorage.setItem('token', data.token); localStorage.setItem('user', JSON.stringify(data.user)); setTimeout(() => { window.location.reload(); kapat(); }, 1500); } } catch(e) { setHata("Sunucuya bağlanılamadı."); }
  };
  const kodGonder = async () => { setHata(""); setBilgi("Kod gönderiliyor..."); try { const res = await fetch(`${API_URL}/kod-gonder`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email}) }); const data = await res.json(); if (!data.success) { setHata(data.error); setBilgi(""); } else { setBilgi("Kod mailine gönderildi!"); setKayitAsama(2); } } catch(e) { setHata("Hata oluştu."); } };
  const kayitTamamla = async () => { setHata(""); setBilgi(""); try { const res = await fetch(`${API_URL}/kayit-tamamla`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email, password, nickname, code}) }); const data = await res.json(); if (!data.success) setHata(data.error); else { setBilgi("Kayıt başarılı! Giriş yapılıyor..."); setTimeout(()=>{ kapat(); window.location.reload(); }, 1500); } } catch(e) { setHata("Hata oluştu."); } };

  return ( <div className="modal-overlay"> <div className="modal-box"> <button onClick={kapat} className="modal-close">✖</button> <h2 style={{ textAlign: 'center', color: '#004aad', marginTop: 0 }}>{tip === 'giris' ? 'Giriş Yap' : 'Kayıt Ol'}</h2> {hata && <div className="modal-error">⚠️ {hata}</div>} {bilgi && <div className="modal-info">{bilgi}</div>}
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}> {tip === 'giris' ? ( <> <input type="email" placeholder="E-posta" value={email} onChange={e => setEmail(e.target.value)} className="modal-input" autoComplete="off" /> <input type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} className="modal-input" autoComplete="off" /> <button onClick={girisYap} className="modal-btn">Giriş Yap</button> </> ) : ( kayitAsama === 1 ? ( <> <input type="email" placeholder="E-posta (@ogr.cu.edu.tr)" value={email} onChange={e => setEmail(e.target.value)} className="modal-input" autoComplete="off" /> <button onClick={kodGonder} className="modal-btn">Kod Gönder</button> </> ) : ( <> <p style={{margin:0, textAlign:'center', fontSize:'0.9em'}}>Kodu gir:</p> <input type="text" placeholder="123456" value={code} onChange={e => setCode(e.target.value)} className="modal-input" maxLength={6} style={{textAlign:'center', letterSpacing:5}}/> <input type="text" placeholder="Takma Ad" value={nickname} onChange={e => setNickname(e.target.value)} className="modal-input" autoComplete="off" /> <input type="password" placeholder="Şifre Belirle" value={password} onChange={e => setPassword(e.target.value)} className="modal-input" autoComplete="off" /> <button onClick={kayitTamamla} className="modal-btn" style={{background:'#28a745'}}>Kayıt Ol</button> </> ) )} </div> </div> </div> );
}

// --- ADMIN PANELİ (SİLME İŞLEMİ TEST) ---
const AdminPanel = () => {
    const [veriler, setVeriler] = useState({ ders: [], yurt: [], forum: [], mesajlar: [] });
    
    const veriCek = () => { 
        fetch(`${API_URL}/admin/tum-veriler`)
            .then(res => res.json())
            .then(data => setVeriler(data))
            .catch(() => setVeriler({ ders: [], yurt: [], forum: [], mesajlar: [] })); 
    };
    
    useEffect(() => { veriCek(); }, []);
    
    const sil = (tur, id) => { 
        if(!window.confirm("Silmek istediğine emin misin?")) return; 
        
        // SİLME İSTEĞİ GÖNDERİLİYOR
        fetch(`${API_URL}/admin/sil/${tur}/${id}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    alert("✅ BAŞARIYLA SİLİNDİ!"); // Başarılıysa uyarı ver
                    veriCek(); // Listeyi yenile
                } else {
                    alert("❌ HATA: " + (data.error || "Silinemedi"));
                }
            })
            .catch(err => alert("Bağlantı Hatası: " + err));
    };
    
    const banla = (nickname) => { 
        if(!nickname || nickname === 'Anonim') return; 
        if(window.confirm(`DİKKAT: ${nickname} banlansın mı?`)) { 
            fetch(`${API_URL}/admin/banla`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname }) }).then(() => alert("Kullanıcı Banlandı!")); 
        } 
    };

    return ( <div style={{padding:40, maxWidth:1000, margin:'0 auto'}}> <h1 style={{color:'#d32f2f', textAlign:'center'}}>👑 Admin Paneli</h1> <div style={{textAlign:'center', marginBottom:30}}><Link to="/" style={{padding:'10px 20px', background:'#eee', borderRadius:5, textDecoration:'none', color:'#333', fontWeight:'bold'}}>Ana Sayfaya Dön</Link></div> <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}> 
    
    {/* MESAJLAR */}
    <div style={{background:'#fff', padding:15, border:'1px solid #ddd', borderRadius:8}}><h3>📨 Mesajlar</h3>{veriler.mesajlar.map(x=><div key={x.id} style={{borderBottom:'1px solid #eee', padding:'5px 0', display:'flex', justifyContent:'space-between'}}><small>{x.mesaj}</small> <button onClick={()=>sil('mesaj',x.id)} style={{cursor:'pointer',background:'red',color:'white',border:'none'}}>SİL</button></div>)}</div> 
    
    {/* DERSLER */}
    <div style={{background:'#fff', padding:15, border:'1px solid #ddd', borderRadius:8}}><h3>💬 Ders Yorumları</h3>{veriler.ders.map(x => (<div key={x.id} style={{borderBottom:'1px solid #eee', padding:'10px 0', display:'flex', justifyContent:'space-between', alignItems:'center'}}><div style={{fontSize:'0.9em'}}><b>{x.kullanici_adi}</b>: {x.yorum_metni}</div><div><button onClick={()=>banla(x.kullanici_adi)} style={{background:'#333', color:'white', border:'none', padding:'5px', borderRadius:5, marginRight:5, cursor:'pointer', fontSize:'12px'}}>🚫 BAN</button><button onClick={()=>sil('ders',x.id)} style={{background:'red', color:'white', border:'none', padding:'5px', borderRadius:5, cursor:'pointer'}}>SİL</button></div></div>))}</div> 
    
    {/* YURTLAR */}
    <div style={{background:'#fff', padding:15, border:'1px solid #ddd', borderRadius:8}}><h3>🛏️ Yurt Yorumları</h3>{veriler.yurt.map(x => (<div key={x.id} style={{borderBottom:'1px solid #eee', padding:'10px 0', display:'flex', justifyContent:'space-between', alignItems:'center'}}><div style={{fontSize:'0.9em'}}><b>{x.kullanici_adi}</b> ({x.yurt_adi}): {x.yorum_metni}</div><div><button onClick={()=>banla(x.kullanici_adi)} style={{background:'#333', color:'white', border:'none', padding:'5px', borderRadius:5, marginRight:5, cursor:'pointer', fontSize:'12px'}}>🚫 BAN</button><button onClick={()=>sil('yurt',x.id)} style={{background:'red', color:'white', border:'none', padding:'5px', borderRadius:5, cursor:'pointer'}}>SİL</button></div></div>))}</div> 
    
    {/* FORUM */}
    <div style={{background:'#fff', padding:15, border:'1px solid #ddd', borderRadius:8}}><h3>🗣️ Forum</h3>{veriler.forum.map(x => (<div key={x.id} style={{borderBottom:'1px solid #eee', padding:'10px 0', display:'flex', justifyContent:'space-between', alignItems:'center'}}><div style={{fontSize:'0.9em'}}><b>{x.kullanici_adi}</b>: {x.mesaj}</div><div><button onClick={()=>banla(x.kullanici_adi)} style={{background:'#333', color:'white', border:'none', padding:'5px', borderRadius:5, marginRight:5, cursor:'pointer', fontSize:'12px'}}>🚫 BAN</button><button onClick={()=>sil('forum',x.id)} style={{background:'red', color:'white', border:'none', padding:'5px', borderRadius:5, cursor:'pointer'}}>SİL</button></div></div>))}</div> </div> </div> );
};

// --- DİĞER SAYFALAR (DEĞİŞMEDİ) ---
const Topluluklar = () => ( <div style={{padding: '40px', textAlign: 'center', maxWidth: '800px', margin: '0 auto'}}> <Link to="/" style={{textDecoration:'none', fontSize:'20px', color: '#333'}}>⬅️ Geri</Link> <div style={{marginTop: '40px', padding: '40px', backgroundColor: '#fff3e0', borderRadius: '20px', border: '2px dashed #FFB74D'}}> <h1 style={{color: '#F57C00'}}>Öğrenci Toplulukları</h1> <p style={{fontSize: '20px', color: '#555', lineHeight: '1.6'}}> Üniversite bünyesinde bulunan topluluklar iletişime geçerse eklemeyi istiyorum. </p> </div> </div> );
const BosSayfa = ({baslik}) => <div style={{padding:20}}><Link to="/">⬅️ Geri</Link><h2>{baslik}</h2><p>Yapım aşamasında...</p></div>;

// --- ANA SAYFA ---
function AnaSayfa() {
  const navigate = useNavigate();
  const [iletisimAcik, setIletisimAcik] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [bilgi, setBilgi] = useState("");
  const [modalAcik, setModalAcik] = useState(false);
  const [modalTip, setModalTip] = useState('giris');
  const [kullanici, setKullanici] = useState(null);
  const [toplamYorum, setToplamYorum] = useState(0);
  const [mobilMenuAcik, setMobilMenuAcik] = useState(false);

  useEffect(() => { 
      const u = localStorage.getItem('user'); 
      if (u) setKullanici(JSON.parse(u)); 
      fetch(`${API_URL}/toplam-yorum-sayisi`).then(r=>r.json()).then(d=>setToplamYorum(d.toplam)).catch(()=>{});
  }, []);

  const cikisYap = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.reload(); };
  const barYuzdesi = Math.min((toplamYorum / 600) * 100, 100);

  const mesajGonder = () => {
    if (!mesaj.trim()) return;
    fetch(`${API_URL}/iletisim-gonder`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mesaj })
    }).then(() => { setBilgi("Mesajınız iletildi!"); setMesaj(""); setTimeout(() => { setBilgi(""); setIletisimAcik(false); }, 2000); });
  };

  const menuler = [
    { id: 1, title: 'Fakülteler', icon: '🏛️', link: '/fakulteler' },
    { id: 2, title: 'Hocalar', icon: '👨‍🏫', link: '/hocalar' },
    { id: 3, title: 'Anonim', icon: '🎭', link: '/anonimler' },
    { id: 4, title: 'Yurtlar', icon: '🛏️', link: '/yurtlar' },
    { id: 5, title: 'Sorular', icon: '❓', link: '/sorular' },
    { id: 6, title: 'Topluluklar', icon: '🤝', link: '/topluluklar' },
  ];

  const MobilMenu = () => (
      <div className="mobile-menu-overlay" onClick={()=>setMobilMenuAcik(false)}>
          <div className="mobile-menu-content" onClick={e=>e.stopPropagation()}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                <h3 style={{margin:0, color:'#004aad'}}>Menü</h3>
                <button className="close-menu" onClick={()=>setMobilMenuAcik(false)}>✖</button>
              </div>
              {kullanici && kullanici.nickname === 'baraykanat' && <div onClick={() => navigate('/admin')} className="menu-item admin-btn">👑 Admin Paneli</div>}
              
              <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                  {menuler.map(m=><div key={m.id} onClick={()=>{navigate(m.link);setMobilMenuAcik(false)}} className="menu-item"><span>{m.icon}</span>{m.title}</div>)}
              </div>
              
              <hr style={{margin:'20px 0', border:'0', borderTop:'1px solid #eee'}}/>
              
              <h3 style={{margin:'0 0 10px 0', color:'#444'}}>İletişim</h3>
              {!iletisimAcik ? <button onClick={()=>setIletisimAcik(true)} className="msg-btn">Mesaj Yaz</button> : <div><textarea className="msg-input" value={mesaj} onChange={e=>setMesaj(e.target.value)}/><button onClick={mesajGonder} className="send-btn" style={{width:'100%'}}>Gönder</button></div>}
              <div style={{marginTop:15, textAlign:'center'}}><a href="mailto:cukampus2025@gmail.com" style={{color:'#004aad', fontWeight:'bold', textDecoration:'none'}}>📧 Mail At</a></div>
          </div>
      </div>
  );

  return (
    <div className="main-container">
      <div className="beta-text">Beta 0.32</div>
      <GirisModal kapali={!modalAcik} kapat={() => setModalAcik(false)} tip={modalTip} />
      
      <div className="mobile-header"> <button className="hamburger-btn" onClick={()=>setMobilMenuAcik(true)}>☰</button> <h1 className="mobile-logo">Çukurova Kampüs</h1> </div>
      {mobilMenuAcik && <MobilMenu/>}

      <header className="desktop-header">
        <h1 style={{ color: '#004aad', fontSize: '38px', margin: '0 0 8px 0', fontWeight: '800' }}>Çukurova Kampüs</h1>
        <p style={{ color: '#666', fontSize: '16px', margin: 0 }}>Öğrenci Yorum ve Bilgi Platformu</p>
      </header>

      <div className="content-grid">
        <div className="left-col desktop-only">
          <h3 className="col-title">Menü</h3>
          {kullanici && kullanici.nickname === 'baraykanat' && ( <div onClick={() => navigate('/admin')} className="menu-item admin-btn">👑 Admin Paneli</div> )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {menuler.map((menu) => ( <div key={menu.id} onClick={() => navigate(menu.link)} className="menu-item"> <span style={{ marginRight: '12px', fontSize: '18px' }}>{menu.icon}</span>{menu.title} </div> ))}
          </div>
        </div>
        
        <div className="center-col">
          {!kullanici ? ( <> <h2 style={{ color: '#004aad', fontSize: '26px', margin: '0 0 15px 0' }}>Hoş Geldin</h2> <p style={{ color: '#555', marginBottom: '30px', fontSize: '15px' }}>Yorum yapmak için giriş yapmalısın.</p> <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '220px', margin: '0 auto' }}> <button onClick={() => { setModalTip('giris'); setModalAcik(true); }} className="login-btn">Giriş Yap</button> <button onClick={() => { setModalTip('kayit'); setModalAcik(true); }} className="register-btn">Kayıt Ol</button> </div> </> ) : ( <> <h2 style={{ color: '#004aad', fontSize: '26px', margin: '0 0 10px 0' }}>{kullanici.nickname}</h2> <p style={{ color: '#555', marginBottom: '30px' }}>Giriş yaptın.</p> <button onClick={cikisYap} className="logout-btn">Çıkış Yap</button> </> )}
          <div className="donation-bar-container">
            <p className="donation-text">2025 31 Aralık tarihine kadar her 600 yorum için<br/> Darüşşafaka Cemiyetine 200 lira bağış!</p>
            <div className="progress-bg"><div className="progress-fill" style={{ width: `${barYuzdesi}%` }}></div></div>
            <small style={{ color: '#777' }}>{toplamYorum} / 600 Yorum</small>
          </div>
        </div>

        <div className="right-col desktop-only">
          <h3 className="col-title">İletişim</h3>
          <div className="iletisim-box">
            <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.5', marginBottom: '15px', marginTop: 0 }}>Tavsiye ve önerileriniz için:</p>
            {!iletisimAcik ? ( <button onClick={() => setIletisimAcik(true)} className="msg-btn">Mesaj Yaz</button> ) : ( <div> <textarea rows="4" value={mesaj} onChange={(e) => setMesaj(e.target.value)} className="msg-input" /> <div style={{ display: 'flex', gap: '10px' }}> <button onClick={mesajGonder} className="send-btn">Gönder</button> <button onClick={() => setIletisimAcik(false)} className="cancel-btn">İptal</button> </div> </div> )}
            <div style={{marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee', textAlign:'center'}}> <a href="mailto:cukampus2025@gmail.com" style={{color: '#004aad', textDecoration: 'none', fontWeight:'bold'}}>📧 Mail At</a> </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- FORUM SAYFASI ---
function ForumSayfasi({ tur, baslik, anonimMi }) {
  const navigate = useNavigate(); const [gonderiler, setGonderiler] = useState([]); const [yeniMesaj, setYeniMesaj] = useState(""); const [cevapKutusuAcik, setCevapKutusuAcik] = useState(null); const [cevapMesaj, setCevapMesaj] = useState(""); const [kullanici, setKullanici] = useState(null);
  const verileriCek = useCallback(() => { fetch(`${API_URL}/forum/${tur}`).then(res => res.json()).then(data => { if(Array.isArray(data)) setGonderiler(data); else setGonderiler([]); }).catch(()=>setGonderiler([])); }, [tur]);
  useEffect(() => { const user = localStorage.getItem('user'); if (user) setKullanici(JSON.parse(user)); verileriCek(); }, [verileriCek, tur]);
  const gonder = (ustId = 0, mesajIcerik) => { if (!mesajIcerik.trim()) return; const ad = anonimMi ? 'Anonim' : (kullanici ? kullanici.nickname : 'Misafir'); fetch(`${API_URL}/forum-ekle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tur, ust_id: ustId, kullanici_adi: ad, mesaj: mesajIcerik }) }).then(() => { setYeniMesaj(""); setCevapMesaj(""); setCevapKutusuAcik(null); verileriCek(); }); };
  const kendiYorumunuSil = (id) => { if(window.confirm("Silmek istiyor musun?")) fetch(`${API_URL}/yorum-sil`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({tur:'forum', id, kullanici_adi:kullanici.nickname})}).then(()=>{verileriCek();}); };
  if (!kullanici) { return ( <div style={{ padding: '40px', textAlign: 'center', height: '80vh', position:'relative' }}><div style={{ filter: 'blur(8px)' }}><h2>{baslik}</h2><p>...</p></div><div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', padding: '40px', borderRadius: '20px', border: '1px solid #eee' }}><h2 style={{color:'#004aad'}}>🔒 Giriş Yapmalısın</h2><button onClick={() => navigate('/')} style={{padding: '12px 25px', background:'#004aad', color:'white', border:'none', borderRadius:8, fontWeight:'bold', cursor:'pointer', fontSize:'16px'}}>Giriş Ekranına Git</button></div></div> ); }
  return ( <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}> <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}> <button onClick={() => navigate('/')} style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer', marginRight: '15px' }}>⬅️</button> <h2 style={{ margin: 0, color: '#333' }}>{baslik}</h2> </div> <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '12px' }}> <textarea rows="3" value={yeniMesaj} onChange={(e) => setYeniMesaj(e.target.value)} style={{ width: '95%', padding: '10px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '10px', resize:'vertical' }} placeholder={anonimMi ? "" : "Soru sor..."} /> <button onClick={() => gonder(0, yeniMesaj)} style={{ backgroundColor: '#004aad', color: 'white', border: 'none', padding: '8px 25px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', float: 'right' }}>Paylaş</button> <div style={{ clear: 'both' }}></div> </div> <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}> {gonderiler.map((soru) => ( <div key={soru.id} style={{ padding: '20px', backgroundColor: 'white', border: '1px solid #eee', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}> <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}> <span style={{ fontWeight: 'bold', color: anonimMi ? '#555' : '#004aad' }}>{anonimMi?'Anonim':soru.kullanici_adi}</span> <div style={{fontSize:'0.8em', color:'#ccc'}}>{new Date(soru.tarih).toLocaleDateString()} {kullanici.nickname===soru.kullanici_adi && <button onClick={()=>kendiYorumunuSil(soru.id)} style={{marginLeft:10, background:'none', border:'none', cursor:'pointer'}}>🗑️</button>}</div> </div> <p style={{ fontSize: '1.1em', margin: '0 0 10px 0', lineHeight: '1.5' }}>{soru.mesaj}</p> <div style={{ borderTop: '1px solid #f5f5f5', paddingTop: '10px' }}> <button onClick={() => setCevapKutusuAcik(cevapKutusuAcik === soru.id ? null : soru.id)} style={{ background: 'none', border: 'none', color: '#004aad', cursor: 'pointer', fontSize: '0.9em', fontWeight: '600' }}> 💬 Cevapla </button> </div> {(cevapKutusuAcik === soru.id || soru.cevaplar.length > 0) && ( <div style={{ marginTop: '15px', paddingLeft: '15px', borderLeft: '3px solid #eee' }}> {soru.cevaplar.map(c => ( <div key={c.id} style={{ marginBottom: '10px', fontSize: '0.95em', backgroundColor: '#fbfbfb', padding: '10px', borderRadius: '8px' }}> <strong style={{ color: anonimMi ? '#777' : '#444', fontSize: '0.9em' }}>{anonimMi?'Anonim':c.kullanici_adi}: </strong> {c.mesaj} </div> ))} {cevapKutusuAcik === soru.id && ( <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}> <input type="text" value={cevapMesaj} onChange={(e) => setCevapMesaj(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }} placeholder="Cevabın..." /> <button onClick={() => gonder(soru.id, cevapMesaj)} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '5px', cursor: 'pointer' }}>→</button> </div> )} </div> )} </div> ))} </div> </div> ); }

function YurtlarSayfasi() {
  const navigate = useNavigate(); const [seciliYurt, setSeciliYurt] = useState(null); const [yorumlar, setYorumlar] = useState([]); const [yeniYorum, setYeniYorum] = useState(""); const [kullanici, setKullanici] = useState(null);
  const yurtListesi = ["Beş Ocak Kyk Kız Öğrenci Yurdu", "Toroslar Kyk Kız Öğrenci Yurdu", "Fevzi Çakmak Kyk Kız Öğrenci Yurdu", "Mahmut Sami Ramazanoğlu Kyk Kız Öğrenci Yurdu", "Ceyhan Kyk Kız Ve Erkek Öğrenci Yurdu", "Kozan Kyk Kız Ve Erkek Öğrenci Yurdu", "Çukurova Kyk Erkek Öğrenci Yurdu", "Adana Kyk Erkek Öğrenci Yurdu", "Kutul Amare Kyk Erkek Öğrenci Yurdu"];
  useEffect(() => { const user = localStorage.getItem('user'); if (user) setKullanici(JSON.parse(user)); }, []);
  const yurtSec = (yurt) => { setSeciliYurt(yurt); fetch(`${API_URL}/yurt-yorumlari/${yurt}`).then(res => res.json()).then(data => { if(Array.isArray(data)) setYorumlar(data); else setYorumlar([]); }).catch(()=>setYorumlar([])); };
  const yorumGonder = () => { if (!yeniYorum.trim()) return; fetch(`${API_URL}/yurt-yorum-ekle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ yurt_adi: seciliYurt, yorum_metni: yeniYorum, kullanici_adi: kullanici.nickname }) }).then(() => { setYeniYorum(""); yurtSec(seciliYurt); }); };
  const kendiYorumunuSil = (id) => { if(window.confirm("Silmek istiyor musun?")) fetch(`${API_URL}/yorum-sil`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({tur:'yurt', id, kullanici_adi:kullanici.nickname})}).then(()=>{yurtSec(seciliYurt);}); };
  return ( <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}> <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}> <button onClick={() => seciliYurt ? setSeciliYurt(null) : navigate('/')} style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer', marginRight: '15px' }}>⬅️</button> <h2 style={{ margin: 0, color: '#333' }}>{!seciliYurt ? 'Yurtlar' : seciliYurt}</h2> </div> {!seciliYurt ? ( <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}> {yurtListesi.map((yurt, index) => ( <div key={index} onClick={() => yurtSec(yurt)} style={{ padding: '20px', backgroundColor: 'white', border: '1px solid #eee', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', color:'#00796b', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display:'flex', justifyContent:'space-between' }}> <span>🛏️ {yurt}</span> <span style={{color:'#ccc'}}>❯</span> </div> ))} </div> ) : ( <div> {kullanici ? ( <> <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e0f7fa', borderRadius: '10px' }}> <textarea rows="3" placeholder="Bu yurt hakkında ne düşünüyorsun?" value={yeniYorum} onChange={(e) => setYeniYorum(e.target.value)} style={{ width: '95%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', marginBottom: '10px' }} /> <button onClick={yorumGonder} style={{ backgroundColor: '#00796b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Gönder</button> </div> <h3>Yorumlar ({yorumlar.length})</h3> <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}> {yorumlar.map((y) => ( <div key={y.id} style={{ padding: '15px', backgroundColor: 'white', border: '1px solid #eee', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}> <div style={{fontWeight:'bold', color:'#004aad', marginBottom:'5px', display:'flex', justifyContent:'space-between'}}>{y.kullanici_adi} {kullanici.nickname===y.kullanici_adi && <button onClick={()=>kendiYorumunuSil(y.id)} style={{background:'none', border:'none', cursor:'pointer'}}>🗑️</button>}</div> <div style={{ color: '#333' }}>{y.yorum_metni}</div> <div style={{ fontSize: '0.7em', color: '#999', marginTop: '5px' }}>{new Date(y.tarih).toLocaleDateString('tr-TR')}</div> </div> )) } </div> </> ) : ( <div style={{ padding: '30px', backgroundColor: '#fff', borderRadius: '15px', textAlign: 'center', border: '1px solid #eee', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' }}> <span style={{ fontSize: '40px', display: 'block', marginBottom: '10px' }}>🔒</span> <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Yorumlar Gizli</h3> <button onClick={() => navigate('/')} style={{ padding: '12px 25px', backgroundColor: '#004aad', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Giriş Ekranına Git</button> </div> )} </div> )} </div> ); }

function DersDetay() {
  const location = useLocation(); const navigate = useNavigate(); const ders = location.state?.ders; const [kullanici, setKullanici] = useState(null); const [yeniYorum, setYeniYorum] = useState(""); const [yorumlar, setYorumlar] = useState([]);
  const verileriGuncelle = useCallback(() => { if(ders) { fetch(`${API_URL}/ders-yorumlari/${ders.ders_kodu}`).then(res => res.json()).then(data => { if(Array.isArray(data)) setYorumlar(data); else setYorumlar([]); }).catch(()=>setYorumlar([])); } }, [ders]);
  useEffect(() => { const user = localStorage.getItem('user'); if (user) setKullanici(JSON.parse(user)); verileriGuncelle(); }, [ders, verileriGuncelle]);
  const yorumGonder = () => { if (!yeniYorum.trim()) return; if (!kullanici) { alert("Giriş yapmalısın!"); return; } fetch(`${API_URL}/ders-yorum-ekle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ders_kodu: ders.ders_kodu, ders_adi: ders.ders_adi, kullanici_adi: kullanici.nickname, yorum_metni: yeniYorum }) }).then(() => { setYeniYorum(""); verileriGuncelle(); }); };
  const kendiYorumunuSil = (id) => { if(window.confirm("Silmek istiyor musun?")) fetch(`${API_URL}/yorum-sil`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({tur:'ders', id, kullanici_adi:kullanici.nickname})}).then(()=>{verileriGuncelle();}); };
  if (!ders) return <div style={{padding:20}}>Hata: Ders bulunamadı. <button onClick={()=>navigate('/')}>Geri Dön</button></div>;
  return ( <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}> <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer', marginBottom: '20px' }}>⬅️</button> <div style={{ backgroundColor: '#004aad', color: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}> <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8em' }}>{ders.ders_kodu}</span> <h2 style={{ margin: '10px 0' }}>{ders.ders_adi}</h2> <p style={{ margin: 0, opacity: 0.9 }}>👨‍🏫 {ders.hoca_adi}</p> <small style={{ display:'block', marginTop:'10px', opacity: 0.7 }}>{ders.fakulte} / {ders.bolum}</small> </div> <div style={{ marginTop: '30px' }}> <h3>💬 Yorumlar ({yorumlar.length})</h3> {kullanici ? ( <> <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '10px', border:'1px solid #c8e6c9' }}> <textarea rows="3" placeholder="Bu ders hakkında ne düşünüyorsun?" value={yeniYorum} onChange={(e) => setYeniYorum(e.target.value)} style={{ width: '95%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '10px' }} /> <button onClick={yorumGonder} style={{ backgroundColor: '#2e7d32', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Yorum Yap</button> </div> <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}> {yorumlar.map((y) => ( <div key={y.id} style={{ padding: '15px', backgroundColor: 'white', border: '1px solid #eee', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}> <div style={{fontWeight:'bold', color:'#004aad', marginBottom:'5px', display:'flex', justifyContent:'space-between'}}>{y.kullanici_adi} {kullanici.nickname===y.kullanici_adi && <button onClick={()=>kendiYorumunuSil(y.id)} style={{background:'none', border:'none', cursor:'pointer'}}>🗑️</button>}</div> <div style={{color:'#333'}}>{y.yorum_metni}</div> <div style={{fontSize:'0.7em', color:'#ccc', marginTop:'5px'}}>{y.tarih ? new Date(y.tarih).toLocaleDateString() : ''}</div> </div> ))} </div> </> ) : ( <div style={{ padding: '30px', backgroundColor: '#fff', borderRadius: '15px', textAlign: 'center', border: '1px solid #eee', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' }}> <span style={{ fontSize: '40px', display: 'block', marginBottom: '10px' }}>🔒</span> <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Yorumlar Gizli</h3> <button onClick={() => navigate('/')} style={{ padding: '12px 25px', backgroundColor: '#004aad', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Giriş Ekranına Git</button> </div> )} </div> </div> ); }

function FakultelerSayfasi() { const [tumVeri, setTumVeri] = useState([]); const [seciliFakulte, setSeciliFakulte] = useState(null); const [seciliBolum, setSeciliBolum] = useState(null); const [dersler, setDersler] = useState([]); const [aramaMetni, setAramaMetni] = useState(""); const navigate = useNavigate(); useEffect(() => { fetch(`${API_URL}/bolumler`).then(res => res.json()).then(data => setTumVeri(data)); }, []); const tumFakulteler = [...new Set(tumVeri.map(item => item.fakulte))]; const fakulteSec = (fakulteAdi) => { setSeciliFakulte(fakulteAdi); setAramaMetni(""); }; const bolumSec = (bolumAdi) => { setSeciliBolum(bolumAdi); setAramaMetni(""); fetch(`${API_URL}/dersler/${bolumAdi}`).then(res => res.json()).then(data => setDersler(data)); }; const derseGit = (ders) => { navigate('/ders-detay', { state: { ders: ders } }); }; const geriDon = () => { setAramaMetni(""); if (seciliBolum) { setSeciliBolum(null); setDersler([]); } else if (seciliFakulte) { setSeciliFakulte(null); } else { navigate('/'); } }; const filtrelenmisFakulteler = tumFakulteler.filter(fak => fak.toLocaleLowerCase('tr').includes(aramaMetni.toLocaleLowerCase('tr'))); const filtrelenmisBolumler = tumVeri.filter(x => x.fakulte === seciliFakulte).filter(x => x.bolum.toLocaleLowerCase('tr').includes(aramaMetni.toLocaleLowerCase('tr'))); const filtrelenmisDersler = dersler.filter(d => d.ders_adi.toLocaleLowerCase('tr').includes(aramaMetni.toLocaleLowerCase('tr')) || d.ders_kodu.toLocaleLowerCase('tr').includes(aramaMetni.toLocaleLowerCase('tr'))); return ( <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}> <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}> <button onClick={geriDon} style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer', marginRight: '15px' }}>⬅️</button> <h2 style={{ margin: 0, fontSize: '20px' }}>{!seciliFakulte ? 'Fakülte Seç' : !seciliBolum ? 'Bölüm Seç' : 'Ders Seç'}</h2> </div> <input type="text" placeholder="Fakülte ara..." value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)} style={{ width: '93%', padding: '15px', fontSize: '16px', borderRadius: '12px', border: '2px solid #eee', marginBottom: '20px', outline: 'none', backgroundColor: '#f9f9f9' }} /> {!seciliFakulte && ( <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}> {filtrelenmisFakulteler.map((fak, i) => ( <div key={i} onClick={() => fakulteSec(fak)} style={{ padding: '20px', backgroundColor: 'white', border: '1px solid #eee', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display:'flex', justifyContent:'space-between' }}>{fak} <span style={{color:'#ccc'}}>❯</span></div> ))} </div> )} {seciliFakulte && !seciliBolum && ( <div> <div style={{marginBottom:'10px', color:'#888', fontSize:'0.9em'}}>{seciliFakulte}</div> <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}> {filtrelenmisBolumler.map((item, i) => ( <div key={i} onClick={() => bolumSec(item.bolum)} style={{ padding: '15px', backgroundColor: '#f0f7ff', border: '1px solid #e1effe', borderRadius: '10px', cursor: 'pointer', color: '#0056b3', fontWeight: '600' }}>{item.bolum}</div> ))} </div> </div> )} {seciliBolum && ( <div> <div style={{marginBottom:'10px', color:'#888', fontSize:'0.9em'}}>{seciliBolum}</div> <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}> {filtrelenmisDersler.map((d) => ( <div key={d.id} onClick={() => derseGit(d)} style={{ padding: '15px', backgroundColor: 'white', border: '1px solid #eee', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)', cursor: 'pointer' }}> <div style={{fontSize:'0.8em', color:'#999'}}>{d.ders_kodu}</div><div style={{fontWeight:'bold', fontSize:'1.1em', color: '#333'}}>{d.ders_adi}</div><div style={{fontSize:'0.9em', color:'#555', marginTop:'5px'}}>👨‍🏫 {d.hoca_adi}</div> </div> ))} </div> </div> )} </div> ); }

function HocalarSayfasi() { 
    const [data, setData] = useState([]); 
    const [arama, setArama] = useState(""); 
    const [secili, setSecili] = useState(null); 
    const [dersler, setDersler] = useState([]); 
    const nav = useNavigate();

    useEffect(() => { 
        fetch(`${API_URL}/hocalar`)
            .then(r => r.json())
            .then(d => { if(Array.isArray(d)) setData(d); else setData([]); })
            .catch(() => setData([])); 
    }, []);

    const hocaSec = (h) => { 
        setSecili(h); 
        fetch(`${API_URL}/hoca-dersleri/${h}`).then(r => r.json()).then(d => setDersler(d)); 
    };

    const don = () => { if(secili) setSecili(null); else nav('/'); };

    const filtreliHocalar = arama.trim() === "" 
        ? data 
        : data.filter(i => i.hoca_adi && i.hoca_adi.toLocaleLowerCase('tr').includes(arama.toLocaleLowerCase('tr')));

    return ( 
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}> 
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <button onClick={don} style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer', marginRight: '15px' }}>⬅️</button> 
                <h2 style={{ margin: 0, color: '#333' }}>{!secili ? 'Hoca Bul' : secili}</h2> 
            </div> 
            
            {!secili ? ( 
                <div>
                    <input 
                        type="text" 
                        placeholder="Hoca adı ara..." 
                        value={arama} 
                        onChange={(e) => setArama(e.target.value)} 
                        style={{ width: '93%', padding: '15px', fontSize: '16px', borderRadius: '12px', border: '2px solid #eee', marginBottom: '20px', outline: 'none', backgroundColor: '#fff' }} 
                    /> 
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}> 
                        {filtreliHocalar.map((item, index) => ( 
                            <div key={index} onClick={() => hocaSec(item.hoca_adi)} style={{ padding: '15px', backgroundColor: 'white', border: '1px solid #eee', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', color: '#444', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display:'flex', alignItems:'center' }}> 
                                <span style={{marginRight:'10px', fontSize:'1.2em'}}>👨‍🏫</span> {item.hoca_adi} 
                            </div> 
                        ))} 
                    </div> 
                </div> 
            ) : ( 
                <div>
                    <p style={{color:'#666', marginBottom:'10px'}}>Verdiği Dersler:</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}> 
                        {dersler.map((d) => ( 
                            <div key={d.id} onClick={() => nav('/ders-detay', { state: { ders: d } })} style={{ padding: '15px', backgroundColor: 'white', borderLeft: '5px solid #004aad', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor:'pointer' }}> 
                                <div style={{ fontWeight: 'bold', color: '#333', fontSize:'1.1em' }}><span style={{color: '#004aad', marginRight:'8px'}}>{d.ders_kodu}</span> {d.ders_adi}</div> 
                                <div style={{ fontSize: '0.85em', color: '#888', marginTop:'4px' }}>{d.fakulte} - {d.bolum}</div> 
                            </div> 
                        ))} 
                    </div> 
                </div> 
            )} 
        </div> 
    ); 
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AnaSayfa />} />
        <Route path="/fakulteler" element={<FakultelerSayfasi />} />
        <Route path="/hocalar" element={<HocalarSayfasi />} />
        <Route path="/ders-detay" element={<DersDetay />} />
        <Route path="/sorular" element={<ForumSayfasi tur="soru" baslik="❓ Soru - Cevap" />} />
        <Route path="/anonimler" element={<ForumSayfasi tur="anonim" baslik="🎭 Burada Anonimsin" anonimMi={true} />} />
        <Route path="/yurtlar" element={<YurtlarSayfasi />} />
        <Route path="/topluluklar" element={<Topluluklar />} />
        <Route path="/tavsiyeler" element={<BosSayfa baslik="Tavsiyeler" />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}

export default App;