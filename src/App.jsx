 import { useEffect, useMemo, useState } from 'react';
import { Camera, BookOpen, Mail, UserRound, Menu, X, PawPrint, Heart, Sparkles, LogIn, LogOut, Plus, Pencil, Trash2, Search, Send, ArrowUpRight } from 'lucide-react';
import { supabase, supabaseReady } from './lib/supabase.js';

const SITE_NAME = import.meta.env.VITE_SITE_NAME || 'ぽけっと日和';
const PUBLIC_EMAIL = import.meta.env.VITE_PUBLIC_EMAIL || 'hello@example.com';
const CATEGORIES = ['すべて', '動物・野生動物', '日記', '写真・カメラ', '趣味', 'お出かけ・旅', 'コラム'];
const DEMO_POSTS = [
  { id:'demo-1', title:'森で見つけた、小さな発見。', slug:'forest-discovery', category:'動物・野生動物', excerpt:'いつもの景色も、少し目をこらすと新しい発見がある。', body:'ここに記事本文が入ります。管理画面から自分の記事を投稿してね。', image_url:'https://images.unsplash.com/photo-1474511320723-9a56873867b5?auto=format&fit=crop&w=1200&q=85', status:'published', created_at:new Date().toISOString() },
  { id:'demo-2', title:'何気ない今日を残しておこう。', slug:'ordinary-day', category:'日記', excerpt:'小さな出来事も、あとから見返すと大切な思い出。', body:'日記のサンプルです。あなたらしい日々の記録に差し替えてね。', image_url:'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=85', status:'published', created_at:new Date().toISOString() },
  { id:'demo-3', title:'お気に入りの一枚と、撮影の裏話。', slug:'photo-notes', category:'写真・カメラ', excerpt:'写真を撮る時間も、写真を選ぶ時間も好き。', body:'撮影したときのことや使った機材などを書いてみよう。', image_url:'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1200&q=85', status:'published', created_at:new Date().toISOString() },
  { id:'demo-4', title:'次のお休みはどこへ行こう？', slug:'next-trip', category:'お出かけ・旅', excerpt:'気になる場所を少しずつリストに。', body:'お出かけの記録や次に行きたい場所を書こう。', image_url:'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=85', status:'published', created_at:new Date().toISOString() }
];

function slugify(s) {
  return (s || 'post').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `post-${Date.now()}`;
}
function dateLabel(s) {
  try { return new Intl.DateTimeFormat('ja-JP', {year:'numeric',month:'short',day:'numeric'}).format(new Date(s)); }
  catch { return ''; }
}

export default function App() {
  const [page, setPage] = useState('home');
  const [posts, setPosts] = useState(DEMO_POSTS);
  const [selectedPost, setSelectedPost] = useState(null);
  const [category, setCategory] = useState('すべて');
  const [query, setQuery] = useState('');
  const [profile, setProfile] = useState({display_name:'表示名未設定', bio:'動物の写真も、日々の記録も。好きなことを自由に綴っています。', avatar_url:''});
  const [session, setSession] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [contact, setContact] = useState({name:'',email:'',topic:'感想・ご質問',message:''});
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    document.title = `${SITE_NAME}｜好きなものを、ひとつずつ。`;
    if (!supabaseReady) return;
    supabase.auth.getSession().then(({data}) => setSession(data.session));
    const {data: listener} = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    loadPosts();
    loadProfile();
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadPosts() {
    if (!supabaseReady) return;
    const {data, error} = await supabase.from('posts').select('*').order('created_at', {ascending:false});
    if (!error && data) setPosts(data.length ? data : []);
  }
  async function loadProfile() {
    if (!supabaseReady) return;
    const {data} = await supabase.from('site_profile').select('*').eq('id',1).maybeSingle();
    if (data) setProfile(data);
  }
  const visiblePosts = useMemo(() => posts.filter(p => p.status === 'published' &&
    (category === 'すべて' || p.category === category) &&
    `${p.title} ${p.excerpt} ${p.body} ${p.category}`.toLowerCase().includes(query.toLowerCase())), [posts, category, query]);
  const allPublished = posts.filter(p => p.status === 'published');
  const isConfigured = supabaseReady;

  function navigate(next) {
    setPage(next); setMobileNav(false); setNotice(''); setSelectedPost(null); setEditing(null);
    window.scrollTo({top:0, behavior:'smooth'});
  }
  function openPost(post) { setSelectedPost(post); setPage('article'); window.scrollTo({top:0, behavior:'smooth'}); }
  async function login(e) {
    e.preventDefault(); setBusy(true); setNotice('');
    if (!supabaseReady) { setNotice('先にSupabaseの環境変数を設定してください。'); setBusy(false); return; }
    const {error} = await supabase.auth.signInWithPassword({email:loginEmail,password:loginPassword});
    setNotice(error ? `ログインできませんでした：${error.message}` : 'ログインしました。');
    setBusy(false);
  }
  async function logout() { await supabase?.auth.signOut(); setAdminMode(false); setNotice('ログアウトしました。'); }
  async function savePost(e) {
    e.preventDefault();
    if (!session || !supabaseReady) return setNotice('管理者としてログインしてください。');
    setBusy(true); setNotice('');
    const form = new FormData(e.currentTarget);
    const title = String(form.get('title') || '').trim();
    const payload = {
      title, slug: String(form.get('slug') || '').trim() || `${slugify(title)}-${Date.now().toString().slice(-5)}`,
      category: String(form.get('category') || '日記'), excerpt: String(form.get('excerpt') || ''),
      body: String(form.get('body') || ''), image_url: String(form.get('image_url') || ''),
      status: String(form.get('status') || 'draft'), updated_at: new Date().toISOString()
    };
    let result;
    if (editing?.id) result = await supabase.from('posts').update(payload).eq('id',editing.id);
    else result = await supabase.from('posts').insert(payload);
    setBusy(false);
    if (result.error) { setNotice(`保存できませんでした：${result.error.message}`); return; }
    setNotice('記事を保存しました。'); setEditing(null); await loadPosts();
  }
  async function deletePost(post) {
    if (!window.confirm(`「${post.title}」を削除しますか？`)) return;
    const {error} = await supabase.from('posts').delete().eq('id',post.id);
    setNotice(error ? `削除できませんでした：${error.message}` : '記事を削除しました。');
    await loadPosts();
  }
  async function submitContact(e) {
    e.preventDefault(); setBusy(true); setNotice('');
    if (!supabaseReady) { setNotice('お問い合わせを受け取るには、先にSupabaseを設定してください。'); setBusy(false); return; }
    const {error} = await supabase.from('contact_messages').insert({
      name:contact.name.trim(), email:contact.email.trim(), topic:contact.topic, message:contact.message.trim()
    });
    setBusy(false);
    if (error) { setNotice('送信できませんでした。入力内容を確認して、もう一度お試しください。'); return; }
    setContact({name:'',email:'',topic:'感想・ご質問',message:''});
    setNotice('お問い合わせを受け付けました。ありがとうございます！');
  }

  const navItems = [
    ['home','ホーム'],['blog','記事一覧'],['gallery','写真ギャラリー'],['about','プロフィール'],['contact','お問い合わせ']
  ];
  const categoriesForUI = CATEGORIES.filter(c => c === 'すべて' || posts.some(p => p.category === c));

  return <div className="app-shell">
    <div className="announcement"><Sparkles size={14}/> すきなものを、すきなだけ。 <Heart size={14}/></div>
    <header className="site-header">
      <button className="brand" onClick={() => navigate('home')} aria-label="トップページへ">
        <span className="brand-icon"><PawPrint size={25}/></span>
        <span><strong>{SITE_NAME}</strong><small>PHOTO · DIARY · MY LIFE</small></span>
      </button>
      <nav className="desktop-nav">{navItems.map(([key,label]) => <button key={key} className={page===key?'active':''} onClick={() => navigate(key)}>{label}</button>)}
        <button className="admin-link" onClick={() => {setAdminMode(true);navigate('admin')}}><LogIn size={16}/> 管理</button>
      </nav>
      <button className="menu-toggle" onClick={() => setMobileNav(!mobileNav)} aria-label="メニュー">{mobileNav?<X/>:<Menu/>}</button>
    </header>
    {mobileNav && <nav className="mobile-nav">{navItems.map(([key,label]) => <button key={key} onClick={() => navigate(key)}>{label}</button>)}<button onClick={() => {setAdminMode(true);navigate('admin')}}>管理画面</button></nav>}
    {!isConfigured && <div className="setup-banner"><strong>プレビュー表示中</strong><span>記事保存・ログイン・お問い合わせを有効にするには、Supabaseの設定が必要です。</span></div>}
    {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="閉じる"><X size={16}/></button></div>}

    <main>
      {page === 'home' && <>
        <section className="hero">
          <div className="hero-copy"><span className="eyebrow"><Sparkles size={15}/> MY LITTLE UNIVERSE</span><h1>好きなものを、<br/><em>ひとつずつ。</em></h1><p>動物の写真も、日々の記録も。<br/>好きなことを自由に綴る、小さなブログ。</p><div className="hero-actions"><button className="btn-primary" onClick={() => navigate('blog')}>記事を読む <ArrowUpRight size={17}/></button><button className="btn-soft" onClick={() => navigate('about')}>このブログについて</button></div><div className="hero-stickers"><span>🐾 ANIMAL</span><span>📷 PHOTO</span><span>☕ DAILY</span></div></div>
          <div className="hero-art"><div className="hero-blob"></div><img src="https://images.unsplash.com/photo-1474511320723-9a56873867b5?auto=format&fit=crop&w=1000&q=85" alt="森の中のキツネ" /><span className="sticker sticker-one">HELLO! <Heart size={14}/></span><span className="sticker sticker-two">little<br/>moments ✿</span><span className="sparkle s1">✳</span><span className="sparkle s2">✦</span></div>
        </section>
        <section className="section-block">
          <div className="section-heading"><div><span className="eyebrow">FIND YOUR FAVORITE</span><h2>なにを読む？</h2></div><span className="section-note">気分に合わせて、どうぞ。</span></div>
          <div className="category-grid">{[
            ['🐾','動物・野生動物','category-animal'],['📔','日記','category-diary'],['📷','写真・カメラ','category-photo'],['🎨','趣味','category-hobby'],['🌿','お出かけ・旅','category-trip'],['✍️','コラム','category-column']
   
