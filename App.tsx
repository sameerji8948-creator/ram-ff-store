import { useEffect, useMemo, useState, useRef } from 'react'
import { requireSupabase, isSupabaseConfigured } from './supabase'
import ApkStore, { LegalModal } from './ApkStore'
import qrCodeAsset from "./f251df9202508cc6-6334487114589869150_1.jpg"

// Public marketplace display settings only. Private bot credentials must never be shipped to the browser.
const TELEGRAM_CONFIG = { BOT_USERNAME: 'alerts', UPI_ID: '' }
const BOT_USERNAME = TELEGRAM_CONFIG.BOT_USERNAME
const CONFIG_UPI_ID = TELEGRAM_CONFIG.UPI_ID

async function uploadToTelegram(_file?: File, _caption?: string){
  // Telegram notifications are intentionally disabled in the browser build.
  // Connect them through a server-side function when a secure backend is configured.
  return false
}

import {
  Search, Flame, ShieldCheck, Zap, Star, Heart, Trophy, Crosshair, Crown, Verified, Eye,
  MessageCircle, Lock, Clock3, BadgeCheck, Sparkles, ChevronRight, Filter, X, Plus, Layers,
  Gamepad2, MapPin, AlertTriangle, User, Bell, ShoppingCart, Settings, LogOut, LogIn,
  Shield, Package, Wallet, ArrowRight, ArrowLeft, Upload, Camera, Save, Sun, Moon, Inbox,
  HeartOff, ExternalLink, Check, Clock, Gift, FileText, KeyRound, Rocket, Bot, Key, Cpu,
  FileCode, Download, RefreshCw, Wrench, History, Fingerprint, Monitor, Menu, Grid, Sliders,
  DollarSign, Users, Award, TrendingUp, Activity, Play, Image as ImageIcon, Send, Phone,
  Globe, MoreVertical, CheckCircle, AlertCircle, CreditCard, Building2, QrCode, Smartphone,
  Timer, ShieldAlert, Receipt, Info, Paperclip, Headphones
} from 'lucide-react'

type Rank = 'Heroic' | 'Grandmaster' | 'Master' | 'Diamond' | 'Not specified'
type Listing = {
  id: string
  level: number
  likes: number
  rank: Rank
  rankPoints: number
  evoGuns: string[]
  bundles: string[]
  gunSkins?: string[]
  emotes?: string[]
  vehicles?: string[]
  glooWalls?: string[]
  pets?: string[]
  passes?: string[]
  backpacks?: string[]
  rareItems?: string[]
  price: number
  verified: boolean
  seller: string
  sellerEmail?: string
  sellerPhone?: string
  rating: number
  sales: number
  region: 'IND' | 'BR' | 'ID' | 'NA' | 'MENA'
  instant: boolean
  vault: number
  characters: string[]
  bio: string
  createdAt?: string
  approved?: boolean
  featured?: boolean
  views?: number
  images?: number
  hasVideo?: boolean
  mediaUrls?: string[]
  mediaTypes?: string[]
}
type UserRole = 'user' | 'admin'
type AppUser = {
  id: string
  email: string
  name: string
  role: UserRole
  avatar: string
  bio: string
  verified: boolean
  joined: string
  rating: number
  sales: number
  banned?: boolean
  balance?: number
  phone?: string
}
type ChatMsg = { from: string; text: string; time: string; type?: 'text' | 'offer' | 'system' | 'image'; mediaPath?: string; mediaType?: string }
type ChatThread = { id: string; listingId: string; listingTitle: string; buyer: string; buyerEmail: string; seller: string; sellerEmail: string; messages: ChatMsg[]; unread: number; createdAt: string; online?: boolean }
type OrderStatus = 'pending_verification' | 'paid' | 'escrow' | 'delivered' | 'confirmed' | 'completed' | 'disputed'
type Order = { id: string; listingId: string; buyer: string; buyerEmail: string; seller: string; sellerEmail: string; price: number; status: OrderStatus; createdAt: string; paymentMethod?: string; escrowAmount?: number; sellerPayout?: number; transactionId?: string }
type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet' | 'paypal'
type VoucherInventoryItem = { id:string; provider:string; title:string; balance:number; price:number; voucher_code:string; status:'available'|'sold'|'disabled'; created_at:string }
type PublicVoucherItem = { id:string; provider:string; title:string; balance:number; price:number; created_at:string }

const LISTINGS_SEED: Listing[] = [] // No fabricated sellers/listings are shown as genuine marketplace offers.

const DEFAULT_USERS: AppUser[] = [] // No seeded/demo accounts or shared administrator credentials.

type View = 'home'|'profile'|'settings'|'inbox'|'orders'|'wishlist'|'cart'|'admin'|'sell'|'checkout'|'payment_success'|'vouchers'|'apk'

function profileToAppUser(profile:any): AppUser {
  return {
    id: profile.id, email: profile.email || '', name: profile.name || 'Player',
    role: profile.role === 'admin' ? 'admin' : 'user',
    avatar: profile.avatar || (profile.name || 'P').slice(0,1).toUpperCase(),
    bio: profile.bio || '', verified: Boolean(profile.verified),
    joined: profile.joined || (profile.created_at ? profile.created_at.slice(0,10) : ''),
    rating: Number(profile.rating || 0), sales: Number(profile.sales || 0),
    banned: Boolean(profile.banned), balance: Number(profile.balance || 0), phone: profile.phone || ''
  }
}


function ListingMediaItem({ path, mediaType, className, controls = false }: { path: string; mediaType?: string; className?: string; controls?: boolean }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let alive = true
    if (!path) return
    if (/^https?:\/\//i.test(path)) { setUrl(path); return }
    if (!isSupabaseConfigured) return
    requireSupabase().storage.from('listing-media').createSignedUrl(path, 60 * 30)
      .then(({ data, error }) => { if (alive && !error && data?.signedUrl) setUrl(data.signedUrl) })
      .catch(() => {})
    return () => { alive = false }
  }, [path])
  if (!url) return <div className={className} aria-label="Listing media loading" />
  return mediaType?.startsWith('video/')
    ? <video src={url} controls={controls} muted={!controls} autoPlay={!controls} loop={!controls} playsInline className={className}/>
    : <img src={url} alt="Listing media" className={className}/>
}

function ChatAttachment({ path, mediaType }: { path: string; mediaType?: string }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let alive = true
    if (!isSupabaseConfigured) return
    requireSupabase().storage.from('chat-media').createSignedUrl(path, 60 * 60 * 24 * 7)
      .then(({ data, error }) => { if (alive && !error) setUrl(data.signedUrl) })
      .catch(() => {})
    return () => { alive = false }
  }, [path])
  if (!url) return <div className="mt-2 rounded-lg bg-black/20 px-3 py-2 text-[11px] opacity-70">Loading attachment…</div>
  return mediaType?.startsWith('video/')
    ? <video src={url} controls playsInline className="mt-2 max-w-full max-h-[260px] rounded-xl" />
    : <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Chat attachment" className="mt-2 max-w-full max-h-[260px] rounded-xl object-contain" /></a>
}

export default function App(){
  const [listings, setListings] = useState<Listing[]>(LISTINGS_SEED)
  const [users, setUsers] = useState<AppUser[]>(DEFAULT_USERS)
  const [chats, setChats] = useState<ChatThread[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [wishlist, setWishlist] = useState<string[]>([])
  const [cart, setCart] = useState<string[]>([])

  const [q, setQ] = useState('')
  const [heroSearch, setHeroSearch] = useState('')
  const [collectionType, setCollectionType] = useState('ALL')
  const [levelRange, setLevelRange] = useState<[number, number]>([0,100])
  const [priceRange, setPriceRange] = useState<[number, number]>([0,10000])
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [region, setRegion] = useState<string>('ALL')
  const [evoMin, setEvoMin] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'featured'|'price_asc'|'price_desc'|'level_desc'|'likes'>('featured')

  const [view, setView] = useState<View>('home')
  const [profileTab, setProfileTab] = useState<'listings'|'wishlist'|'orders'|'settings'>('listings')
  const [settingsTab, setSettingsTab] = useState<'account'|'notifications'|'privacy'|'payments'|'appearance'>('account')
  const [adminTab, setAdminTab] = useState<'dash'|'users'|'listings'|'orders'|'qr'|'vouchers'|'panels'>('dash')

  const [currentUser, setCurrentUser] = useState<AppUser|null>(null)
  const [showAuth, setShowAuth] = useState<null|'login'|'signup'>(null)
  const [authForm, setAuthForm] = useState({ email:'', password:'', name:'' })
  const [loginError, setLoginError] = useState<string|null>(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [faqOpen, setFaqOpen] = useState<number | null>(0)
  const [toast, setToast] = useState<string|null>(null)
  const [selected, setSelected] = useState<Listing|null>(null)
  const [detailTab, setDetailTab] = useState<'overview'|'screenshots'|'stats'|'seller'>('overview')
  const [activeChatId, setActiveChatId] = useState<string|null>(null)
  const [chatInput, setChatInput] = useState('')
  const [offerAmount, setOfferAmount] = useState<number>(0)
  const [sellStep, setSellStep] = useState(1)
  const [sellForm, setSellForm] = useState({
    level:0, likes:0, rank:'Not specified' as Rank, evo:[] as string[], bundles:[] as string[], gunSkins:'', emotes:'', vehicles:'', glooWalls:'', pets:'', passes:'', backpacks:'', rareItems:'',
    price:2999, region:'IND' as Listing['region'], bio:'', sellerPhone:'', characters:[], delivery:'instant', legal:false
  })
  const [sellMediaFiles, setSellMediaFiles] = useState<File[]>([])
  const [sellMediaPreviews, setSellMediaPreviews] = useState<{url:string; type:string; name:string}[]>([])
  const [chatMediaFile, setChatMediaFile] = useState<File|null>(null)
  const chatFileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [showAdminPortal, setShowAdminPortal] = useState(false)
  const [adminForm, setAdminForm] = useState({ user:'', pass:'' })
  const [voucherItems, setVoucherItems] = useState<VoucherInventoryItem[]>([])
  const [publicVoucherItems, setPublicVoucherItems] = useState<PublicVoucherItem[]>([])
  const [voucherCatalogLoading, setVoucherCatalogLoading] = useState(false)
  const [voucherForm, setVoucherForm] = useState({ provider:'Voucher', title:'', balance:'', price:'', code:'' })
  const [voucherBusy, setVoucherBusy] = useState(false)
  const [showVoucherCodes, setShowVoucherCodes] = useState(false)
  const [theme, setTheme] = useState<'dark'|'light'>('dark')
  const [notifications, setNotifications] = useState([
    
  ])

  // Checkout & Payment states
  const [checkoutListings, setCheckoutListings] = useState<Listing[]>([])
  const [checkoutCartMode, setCheckoutCartMode] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod|null>(null)
  const [paymentForm, setPaymentForm] = useState({
    upiApp:'phonepe' as 'phonepe'|'gpay'|'paytm',
    upiId:'',
    cardNumber:'',
    cardExpiry:'',
    cardCvv:'',
    cardName:'',
    bank:'SBI',
    walletType:'paytm',
    paypalEmail:'',
    otp:''
  })
  const [showPaymentGateway, setShowPaymentGateway] = useState(false)
  const [paymentStage, setPaymentStage] = useState<'form'|'processing'|'otp'|'upi_qr'|'success'|'failed'>('form')
  const [paymentError, setPaymentError] = useState<string|null>(null)
  const [payProcessing, setPayProcessing] = useState(false)
  const [checkoutConfirmOpen, setCheckoutConfirmOpen] = useState(false)
  const [paymentResult, setPaymentResult] = useState<{saved:number, remaining:number, error:string|null, reloadError:string|null}|null>(null)

  // UPI QR + Telegram states
  const [upiTimer, setUpiTimer] = useState(600)
  const [transactionId, setTransactionId] = useState('')
  const [transactionError, setTransactionError] = useState<string|null>(null)
  const UPI_ID = CONFIG_UPI_ID
  const UPI_NAME = ''
  const [showToken, setShowToken] = useState(false)
  const [tgStatus, setTgStatus] = useState<'idle'|'testing'|'connected'|'failed'>('idle')
  const [tgLastMe, setTgLastMe] = useState<string|null>(null)

  // record maps
  const [wishlistRecords, setWishlistRecords] = useState<Record<string,string>>({})
  const [cartRecords, setCartRecords] = useState<Record<string,string>>({})
  const [chatRecordMap, setChatRecordMap] = useState<Record<string,string>>({})
  const [orderRecordMap, setOrderRecordMap] = useState<Record<string,string>>({})

  // edit profile
  const [editProfile, setEditProfile] = useState({ name:'', bio:'', phone:'' })
  const [appSettings, setAppSettings] = useState({ orderUpdates:true, messages:true, priceDrops:true, promo:false, twoFactor:false, emailVisible:false })

  const sellRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previews = sellMediaFiles.map(file => ({ url: URL.createObjectURL(file), type: file.type, name: file.name }))
    setSellMediaPreviews(previews)
    return () => previews.forEach(item => URL.revokeObjectURL(item.url))
  }, [sellMediaFiles])
  const activeChat = useMemo(()=> chats.find(c=>c.id===activeChatId)||null, [chats, activeChatId])
  const isAdmin = currentUser?.role==='admin'
  const [legalDoc, setLegalDoc] = useState<string|null>(null)
  useEffect(()=>{
    const q = new URLSearchParams(window.location.search)
    if(q.get('panel')==='expired'){ setView('apk'); pushToast('This link has expired. Open My Panel Orders and tap Download to get a new link.'); window.history.replaceState({},'',window.location.pathname) }
  },[])
  useEffect(()=>{
    if(!isSupabaseConfigured) return
    const { data } = requireSupabase().auth.onAuthStateChange((event)=>{
      if(event==='PASSWORD_RECOVERY'){
        const p = window.prompt('Enter your new password (at least 8 characters)')
        if(p && p.length>=8){ requireSupabase().auth.updateUser({password:p}).then(({error})=>pushToast(error?error.message:'Password updated')) }
        else if(p){ pushToast('Password must be at least 8 characters') }
      }
    })
    return ()=>data.subscription.unsubscribe()
  },[])

  // Supabase data helpers. Row access is protected by the SQL policies in supabase/schema.sql.
  async function apiCreate(collection:string, value:any, idempotency_key?:string){
    const client = requireSupabase()
    const { data: authData } = await client.auth.getUser()
    if(!authData.user) throw new Error('Please sign in again')
    const { data, error } = await client.from('app_records').insert({
      collection, value, owner_id: authData.user.id,
      idempotency_key: idempotency_key || `${collection}-${Date.now()}-${Math.random()}`
    }).select('id,value').single()
    if(error) throw error
    return data
  }
  async function apiList(collection:string, limit=100){
    const client = requireSupabase()
    if(collection==='users'){
      const { data, error } = await client.from('profiles').select('*').order('created_at',{ascending:false}).limit(limit)
      if(error) throw error
      return (data||[]).map((profile:any)=>({id:profile.id, value:profileToAppUser(profile)}))
    }
    const { data, error } = await client.from('app_records').select('id,value').eq('collection',collection).order('created_at',{ascending:false}).limit(limit)
    if(error) throw error
    return data || []
  }
  async function apiReplace(collection:string, id:string, value:any){
    const client = requireSupabase()
    if(collection==='users'){
      const { data, error } = await client.from('profiles').update({name:value.name,bio:value.bio,phone:value.phone,verified:value.verified,banned:value.banned}).eq('id',id).select().single()
      if(error) throw error
      return data
    }
    const { data, error } = await client.from('app_records').update({value}).eq('id',id).select('id,value').single()
    if(error) throw error
    return data
  }
  async function apiDelete(collection:string, id:string){
    const client = requireSupabase()
    const { error } = await client.from('app_records').delete().eq('id',id)
    if(error) throw error
    return true
  }

  async function testTelegramConnection(){
    setTgStatus('failed')
    setTgLastMe(null)
    pushToast('Telegram backend is not configured')
  }

  // init
  useEffect(()=>{
    if(isSupabaseConfigured){
      const client = requireSupabase()
      client.auth.getSession().then(async ({data})=>{
        const authUser = data.session?.user
        if(!authUser) return
        const {data:profile,error} = await client.from('profiles').select('*').eq('id',authUser.id).single()
        if(!error && profile){ const user = profileToAppUser(profile); setCurrentUser(user); setEditProfile({name:user.name,bio:user.bio,phone:user.phone||''}) }
      }).catch(()=>{})
    }
    const th = localStorage.getItem('ff_theme'); if(th) setTheme(th as any)
    const sett = localStorage.getItem('ff_app_settings'); if(sett) try{ setAppSettings(JSON.parse(sett)) }catch{}

    const checkHash = () => { if(window.location.hash==='#admin' || window.location.hash==='#admin-login'){ setShowAdminPortal(true) } }
    checkHash()
    window.addEventListener('hashchange', checkHash)
    const onKey = (e: KeyboardEvent)=>{ if(e.ctrlKey && e.shiftKey && e.key.toLowerCase()==='a'){ e.preventDefault(); setShowAdminPortal(true) } }
    window.addEventListener('keydown', onKey)

    async function load(){
      try{
        const cols = ['listings','users','chats','orders','wishlist','cart']
        for(const col of cols){
          try{
            const records = await apiList(col, 100)
            if(records.length){
              const vals = records.map(r=>r.value)
              if(col==='listings'){
                const merged = vals.filter((v:any)=>v.price && v.approved !== false || v.sellerEmail === currentUser?.email)
                setListings(merged)
              }
              if(col==='users'){ setUsers(vals) }
              if(col==='chats'){
                setChats(vals)
                const map: Record<string,string> = {}
                records.forEach(r=>{ if(r.value?.id) map[r.value.id]=r.id })
                setChatRecordMap(map)
              }
              if(col==='orders'){
                setOrders(vals)
                const map: Record<string,string> = {}
                records.forEach(r=>{ if(r.value?.id) map[r.value.id]=r.id })
                setOrderRecordMap(map)
              }
              if(col==='wishlist'){
                const map: Record<string,string> = {}
                records.forEach(r=>{
                  const v = r.value
                  if(v?.listingId){ map[v.listingId]=r.id }
                })
                setWishlistRecords(prev=>({...prev, ...map}))
              }
              if(col==='cart'){
                const map: Record<string,string> = {}
                records.forEach(r=>{
                  const v = r.value
                  if(v?.listingId){ map[v.listingId]=r.id }
                })
                setCartRecords(prev=>({...prev, ...map}))
              }
            }
          }catch{}
        }
      }catch{}
    }
    load()
    return ()=>{ window.removeEventListener('hashchange',checkHash); window.removeEventListener('keydown',onKey) }
  },[])

  // load user-specific wishlist/cart when user changes
  useEffect(()=>{
    if(!currentUser) return
    async function loadUserData(){
      try{
        const wRecs = await apiList('wishlist', 100)
        const filteredW = wRecs.filter(r=> r.value.userEmail===currentUser.email)
        const ids = filteredW.map(r=> r.value.listingId)
        const map: Record<string,string> = {}
        filteredW.forEach(r=>{ map[r.value.listingId]=r.id })
        setWishlist(ids)
        setWishlistRecords(map)

        const cRecs = await apiList('cart', 100)
        const filteredC = cRecs.filter(r=> r.value.userEmail===currentUser.email)
        const cIds = filteredC.map(r=> r.value.listingId)
        const cMap: Record<string,string> = {}
        filteredC.forEach(r=>{ cMap[r.value.listingId]=r.id })
        setCart(cIds)
        setCartRecords(cMap)

        const chatRecs = await apiList('chats', 100)
        setChats(chatRecs.map((r:any)=>r.value))
        const chatMap: Record<string,string> = {}
        chatRecs.forEach((r:any)=>{ if(r.value?.id) chatMap[r.value.id]=r.id })
        setChatRecordMap(chatMap)

        const orderRecs = await apiList('orders', 100)
        setOrders(orderRecs.map((r:any)=>r.value))
        const orderMap: Record<string,string> = {}
        orderRecs.forEach((r:any)=>{ if(r.value?.id) orderMap[r.value.id]=r.id })
        setOrderRecordMap(orderMap)
        if(currentUser.role==='admin'){
          const userRecs = await apiList('users', 100)
          setUsers(userRecs.map((r:any)=>r.value))
        }
      }catch{}
    }
    loadUserData()
    setEditProfile({name:currentUser.name, bio:currentUser.bio, phone:currentUser.phone||''})
  },[currentUser])

  // The public catalogue is served by a database function that returns metadata only; voucher codes never reach customers.
  useEffect(()=>{
    if(view!=='vouchers' || !isSupabaseConfigured) return
    let alive=true
    setVoucherCatalogLoading(true)
    requireSupabase().rpc('get_available_vouchers')
      .then(({data,error}:any)=>{
        if(!alive) return
        if(error){ pushToast('Voucher store is waiting for the latest Supabase SQL setup.'); setPublicVoucherItems([]); return }
        setPublicVoucherItems(data||[])
      })
      .catch(()=>{ if(alive) pushToast('Could not load voucher store') })
      .finally(()=>{ if(alive) setVoucherCatalogLoading(false) })
    return ()=>{alive=false}
  },[view])

  // Voucher codes are loaded only for authenticated administrators; RLS also enforces this on the database.
  useEffect(()=>{
    if(!currentUser || currentUser.role!=='admin' || adminTab!=='vouchers' || !isSupabaseConfigured) return
    let alive = true
    requireSupabase().from('voucher_inventory').select('*').order('created_at',{ascending:false}).limit(300)
      .then(({data,error}:any)=>{
        if(!alive) return
        if(error){ pushToast('Voucher inventory unavailable. Run the latest Supabase SQL setup.'); return }
        setVoucherItems(data||[])
      })
    return ()=>{ alive=false }
  },[currentUser?.id,currentUser?.role,adminTab])

  async function addVoucherInventory(){
    if(!isAdmin) return
    const balance=Number(voucherForm.balance), price=Number(voucherForm.price)
    if(!voucherForm.code.trim() || !voucherForm.title.trim() || !Number.isFinite(balance) || balance<=0 || !Number.isFinite(price) || price<=0){
      pushToast('Enter voucher name, code, balance and selling price'); return
    }
    if(!window.confirm('Confirm that this voucher issuer permits resale for value?')) return
    setVoucherBusy(true)
    try{
      const {data,error}=await requireSupabase().from('voucher_inventory').insert({
        provider:voucherForm.provider.trim(), title:voucherForm.title.trim().slice(0,100),
        balance, price, voucher_code:voucherForm.code.trim(), status:'available',
        created_by:currentUser!.id
      }).select('*').single()
      if(error) throw error
      setVoucherItems(prev=>[data,...prev])
      setVoucherForm({provider:'Voucher',title:'',balance:'',price:'',code:''})
      pushToast('Voucher added to private admin inventory')
    }catch(e:any){ pushToast(e?.message||'Could not save voucher') }
    finally{ setVoucherBusy(false) }
  }

  async function updateVoucherStatus(item:VoucherInventoryItem,status:'available'|'sold'|'disabled'){
    if(!isAdmin) return
    try{
      const {data,error}=await requireSupabase().from('voucher_inventory').update({status}).eq('id',item.id).select('*').single()
      if(error) throw error
      setVoucherItems(prev=>prev.map(v=>v.id===item.id?data:v))
      pushToast('Voucher status updated')
    }catch(e:any){ pushToast(e?.message||'Could not update voucher') }
  }

  async function deleteVoucher(item:VoucherInventoryItem){
    if(!isAdmin || !window.confirm('Permanently delete this voucher code?')) return
    try{
      const {error}=await requireSupabase().from('voucher_inventory').delete().eq('id',item.id)
      if(error) throw error
      setVoucherItems(prev=>prev.filter(v=>v.id!==item.id))
      pushToast('Voucher deleted')
    }catch(e:any){ pushToast(e?.message||'Could not delete voucher') }
  }

  // Refresh participant conversations so buyer and seller see new messages without reloading.
  useEffect(()=>{
    if(!currentUser) return
    const refreshChats = async () => {
      try{
        const records = await apiList('chats', 100)
        setChats(records.map((record:any)=>record.value))
        const map:Record<string,string> = {}
        records.forEach((record:any)=>{ if(record.value?.id) map[record.value.id]=record.id })
        setChatRecordMap(map)
      }catch{}
    }
    const timer = window.setInterval(refreshChats, 4000)
    return ()=>window.clearInterval(timer)
  },[currentUser?.id])

  // UPI Timer countdown
  useEffect(()=>{
    if(paymentStage!=='upi_qr') return
    if(upiTimer<=0) return
    const t = setInterval(()=> setUpiTimer(prev=> Math.max(0, prev-1)), 1000)
    return ()=> clearInterval(t)
  },[paymentStage, upiTimer])

  useEffect(()=>{ if(toast){ const t=setTimeout(()=>setToast(null),3500); return ()=>clearTimeout(t)} },[toast])
  useEffect(()=>{ localStorage.setItem('ff_theme', theme) },[theme])
  useEffect(()=>{ localStorage.setItem('ff_app_settings', JSON.stringify(appSettings)) },[appSettings])

  function pushToast(t:string){ setToast(t) }

  const filtered = useMemo(()=>{
    let out = listings.filter(l=>{
      if(l.approved===false && !isAdmin) return false
      if(q || heroSearch){
        const s = (q||heroSearch).toLowerCase()
        const hay = `${l.id} ${l.level} ${l.rank} ${l.evoGuns.join(' ')} ${l.bundles.join(' ')} ${(l.gunSkins||[]).join(' ')} ${(l.emotes||[]).join(' ')} ${(l.vehicles||[]).join(' ')} ${(l.glooWalls||[]).join(' ')} ${(l.pets||[]).join(' ')} ${(l.passes||[]).join(' ')} ${(l.rareItems||[]).join(' ')} ${l.seller} ${l.region} ${l.bio} ${l.characters.join(' ')}`.toLowerCase()
        if(!hay.includes(s)) return false
      }
      const collectionCounts:Record<string,number> = { EVO_GUNS:l.evoGuns?.length||0, BUNDLES:l.bundles?.length||0, EMOTES:l.emotes?.length||0, GUN_SKINS:l.gunSkins?.length||0, GLOO_WALLS:l.glooWalls?.length||0, VEHICLES:l.vehicles?.length||0, PETS:l.pets?.length||0 }
      if(collectionType!=='ALL' && !(collectionCounts[collectionType]>0)) return false
      if(l.level < levelRange[0] || l.level > levelRange[1]) return false
      if(l.price < priceRange[0] || l.price > priceRange[1]) return false
      if(verifiedOnly && !l.verified) return false
      if(region!=='ALL' && l.region!==region) return false
      if(evoMin>0 && l.evoGuns.length < evoMin) return false
      return true
    })
    if(sortBy==='price_asc') out = [...out].sort((a,b)=>a.price-b.price)
    if(sortBy==='price_desc') out = [...out].sort((a,b)=>b.price-a.price)
    if(sortBy==='level_desc') out = [...out].sort((a,b)=>b.level-a.level)
    if(sortBy==='likes') out = [...out].sort((a,b)=>b.likes-a.likes)
    if(sortBy==='featured') out = [...out].sort((a,b)=> (b.featured?1:0)-(a.featured?1:0) || (b.views||0)-(a.views||0))
    return out
  },[listings,q,heroSearch,collectionType,levelRange,priceRange,verifiedOnly,region,evoMin,sortBy,isAdmin])

  const featured = useMemo(()=> listings.filter(l=>l.featured).slice(0,6), [listings])
  const cartListings = useMemo(()=> listings.filter(l=> cart.includes(l.id)), [listings, cart])

  // Google OAuth opens Google's account chooser. Existing accounts sign in; new accounts are created by Supabase Auth.
  async function handleGoogleAuth(){
    setLoginError(null)
    try{
      const client=requireSupabase()
      const {error}=await client.auth.signInWithOAuth({
        provider:'google',
        options:{
          redirectTo:window.location.origin,
          queryParams:{prompt:'select_account'}
        }
      })
      if(error) throw error
    }catch(e){
      setLoginError(e instanceof Error?e.message:'Google sign-in could not be started')
    }
  }

  // Supabase Auth: passwords are never stored in browser storage or app tables.
  async function handleLogin(){
    setLoginError(null)
    if(!authForm.email || !authForm.password){ setLoginError('Enter email and password'); return }
    try{
      const client=requireSupabase()
      const {data,error}=await client.auth.signInWithPassword({email:authForm.email.trim(),password:authForm.password})
      if(error || !data.user) throw error || new Error('Login failed')
      const {data:profile,error:profileError}=await client.from('profiles').select('*').eq('id',data.user.id).single()
      if(profileError || !profile) throw profileError || new Error('Profile not found')
      const user=profileToAppUser(profile)
      if(user.banned){ await client.auth.signOut(); throw new Error('Account disabled. Contact support.') }
      if(user.role==='admin'){ await client.auth.signOut(); throw new Error('Use the admin portal') }
      setCurrentUser(user); setShowAuth(null); setAuthForm({email:'',password:'',name:''}); pushToast(`Welcome ${user.name}`)
    }catch(e){ setLoginError(e instanceof Error?e.message:'Login failed') }
  }
  async function handleSignup(){
    setLoginError(null)
    if(!authForm.email || !authForm.name || authForm.password.length<8){ setLoginError('Name, email and password (at least 8 characters) are required'); return }
        try{
      const client=requireSupabase()
      const {data,error}=await client.auth.signUp({email:authForm.email.trim(),password:authForm.password,options:{data:{name:authForm.name.trim()}}})
      if(error) throw error
      if(data.session && data.user){
        const {data:profile,error:profileError}=await client.from('profiles').select('*').eq('id',data.user.id).single()
        if(profileError || !profile) throw profileError || new Error('Account created but profile is not ready. Try signing in.')
        setCurrentUser(profileToAppUser(profile)); setShowAuth(null); pushToast('Account created!')
      }else{
        setShowAuth('login'); setLoginError('Account created. Please verify your email, then sign in.')
      }
    }catch(e){ setLoginError(e instanceof Error?e.message:'Signup failed') }
  }
  async function handleAdminLogin(){
    try{
      const client=requireSupabase()
      const {data,error}=await client.auth.signInWithPassword({email:adminForm.user.trim(),password:adminForm.pass})
      if(error || !data.user) throw error || new Error('Invalid admin credentials')
      const {data:profile,error:profileError}=await client.from('profiles').select('*').eq('id',data.user.id).single()
      if(profileError || !profile || profile.role!=='admin' || profile.banned){ await client.auth.signOut(); throw new Error('This account does not have active administrator permission') }
      const admin=profileToAppUser(profile); setCurrentUser(admin); setShowAdminPortal(false); setView('admin'); pushToast('Admin access granted')
    }catch(e){ pushToast(e instanceof Error?e.message:'Admin login failed') }
  }
  async function handleLogout(){
    try{ await requireSupabase().auth.signOut() }catch(e){ pushToast(e instanceof Error?e.message:'Logout failed'); return }
    setCurrentUser(null); setWishlist([]); setCart([]); setChats([]); setOrders([]); setView('home'); pushToast('Logged out')
  }

  // wishlist cart with persistence
  async function toggleWishlist(id:string){
    if(!currentUser){ setShowAuth('login'); return }
    const exists = wishlist.includes(id)
    if(exists){
      setWishlist(prev=> prev.filter(x=>x!==id))
      const recId = wishlistRecords[id]
      try{
        if(recId) await apiDelete('wishlist', recId)
        setWishlistRecords(prev=>{ const n={...prev}; delete n[id]; return n })
      }catch{}
      pushToast('Removed from wishlist')
    }else{
      setWishlist(prev=> [...prev, id])
      try{
        const rec = await apiCreate('wishlist', {userEmail:currentUser.email, listingId:id, createdAt:new Date().toISOString()}, `wish-${currentUser.email}-${id}`)
        setWishlistRecords(prev=>({...prev, [id]: rec.id}))
      }catch{}
      pushToast('Added to wishlist ♥')
    }
  }
  async function toggleCart(id:string){
    if(!currentUser){ setShowAuth('login'); return }
    const exists = cart.includes(id)
    if(exists){
      setCart(prev=> prev.filter(x=>x!==id))
      const recId = cartRecords[id]
      try{
        if(recId) await apiDelete('cart', recId)
        setCartRecords(prev=>{ const n={...prev}; delete n[id]; return n })
      }catch{}
      pushToast('Removed from cart')
    }else{
      setCart(prev=> [...prev, id])
      try{
        const rec = await apiCreate('cart', {userEmail:currentUser.email, listingId:id, createdAt:new Date().toISOString()}, `cart-${currentUser.email}-${id}`)
        setCartRecords(prev=>({...prev, [id]: rec.id}))
      }catch{}
      pushToast('Added to cart')
    }
  }

  // Checkout initiation
  function initiateCheckout(listing: Listing | Listing[], isCart=false){
    if(!currentUser){ setShowAuth('login'); return }
    const arr = Array.isArray(listing) ? listing : [listing]
    if(arr.length===0){ pushToast('No items to checkout'); return }
    if(arr.length>1){ pushToast('For UTR safety, checkout one listing per payment. Remove other cart items first.'); return }
    setCheckoutListings(arr)
    setCheckoutCartMode(isCart)
    setSelectedPaymentMethod(null)
    setPaymentForm({ upiApp:'phonepe', upiId:'', cardNumber:'', cardExpiry:'', cardCvv:'', cardName:'', bank:'SBI', walletType:'paytm', paypalEmail:'', otp:'' })
    setPaymentError(null)
    setPaymentStage('form')
    setShowPaymentGateway(false)
    setTransactionId('')
    setTransactionError(null)
    setUpiTimer(600)
    setView('checkout')
    window.scrollTo({top:0, behavior:'smooth'})
    pushToast(`Checkout: ${arr.length} item(s) • admin-reviewed payment`)
  }

  function isCheckoutFormValid(){
    if(!selectedPaymentMethod) return false
    if(selectedPaymentMethod==='upi'){
      return true
    }
    if(selectedPaymentMethod==='card'){
      if(paymentForm.cardNumber.replace(/\s/g,'').length < 16) return false
      if(!paymentForm.cardExpiry || !paymentForm.cardExpiry.includes('/')) return false
      if(paymentForm.cardCvv.length < 3) return false
      if(!paymentForm.cardName) return false
    }
    if(selectedPaymentMethod==='paypal'){
      if(!paymentForm.paypalEmail || !paymentForm.paypalEmail.includes('@')) return false
    }
    if(selectedPaymentMethod==='netbanking'){
      if(!paymentForm.bank) return false
    }
    return true
  }

  function handlePayClick(){
    if(!isCheckoutFormValid()){
      setPaymentError('Select payment method and fill required fields')
      pushToast('Select payment method first')
      return
    }
    setPaymentError(null)
    setCheckoutConfirmOpen(true)
  }

  function confirmCheckoutProceed(){
    setCheckoutConfirmOpen(false)
    setShowPaymentGateway(true)
    setPaymentError(null)
    setTransactionError(null)
    setTransactionId('')
    if(selectedPaymentMethod==='upi'){
      setPaymentStage('upi_qr')
      setUpiTimer(600)
      setPayProcessing(false)
    } else {
      setPaymentStage('failed')
      setPaymentError('Card, netbanking and wallet gateway is not connected. Please use UPI manual verification for now.')
    }
  }

  // For card / other methods (OTP)
  async function verifyOtpAndPay(){
    setPaymentStage('failed')
    setPayProcessing(false)
    setPaymentError('Secure card/netbanking gateway is not configured yet. No payment was taken.')
    pushToast('Payment gateway not configured')
  }

  // NEW: UPI Verification with transaction ID
  async function verifyUpiPayment(){
    const tid = transactionId.trim()
    if(tid.length < 6){
      setTransactionError('Enter valid Transaction ID / UTR (min 6 chars)')
      return
    }
    setTransactionError(null)
    setPayProcessing(true)
    setPaymentStage('processing')
    await new Promise(r=> setTimeout(r, 1600))

    const rows = checkoutListings.map(l=> ({
      id:`FF-ORD-${Math.floor(100000+Math.random()*899999)}`,
      listingId:l.id,
      buyer: currentUser!.name,
      buyerEmail: currentUser!.email,
      seller: l.seller,
      sellerEmail: l.sellerEmail||'seller@ff.com',
      price:l.price,
      status:'pending_verification' as OrderStatus,
      createdAt:new Date().toISOString(),
      paymentMethod: 'upi' as PaymentMethod,
      escrowAmount:l.price,
      sellerPayout: Math.floor(l.price*0.95),
      transactionId: tid
    }))

    let saved = 0
    let error: string|null = null
    let reloadError: string|null = null

    const createRow = async (row:any)=>{
      const rec = await apiCreate('orders', row, `order-${row.id}`)
      return rec
    }
    const reloadRecords = async ()=>{
      const recs = await apiList('orders', 100)
      setOrders(recs.map(r=>r.value))
      const map: Record<string,string> = {}
      recs.forEach(r=>{ if(r.value?.id) map[r.value.id]=r.id })
      setOrderRecordMap(map)
    }

    let telegramNotificationFailed = false
    try{
      for(const row of rows){
        const created = await createRow(row)
        saved+=1
        // Notify the marketplace owner only after the order record is safely saved.
        // The Edge Function validates the signed-in buyer and reads the saved order server-side.
        try{
          const { error: notifyError } = await requireSupabase().functions.invoke('notify-utr', { body: { recordId: created.id } })
          if(notifyError) telegramNotificationFailed = true
        }catch{
          telegramNotificationFailed = true
        }
      }
    }catch(e){
      error = e instanceof Error ? e.message : String(e)
    }
    try{
      await reloadRecords()
    }catch(e){
      reloadError = e instanceof Error ? e.message : String(e)
    }

    setPaymentResult({saved, remaining: rows.length - saved, error, reloadError})

    if(saved>0){
      if(error || reloadError){
        setOrders(prev=> [...rows.slice(0,saved), ...prev])
      }
      if(checkoutCartMode){
        for(const l of checkoutListings){
          const recId = cartRecords[l.id]
          if(recId){ try{ await apiDelete('cart', recId) }catch{} }
        }
        setCart([])
        setCartRecords({})
      }
      setPaymentStage('success')
      pushToast(telegramNotificationFailed ? `UTR saved • Telegram alert needs setup • ${tid}` : `UTR submitted • Telegram alert sent • ${tid}`)
      setTimeout(()=>{
        setShowPaymentGateway(false)
        setView('orders')
        setCheckoutListings([])
        setPayProcessing(false)
        setTransactionId('')
      }, 2200)
    }else{
      setPaymentStage('failed')
      setPaymentError(error || 'UPI verification failed')
      setPayProcessing(false)
    }
  }

  // Buyer-seller conversations are tied to a listing and stored for both participants.
  async function openChat(listing: Listing){
    if(!currentUser){ setShowAuth('login'); return }
    if(currentUser.email === listing.sellerEmail){ pushToast('You cannot start a buyer chat on your own listing'); return }
    const buyerEmail = currentUser.email
    const existing = chats.find(c=> c.listingId===listing.id && c.buyerEmail===buyerEmail)
    if(existing){ setActiveChatId(existing.id); setView('inbox'); return }
    const thread: ChatThread = {
      id:`chat_${Date.now()}`, listingId:listing.id, listingTitle:`${listing.bundles?.[0] || listing.evoGuns?.[0] || 'Collection listing'} • ${listing.id}`,
      buyer:currentUser.name, buyerEmail, seller:listing.seller, sellerEmail:listing.sellerEmail||'seller@ff.com',
      messages:[{from:'system', text:`Conversation started about ${listing.id}. Never share passwords, OTPs or recovery codes in chat.`, time:new Date().toLocaleTimeString(), type:'system'}],
      unread:0, createdAt:new Date().toISOString(), online:false
    }
    try{
      const rec = await apiCreate('chats', thread, `chat-${thread.id}`)
      setChatRecordMap(prev=>({...prev, [thread.id]: rec.id}))
    }catch(e){ pushToast(e instanceof Error ? e.message : 'Could not create chat'); return }
    setChats(prev=>[thread, ...prev]); setActiveChatId(thread.id); setView('inbox'); pushToast('Conversation opened')
  }
  async function sendMessage(){
    if(!activeChat || (!chatInput.trim() && !chatMediaFile) || !currentUser) return
    try{
      let mediaPath: string | undefined
      if(chatMediaFile){
        if(chatMediaFile.size > 25 * 1024 * 1024) throw new Error('Chat attachment must be under 25 MB')
        if(!['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm'].includes(chatMediaFile.type)) throw new Error('Use JPG, PNG, WEBP, GIF, MP4, MOV or WEBM files')
        const client = requireSupabase()
        const { data: auth } = await client.auth.getUser()
        if(!auth.user) throw new Error('Please sign in again')
        const safeName = chatMediaFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        mediaPath = `${activeChat.id}/${auth.user.id}/${Date.now()}-${safeName}`
        const { error } = await client.storage.from('chat-media').upload(mediaPath, chatMediaFile, { upsert:false, contentType:chatMediaFile.type })
        if(error) throw error
      }
      const msg: ChatMsg = { from:currentUser.email, text:chatInput.trim(), time:new Date().toLocaleTimeString(), mediaPath, mediaType:chatMediaFile?.type }
      const updatedThread = {...activeChat, messages:[...activeChat.messages, msg], unread:0}
      const recId = chatRecordMap[activeChat.id]
      if(recId) await apiReplace('chats', recId, updatedThread)
      else { const rec = await apiCreate('chats', updatedThread, `chat-${updatedThread.id}`); setChatRecordMap(prev=>({...prev,[updatedThread.id]:rec.id})) }
      setChats(prev=> prev.map(c=> c.id===activeChat.id ? updatedThread : c))
      setChatInput(''); setChatMediaFile(null)
      if(chatFileRef.current) chatFileRef.current.value = ''
    }catch(e){ pushToast(e instanceof Error ? e.message : 'Message could not be sent') }
  }

  async function sendOffer(){
    if(!activeChat || !offerAmount) return
    const msg: ChatMsg = { from: currentUser?.email||'me', text:`Offer: ₹${offerAmount} for ${activeChat.listingId}`, time:new Date().toLocaleTimeString(), type:'offer' }
    const updated = {...activeChat, messages:[...activeChat.messages, msg]}
    setChats(prev=> prev.map(c=> c.id===activeChat.id? updated : c))
    const recId = chatRecordMap[activeChat.id]
    try{
      if(recId) await apiReplace('chats', recId, updated)
    }catch{}
    pushToast(`Offer ₹${offerAmount} sent`); setOfferAmount(0)
  }

  async function handleSellSubmit(){
    if(!currentUser){ setShowAuth('login'); return }
    if(!sellForm.legal){ pushToast('Accept legal declaration'); return }
    if(!/^\+?[0-9\s-]{10,15}$/.test(sellForm.sellerPhone.trim())){ pushToast('Enter a valid seller contact number'); setSellStep(1); return }
    if(sellForm.level < 0 || sellForm.level > 100){ pushToast('Enter a valid account level'); return }
    const collectionEntries = [...sellForm.evo, ...sellForm.bundles, ...sellForm.gunSkins.split(','), ...sellForm.emotes.split(','), ...sellForm.vehicles.split(','), ...sellForm.glooWalls.split(','), ...sellForm.pets.split(','), ...sellForm.passes.split(','), ...sellForm.backpacks.split(','), ...sellForm.rareItems.split(',')].map(x=>x.trim()).filter(Boolean)
    if(collectionEntries.length===0){ pushToast('Add at least one collection item'); setSellStep(2); return }
    if(sellForm.bio.length < 10){ pushToast('Add seller note (min 10 chars)'); setSellStep(1); return }
    if(sellForm.price < 500 || sellForm.price > 15000){ pushToast('Price 500-15000'); setSellStep(4); return }
    if(sellMediaFiles.length===0){ pushToast('Upload at least one photo or video'); setSellStep(3); return }
    if(sellMediaFiles.length>10){ pushToast('Maximum 10 media files per listing'); setSellStep(3); return }
    const allowedMedia = ['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
    if(sellMediaFiles.some(file=>!allowedMedia.includes(file.type) || file.size>50*1024*1024)){ pushToast('Use supported image/video files under 50 MB each'); setSellStep(3); return }
        setBusy(true)
    try{
      const client = requireSupabase()
      const { data: auth } = await client.auth.getUser()
      if(!auth.user) throw new Error('Please sign in again')
      const listingId = `FF-${Math.floor(1000+Math.random()*8999)}`
      const mediaUrls:string[] = []
      const mediaTypes:string[] = []
      for(let i=0;i<sellMediaFiles.length;i++){
        const file = sellMediaFiles[i]
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${auth.user.id}/${listingId}/${Date.now()}-${i}-${safeName}`
        const { error } = await client.storage.from('listing-media').upload(path, file, { upsert:false, contentType:file.type })
        if(error) throw error
        mediaUrls.push(path)
        mediaTypes.push(file.type)
      }
      const csv = (value:string) => value.split(',').map(x=>x.trim()).filter(Boolean)
      const newListing: Listing = {
        id:listingId, level:sellForm.level, likes:sellForm.likes, rank:sellForm.rank,
        rankPoints:0, evoGuns:sellForm.evo, bundles:sellForm.bundles, gunSkins:csv(sellForm.gunSkins), emotes:csv(sellForm.emotes), vehicles:csv(sellForm.vehicles), glooWalls:csv(sellForm.glooWalls), pets:csv(sellForm.pets), passes:csv(sellForm.passes), backpacks:csv(sellForm.backpacks), rareItems:csv(sellForm.rareItems), price:sellForm.price,
        verified:false, seller:currentUser.name, sellerEmail:currentUser.email, sellerPhone:sellForm.sellerPhone.trim(), rating:0, sales:0, region:sellForm.region,
        instant:sellForm.delivery==='instant', vault:0, characters:sellForm.characters,
        bio:sellForm.bio, createdAt:new Date().toISOString(), approved:false, views:0, images:mediaUrls.length,
        hasVideo:mediaTypes.some(t=>t.startsWith('video/')), mediaUrls, mediaTypes
      }
      await apiCreate('listings', newListing, `sell-${newListing.id}`)
      setListings(prev=>[newListing, ...prev])
      pushToast('Listing submitted with media for admin review')
      setView('home'); setSellStep(1); setSellMediaFiles([]); setSellForm({level:0,likes:0,rank:'Not specified',evo:[] as string[],bundles:[] as string[],gunSkins:'',emotes:'',vehicles:'',glooWalls:'',pets:'',passes:'',backpacks:'',rareItems:'',price:2999,region:'IND',bio:'',sellerPhone:'',characters:[],delivery:'instant',legal:false})
    }catch(e){ pushToast(e instanceof Error ? e.message : 'Upload failed. Check Supabase Storage setup.') }
    setBusy(false)
  }

  async function handleOrderStatusUpdate(orderId:string, newStatus:OrderStatus){
    if(!currentUser){ setShowAuth('login'); return }
    const order = orders.find(o=>o.id===orderId)
    if(!order) return
    if(newStatus==='escrow' && !isAdmin){ pushToast('Only an administrator can verify payment and move it to admin-held status'); return }
    if(newStatus==='completed' && (!isAdmin || order.status!=='confirmed')){ pushToast('Only an administrator can complete an order after buyer confirmation'); return }
    if(newStatus==='disputed' && currentUser.email!==order.buyerEmail && currentUser.email!==order.sellerEmail && !isAdmin){ pushToast('Only order participants can raise a dispute'); return }
    const orderFlow: OrderStatus[] = ['pending_verification','paid','escrow','delivered','confirmed','completed']
    const currentIdx = orderFlow.indexOf(order.status)
    const newIdx = orderFlow.indexOf(newStatus)
    if(newIdx <= currentIdx && newStatus!=='disputed'){
      pushToast(`Cannot revert: ${order.status} -> ${newStatus}`)
      return
    }
    if(newStatus==='delivered' && currentUser.email!==order.sellerEmail && !isAdmin){
      pushToast('Only seller can mark delivered')
      return
    }
    if(newStatus==='confirmed' && currentUser.email!==order.buyerEmail && !isAdmin){
      pushToast('Only buyer can confirm')
      return
    }
    setBusy(true)
    const updated = {...order, status:newStatus}
    const recId = orderRecordMap[orderId]
    try{
      if(recId) await apiReplace('orders', recId, updated)
      else {
        const rec = await apiCreate('orders', updated, `order-${orderId}`)
        setOrderRecordMap(prev=>({...prev, [orderId]: rec.id}))
      }
      setOrders(prev=> prev.map(o=> o.id===orderId? updated : o))
      pushToast(`Order ${orderId} → ${newStatus.toUpperCase()}`)
    }catch(e){
      pushToast('Update failed')
    }
    setBusy(false)
  }

  async function handleProfileSave(){
    if(!currentUser) return
    if(!editProfile.name.trim()){ pushToast('Name required'); return }
    const updated = {...currentUser, name:editProfile.name, bio:editProfile.bio, phone:editProfile.phone}
    setCurrentUser(updated)
    setUsers(prev=> prev.map(u=> u.id===currentUser.id? updated : u))
    try{
      const recs = await apiList('users', 100)
      const found = recs.find(r=> r.value.email===currentUser.email)
      if(found) await apiReplace('users', found.id, updated)
      else await apiCreate('users', updated, `user-${updated.email}`)
      pushToast('Profile saved')
    }catch{ pushToast('Profile saved locally') }
  }

  function handleSellMediaSelect(files: FileList | null){
    if(!files) return
    const incoming = Array.from(files)
    const allowedTypes = ['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
    const accepted = incoming.filter(file => allowedTypes.includes(file.type))
    if(accepted.length !== incoming.length) pushToast('Use JPG, PNG, WEBP, GIF, MP4, MOV or WEBM files only')
    const tooLarge = accepted.find(file => file.size > (file.type.startsWith('video/') ? 50 : 10) * 1024 * 1024)
    if(tooLarge){ pushToast(`${tooLarge.name} is too large. Images max 10 MB, videos max 50 MB.`); return }
    const combined = [...sellMediaFiles, ...accepted].slice(0, 10)
    if(sellMediaFiles.length + accepted.length > 10) pushToast('Maximum 10 media files per listing')
    setSellMediaFiles(combined)
  }

  const unreadChats = chats.reduce((a,c)=>a+c.unread,0)
  const unreadNotifs = notifications.filter(n=>!n.read).length
  const checkoutTotal = checkoutListings.reduce((s,l)=>s+l.price,0)
  const checkoutCommission = Math.floor(checkoutTotal*0.05)
  const checkoutSellerPayout = checkoutTotal - checkoutCommission

  function formatTimer(sec:number){
    const m = Math.floor(sec/60).toString().padStart(2,'0')
    const s = (sec%60).toString().padStart(2,'0')
    return `${m}:${s}`
  }

  return (
    <div data-safe-area-inset-root className={`min-h-screen w-full overflow-x-clip selection:bg-[#ff7a1a] selection:text-black ${theme==='dark'?'bg-[#070709] text-[#f5f5f0]':'bg-[#f6f6f3] text-[#080c18]'}`} style={{boxSizing:'border-box', paddingTop:'var(--safe-area-inset-top)'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Manrope:wght@600;700;800&family=JetBrains+Mono:wght@500&display=swap');
        :root{ --neon:#ff7a1a; --blue:#83b6df; --card:#141e32; --border:#2a3a54; }
        *{font-family:"DM Sans",system-ui,sans-serif}
        .display{font-family:"Manrope",sans-serif; letter-spacing:-0.025em}
        .mono{font-family:"JetBrains Mono",monospace}
        .glass{backdrop-filter:blur(18px); background:rgba(15,24,42,.86); border:1px solid rgba(148,169,196,.15)}
        .glass-light{backdrop-filter:blur(18px); background:rgba(255,255,255,.9); border:1px solid rgba(15,24,42,.08)}
        .neon-glow{box-shadow:0 12px 36px rgba(0,0,0,.22)}
        .neon-glow:hover{box-shadow:0 18px 44px rgba(0,0,0,.3)}
        .tilt{transition:transform .2s ease}
        .tilt:hover{transform:translateY(-3px)}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
        @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
        @keyframes pulseGlow{0%,100%{box-shadow:0 0 12px rgba(255,122,26,.12)}50%{box-shadow:0 0 24px rgba(255,122,26,.22)}}
        .scrollbar-none::-webkit-scrollbar{display:none}
        .scrollbar-none{-ms-overflow-style:none; scrollbar-width:none}
        @keyframes spin{to{transform:rotate(360deg)}}
        .animate-spin{animation:spin 1s linear infinite}
      `}</style>

      {/* HEADER */}
      <header data-safe-area-sticky-top className={`sticky z-40 backdrop-blur-2xl border-b ${theme==='dark'?'bg-[rgba(7,7,9,0.88)] border-[#141e32]':'bg-[rgba(255,255,255,0.88)] border-[#e5e5e5]'}`} style={{top:'var(--safe-area-inset-top)'}}>
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 h-[64px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={()=>setView('home')}>
              <div className="w-9 h-9 rounded-[11px] bg-[#ff7a1a] flex items-center justify-center shadow-[0_8px_24px_rgba(255,122,26,0.22)]">
                <Flame className="w-5 h-5 text-black"/>
              </div>
              <div className="leading-none hidden sm:block">
                <div className="display font-[800] text-[17px] tracking-tight flex items-center gap-1">RAM<span className="text-[#ff7a1a]"> FF STORE</span><span className="hidden lg:inline ml-2 text-[10px] font-[500] text-[#9aa9bd]">Verified deals. Zero stress.</span></div>
                <div className="mono text-[8px] text-[#777] tracking-[0.18em] mt-[2px]">ADMIN REVIEW • PAYMENT TRACKED • SECURE</div>
              </div>
              <div className="sm:hidden display font-[800] text-[16px]">FF<span className="text-[#ff7a1a]">M</span></div>
            </div>
            <div className="hidden xl:flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111a2e] border border-[#222] text-[11px]"><span className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse"/><span className="mono">{listings.length} Listings • Admin Review</span></span>
            </div>
          </div>

          <div className="flex-1 max-w-[520px] hidden md:flex">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]"/>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search Cobra, Hip-Hop, Criminal, Heroic..." className="w-full h-[42px] pl-10 pr-[96px] rounded-[12px] bg-[#111a2e] border border-[#222] focus:border-[#ff7a1a]/40 outline-none text-[13px] placeholder:text-[#555]"/>
              <div className="absolute right-1 top-1 bottom-1 flex items-center gap-1">
                <button onClick={()=>setShowFilters(!showFilters)} className="h-full px-3 rounded-[9px] bg-[#1a2540] border border-[#263650] flex items-center gap-1.5 text-[12px] hover:border-[#333]"><Sliders className="w-3.5 h-3.5"/>Filters</button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="hidden lg:flex items-center gap-1.5">
              <button onClick={()=>{ if(!currentUser){ setShowAuth('login'); return } setView('wishlist')}} className="relative w-[40px] h-[40px] rounded-[12px] bg-[#111a2e] border border-[#222] flex items-center justify-center hover:bg-[#1a2540]">
                <Heart className="w-4 h-4"/>{wishlist.length>0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF2D78] text-white text-[10px] font-[800] flex items-center justify-center">{wishlist.length}</span>}
              </button>
              <button onClick={()=>{ if(!currentUser){ setShowAuth('login'); return } setView('cart')}} className="relative w-[40px] h-[40px] rounded-[12px] bg-[#111a2e] border border-[#222] flex items-center justify-center hover:bg-[#1a2540]">
                <ShoppingCart className="w-4 h-4"/>{cart.length>0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff7a1a] text-black text-[10px] font-[800] flex items-center justify-center">{cart.length}</span>}
              </button>
              <button onClick={()=>{ if(!currentUser){ setShowAuth('login'); return } setView('inbox')}} className="relative w-[40px] h-[40px] rounded-[12px] bg-[#111a2e] border border-[#222] flex items-center justify-center hover:bg-[#1a2540]">
                <MessageCircle className="w-4 h-4"/>{unreadChats>0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#00d4ff] text-black text-[10px] font-[800] flex items-center justify-center">{unreadChats}</span>}
              </button>
              <div className="relative">
                <button onClick={()=>setShowNotifs(!showNotifs)} className="relative w-[40px] h-[40px] rounded-[12px] bg-[#111a2e] border border-[#222] flex items-center justify-center hover:bg-[#1a2540]">
                  <Bell className="w-4 h-4"/>{unreadNotifs>0 && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00d4ff] animate-pulse border-2 border-[#080c18]"/>}
                </button>
                {showNotifs && (
                  <div className="absolute right-0 top-[48px] w-[340px] rounded-[16px] bg-[#0f1729] border border-[#222] shadow-[0_20px_80px_rgba(0,0,0,0.6)] p-3 z-50">
                    <div className="flex items-center justify-between mb-2"><span className="font-[700] text-[13px]">Notifications • {unreadNotifs} new</span><button onClick={()=>setShowNotifs(false)} className="w-6 h-6 rounded-full bg-[#1a2540] flex items-center justify-center"><X className="w-3 h-3"/></button></div>
                    <div className="space-y-2 max-h-[320px] overflow-auto scrollbar-none">
                      {notifications.map(n=>(
                        <div key={n.id} onClick={()=>{ setNotifications(prev=>prev.map(x=> x.id===n.id? {...x, read:true}:x)) }} className={`p-3 rounded-[12px] border text-[12px] leading-[1.4] cursor-pointer ${n.read?'bg-[#111a2e] border-[#222] text-[#777]':'bg-[#1f1208] border-[#ff7a1a]/20 text-white'}`}><div>{n.text}</div><div className="mono text-[10px] text-[#666] mt-1">{n.time}</div></div>
                      ))}
                    </div>
                    <button onClick={()=>{ setNotifications(prev=>prev.map(x=>({...x, read:true}))); pushToast('All marked read')}} className="mt-2 w-full h-[36px] rounded-[10px] bg-[#1a2540] border border-[#222] text-[12px]">Mark all read</button>
                  </div>
                )}
              </div>
            </div>

            <button onClick={()=>setView('vouchers')} className={`hidden sm:inline-flex h-[40px] px-3 rounded-[12px] border text-[13px] items-center gap-2 ${view==='vouchers'?'bg-[#ff7a1a]/15 border-[#ff7a1a]/40 text-[#ff7a1a]':'bg-[#111a2e] border-[#222] hover:bg-[#1a2540]'}`}><Gift className="w-4 h-4"/>Redeem Voucher</button>
            <button onClick={()=>setView('apk')} className={`hidden sm:inline-flex h-[40px] px-3 rounded-[12px] border text-[13px] items-center gap-2 ${view==='apk'?'bg-[#00d4ff]/15 border-[#00d4ff]/40 text-[#00d4ff]':'bg-[#111a2e] border-[#222] hover:bg-[#1a2540]'}`}><Smartphone className="w-4 h-4"/>Panel Store</button>
            <button onClick={()=>{ if(!currentUser){ setShowAuth('login'); return } setView('sell')}} className="hidden sm:inline-flex h-[40px] px-4 rounded-[12px] bg-[#1a2540] border border-[#263650] text-[13px] items-center gap-2 hover:bg-[#252525]"><Plus className="w-4 h-4"/>Sell</button>

            {currentUser ? (
              <div className="relative">
                <button onClick={()=>setShowProfileMenu(!showProfileMenu)} className={`h-[40px] pl-1.5 pr-3 rounded-[12px] border flex items-center gap-2 ${isAdmin?'bg-[#ff7a1a]/15 border-[#ff7a1a]/30':'bg-[#111a2e] border-[#222]'}`}>
                  <div className="w-7 h-7 rounded-full bg-[#ff7a1a] text-black font-[800] text-[12px] flex items-center justify-center">{currentUser.avatar}</div>
                  <span className="hidden sm:block text-[13px] font-[600] max-w-[90px] truncate">{currentUser.name}</span>
                  <ChevronRight className={`w-3 h-3 transition ${showProfileMenu?'rotate-90':''}`}/>
                </button>
                {showProfileMenu && (
                  <div className="absolute right-0 top-[48px] w-[300px] rounded-[16px] bg-[#0f1729] border border-[#222] shadow-[0_20px_80px_rgba(0,0,0,0.6)] p-2 z-50">
                    <div className="p-3 rounded-[12px] bg-[#141e32] border border-[#222] mb-2">
                      <div className="flex items-center gap-2"><div className="w-10 h-10 rounded-full bg-[#ff7a1a] text-black font-[800] flex items-center justify-center">{currentUser.avatar}</div><div><div className="text-[13px] font-[700] flex items-center gap-1">{currentUser.name}{currentUser.verified && <Verified className="w-4 h-4 text-[#00d4ff]"/>}{isAdmin && <Crown className="w-3 h-3 text-[#ff7a1a]"/>}</div><div className="text-[11px] text-[#777]">{currentUser.email}</div></div></div>
                      <div className="mt-2 flex gap-1.5"><span className="px-2 py-1 rounded-full bg-[#ff7a1a]/20 text-[10px] font-[700]">{currentUser.role.toUpperCase()}</span><span className="px-2 py-1 rounded-full bg-[#1a2540] border border-[#263650] text-[10px]">{currentUser.joined}</span></div>
                    </div>
                    <button onClick={()=>{setView('profile'); setProfileTab('listings'); setShowProfileMenu(false)}} className="w-full h-[38px] rounded-[10px] hover:bg-[#1a2540] flex items-center gap-2 px-3 text-[13px]"><User className="w-4 h-4"/> Profile • {currentUser.sales} sales</button>
                    <button onClick={()=>{setView('orders'); setShowProfileMenu(false)}} className="w-full h-[38px] rounded-[10px] hover:bg-[#1a2540] flex items-center gap-2 px-3 text-[13px]"><Package className="w-4 h-4"/> Orders / Payment status</button>
                    <button onClick={()=>{setView('cart'); setShowProfileMenu(false)}} className="w-full h-[38px] rounded-[10px] hover:bg-[#1a2540] flex items-center gap-2 px-3 text-[13px]"><ShoppingCart className="w-4 h-4"/> Cart • {cart.length}</button>
                    <button onClick={()=>{setView('wishlist'); setShowProfileMenu(false)}} className="w-full h-[38px] rounded-[10px] hover:bg-[#1a2540] flex items-center gap-2 px-3 text-[13px]"><Heart className="w-4 h-4"/> Wishlist • {wishlist.length}</button>
                    <button onClick={()=>{setView('settings'); setShowProfileMenu(false)}} className="w-full h-[38px] rounded-[10px] hover:bg-[#1a2540] flex items-center gap-2 px-3 text-[13px]"><Settings className="w-4 h-4"/> Settings</button>
                    {isAdmin && <button onClick={()=>{setView('admin'); setAdminTab('dash'); setShowProfileMenu(false)}} className="w-full h-[38px] rounded-[10px] bg-[#ff7a1a]/10 border border-[#ff7a1a]/20 hover:bg-[#ff7a1a]/15 flex items-center gap-2 px-3 text-[13px] font-[700]"><Shield className="w-4 h-4"/> Admin Panel</button>}
                    <div className="h-[1px] bg-[#222] my-1.5"/>
                    <button onClick={()=>{handleLogout(); setShowProfileMenu(false)}} className="w-full h-[38px] rounded-[10px] hover:bg-[#2a1515] flex items-center gap-2 px-3 text-[13px] text-[#ff8a8a]"><LogOut className="w-4 h-4"/> Logout</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button onClick={()=>setShowAuth('login')} className="h-[40px] px-4 rounded-[12px] bg-[#111a2e] border border-[#222] text-[13px] hidden sm:flex items-center gap-1.5"><LogIn className="w-4 h-4"/>Login</button>
                <button onClick={()=>setShowAuth('signup')} className="h-[40px] px-5 rounded-[12px] bg-[#ff7a1a] text-black font-[700] text-[13px] flex items-center gap-2 hover:brightness-110 shadow-[0_0_24px_rgba(255,122,26,0.35)]"><Zap className="w-4 h-4"/>JOIN</button>
              </>
            )}
            <button onClick={()=>setShowMobileMenu(!showMobileMenu)} className="lg:hidden w-[40px] h-[40px] rounded-[12px] bg-[#111a2e] border border-[#222] flex items-center justify-center"><Menu className="w-5 h-5"/></button>
          </div>
        </div>

        <div className="md:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]"/>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search rare bundles, Evo guns, emotes..." className="w-full h-[44px] pl-10 pr-12 rounded-[14px] bg-[#111a2e] border border-[#222] outline-none text-[13px]"/>
            <button onClick={()=>setShowFilters(!showFilters)} className="absolute right-1 top-1 bottom-1 w-[40px] rounded-[10px] bg-[#1a2540] border border-[#263650] flex items-center justify-center"><Filter className="w-4 h-4"/></button>
          </div>
        </div>

        {showMobileMenu && (
          <div className="lg:hidden absolute left-0 right-0 top-[64px] bg-[#080c18] border-b border-[#141e32] p-4 grid grid-cols-3 gap-2 z-50">
            <button onClick={()=>{ setView('wishlist'); setShowMobileMenu(false)}} className="h-[48px] rounded-[12px] bg-[#111a2e] border border-[#222] flex flex-col items-center justify-center gap-1"><Heart className="w-5 h-5"/><span className="text-[10px]">Wishlist {wishlist.length}</span></button>
            <button onClick={()=>{ setView('cart'); setShowMobileMenu(false)}} className="h-[48px] rounded-[12px] bg-[#111a2e] border border-[#222] flex flex-col items-center justify-center gap-1"><ShoppingCart className="w-5 h-5"/><span className="text-[10px]">Cart {cart.length}</span></button>
            <button onClick={()=>{ setView('inbox'); setShowMobileMenu(false)}} className="h-[48px] rounded-[12px] bg-[#111a2e] border border-[#222] flex flex-col items-center justify-center gap-1"><MessageCircle className="w-5 h-5"/><span className="text-[10px]">Inbox {unreadChats}</span></button>
            <button onClick={()=>{ setView('profile'); setShowMobileMenu(false)}} className="h-[48px] rounded-[12px] bg-[#111a2e] border border-[#222] flex flex-col items-center justify-center gap-1"><User className="w-5 h-5"/><span className="text-[10px]">Profile</span></button>
            <button onClick={()=>{ setView('settings'); setShowMobileMenu(false)}} className="h-[48px] rounded-[12px] bg-[#111a2e] border border-[#222] flex flex-col items-center justify-center gap-1"><Settings className="w-5 h-5"/><span className="text-[10px]">Settings</span></button>
            {!currentUser && <button onClick={()=>{setShowAuth('login');setShowMobileMenu(false)}} className="h-[48px] rounded-[12px] bg-[#111a2e] border border-[#222] flex flex-col items-center justify-center gap-1"><LogIn className="w-5 h-5"/><span className="text-[10px]">Login</span></button>}
            <button onClick={()=>{ setView('sell'); setShowMobileMenu(false)}} className="h-[48px] rounded-[12px] bg-[#ff7a1a] text-black flex flex-col items-center justify-center gap-1 font-[700]"><Plus className="w-5 h-5"/><span className="text-[10px]">Sell</span></button>
          </div>
        )}
      </header>

      {view==='home' && (
        <>
          <div className="relative overflow-hidden">
            <div className="absolute inset-0" style={{background:'radial-gradient(120% 120% at 20% 0%, rgba(255,122,26,0.18), transparent 60%), radial-gradient(100% 100% at 80% 20%, rgba(0,212,255,0.18), transparent 55%), radial-gradient(90% 90% at 50% 100%, rgba(255,45,120,0.10), transparent 60%), #070709'}}/>
            <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage:`linear-gradient(#222 1px, transparent 1px), linear-gradient(90deg, #222 1px, transparent 1px)`, backgroundSize:'40px 40px'}}/>
            <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-8 pb-6 sm:pt-12 sm:pb-10">
              <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-8 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111a2e] border border-[#222] text-[11px] mono"><span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse"/><span>ADMIN REVIEW • MANUAL PAYMENT CHECK • INDIA</span><ShieldCheck className="w-3 h-3 text-[#ff7a1a]"/></div>
                  <h1 className="display mt-5 text-[clamp(32px,6vw,68px)] leading-[0.9] font-[800] tracking-[-0.03em]">
                    <span className="block">BUY • SELL</span>
                    <span className="block text-[#ff7a1a] drop-shadow-[0_0_30px_rgba(255,122,26,0.4)]">FREE FIRE IDs</span>
                     <span className="block text-[#ff7a1a] text-[clamp(15px,2.2vw,22px)] font-[700] mt-3 tracking-[-0.01em]">Trade smart. Play bigger.</span>
                    <span className="block text-[#888] text-[clamp(14px,2vw,18px)] font-[500] mt-3 tracking-[-0.01em] leading-[1.3]">UPI payment: Scan the QR → Pay → Enter UTR → Admin checks bank credit → Delivery</span>
                  </h1>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">{[1,2,3].map(i=><div key={i} className="w-8 h-8 rounded-full bg-[#1a2540] border-2 border-[#080c18] flex items-center justify-center text-[11px] font-[800]">{String.fromCharCode(64+i)}</div>)}</div>
                      <div className="text-[12px] leading-[1.2]"><div className="font-[700]">Buyer & Seller Marketplace • UPI QR</div><div className="flex items-center gap-1 text-[#777]">Listings appear after seller submission and admin approval</div></div>
                    </div>
                  </div>
                  <div className="mt-6 relative max-w-[520px]">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]"/>
                      <input value={heroSearch} onChange={e=>setHeroSearch(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ document.getElementById('grid')?.scrollIntoView({behavior:'smooth'}) } }} placeholder="Search rare bundles, Evo guns, emotes, Gloo Walls and collections..." className="w-full h-[54px] pl-12 pr-[120px] rounded-[16px] bg-[#111a2e] border border-[#222] focus:border-[#ff7a1a]/40 outline-none text-[14px] placeholder:text-[#555]"/>
                      <button onClick={()=>document.getElementById('grid')?.scrollIntoView({behavior:'smooth'})} className="absolute right-1.5 top-1.5 bottom-1.5 px-5 rounded-[12px] bg-white text-black font-[700] text-[13px] flex items-center gap-2">Search <ChevronRight className="w-4 h-4"/></button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {['Cobra Rage','Hip-Hop','Criminal Bundle','Grandmaster','Angelical'].map(tag=>(
                        <button key={tag} onClick={()=>setHeroSearch(tag)} className="px-3 py-1.5 rounded-full bg-[#141e32] border border-[#222] text-[11px] hover:border-[#ff7a1a]/30 hover:text-white">{tag}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -inset-10 bg-[radial-gradient(40%_40%_at_50%_50%,rgba(255,122,26,0.18),transparent)] blur-[30px]"/>
                  <div className="relative rounded-[20px] bg-[#0f1729] border border-[#222] p-3">
                    <div className="flex items-center justify-between mb-3"><span className="font-[700] text-[13px] flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#00d4ff]"/> UPI PAYMENT DETAILS</span><span className="px-2 py-1 rounded-full bg-[#00d4ff]/20 text-[#00d4ff] text-[10px] font-[800]">MANUAL CHECK</span></div>
                    <div className="rounded-[14px] bg-white p-2 border border-[#222] flex gap-2 items-center">
                      <img src={qrCodeAsset} alt="UPI QR" className="w-[88px] h-[88px] object-contain rounded-[8px] bg-white"/>
                      <div className="flex-1 min-w-0"><div className="font-[800] text-[13px] text-black">Scan the QR to pay</div><div className="mt-1 px-2 py-1 rounded-full bg-[#ff7a1a] text-black text-[10px] font-[800] inline-flex">UPI • Verify before delivery</div></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {listings.slice(0,4).map(t=>(
                        <div key={t.id} onClick={()=>{ setSelected(t); setDetailTab('overview') }} className="rounded-[14px] bg-[#141e32] border border-[#222] p-2.5 cursor-pointer hover:border-[#ff7a1a]/30 transition group">
                          <div className="flex items-center justify-between"><span className="mono text-[9px] px-1.5 py-0.5 rounded-full bg-[#222]">{t.id}</span><Eye className="w-3 h-3 text-[#555] group-hover:text-[#ff7a1a]"/></div>
                          <div className="mt-1 font-[700] text-[12px]">{(t.bundles?.[0] || t.evoGuns?.[0] || 'Collection listing')} • {t.views} views</div>
                          <div className="text-[11px] text-[#777] truncate">{t.bundles[0]}</div>
                          <div className="mt-1 font-[800] text-[13px]">₹{t.price.toLocaleString('en-IN')}</div>
                          {t.hasVideo && <div className="mt-1 flex items-center gap-1 text-[9px] text-[#00d4ff]"><Play className="w-3 h-3"/>Video proof</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-7 sm:py-9">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[{icon:ShieldCheck,title:'Admin-reviewed listings',desc:'New listings stay pending until reviewed'},{icon:Lock,title:'Private conversations',desc:'Buyer and seller chat access is restricted'},{icon:Receipt,title:'Manual UPI checks',desc:'UTR is reviewed before order progression'},{icon:Headphones,title:'Dispute assistance',desc:'Report suspicious activity to the admin'}].map((item,i)=>(
                <div key={item.title} className="rounded-2xl border border-[#2a3a54] bg-[#141e32] p-4 sm:p-5">
                  <div className="w-9 h-9 rounded-xl bg-[#ff7a1a]/12 text-[#ff7a1a] flex items-center justify-center mb-3">{(()=>{const Icon=item.icon; return <Icon className="w-[18px] h-[18px]"/>})()}</div>
                  <div className="font-bold text-[13px] sm:text-[14px]">{item.title}</div><p className="text-[11px] sm:text-xs text-[#9aa9bd] mt-1 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[#10182b] border-y border-[#263650]">
            <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6"><div><div className="text-[#ff7a1a] text-[10px] font-bold tracking-[.2em] uppercase">Simple process</div><h2 className="display text-2xl sm:text-3xl font-extrabold mt-1">How the marketplace works</h2></div><p className="text-xs sm:text-sm text-[#9aa9bd] max-w-lg">Clear steps help both sides understand what happens before and after a purchase.</p></div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[{n:'01',t:'Explore listings',d:'Review account details, media and seller information.'},{n:'02',t:'Contact the seller',d:'Ask questions in the marketplace chat before deciding.'},{n:'03',t:'Submit payment reference',d:'Pay only after checking the displayed payment details, then submit your UTR.'},{n:'04',t:'Wait for admin review',d:'Payment is not confirmed until the recipient account is checked manually.'}].map(x=>(<div key={x.n} className="rounded-2xl bg-[#141e32] border border-[#263650] p-4"><div className="mono text-[#ff7a1a] text-xs">{x.n}</div><h3 className="font-bold mt-3 text-sm">{x.t}</h3><p className="text-xs text-[#9aa9bd] mt-2 leading-relaxed">{x.d}</p></div>))}
              </div>
            </div>
          </section>

          <section id="help-centre" className="mx-auto max-w-[1000px] px-4 sm:px-6 py-9 sm:py-12">
            <div className="text-center mb-5"><div className="text-[#ff7a1a] text-[10px] font-bold tracking-[.2em] uppercase">Help centre</div><h2 className="display text-2xl sm:text-3xl font-extrabold mt-1">Frequently asked questions</h2></div>
            <div className="space-y-2">
              {[{q:'Does submitting a UTR mean my payment is confirmed?',a:'No. A submitted UTR is only a payment reference. The order remains pending until an administrator checks the actual credit in the receiving bank or UPI account.'},{q:'Is this a regulated escrow service?',a:'No. A personal UPI QR does not create regulated escrow or automatically hold funds. Do not treat the website status as proof of protected funds.'},{q:'When does a new seller listing appear?',a:'New listings should remain pending review and appear publicly only after administrator approval.'},{q:'What should I do if I suspect a scam?',a:'Stop the transaction, do not share passwords or OTPs, preserve chat and payment evidence, and report the account or order to the marketplace administrator.'}].map((f,i)=>(
                <div key={f.q} className="rounded-xl border border-[#2a3a54] bg-[#141e32] overflow-hidden"><button onClick={()=>setFaqOpen(faqOpen===i?null:i)} className="w-full text-left px-4 py-4 flex items-center justify-between gap-3"><span className="font-semibold text-sm">{f.q}</span><ChevronRight className={`w-4 h-4 text-[#ff7a1a] transition-transform ${faqOpen===i?'rotate-90':''}`}/></button>{faqOpen===i&&<p className="px-4 pb-4 text-xs sm:text-sm text-[#9aa9bd] leading-relaxed">{f.a}</p>}</div>
              ))}
            </div>
          </section>

          <div className="border-y border-[#263650] bg-[#10182b]">
            <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-5">
              <div className="flex items-center justify-between mb-3"><h3 className="display font-[700] text-[18px] flex items-center gap-2"><Crown className="w-4 h-4 text-[#ff7a1a]"/> Featured Vaults • Premium Picks</h3><button onClick={()=>document.getElementById('grid')?.scrollIntoView({behavior:'smooth'})} className="text-[12px] text-[#777] flex items-center gap-1">View all <ChevronRight className="w-3 h-3"/></button></div>
              <div className="flex gap-3 overflow-auto pb-2 scrollbar-none">
                {featured.map(f=>(
                  <div key={f.id} onClick={()=>{ setSelected(f); setDetailTab('overview')}} className="min-w-[260px] rounded-[16px] bg-[#111a2e] border border-[#222] p-3 cursor-pointer hover:-translate-y-1 transition tilt neon-glow">
                    <div className="flex items-center justify-between"><span className="px-2 py-1 rounded-full bg-[#ff7a1a] text-black text-[10px] font-[800]">FEATURED</span><span className="mono text-[10px] text-[#666]">{f.id}</span></div>
                    <div className="mt-2 h-[68px] rounded-[12px] bg-gradient-to-br from-[#1f1208] to-[#2a2a14] border border-[rgba(255,122,26,0.2)] flex items-center justify-center relative overflow-hidden">
                      <Crown className="w-6 h-6 text-[#ff7a1a]"/>
                    </div>
                    <div className="mt-2 font-[700] text-[13px]">{f.bundles?.[0] || f.evoGuns?.[0] || 'Collection listing'} • Lv {f.level || '—'}</div>
                    <div className="text-[11px] text-[#777]">{f.evoGuns[0]}</div>
                    <div className="mt-2 flex items-center justify-between"><span className="font-[800]">₹{f.price.toLocaleString('en-IN')}</span><span className="px-2 py-1 rounded-full bg-[#00d4ff]/15 text-[#00d4ff] text-[10px] flex items-center gap-1"><Clock3 className="w-3 h-3"/>INSTANT</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6 grid lg:grid-cols-[300px_1fr] gap-6" id="grid">
            <div className={`${showFilters?'fixed inset-0 z-[55] lg:static lg:z-auto': 'hidden lg:block'}`}>
              {showFilters && <div className="absolute inset-0 bg-black/70 backdrop-blur-sm lg:hidden" onClick={()=>setShowFilters(false)}/>}
              <div className={`relative h-full lg:h-auto overflow-auto lg:overflow-visible ${showFilters?'w-[84%] max-w-[340px] bg-[#0b1020] border-r lg:border-0 border-[#222] p-5 lg:p-0':'w-full'} rounded-[20px] lg:rounded-none`}>
                <div className="lg:sticky lg:top-[80px] space-y-4">
                  <div className="flex items-center justify-between lg:mb-2">
                    <h3 className="font-[700] text-[14px] flex items-center gap-2"><Sliders className="w-4 h-4"/> Filters</h3>
                    <div className="flex items-center gap-2">
                      <button onClick={()=>{ setCollectionType('ALL'); setLevelRange([0,100]); setPriceRange([0,10000]); setVerifiedOnly(false); setRegion('ALL'); setEvoMin(0); setQ(''); setHeroSearch('') }} className="text-[11px] text-[#777] hover:text-white">Reset</button>
                      <button onClick={()=>setShowFilters(false)} className="lg:hidden w-8 h-8 rounded-full bg-[#1a2540] flex items-center justify-center"><X className="w-4 h-4"/></button>
                    </div>
                  </div>

                  <div className="rounded-[16px] bg-[#0f1729] border border-[#1a2540] p-4 space-y-5">
                    <div>
                      <div className="mono text-[11px] text-[#666] tracking-widest mb-3">ACCOUNT LEVEL (OPTIONAL) {levelRange[0]} - {levelRange[1]}</div>
                      <div className="space-y-2">
                        <input type="range" min={0} max={100} value={levelRange[0]} onChange={e=>setLevelRange([parseInt(e.target.value), levelRange[1]])} className="w-full accent-[#ff7a1a]"/>
                        <input type="range" min={0} max={100} value={levelRange[1]} onChange={e=>setLevelRange([levelRange[0], parseInt(e.target.value)])} className="w-full accent-[#00d4ff]"/>
                        <div className="flex justify-between text-[11px] mono"><span>{levelRange[0]}</span><span>{levelRange[1]}+</span></div>
                      </div>
                    </div>

                    <div>
                      <div className="mono text-[11px] text-[#666] tracking-widest mb-2">COLLECTION CATEGORY</div>
                      <select value={collectionType} onChange={e=>setCollectionType(e.target.value)} className="w-full h-[42px] rounded-[10px] bg-[#141e32] border border-[#263650] px-3 text-[12px]">
                        <option value="ALL">All Collections</option>
                        <option value="EVO_GUNS">Evo Guns</option>
                        <option value="BUNDLES">Rare Bundles & Outfits</option>
                        <option value="EMOTES">Emotes</option>
                        <option value="GUN_SKINS">Weapon Skins</option>
                        <option value="GLOO_WALLS">Gloo Walls & Effects</option>
                        <option value="VEHICLES">Vehicles & Boards</option>
                        <option value="PETS">Pets & Pet Skins</option>
                      </select>
                    </div>

                    <div>
                      <div className="mono text-[11px] text-[#666] tracking-widest mb-2">EVO GUNS MIN</div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[0,1,2,3,4].map(n=>(
                          <button key={n} onClick={()=>setEvoMin(n)} className={`h-[32px] rounded-[8px] border text-[12px] font-[600] ${evoMin===n?'bg-[#ff7a1a] text-black border-[#ff7a1a]':'bg-[#141e32] border-[#222] text-[#777]'}`}>{n===0?'Any':`${n}+`}</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mono text-[11px] text-[#666] tracking-widest mb-3">PRICE RANGE ₹{priceRange[0]} - ₹{priceRange[1]}</div>
                      <input type="range" min={0} max={10000} step={500} value={priceRange[1]} onChange={e=>setPriceRange([priceRange[0], parseInt(e.target.value)])} className="w-full accent-[#ff7a1a]"/>
                      <div className="mt-2 flex gap-2">
                        <button onClick={()=>setPriceRange([0,2000])} className="flex-1 h-[28px] rounded-full bg-[#141e32] border border-[#222] text-[11px]">Under 2K</button>
                        <button onClick={()=>setPriceRange([2000,5000])} className="flex-1 h-[28px] rounded-full bg-[#141e32] border border-[#222] text-[11px]">2K-5K</button>
                        <button onClick={()=>setPriceRange([5000,10000])} className="flex-1 h-[28px] rounded-full bg-[#141e32] border border-[#222] text-[11px]">5K+</button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="mono text-[11px] text-[#666] tracking-widest">REGION</div>
                      <select value={region} onChange={e=>setRegion(e.target.value)} className="w-full h-[40px] rounded-[10px] bg-[#141e32] border border-[#222] text-[13px] px-3"><option value="ALL">All Regions</option><option value="IND">India 🇮🇳</option><option value="BR">Brazil 🇧🇷</option><option value="ID">Indonesia 🇮🇩</option><option value="NA">North America 🇺🇸</option><option value="MENA">MENA 🌍</option></select>
                    </div>

                    <label className="flex items-center justify-between p-3 rounded-[12px] bg-[#1f1208] border border-[rgba(255,122,26,0.2)] cursor-pointer">
                      <span className="flex items-center gap-2 text-[13px] font-[600]"><BadgeCheck className="w-4 h-4 text-[#00d4ff]"/> Admin-approved listings only</span>
                      <button onClick={()=>setVerifiedOnly(!verifiedOnly)} className={`w-11 h-6 rounded-full p-1 flex transition ${verifiedOnly?'justify-end bg-[#ff7a1a]':'justify-start bg-[#263650]'}`}><div className="w-4 h-4 rounded-full bg-white shadow"/></button>
                    </label>
                  </div>

                  <div className="rounded-[16px] bg-white border border-[#222] p-3 flex gap-3">
                    <img src={qrCodeAsset} alt="UPI QR" className="w-[76px] h-[76px] rounded-[10px] object-contain bg-white"/>
                    <div><div className="font-[800] text-[12px] text-black">Scan the QR to pay</div><div className="mt-1 text-[11px] text-[#666]">Scan this QR for instant payment. Enter UTR after pay.</div></div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <h2 className="display text-[22px] sm:text-[26px] font-[800] flex items-center gap-3"><Layers className="w-5 h-5 text-[#ff7a1a]"/>Live Vaults <span className="text-[#666] font-[500] text-[14px]">({filtered.length} IDs)</span></h2>
                <div className="flex items-center gap-2">
                  <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} className="h-[38px] rounded-[10px] bg-[#111a2e] border border-[#222] text-[12px] px-3"><option value="featured">Featured First</option><option value="price_asc">Price Low to High</option><option value="price_desc">Price High to Low</option><option value="level_desc">Level High to Low</option><option value="likes">Most Liked</option></select>
                  <button onClick={()=>setShowFilters(true)} className="lg:hidden h-[38px] px-3 rounded-[10px] bg-[#111a2e] border border-[#222] flex items-center gap-1.5 text-[12px]"><Filter className="w-4 h-4"/>Filters</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                {filtered.map(item=>(
                  <div key={item.id} className="group relative rounded-[20px] bg-[#0f1729] border border-[#1a2540] overflow-hidden hover:border-[#263650] transition-all duration-300 tilt neon-glow">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-[radial-gradient(60%_60%_at_30%_0%,rgba(255,122,26,0.08),transparent)] pointer-events-none"/>
                    <div onClick={()=>{ setSelected(item); setDetailTab('overview') }} className="relative h-[160px] bg-gradient-to-br from-[#16160f] via-[#1c1c14] to-[#111] border-b border-[#1a2540] p-3 flex flex-col justify-between cursor-pointer overflow-hidden">
                      {item.mediaUrls?.[0] && <ListingMediaItem path={item.mediaUrls[0]} mediaType={item.mediaTypes?.[0]} className="absolute inset-0 w-full h-full object-cover opacity-55"/>}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/45"/>
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full bg-black/60 border border-white/10 mono text-[10px] tracking-widest">{item.id}</span>
                          {item.verified && <span className="w-6 h-6 rounded-full bg-[#00d4ff] flex items-center justify-center"><Verified className="w-3.5 h-3.5 text-black"/></span>}
                          {item.instant && <span className="px-2 py-1 rounded-full bg-[#00d4ff] text-black text-[10px] font-[800] flex items-center gap-1"><Clock3 className="w-3 h-3"/>INSTANT</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center gap-1 text-[10px] text-[#777]"><ImageIcon className="w-3 h-3"/>{item.images}</span>
                          {item.hasVideo && <span className="w-5 h-5 rounded-full bg-[#00d4ff]/20 flex items-center justify-center"><Play className="w-3 h-3 text-[#00d4ff]"/></span>}
                          <span className="flex items-center gap-1 text-[11px] text-[#666]"><Eye className="w-3 h-3"/>{item.views||0}</span>
                        </div>
                      </div>
                      <div className="relative z-10 flex items-end justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-10 h-10 rounded-[12px] bg-gradient-to-br ${item.rank==='Grandmaster'?'from-[#FFB800] to-[#FF2D78]': item.rank==='Heroic'?'from-[#00D4FF] to-[#6B7BFF]': item.rank==='Master'?'from-[#A855F7] to-[#FF2D78]':'from-[#9CA3AF] to-[#D1D5DB]'} flex items-center justify-center`}><Trophy className="w-5 h-5 text-black"/></div>
                          <div>
                            <div className="text-[13px] font-[800] leading-none flex items-center gap-1.5">{item.rank}<span className="text-[10px] font-[500] text-[#777]">• {item.rankPoints} pts</span></div>
                            <div className="mono text-[10px] text-[#777] mt-1">Lv {item.level} • Vault {item.vault} • {item.region}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[20px] font-[800] leading-none">₹{item.price.toLocaleString('en-IN')}</div>
                          <div className="mono text-[9px] text-[#666] mt-1">admin payment review • UPI QR</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 space-y-3">
                      <div><div className="flex items-center gap-1.5 mono text-[10px] text-[#666] mb-1.5"><Crosshair className="w-3 h-3"/> EVO GUNS ({item.evoGuns.length})</div><div className="flex flex-wrap gap-1.5">{item.evoGuns.slice(0,3).map(g=><span key={g} className="px-2 py-1 rounded-[8px] bg-[#141e32] border border-[#222] text-[11px] leading-tight">{g}</span>)}{item.evoGuns.length>3 && <span className="px-2 py-1 rounded-[8px] bg-[#ff7a1a]/15 border border-[#ff7a1a]/30 text-[11px]">+{item.evoGuns.length-3} more</span>}</div></div>
                      <div><div className="flex items-center gap-1.5 mono text-[10px] text-[#666] mb-1.5"><Crown className="w-3 h-3"/> RARE BUNDLES</div><div className="flex flex-wrap gap-1.5">{item.bundles.slice(0,3).map(b=><span key={b} className="px-2 py-1 rounded-[8px] bg-[#141e32] border border-[#263650] text-[11px]">{b}</span>)}</div></div>
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-[#1a2540] border border-[#263650] flex items-center justify-center text-[11px] font-[800]">{item.seller[0]}</div><div><div className="text-[12px] font-[600] leading-none flex items-center gap-1">{item.seller}{item.approved && <BadgeCheck className="w-3 h-3 text-[#00d4ff]"/>}</div><div className="flex items-center gap-1 mt-0.5"><Star className="w-3 h-3 text-[#ff7a1a] fill-[#ff7a1a]"/><span className="text-[11px] font-[600]">{item.rating}</span><span className="text-[10px] text-[#666]">• {item.sales} sales</span></div></div></div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={(e)=>{ e.stopPropagation(); toggleWishlist(item.id)}} className={`w-8 h-8 rounded-[10px] border flex items-center justify-center transition ${wishlist.includes(item.id)?'bg-[#FF2D78]/20 border-[#FF2D78]/40 text-[#FF2D78] scale-110':'bg-[#141e32] border-[#222] hover:border-[#333]'}`}><Heart className={`w-4 h-4 ${wishlist.includes(item.id)?'fill-[#FF2D78]':''}`}/></button>
                          <button onClick={(e)=>{ e.stopPropagation(); toggleCart(item.id)}} className={`w-8 h-8 rounded-[10px] border flex items-center justify-center ${cart.includes(item.id)?'bg-[#ff7a1a] text-black border-[#ff7a1a]':'bg-[#141e32] border-[#222]'}`}><ShoppingCart className="w-4 h-4"/></button>
                          <button onClick={(e)=>{ e.stopPropagation(); openChat(item)}} className="w-8 h-8 rounded-[10px] bg-[#141e32] border border-[#222] flex items-center justify-center hover:bg-[#222]"><MessageCircle className="w-4 h-4"/></button>
                          <button onClick={(e)=>{ e.stopPropagation(); initiateCheckout(item)}} className="h-8 px-3 rounded-[10px] bg-white text-black text-[12px] font-[700] flex items-center gap-1 hover:bg-zinc-100">Buy <ChevronRight className="w-3 h-3"/></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {filtered.length===0 && (
                <div className="mt-10 rounded-[20px] border border-dashed border-[#222] p-10 text-center bg-[#0f1729]">
                  <AlertTriangle className="w-6 h-6 mx-auto text-[#ff7a1a]"/><div className="mt-3 font-[700]">No vaults match filters</div><div className="mono text-[12px] text-[#666] mt-1">Try lowering min level or increasing price cap</div>
                  <button onClick={()=>{ setCollectionType('ALL'); setLevelRange([0,100]); setPriceRange([0,10000]); setVerifiedOnly(false); setRegion('ALL'); setQ(''); setHeroSearch('')}} className="mt-4 h-[40px] px-5 rounded-[12px] bg-white text-black font-[700] text-[13px]">Clear Filters</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {view==='checkout' && (
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 mb-6">
            <button onClick={()=> setView(checkoutCartMode ? 'cart' : 'home')} className="w-9 h-9 rounded-[12px] bg-[#111a2e] border border-[#222] flex items-center justify-center"><ArrowLeft className="w-4 h-4"/></button>
            <div><div className="display font-[800] text-[22px]">Secure Checkout</div><div className="mono text-[11px] text-[#777]">UPI QR • Manual payment review</div></div>
            <div className="ml-auto hidden sm:flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#00d4ff]"/><span className="text-[12px] font-[600]">Admin review • UPI reference</span></div>
          </div>

          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
            {/* LEFT - ITEMS + PAYMENT METHODS */}
            <div className="space-y-4">
              <div className="rounded-[20px] bg-[#0f1729] border border-[#1a2540] p-4 sm:p-5">
                <div className="font-[700] text-[14px] flex items-center gap-2 mb-3"><Package className="w-4 h-4"/> Order Items • {checkoutListings.length}</div>
                <div className="space-y-3">
                  {checkoutListings.map(l=>(
                    <div key={l.id} className="flex gap-3 p-3 rounded-[14px] bg-[#141e32] border border-[#222]">
                      <div className="w-[56px] h-[56px] rounded-[12px] bg-gradient-to-br from-[#1f1208] to-[#222] border border-[#222] flex items-center justify-center"><Crown className="w-6 h-6 text-[#ff7a1a]"/></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2"><span className="font-[700] text-[13px]">{l.id} • {l.bundles?.[0] || l.evoGuns?.[0] || 'Collection listing'}</span><span className="font-[800]">₹{l.price.toLocaleString('en-IN')}</span></div>
                        <div className="text-[11px] text-[#777] truncate">{l.evoGuns[0]} • {l.bundles[0]} • {l.seller} {l.verified && '✓'}</div>
                        <div className="mt-1 flex gap-1.5"><span className="px-2 py-0.5 rounded-full bg-[#00d4ff]/15 text-[#00d4ff] text-[10px]">Admin review</span><span className="px-2 py-0.5 rounded-full bg-[#222] text-[#777] text-[10px]">{l.region}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] bg-[#0f1729] border border-[#1a2540] p-4 sm:p-5">
                <div className="font-[700] text-[14px] flex items-center gap-2 mb-4"><CreditCard className="w-4 h-4"/> Select Payment Method</div>
                <div className="grid gap-2">
                  {[
                    {id:'upi', name:'UPI QR', desc:'Scan the QR • Submit UTR for manual review', icon:QrCode, highlight:true},
                  ].map(m=>{
                    const selected = selectedPaymentMethod===m.id
                    return (
                      <button key={m.id} onClick={()=>setSelectedPaymentMethod(m.id as PaymentMethod)} className={`text-left p-3 rounded-[14px] border flex items-center gap-3 transition ${selected?'bg-[#ff7a1a]/10 border-[#ff7a1a]/30':'bg-[#141e32] border-[#222] hover:border-[#333]'} ${(m as any).highlight && !selected?'ring-1 ring-[#ff7a1a]/20':''}`}>
                        <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center ${selected?'bg-[#ff7a1a] text-black': (m as any).highlight?'bg-white text-black':'bg-[#222] text-[#777]'}`}><m.icon className="w-5 h-5"/></div>
                        <div className="flex-1"><div className="font-[600] text-[13px] flex items-center gap-2">{m.name}{(m as any).highlight && <span className="px-2 py-0.5 rounded-full bg-[#ff7a1a] text-black text-[9px] font-[800]">RECOMMENDED</span>}</div><div className="text-[11px] text-[#777]">{m.desc}</div></div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selected?'bg-[#ff7a1a] border-[#ff7a1a]':'border-[#333]'}`}>{selected && <Check className="w-3 h-3 text-black"/>}</div>
                      </button>
                    )
                  })}
                </div>

                {selectedPaymentMethod && (
                  <div className="mt-5 p-4 rounded-[14px] bg-[#0b1020] border border-[#141e32]">
                    <div className="mono text-[10px] text-[#666] tracking-widest mb-3">PAYMENT DETAILS • {selectedPaymentMethod.toUpperCase()}</div>
                    {selectedPaymentMethod==='upi' && (
                      <div className="space-y-3">
                        <div className="rounded-[12px] bg-white p-3 border border-[#222] flex gap-3 items-center">
                          <img src={qrCodeAsset} alt="UPI QR" className="w-[64px] h-[64px] rounded-[8px] object-contain bg-white"/>
                          <div><div className="font-[700] text-[12px] text-black">Scan the QR to pay</div><div className="text-[10px] text-[#666] mt-1">You will see full QR after clicking Pay</div></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {['phonepe','gpay','paytm'].map(app=>(
                            <button key={app} onClick={()=>setPaymentForm({...paymentForm, upiApp: app as any})} className={`h-[40px] rounded-[10px] border text-[12px] font-[600] capitalize ${paymentForm.upiApp===app?'bg-white text-black border-white':'bg-[#141e32] border-[#222] text-[#777]'}`}>{app}</button>
                          ))}
                        </div>
                        <div className="text-[11px] text-[#666] flex items-center gap-1"><Info className="w-3 h-3"/> After Pay, scan QR and enter UTR. No UPI ID typing needed.</div>
                      </div>
                    )}
                    {selectedPaymentMethod==='card' && (
                      <div className="space-y-3">
                        <input value={paymentForm.cardNumber} onChange={e=>setPaymentForm({...paymentForm, cardNumber:e.target.value.replace(/\D/g,'').slice(0,16)})} placeholder="Card Number • 16 digits" className="w-full h-[44px] rounded-[12px] bg-[#141e32] border border-[#222] px-3 text-[13px]"/>
                        <div className="grid grid-cols-2 gap-2">
                          <input value={paymentForm.cardExpiry} onChange={e=>setPaymentForm({...paymentForm, cardExpiry:e.target.value})} placeholder="MM/YY" className="h-[44px] rounded-[12px] bg-[#141e32] border border-[#222] px-3 text-[13px]"/>
                          <input value={paymentForm.cardCvv} onChange={e=>setPaymentForm({...paymentForm, cardCvv:e.target.value.replace(/\D/g,'').slice(0,3)})} placeholder="CVV" type="password" className="h-[44px] rounded-[12px] bg-[#141e32] border border-[#222] px-3 text-[13px]"/>
                        </div>
                        <input value={paymentForm.cardName} onChange={e=>setPaymentForm({...paymentForm, cardName:e.target.value})} placeholder="Name on Card" className="w-full h-[44px] rounded-[12px] bg-[#141e32] border border-[#222] px-3 text-[13px]"/>
                      </div>
                    )}
                    {selectedPaymentMethod==='netbanking' && (
                      <div className="space-y-3">
                        <select value={paymentForm.bank} onChange={e=>setPaymentForm({...paymentForm, bank:e.target.value})} className="w-full h-[44px] rounded-[12px] bg-[#141e32] border border-[#222] px-3 text-[13px]">
                          <option>SBI</option><option>HDFC</option><option>ICICI</option><option>Axis</option><option>Kotak</option><option>PNB</option>
                        </select>
                        <div className="text-[11px] text-[#666]">You will be redirected to {paymentForm.bank} secure login in gateway</div>
                      </div>
                    )}
                    {selectedPaymentMethod==='wallet' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {['paytm','amazonpay','phonepe','mobikwik'].map(w=>(
                            <button key={w} onClick={()=>setPaymentForm({...paymentForm, walletType:w})} className={`h-[40px] rounded-[10px] border text-[12px] font-[600] capitalize ${paymentForm.walletType===w?'bg-white text-black border-white':'bg-[#141e32] border-[#222] text-[#777]'}`}>{w}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedPaymentMethod==='paypal' && (
                      <div className="space-y-3">
                        <input value={paymentForm.paypalEmail} onChange={e=>setPaymentForm({...paymentForm, paypalEmail:e.target.value})} placeholder="PayPal Email" className="w-full h-[44px] rounded-[12px] bg-[#141e32] border border-[#222] px-3 text-[13px]"/>
                      </div>
                    )}
                    {paymentError && <div className="mt-3 p-2.5 rounded-[10px] bg-[#2a1515] border border-[#5a2222] text-[12px] text-[#ff9a9a] flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>{paymentError}</div>}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[20px] bg-[#0f1729] border border-[#1a2540] p-5 sticky top-[80px]">
                <div className="font-[700] text-[16px] flex items-center gap-2"><Receipt className="w-4 h-4"/> Price Breakdown</div>
                <div className="mt-4 space-y-2 text-[13px]">
                  <div className="flex justify-between"><span className="text-[#777]">Subtotal ({checkoutListings.length} item)</span><span className="font-[600]">₹{checkoutTotal.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span className="text-[#777]">Platform fee (5%)</span><span className="font-[600]">₹{checkoutCommission.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span className="text-[#777]">Seller payout</span><span className="text-[#00d4ff] font-[600]">₹{checkoutSellerPayout.toLocaleString('en-IN')}</span></div>
                  <div className="h-[1px] bg-[#222] my-2"/>
                  <div className="flex justify-between text-[16px]"><span className="font-[700]">Total to Pay</span><span className="font-[800]">₹{checkoutTotal.toLocaleString('en-IN')}</span></div>
                  <div className="text-[11px] text-[#666]">Payment is manually checked by the administrator; this is not a regulated escrow service</div>
                </div>

                {selectedPaymentMethod==='upi' && (
                  <div className="mt-4 rounded-[12px] bg-white p-3 border border-[#222] flex gap-2 items-center">
                    <img src={qrCodeAsset} alt="QR" className="w-[56px] h-[56px] object-contain rounded-[8px]"/>
                    <div className="flex-1"><div className="text-[12px] font-[800] text-black">Scan the QR to pay</div><div className="mt-1 inline-flex px-2 py-0.5 rounded-full bg-[#ff7a1a] text-black text-[9px] font-[800]">UPI QR provided</div></div>
                  </div>
                )}

                <div className="mt-5 rounded-[12px] bg-[#0c1a22] border border-[#00d4ff]/20 p-3">
                  <div className="font-[700] text-[12px] flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#00d4ff]"/>Admin Payment Review • UPI</div>
                  <div className="mt-2 space-y-1.5 text-[11px] text-[#777] leading-[1.4]">
                    <div className="flex gap-2"><span className="text-[#00d4ff]">1.</span> Scan the QR → Pay ₹{checkoutTotal}</div>
                    <div className="flex gap-2"><span className="text-[#00d4ff]">2.</span> Copy Transaction ID / UTR</div>
                    <div className="flex gap-2"><span className="text-[#00d4ff]">3.</span> Enter UTR → Pending bank verification</div>
                    <div className="flex gap-2"><span className="text-[#00d4ff]">4.</span> Seller delivers → You confirm</div>
                  </div>
                </div>

                <button disabled={!isCheckoutFormValid() || payProcessing} onClick={handlePayClick} className="mt-5 w-full h-[48px] rounded-[14px] bg-[#ff7a1a] text-black font-[800] text-[14px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110">
                  {payProcessing ? <><RefreshCw className="w-4 h-4 animate-spin"/>Processing...</> : <><Lock className="w-4 h-4"/>Pay ₹{checkoutTotal.toLocaleString('en-IN')} • {selectedPaymentMethod==='upi' ? 'Show QR' : 'Admin review'}</>}
                </button>
                <div className="mt-3 text-center mono text-[10px] text-[#555]">UPI QR • Manual review • No automatic PAID status • UTR → Admin review → Delivery</div>
                <button onClick={()=>setView(checkoutCartMode ? 'cart' : 'home')} className="mt-3 w-full h-[40px] rounded-[12px] bg-[#141e32] border border-[#222] text-[12px]">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT GATEWAY MODAL WITH REAL QR */}
      {showPaymentGateway && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md"/>
          <div className="relative w-full max-w-[460px] rounded-[22px] bg-[#101010] border border-[#222] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.9)] max-h-[92vh] overflow-y-auto scrollbar-none">
            <div className="h-[56px] border-b border-[#1a2540] flex items-center justify-between px-5 sticky top-0 bg-[#101010] z-10">
              <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-[10px] bg-[#ff7a1a] flex items-center justify-center"><QrCode className="w-4 h-4 text-black"/></div><div><div className="font-[700] text-[13px]">{paymentStage==='upi_qr' ? 'Scan & Pay' : 'Secure Payment Gateway'}</div><div className="mono text-[10px] text-[#666]">{paymentStage==='upi_qr' ? 'UPI QR' : 'Manual payment review • Encrypted'}</div></div></div>
              <button onClick={()=>{ if(paymentStage!=='processing'){ setShowPaymentGateway(false); setPaymentStage('form')} }} className="w-8 h-8 rounded-full bg-[#141e32] flex items-center justify-center"><X className="w-4 h-4"/></button>
            </div>

            <div className="p-5">
              {paymentStage==='processing' && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-[#ff7a1a]/15 border border-[#ff7a1a]/20 mx-auto flex items-center justify-center"><RefreshCw className="w-8 h-8 text-[#ff7a1a] animate-spin"/></div>
                  <div className="mt-4 font-[700] text-[16px]">Processing Payment...</div>
                  <div className="mono text-[12px] text-[#777] mt-1">Via {selectedPaymentMethod?.toUpperCase()} • ₹{checkoutTotal.toLocaleString('en-IN')}</div>
                  <div className="mt-4 h-2 rounded-full bg-[#141e32] overflow-hidden"><div className="h-full w-[70%] bg-[#ff7a1a] animate-pulse"/></div>
                  <div className="mt-3 text-[11px] text-[#666]">Please wait • Do not close</div>
                </div>
              )}

              {paymentStage==='upi_qr' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff7a1a]/15 border border-[#ff7a1a]/30 text-[11px] font-[700]"><Timer className="w-3 h-3"/> Expires in {formatTimer(upiTimer)} • UTR submission only</div>
                  </div>

                  <div className="rounded-[18px] bg-white p-4 border-2 border-[#ff7a1a] shadow-[0_0_30px_rgba(255,122,26,0.2)]">
                    <div className="flex items-center justify-between mb-3">
                      <div><div className="font-[800] text-[15px] text-black">Scan the QR to pay</div></div>
                      <div className="px-2 py-1 rounded-full bg-black text-white text-[10px] font-[800]">TRIO UPI</div>
                    </div>
                    <div className="bg-white rounded-[14px] p-2 flex items-center justify-center">
                      <img src={qrCodeAsset} alt="UPI QR" className="w-full max-w-[320px] h-auto object-contain rounded-[12px]"/>
                    </div>
                    <div className="mt-3 text-center">
                      <div className="font-[800] text-[22px] text-black">₹{checkoutTotal.toLocaleString('en-IN')}</div>
                      <div className="mono text-[11px] text-[#666] mt-1">Amount • Pay exact • Enter UTR below</div>
                      <div className="mt-2 flex items-center justify-center gap-2"><span className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse"/><span className="text-[11px] font-[600] text-black">Scan with PhonePe / GPay / PayTM / Any UPI</span></div>
                    </div>
                  </div>


                  <div className="rounded-[14px] bg-[#1f1208] border border-[#ff7a1a]/20 p-3">
                    <div className="font-[700] text-[12px] flex items-center gap-2"><Info className="w-4 h-4 text-[#ff7a1a]"/> How to Pay:</div>
                    <div className="mt-2 space-y-1 text-[11px] text-[#999] leading-[1.5]">
                      <div>1. Open PhonePe / GPay / PayTM / BHIM</div>
                      <div>2. Tap Scan & Pay → Scan above QR</div>
                      <div>3. Pay <span className="text-[#ff7a1a] font-[700]">₹{checkoutTotal.toLocaleString('en-IN')}</span> by scanning the QR</div>
                      <div>4. After payment, copy Transaction ID / UTR (e.g. 123456789012)</div>
                      <div>5. Paste below to submit for admin verification</div>
                    </div>
                  </div>

                  <div className="rounded-[14px] bg-[#0b1020] border border-[#1a2540] p-4">
                    <div className="font-[700] text-[13px] flex items-center gap-2"><Receipt className="w-4 h-4"/> Payment Done? Enter Transaction ID</div>
                    <div className="mono text-[10px] text-[#666] mt-1 tracking-widest">UTR / TRANSACTION ID • REQUIRED</div>
                    <input value={transactionId} onChange={e=>{ setTransactionId(e.target.value); setTransactionError(null) }} placeholder="Enter UTR/Transaction ID (e.g. 123456789012)" className="mt-3 w-full h-[48px] rounded-[12px] bg-[#141e32] border border-[#222] px-4 text-[14px] font-[600] outline-none focus:border-[#ff7a1a]/40 tracking-wide"/>
                    <div className="mt-2 text-[10px] text-[#555]">Find UTR in PhonePe: Transaction → Details → UTR No. GPay: Activity → Transaction → UTR</div>
                    {transactionError && <div className="mt-3 p-2.5 rounded-[10px] bg-[#2a1515] border border-[#5a2222] text-[12px] text-[#ff9a9a] flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>{transactionError}</div>}
                    {paymentError && <div className="mt-3 p-2.5 rounded-[10px] bg-[#2a1515] border border-[#5a2222] text-[12px] text-[#ff9a9a]">{paymentError}</div>}
                    <button onClick={verifyUpiPayment} disabled={payProcessing || transactionId.trim().length < 6} className="mt-4 w-full h-[48px] rounded-[14px] bg-[#ff7a1a] text-black font-[800] text-[14px] disabled:opacity-50 flex items-center justify-center gap-2">
                      {payProcessing ? <><RefreshCw className="w-4 h-4 animate-spin"/>Verifying UTR...</> : <><CheckCircle className="w-4 h-4"/>Submit UTR for Admin Review</>}
                    </button>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button onClick={()=>{ setTransactionId(''); pushToast('Cleared') }} className="h-[40px] rounded-[12px] bg-[#141e32] border border-[#222] text-[12px]">Clear</button>
                      <button onClick={()=>{ setShowPaymentGateway(false); setPaymentStage('form'); }} className="h-[40px] rounded-[12px] bg-[#141e32] border border-[#222] text-[12px]">Cancel</button>
                    </div>
                    <div className="mt-3 text-center mono text-[10px] text-[#444]"><Timer className="w-3 h-3 inline mr-1"/>{formatTimer(upiTimer)} left • Payment not confirmed by UTR • Order ID created after submission</div>
                  </div>
                </div>
              )}

              {paymentStage==='otp' && (
                <div>
                  <div className="text-center">
                    {selectedPaymentMethod==='upi' ? (
                      <>
                        <div className="w-[160px] h-[160px] rounded-[16px] bg-white mx-auto p-2 flex items-center justify-center"><img src={qrCodeAsset} alt="QR" className="w-full h-full object-contain rounded-[8px]"/></div>
                        <div className="mt-3 font-[700] text-[14px]">Scan QR with {paymentForm.upiApp.toUpperCase()}</div>
                        <div className="mono text-[11px] text-[#777]">UPI • ₹{checkoutTotal}</div>
                      </>
                    ) : selectedPaymentMethod==='card' ? (
                      <>
                        <div className="w-full h-[96px] rounded-[14px] bg-gradient-to-br from-[#1f1208] to-[#333] border border-[#222] p-3 flex flex-col justify-between text-left"><div className="flex justify-between"><CreditCard className="w-6 h-6 text-[#ff7a1a]"/><span className="mono text-[10px] text-[#777]">VISA • **** {paymentForm.cardNumber.slice(-4)}</span></div><div className="mono text-[12px]">{paymentForm.cardName.toUpperCase()}</div></div>
                        <div className="mt-4 font-[700]">OTP Sent</div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-[#00d4ff]/15 mx-auto flex items-center justify-center"><Smartphone className="w-6 h-6 text-[#00d4ff]"/></div>
                        <div className="mt-3 font-[700]">Enter OTP</div>
                      </>
                    )}
                    <div className="mono text-[11px] text-[#666] mt-2">OTP sent to your mobile / email linked to {selectedPaymentMethod}</div>
                    <div className="text-[10px] text-[#555] mt-1">Secure payment gateway is not configured for this method.</div>
                  </div>

                  <div className="mt-6">
                    <label className="mono text-[11px] text-[#666] tracking-widest">6-DIGIT OTP / UPI PIN</label>
                    <input value={paymentForm.otp} onChange={e=>setPaymentForm({...paymentForm, otp:e.target.value.replace(/\D/g,'').slice(0,6)})} placeholder="••••••" type="password" className="mt-2 w-full h-[52px] rounded-[14px] bg-[#141e32] border border-[#222] text-center text-[22px] tracking-[0.6em] font-[800] outline-none focus:border-[#ff7a1a]/40"/>
                    {paymentError && <div className="mt-3 p-2.5 rounded-[10px] bg-[#2a1515] border border-[#5a2222] text-[12px] text-[#ff9a9a] flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>{paymentError}</div>}
                    <button onClick={verifyOtpAndPay} disabled={payProcessing || paymentForm.otp.length!==6} className="mt-4 w-full h-[48px] rounded-[14px] bg-[#ff7a1a] text-black font-[800] text-[14px] disabled:opacity-50 flex items-center justify-center gap-2">
                      {payProcessing ? <><RefreshCw className="w-4 h-4 animate-spin"/>Verifying...</> : <>Verify & Pay ₹{checkoutTotal.toLocaleString('en-IN')}</>}
                    </button>
                    <button onClick={()=>{ setPaymentStage('processing'); setTimeout(()=>setPaymentStage('otp'), 1200); setPaymentForm({...paymentForm, otp:''}); pushToast('OTP resent') }} className="mt-2 w-full h-[40px] rounded-[12px] bg-[#141e32] border border-[#222] text-[12px]">Resend OTP</button>
                    <div className="mt-3 text-center mono text-[10px] text-[#444]"><Timer className="w-3 h-3 inline mr-1"/>Payment gateway unavailable until configured</div>
                  </div>
                </div>
              )}
              {paymentStage==='success' && (
                <div className="text-center py-6">
                  <div className="w-20 h-20 rounded-full bg-[#00d4ff]/15 border border-[#00d4ff]/30 mx-auto flex items-center justify-center"><CheckCircle className="w-10 h-10 text-[#00d4ff]"/></div>
                  <div className="mt-4 font-[800] text-[20px]">UTR Submitted</div>
                  <div className="mono text-[12px] text-[#777] mt-1">₹{checkoutTotal.toLocaleString('en-IN')} • Awaiting admin verification • UTR: {transactionId}</div>
                  <div className="mt-4 p-3 rounded-[12px] bg-[#0c1a22] border border-[#00d4ff]/20 text-left">
                    <div className="text-[12px] font-[700] text-[#ff7a1a]">What happens next:</div>
                    <div className="mt-2 space-y-1 text-[11px] text-[#999] leading-[1.4]">
                      <div>✓ UTR saved with your order</div>
                      <div>• Admin will verify the actual transaction</div>
                      <div>• Order moves to admin-held workflow only after bank verification</div>
                      <div>• Do not pay again unless support asks</div>
                    </div>
                  </div>
                  {paymentResult && (
                    <div className="mt-3 text-[11px] mono text-[#666]">Saved {paymentResult.saved} order(s) • {paymentResult.remaining} remaining</div>
                  )}
                </div>
              )}
              {paymentStage==='failed' && (
                <div className="text-center py-6">
                  <div className="w-20 h-20 rounded-full bg-[#FF2D78]/15 border border-[#FF2D78]/30 mx-auto flex items-center justify-center"><ShieldAlert className="w-10 h-10 text-[#FF2D78]"/></div>
                  <div className="mt-4 font-[800] text-[18px]">Payment Failed</div>
                  <div className="text-[12px] text-[#777] mt-1">{paymentError || transactionError || 'Something went wrong'}</div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={()=>{ setPaymentStage('form'); setPaymentError(null); setTransactionError(null); setPayProcessing(false)}} className="flex-1 h-[44px] rounded-[12px] bg-[#141e32] border border-[#222] text-[13px]">Retry</button>
                    <button onClick={()=>{ setPaymentStage('form'); setPaymentError(null); setShowPaymentGateway(false)}} className="flex-1 h-[44px] rounded-[12px] bg-white text-black font-[700] text-[13px]">Change Method</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {checkoutConfirmOpen && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={()=>setCheckoutConfirmOpen(false)}/>
          <div className="relative w-full max-w-[380px] rounded-[20px] bg-[#0f1729] border border-[#222] p-5">
            <div className="w-12 h-12 rounded-full bg-white mx-auto flex items-center justify-center"><img src={qrCodeAsset} alt="QR" className="w-10 h-10 object-contain rounded-full"/></div>
            <div className="mt-3 text-center font-[700] text-[16px]">{selectedPaymentMethod==='upi' ? `Pay ₹${checkoutTotal.toLocaleString('en-IN')} by scanning the QR?` : `Confirm Payment ₹${checkoutTotal.toLocaleString('en-IN')}?`}</div>
            <div className="mt-2 text-center text-[12px] text-[#777] leading-[1.4]">
              {selectedPaymentMethod==='upi' ? (
                <>You will be shown <span className="text-white font-[600]">the official QR</span>. Scan with PhonePe/GPay, pay exact amount, then enter UTR. Payment remains pending until the administrator verifies the bank credit.</>
              ) : (
                <>You are about to pay ₹{checkoutTotal.toLocaleString('en-IN')} via {selectedPaymentMethod?.toUpperCase()}. Payment will remain pending until the administrator checks the bank credit. This is not regulated escrow.</>
              )}
            </div>
            {selectedPaymentMethod==='upi' && (
              <div className="mt-3 rounded-[12px] bg-white p-2 flex gap-2 items-center border border-[#222]">
                <img src={qrCodeAsset} alt="QR preview" className="w-[48px] h-[48px] object-contain rounded-[8px]"/>
                <div><div className="font-[700] text-[11px] text-black">UPI QR</div><div className="mono text-[10px] text-[#555]">₹{checkoutTotal.toLocaleString('en-IN')} • UPI payment</div></div>
              </div>
            )}
            <div className="mt-5 flex gap-2"><button onClick={()=>setCheckoutConfirmOpen(false)} className="flex-1 h-[42px] rounded-[12px] bg-[#141e32] border border-[#222] text-[13px]">Cancel</button><button onClick={confirmCheckoutProceed} className="flex-1 h-[42px] rounded-[12px] bg-[#ff7a1a] text-black font-[700] text-[13px]">{selectedPaymentMethod==='upi' ? 'Show QR & Pay' : 'Yes, Pay Now'}</button></div>
          </div>
        </div>
      )}

      {view==='cart' && (
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6"><h2 className="display text-[24px] font-[800] flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-[#ff7a1a]"/>Cart • {cart.length} items</h2><button onClick={()=>setView('home')} className="h-[36px] px-4 rounded-[10px] bg-[#141e32] border border-[#222] text-[12px] flex items-center gap-1"><ArrowLeft className="w-4 h-4"/>Continue Shopping</button></div>
          {cartListings.length===0 ? (
            <div className="rounded-[20px] border border-dashed border-[#222] p-12 text-center bg-[#0f1729]"><ShoppingCart className="w-10 h-10 mx-auto text-[#333]"/><div className="mt-3 font-[700]">Cart is empty</div><div className="mono text-[12px] text-[#666] mt-1">Add vaults to cart, then checkout with the official QR</div><button onClick={()=>setView('home')} className="mt-4 h-[40px] px-6 rounded-[12px] bg-white text-black font-[700] text-[13px]">Browse Vaults</button></div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_340px] gap-6">
              <div className="space-y-3">
                {cartListings.map(l=>(
                  <div key={l.id} className="rounded-[16px] bg-[#0f1729] border border-[#1a2540] p-4 flex gap-4">
                    <div className="w-[64px] h-[64px] rounded-[12px] bg-[#141e32] border border-[#222] flex items-center justify-center"><Crown className="w-6 h-6 text-[#ff7a1a]"/></div>
                    <div className="flex-1 min-w-0"><div className="flex justify-between"><span className="font-[700] text-[14px]">{l.id} • {l.bundles?.[0] || l.evoGuns?.[0] || 'Collection listing'}</span><span className="font-[800]">₹{l.price.toLocaleString('en-IN')}</span></div><div className="text-[12px] text-[#777] truncate">{l.evoGuns[0]} • {l.bundles[0]} • {l.seller}</div><div className="mt-3 flex gap-2"><button onClick={()=>{ setSelected(l); setDetailTab('overview')}} className="h-[32px] px-3 rounded-[8px] bg-[#141e32] border border-[#222] text-[11px]">View</button><button onClick={()=>toggleCart(l.id)} className="h-[32px] px-3 rounded-[8px] bg-[#2a1515] border border-[#5a2222] text-[#ff9a9a] text-[11px] flex items-center gap-1"><X className="w-3 h-3"/>Remove</button></div></div>
                  </div>
                ))}
              </div>
              <div className="rounded-[20px] bg-[#0f1729] border border-[#1a2540] p-5 h-fit sticky top-[80px]">
                <div className="font-[700]">Order Summary</div>
                <div className="mt-4 space-y-2 text-[13px]"><div className="flex justify-between"><span className="text-[#777]">Items ({cartListings.length})</span><span>₹{cartListings.reduce((s,l)=>s+l.price,0).toLocaleString('en-IN')}</span></div><div className="flex justify-between"><span className="text-[#777]">Marketplace Fee (5%)</span><span>₹{Math.floor(cartListings.reduce((s,l)=>s+l.price,0)*0.05).toLocaleString('en-IN')}</span></div><div className="h-[1px] bg-[#222] my-2"/><div className="flex justify-between font-[800] text-[16px]"><span>Total</span><span>₹{cartListings.reduce((s,l)=>s+l.price,0).toLocaleString('en-IN')}</span></div></div>
                <div className="mt-3 rounded-[12px] bg-white p-2 flex gap-2 items-center border"><img src={qrCodeAsset} alt="QR" className="w-[40px] h-[40px] object-contain"/><div className="text-[11px] text-black"><div className="font-[800]">Scan the QR to pay</div></div></div>
                <button onClick={()=>initiateCheckout(cartListings, true)} className="mt-5 w-full h-[46px] rounded-[12px] bg-[#ff7a1a] text-black font-[800] text-[14px] flex items-center justify-center gap-2"><QrCode className="w-4 h-4"/>Checkout • UPI</button>
                <div className="mt-3 text-[11px] text-[#666] text-center leading-[1.4]">Official QR • Scan → Pay → UTR → Bank verification → Delivery</div>
                <button onClick={async()=>{
                  if(!confirm('Clear cart?')) return
                  for(const l of cartListings){ const recId=cartRecords[l.id]; if(recId) try{ await apiDelete('cart', recId) }catch{} }
                  setCart([]); setCartRecords({}); pushToast('Cart cleared')
                }} className="mt-3 w-full h-[40px] rounded-[12px] bg-[#141e32] border border-[#222] text-[12px]">Clear Cart</button>
              </div>
            </div>
          )}
        </div>
      )}

      {view==='profile' && currentUser && (
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="rounded-[22px] bg-[#0f1729] border border-[#1a2540] p-6 grid md:grid-cols-[260px_1fr] gap-6">
            <div className="text-center">
              <div className="w-[88px] h-[88px] rounded-[20px] bg-[#ff7a1a] text-black font-[800] text-[32px] flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(255,122,26,0.4)]">{currentUser.avatar}</div>
              <div className="mt-4 font-[800] text-[20px] flex items-center justify-center gap-2">{currentUser.name}{currentUser.verified && <Verified className="w-5 h-5 text-[#00d4ff]"/>}</div>
              <div className="mono text-[12px] text-[#777] mt-1">{currentUser.email}</div>
              <div className="mt-3 flex justify-center gap-2 flex-wrap"><span className="px-2.5 py-1 rounded-full bg-[#ff7a1a]/20 text-[11px] font-[800]">{currentUser.role.toUpperCase()}</span><span className="px-2.5 py-1 rounded-full bg-[#141e32] border border-[#222] text-[11px]">{currentUser.joined}</span></div>
              <div className="mt-4 p-3 rounded-[14px] bg-[#141e32] border border-[#222] text-left">
                <div className="mono text-[10px] text-[#666]">BIO</div><div className="text-[13px] mt-1 leading-[1.4]">{currentUser.bio}</div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center"><div><div className="font-[800]">{currentUser.rating}★</div><div className="mono text-[10px] text-[#666]">Rating</div></div><div><div className="font-[800]">{currentUser.sales}</div><div className="mono text-[10px] text-[#666]">Sales</div></div><div><div className="font-[800]">₹{currentUser.balance||0}</div><div className="mono text-[10px] text-[#666]">Balance</div></div></div>
              </div>
              <div className="mt-4 space-y-2">
                <input value={editProfile.name} onChange={e=>setEditProfile({...editProfile, name:e.target.value})} placeholder="Name" className="w-full h-[40px] rounded-[12px] bg-[#141e32] border border-[#222] px-3 text-[13px]"/>
                <textarea value={editProfile.bio} onChange={e=>setEditProfile({...editProfile, bio:e.target.value})} placeholder="Bio" rows={2} className="w-full rounded-[12px] bg-[#141e32] border border-[#222] p-3 text-[13px] resize-none"/>
                <input value={editProfile.phone} onChange={e=>setEditProfile({...editProfile, phone:e.target.value})} placeholder="Phone" className="w-full h-[40px] rounded-[12px] bg-[#141e32] border border-[#222] px-3 text-[13px]"/>
                <button onClick={handleProfileSave} className="w-full h-[40px] rounded-[12px] bg-white text-black font-[700] text-[13px] flex items-center justify-center gap-2"><Save className="w-4 h-4"/>Save Profile (Persist)</button>
              </div>
            </div>
            <div>
              <div className="flex gap-2 mb-4 flex-wrap">
                {[
                  {k:'listings', l:'My Listings'},
                  {k:'wishlist', l:`Wishlist • ${wishlist.length}`},
                  {k:'orders', l:'Orders'},
                  {k:'settings', l:'Settings'},
                ].map(t=>(
                  <button key={t.k} onClick={()=> t.k==='settings'? (setView('settings')) : setProfileTab(t.k as any)} className={`px-4 h-[36px] rounded-full text-[13px] font-[600] border ${profileTab===t.k?'bg-white text-black border-white':'bg-[#141e32] border-[#222] text-[#777]'}`}>{t.l}</button>
                ))}
              </div>
              {profileTab==='listings' && (
                <div className="grid sm:grid-cols-2 gap-3">
                  {listings.filter(l=> l.sellerEmail===currentUser.email).map(l=>(
                    <div key={l.id} className="rounded-[14px] bg-[#141e32] border border-[#222] p-3 flex justify-between items-center"><div><div className="font-[700] text-[13px]">{l.id} • {l.bundles?.[0] || l.evoGuns?.[0] || 'Collection listing'}</div><div className="text-[11px] text-[#777]">₹{l.price.toLocaleString('en-IN')} • {l.approved===false?'Pending approval':'Live'} • {l.views||0} views</div></div><Eye className="w-4 h-4 text-[#555]"/></div>
                  ))}
                  {listings.filter(l=> l.sellerEmail===currentUser.email).length===0 && <div className="col-span-2 p-8 text-center rounded-[14px] border border-dashed border-[#222] text-[13px] text-[#777]">No listings yet. <button onClick={()=>setView('sell')} className="text-[#ff7a1a] underline">Sell your first ID</button></div>}
                </div>
              )}
              {profileTab==='wishlist' && (
                <div className="grid sm:grid-cols-2 gap-3">
                  {listings.filter(l=> wishlist.includes(l.id)).map(l=>(
                    <div key={l.id} className="rounded-[14px] bg-[#141e32] border border-[#222] p-3"><div className="flex justify-between"><span className="font-[700]">{l.id}</span><span className="font-[800]">₹{l.price.toLocaleString('en-IN')}</span></div><div className="text-[12px] text-[#777]">{l.bundles?.[0] || l.evoGuns?.[0] || 'Collection details'} • Lv {l.level || '—'}</div><div className="flex gap-2 mt-3"><button onClick={()=>{ setSelected(l); setDetailTab('overview')}} className="flex-1 h-[36px] rounded-[10px] bg-white text-black font-[700] text-[12px]">View</button><button onClick={()=>toggleWishlist(l.id)} className="w-[36px] h-[36px] rounded-[10px] bg-[#1a2540] border border-[#222] flex items-center justify-center"><HeartOff className="w-4 h-4"/></button><button onClick={()=>initiateCheckout(l)} className="flex-1 h-[36px] rounded-[10px] bg-[#ff7a1a] text-black font-[700] text-[12px]">Buy Now</button></div></div>
                  ))}
                  {wishlist.length===0 && <div className="col-span-2 p-10 text-center rounded-[16px] border border-dashed border-[#222] text-[13px] text-[#777]">No favorites yet. Heart persists via records API.</div>}
                </div>
              )}
              {profileTab==='orders' && (
                <div className="space-y-2">
                  {orders.filter(o=> o.buyerEmail===currentUser.email || o.sellerEmail===currentUser.email).map(o=>(
                    <div key={o.id} className="rounded-[14px] bg-[#141e32] border border-[#222] p-3 flex justify-between items-center"><div><div className="font-[700] text-[13px]">{o.id} • {o.listingId} • ₹{o.price} • {o.paymentMethod} {o.transactionId && `• UTR ${o.transactionId}`}</div><div className="text-[11px] text-[#777]">{o.status} • {o.createdAt.slice(0,10)} • Admin-tracked ₹{o.escrowAmount}</div></div><span className="px-2 py-1 rounded-full bg-[#00d4ff]/15 text-[#00d4ff] text-[11px]">{o.status}</span></div>
                  ))}
                  {orders.length===0 && <div className="p-8 text-center rounded-[14px] border border-dashed border-[#222] text-[13px] text-[#777]">No orders yet. Orders appear here after a real listing checkout.</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {view==='settings' && currentUser && (
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="rounded-[22px] bg-[#0f1729] border border-[#1a2540] p-5 sm:p-6 grid md:grid-cols-[220px_1fr] gap-6">
            <div className="space-y-1.5">
              <div className="font-[700] mb-2">Settings</div>
              {[
                {k:'account', l:'Account', i:User},
                {k:'notifications', l:'Notifications', i:Bell},
                {k:'privacy', l:'Privacy', i:Shield},
                {k:'payments', l:'Payment', i:Wallet},
                {k:'appearance', l:'Appearance', i:Sun},
              ].map(t=>(
                <button key={t.k} onClick={()=>setSettingsTab(t.k as any)} className={`w-full h-[38px] rounded-[12px] flex items-center gap-2 px-3 text-[13px] ${settingsTab===t.k?'bg-white text-black font-[700]':'bg-[#141e32] border border-[#222] text-[#777]'}`}><t.i className="w-4 h-4"/>{t.l}</button>
              ))}
            </div>
            <div>
              {settingsTab==='account' && (
                <div className="space-y-5">
                  <div className="font-[700] text-[16px]">Account Settings</div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="space-y-1.5"><span className="mono text-[11px] text-[#666]">DISPLAY NAME</span><input value={editProfile.name} onChange={e=>setEditProfile({...editProfile, name:e.target.value})} className="w-full h-[44px] rounded-[12px] bg-[#141e32] border border-[#222] px-3 text-[13px]"/></label>
                    <label className="space-y-1.5"><span className="mono text-[11px] text-[#666]">EMAIL</span><input value={currentUser.email} disabled className="w-full h-[44px] rounded-[12px] bg-[#111] border border-[#222] px-3 text-[13px] opacity-60"/></label>
                    <label className="space-y-1.5"><span className="mono text-[11px] text-[#666]">PHONE</span><input value={editProfile.phone} onChange={e=>setEditProfile({...editProfile, phone:e.target.value})} placeholder="+91 98765 43210" className="w-full h-[44px] rounded-[12px] bg-[#141e32] border border-[#222] px-3 text-[13px]"/></label>
                    <label className="space-y-1.5"><span className="mono text-[11px] text-[#666]">BIO</span><input value={editProfile.bio} onChange={e=>setEditProfile({...editProfile, bio:e.target.value})} className="w-full h-[44px] rounded-[12px] bg-[#141e32] border border-[#222] px-3 text-[13px]"/></label>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-[12px] bg-[#1f1208] border border-[#ff7a1a]/20"><div><div className="font-[600] text-[13px] flex items-center gap-2"><Fingerprint className="w-4 h-4 text-[#ff7a1a]"/>Two-Factor Authentication</div><div className="text-[11px] text-[#777]">Secure your account with 2FA</div></div><button onClick={()=>setAppSettings({...appSettings, twoFactor:!appSettings.twoFactor})} className={`w-12 h-6 rounded-full p-1 flex transition ${appSettings.twoFactor?'justify-end bg-[#ff7a1a]':'justify-start bg-[#263650]'}`}><div className="w-4 h-4 rounded-full bg-white shadow"/></button></div>
                  <button onClick={handleProfileSave} className="h-[42px] px-6 rounded-[12px] bg-white text-black font-[700] text-[13px] flex items-center gap-2"><Save className="w-4 h-4"/>Save Changes</button>
                </div>
              )}
              {settingsTab==='notifications' && (
                <div className="space-y-4"><div className="font-[700]">Notifications</div>{[
                  {k:'orderUpdates', l:'Order updates'},
                  {k:'messages', l:'New messages'},
                  {k:'priceDrops', l:'Price drops in wishlist'},
                  {k:'promo', l:'Promotional offers'},
                ].map(n=><div key={n.k} className="flex items-center justify-between p-3 rounded-[12px] bg-[#141e32] border border-[#222]"><div className="font-[600] text-[13px]">{n.l}</div><button onClick={()=>setAppSettings({...appSettings, [n.k]: !appSettings[n.k as keyof typeof appSettings]})} className={`w-10 h-6 rounded-full p-1 flex transition ${appSettings[n.k as keyof typeof appSettings]?'justify-end bg-[#ff7a1a]':'justify-start bg-[#263650]'}`}><div className="w-4 h-4 rounded-full bg-white shadow"/></button></div>)}</div>
              )}
              {settingsTab==='privacy' && (
                <div className="space-y-4"><div className="font-[700]">Privacy & Safety</div><div className="p-4 rounded-[12px] bg-[#1f1208] border border-[#222] text-[12px] leading-[1.6] text-[#999]"><div className="font-[700] text-white">Data Protection</div>Use a unique password, never share OTPs or recovery codes, and verify payment directly in your bank app. Seller claims are not independently verified unless marked by an administrator.</div><div className="flex items-center justify-between p-3 rounded-[12px] bg-[#141e32] border border-[#222]"><div className="font-[600] text-[13px]">Email visible to sellers</div><button onClick={()=>setAppSettings({...appSettings, emailVisible:!appSettings.emailVisible})} className={`w-10 h-6 rounded-full p-1 flex transition ${appSettings.emailVisible?'justify-end bg-[#ff7a1a]':'justify-start bg-[#263650]'}`}><div className="w-4 h-4 rounded-full bg-white"/></button></div></div>
              )}
              {settingsTab==='payments' && (
                <div className="space-y-4"><div className="font-[700]">Payment Methods • UPI QR</div><div className="rounded-[14px] bg-white p-3 border flex gap-3 items-center"><img src={qrCodeAsset} alt="QR" className="w-[60px] h-[60px] object-contain"/><div className="text-black"><div className="font-[700] text-[12px]">Scan the QR to pay</div><div className="text-[10px] text-[#666]">UPI details provided</div></div></div><div className="grid sm:grid-cols-3 gap-3">{[{k:'UPI', d:'Scan the QR'},{k:'Bank', d:'IMPS / NEFT'},{k:'PayPal', d:'International'}].map(m=><div key={m.k} className="p-4 rounded-[12px] bg-[#141e32] border border-[#222]"><div className="font-[700] text-[13px]">{m.k}</div><div className="text-[11px] text-[#777]">{m.d}</div><button onClick={()=>pushToast(`${m.k} payment method saved`)} className="mt-3 h-[32px] w-full rounded-[8px] bg-[#222] border border-[#263650] text-[11px]">Saved ✓</button></div>)}</div></div>
              )}
              {settingsTab==='appearance' && (
                <div className="space-y-4"><div className="font-[700]">Appearance</div><div className="flex gap-2"><button onClick={()=>setTheme('dark')} className={`h-[44px] px-5 rounded-[12px] border font-[600] flex items-center gap-2 ${theme==='dark'?'bg-white text-black border-white':'bg-[#141e32] border-[#222]'}`}><Moon className="w-4 h-4"/>Dark Gaming</button><button onClick={()=>setTheme('light')} className={`h-[44px] px-5 rounded-[12px] border font-[600] flex items-center gap-2 ${theme==='light'?'bg-white text-black border-white':'bg-[#141e32] border-[#222]'}`}><Sun className="w-4 h-4"/>Light</button></div></div>
              )}
            </div>
          </div>
        </div>
      )}

      {view==='inbox' && (
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8 py-6">
          <div className="rounded-[20px] bg-[#0f1729] border border-[#1a2540] overflow-hidden grid grid-rows-[150px_minmax(0,1fr)] md:grid-rows-1 md:grid-cols-[320px_minmax(0,1fr)] h-[calc(100dvh-150px)] min-h-[500px] max-h-[820px]">
            <div className="border-b md:border-b-0 md:border-r border-[#1a2540] flex flex-col min-h-0">
              <div className="h-[56px] border-b border-[#1a2540] flex items-center justify-between px-4"><span className="font-[700] flex items-center gap-2"><Inbox className="w-4 h-4"/>Inbox • {chats.length}</span><span className="px-2 py-1 rounded-full bg-[#ff7a1a] text-black text-[11px] font-[800]">{unreadChats} new</span></div>
              <div className="flex-1 min-h-0 overflow-auto scrollbar-none">
                {chats.length===0 && <div className="p-8 text-center text-[13px] text-[#777]">No chats yet. Open a listing and click Chat to start conversation.</div>}
                {chats.map(c=>(
                  <div key={c.id} onClick={()=>setActiveChatId(c.id)} className={`p-3 border-b border-[#141e32] cursor-pointer hover:bg-[#141e32] ${activeChatId===c.id?'bg-[#141e32] border-l-2 border-l-[#ff7a1a]':''}`}>
                    <div className="flex items-center justify-between"><span className="font-[700] text-[13px] truncate">{c.listingTitle}</span><span className="mono text-[10px] text-[#666]">{c.createdAt.slice(0,10)}</span></div>
                    <div className="text-[11px] text-[#666] truncate flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${c.online?'bg-[#00d4ff]':'bg-[#555]'}`}/>{currentUser?.email===c.buyerEmail? c.seller : c.buyer} • {c.listingId}</div>
                    <div className="text-[12px] truncate mt-1 text-[#aaa]">{c.messages[c.messages.length-1]?.text || (c.messages[c.messages.length-1]?.mediaPath ? '📎 Media attachment' : 'No messages yet')}</div>
                    {c.unread>0 && <span className="mt-1 inline-flex px-2 py-0.5 rounded-full bg-[#00d4ff] text-black text-[10px] font-[800]">{c.unread} unread</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col min-h-0 min-w-0">
              {!activeChat ? (
                <div className="flex-1 flex items-center justify-center text-center p-8"><div><MessageCircle className="w-10 h-10 mx-auto text-[#333]"/><div className="mt-3 font-[700]">Select a conversation</div><div className="text-[12px] text-[#666] mt-1">Your messages persist via records API</div></div></div>
              ) : (
                <>
                  <div className="h-[56px] border-b border-[#1a2540] flex items-center justify-between px-4">
                    <div className="flex items-center gap-2 min-w-0"><div className="w-8 h-8 shrink-0 rounded-full bg-[#1a2540] flex items-center justify-center font-[800] text-[12px]">{(currentUser?.email===activeChat.buyerEmail ? activeChat.seller : activeChat.buyer)[0]}</div><div className="min-w-0"><div className="font-[700] text-[13px] truncate">{currentUser?.email===activeChat.buyerEmail ? activeChat.seller : activeChat.buyer} • {activeChat.listingId}</div><div className="text-[11px] text-[#999]">Buyer & seller conversation</div></div></div>
                    <button className="w-8 h-8 rounded-full bg-[#141e32] flex items-center justify-center"><MoreVertical className="w-4 h-4"/></button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-4 space-y-3 scrollbar-none">
                    {activeChat.messages.map((m,i)=>(
                      <div key={i} className={`flex ${m.from===currentUser?.email?'justify-end': m.type==='system'?'justify-center':'justify-start'}`}>
                        {m.type==='system' ? (
                          <div className="px-3 py-1.5 rounded-full bg-[#141e32] border border-[#222] text-[11px] text-[#666] max-w-[80%] text-center">{m.text}</div>
                        ) : m.type==='offer' ? (
                          <div className="max-w-[70%] rounded-[14px] bg-[#ff7a1a] text-black p-3"><div className="font-[800] text-[13px] flex items-center gap-1"><DollarSign className="w-4 h-4"/>Offer</div><div className="text-[13px]">{m.text}</div><div className="mt-2 flex gap-2"><button className="px-3 h-[28px] rounded-full bg-black text-[#ff7a1a] text-[11px] font-[700]">Accept</button><button className="px-3 h-[28px] rounded-full bg-white/20 text-black text-[11px]">Decline</button></div></div>
                        ) : (
                          <div className={`max-w-[70%] rounded-[16px] px-3.5 py-2.5 text-[13px] leading-[1.4] ${m.from===currentUser?.email?'bg-[#ff7a1a] text-black rounded-br-[4px]':'bg-[#1a2540] border border-[#222] rounded-bl-[4px]'}`}>{m.text && <div>{m.text}</div>}{m.mediaPath && <ChatAttachment path={m.mediaPath} mediaType={m.mediaType}/>}<div className={`mono text-[10px] mt-1 ${m.from===currentUser?.email?'text-black/60':'text-[#666]'}`}>{m.time} {m.from===currentUser?.email && <Check className="inline w-3 h-3 ml-1"/>}</div></div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[#1a2540] p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <input type="number" placeholder="Offer ₹" value={offerAmount||''} onChange={e=>setOfferAmount(parseInt(e.target.value)||0)} className="h-[36px] w-[120px] rounded-[10px] bg-[#141e32] border border-[#222] px-3 text-[13px]"/>
                      <button onClick={sendOffer} className="h-[36px] px-3 rounded-[10px] bg-[#1a2540] border border-[#222] text-[12px] font-[600]">Send Offer</button>
                    </div>
                    {chatMediaFile && <div className="mb-2 flex items-center justify-between rounded-lg bg-[#141e32] px-3 py-2 text-[11px] text-[#bbb]"><span className="truncate">Attachment: {chatMediaFile.name}</span><button onClick={()=>{setChatMediaFile(null); if(chatFileRef.current) chatFileRef.current.value=''}} className="text-[#ff7777]">Remove</button></div>}
                    <div className="flex items-center gap-2">
                      <input ref={chatFileRef} type="file" accept="image/*,video/*" className="hidden" onChange={e=>setChatMediaFile(e.target.files?.[0]||null)}/>
                      <button onClick={()=>chatFileRef.current?.click()} title="Attach photo or video" className="w-[42px] h-[42px] shrink-0 rounded-[12px] bg-[#141e32] border border-[#333] text-[#ddd] flex items-center justify-center"><Paperclip className="w-4 h-4"/></button>
                      <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=> e.key==='Enter'&&sendMessage()} placeholder="Type a message..." className="min-w-0 flex-1 h-[42px] rounded-[12px] bg-[#141e32] border border-[#222] px-3 text-[13px] outline-none focus:border-[#ff7a1a]/40"/>
                      <button onClick={sendMessage} className="w-[42px] h-[42px] shrink-0 rounded-[12px] bg-[#ff7a1a] text-black flex items-center justify-center hover:brightness-110"><Send className="w-4 h-4"/></button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {view==='apk' && (
        <ApkStore user={currentUser?{id:currentUser.id,email:currentUser.email,name:currentUser.name}:null} isAdmin={!!isAdmin} toast={pushToast} qr={qrCodeAsset} upiId={UPI_ID} upiName={UPI_NAME} onLogin={()=>setShowAuth('login')}/>
      )}
      {view==='vouchers' && (
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="relative overflow-hidden rounded-[24px] border border-[#4a2a12] bg-[radial-gradient(ellipse_at_top_right,rgba(255,122,26,.16),transparent_55%),#10131b] p-6 sm:p-10">
            <div className="relative max-w-[720px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ff7a1a]/25 bg-[#ff7a1a]/10 px-3 py-1.5 text-[10px] font-[800] tracking-[.16em] text-[#ff7a1a]"><Gift className="w-3.5 h-3.5"/> REDEEM VOUCHERS</div>
              <h1 className="display mt-4 text-[clamp(30px,5vw,52px)] font-[900] leading-[.98]">Redeem <span className="text-[#ff7a1a]">Voucher</span></h1><div className="mt-2 text-[14px] font-[700] text-[#ff7a1a]">Real value. Smart prices.</div>
              <p className="mt-3 max-w-[620px] text-[13px] sm:text-[15px] leading-6 text-[#aab5c7]">Browse available digital vouchers. Check each voucher’s value and price before contacting the marketplace administrator. Redeem codes are kept private and are never shown in the public catalogue.</p>
            </div>
          </div>
          <div className="mt-6 rounded-[16px] border border-[#344660] bg-[#101827] p-4 sm:p-5">
            <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff7a1a]/10 text-[#ff7a1a]"><ShieldCheck className="h-5 w-5"/></div><div><div className="font-[800] text-[14px]">Verified voucher catalogue</div><p className="mt-1 text-[11px] leading-5 text-[#9aa9bd]">Only vouchers whose issuer permits resale may be listed. Check the provider’s terms and voucher region before purchase. The redeem code is shared only after the administrator confirms payment and availability.</p></div></div>
          </div>
          <div className="mt-7 flex flex-wrap items-end justify-between gap-3"><div><h2 className="display text-[22px] font-[800]">Available Vouchers</h2><p className="mt-1 text-[11px] text-[#77849a]">Only vouchers approved for resale by their issuer can appear here.</p></div><span className="rounded-full border border-[#263650] bg-[#111827] px-3 py-1.5 text-[11px] text-[#9aa9bd]">{publicVoucherItems.length} available</span></div>
          {voucherCatalogLoading ? <div className="mt-5 rounded-[16px] border border-[#263650] bg-[#101827] p-10 text-center text-[13px] text-[#9aa9bd]"><RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin"/>Loading voucher offers...</div> : publicVoucherItems.length===0 ? (
            <div className="mt-5 rounded-[18px] border border-dashed border-[#344660] bg-[#101827] p-10 sm:p-14 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff7a1a]/10 text-[#ff7a1a]"><Gift className="h-7 w-7"/></div><h3 className="mt-4 text-[17px] font-[800]">No vouchers available yet</h3><p className="mx-auto mt-2 max-w-[440px] text-[12px] leading-5 text-[#9aa9bd]">New voucher offers will appear here after the administrator adds eligible products to the private inventory.</p><button onClick={()=>setView('home')} className="mt-5 h-10 rounded-[10px] border border-[#344660] px-4 text-[12px] font-[700] hover:bg-white/5">Back to Marketplace</button></div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{publicVoucherItems.map(item=>(
              <article key={item.id} className="overflow-hidden rounded-[18px] border border-[#263650] bg-[#101827] p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ff7a1a]/10 text-[#ff7a1a]"><Gift className="h-5 w-5"/></div><span className="rounded-full border border-[#72c6a0]/20 bg-[#72c6a0]/10 px-2.5 py-1 text-[9px] font-[800] text-[#72c6a0]">AVAILABLE</span></div>
                <div className="mt-4 text-[10px] font-[800] uppercase tracking-[.12em] text-[#9aa9bd]">{item.provider}</div><h3 className="mt-1 text-[16px] font-[800]">{item.title}</h3>
                <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-[#0b1020] p-3"><div className="text-[9px] uppercase tracking-wider text-[#718096]">Redeem Balance</div><div className="mt-1 text-[18px] font-[900] text-white">₹{Number(item.balance).toLocaleString('en-IN')}</div></div><div className="rounded-xl bg-[#0b1020] p-3"><div className="text-[9px] uppercase tracking-wider text-[#718096]">Selling Price</div><div className="mt-1 text-[17px] font-[900] text-[#ff7a1a]">₹{Number(item.price).toLocaleString('en-IN')}</div></div></div>
                {Number(item.balance)>Number(item.price) && <div className="mt-2 flex items-center justify-between rounded-xl border border-[#72c6a0]/25 bg-[#72c6a0]/10 px-3 py-2 text-[11px] font-[800] text-[#72c6a0]"><span>You save ₹{(Number(item.balance)-Number(item.price)).toLocaleString('en-IN')}</span><span>{Math.round((1-Number(item.price)/Number(item.balance))*100)}% OFF</span></div>}
                <button onClick={()=>pushToast('Before paying, contact the marketplace administrator to confirm stock, region and issuer resale eligibility.')} className="mt-4 h-10 w-full rounded-[10px] bg-[#ff7a1a] text-[12px] font-[900] text-[#101827] hover:brightness-110">Ask About Voucher</button>
              </article>
            ))}</div>
          )}
          <div className="mt-6 rounded-[14px] border border-[#344660] bg-[#111827] p-4 text-[11px] leading-5 text-[#9aa9bd]"><span className="font-[800] text-[#ff7a1a]">Purchase protection:</span> A submitted UTR is not proof of payment. Any future order must be released only after the administrator independently confirms the actual bank credit. This personal UPI workflow is not a regulated escrow service.</div>
        </div>
      )}

      {view==='orders' && (
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-4"><h2 className="display text-[24px] font-[800] flex items-center gap-2"><Package className="w-5 h-5 text-[#ff7a1a]"/>Orders & Payment Timeline</h2><span className="px-3 py-1 rounded-full bg-[#00d4ff]/15 text-[#00d4ff] text-[11px] font-[700]">{orders.length} orders • UPI reference</span></div>
          <div className="rounded-[14px] bg-[#0c1a22] border border-[#00d4ff]/20 p-3 mb-4 text-[12px] leading-[1.5]"><span className="font-[700] text-[#00d4ff]">Real UPI Flow:</span> <span className="text-[#999]">Checkout → Show the QR → Scan → Pay → Enter UTR → Admin verifies bank receipt → Delivery → Buyer confirms. UTR submission is not proof of payment or regulated escrow.</span></div>
          <div className="grid gap-3">
            {orders.length===0 && <div className="rounded-[16px] border border-dashed border-[#222] p-10 text-center text-[13px] text-[#777] bg-[#0f1729]">No orders yet. Buy by scanning the official QR</div>}
            {orders.map(o=>{
              const steps = [
                {k:'paid', l:'Payment Received', done:['paid','escrow','delivered','confirmed','completed'].includes(o.status)},
                {k:'escrow', l:'Admin-held workflow', done:['escrow','delivered','confirmed','completed'].includes(o.status)},
                {k:'delivered', l:'Seller Delivering', done:['delivered','confirmed','completed'].includes(o.status)},
                {k:'confirmed', l:'Buyer Confirm', done:['confirmed','completed'].includes(o.status)},
                {k:'completed', l:'Completed', done:o.status==='completed'},
              ]
              return (
                <div key={o.id} className="rounded-[16px] bg-[#0f1729] border border-[#1a2540] p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap"><span className="font-[800] text-[14px]">{o.id}</span><span className="mono text-[11px] px-2 py-1 rounded-full bg-[#141e32] border border-[#222]">{o.listingId}</span><span className={`px-2.5 py-1 rounded-full text-[11px] font-[700] ${o.status==='escrow'?'bg-[#00d4ff]/20 text-[#00d4ff]': o.status==='completed'?'bg-[#00d4ff]/15 text-[#00d4ff]': o.status==='paid'?'bg-[#ff7a1a]/20 text-[#ff7a1a]': o.status==='delivered'?'bg-[#ff9a00]/20 text-[#ff9a00]':'bg-[#222] text-[#777]'}`}>{o.status.toUpperCase()}</span><span className="mono text-[10px] px-2 py-1 rounded-full bg-[#141e32] border border-[#222]">{o.paymentMethod} {o.transactionId ? `• UTR ${o.transactionId}` : ''}</span></div>
                    <div className="text-[13px] font-[700]">₹{o.price.toLocaleString('en-IN')} • Admin-tracked amount ₹{o.escrowAmount} • Indicative seller amount ₹{o.sellerPayout}</div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 overflow-auto scrollbar-none pb-2">
                    {steps.map((step,i,arr)=>(
                      <div key={step.k} className="flex items-center gap-2 shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step.done?'bg-[#00d4ff] border-[#00d4ff] text-black':'bg-[#141e32] border-[#222] text-[#555]'}`}><CheckCircle className="w-4 h-4"/></div>
                        <span className={`text-[11px] font-[600] ${step.done?'text-white':'text-[#555]'}`}>{step.l}</span>
                        {i<arr.length-1 && <div className={`w-8 h-[2px] ${arr[i+1].done?'bg-[#00d4ff]':'bg-[#222]'}`}/>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {o.status==='escrow' && (currentUser?.email===o.sellerEmail || isAdmin) && (
                      <button disabled={busy} onClick={()=>handleOrderStatusUpdate(o.id, 'delivered')} className="h-[36px] px-4 rounded-[10px] bg-white text-black font-[700] text-[12px] flex items-center gap-1 disabled:opacity-50"><>{busy ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Package className="w-3 h-3"/>} Mark as Delivered (Seller)</></button>
                    )}
                    {o.status==='delivered' && (currentUser?.email===o.buyerEmail || isAdmin) && (
                      <button disabled={busy} onClick={()=>handleOrderStatusUpdate(o.id, 'confirmed')} className="h-[36px] px-4 rounded-[10px] bg-[#ff7a1a] text-black font-[700] text-[12px] flex items-center gap-1 disabled:opacity-50"><>{busy ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Check className="w-3 h-3"/>} Confirm Received (Buyer)</></button>
                    )}
                    {o.status==='confirmed' && (
                      <button disabled={busy} onClick={()=>handleOrderStatusUpdate(o.id, 'completed')} className="h-[36px] px-4 rounded-[10px] bg-[#00d4ff] text-black font-[700] text-[12px] flex items-center gap-1 disabled:opacity-50"><>{busy ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Trophy className="w-3 h-3"/>} Complete Order • Release Funds</></button>
                    )}
                    {isAdmin && o.status==='pending_verification' && (
                      <button disabled={busy} onClick={()=>handleOrderStatusUpdate(o.id, 'escrow')} className="h-[36px] px-4 rounded-[10px] bg-[#00d4ff]/15 border border-[#00d4ff]/30 text-[#00d4ff] text-[12px]">Verify Bank Credit • Admin Hold</button>
                    )}
                    {isAdmin && o.status!=='completed' && o.status!=='disputed' && o.status!=='pending_verification' && (
                      <>
                        <button disabled={busy} onClick={()=>handleOrderStatusUpdate(o.id, 'completed')} className="h-[36px] px-4 rounded-[10px] bg-[#ff7a1a] text-black font-[700] text-[12px]">Admin Force Complete</button>
                        <button disabled={busy} onClick={()=>handleOrderStatusUpdate(o.id, 'disputed')} className="h-[36px] px-4 rounded-[10px] bg-[#2a1515] border border-[#5a2222] text-[#ff9a9a] text-[12px]">Dispute</button>
                      </>
                    )}
                    <span className="text-[11px] text-[#555] flex items-center gap-1 ml-auto"><Info className="w-3 h-3"/>Buyer: {o.buyer} • Seller: {o.seller} • {o.createdAt.slice(0,10)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {view==='wishlist' && (
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="display text-[24px] font-[800] flex items-center gap-2 mb-4"><Heart className="w-5 h-5 text-[#FF2D78]"/> Wishlist • {wishlist.length}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.filter(l=> wishlist.includes(l.id)).map(l=>(
              <div key={l.id} className="rounded-[16px] bg-[#0f1729] border border-[#1a2540] p-3 flex flex-col gap-2 hover:border-[#FF2D78]/30"><div className="flex justify-between"><span className="font-[700]">{l.id}</span><span className="font-[800]">₹{l.price.toLocaleString('en-IN')}</span></div><div className="text-[12px] text-[#777]">{l.bundles?.[0] || l.evoGuns?.[0] || 'Collection details'} • Lv {l.level || '—'}</div><div className="flex gap-2 mt-2"><button onClick={()=>{ setSelected(l); setDetailTab('overview')}} className="flex-1 h-[36px] rounded-[10px] bg-white text-black font-[700] text-[12px]">View</button><button onClick={()=>toggleWishlist(l.id)} className="w-[36px] h-[36px] rounded-[10px] bg-[#141e32] border border-[#222] flex items-center justify-center"><HeartOff className="w-4 h-4"/></button><button onClick={()=>initiateCheckout(l)} className="flex-1 h-[36px] rounded-[10px] bg-[#ff7a1a] text-black font-[700] text-[12px]">Buy</button></div></div>
            ))}
            {wishlist.length===0 && <div className="col-span-3 p-10 text-center rounded-[16px] border border-dashed border-[#222] text-[13px] text-[#777]">No favorites yet. Tap heart on any vault to save.</div>}
          </div>
        </div>
      )}

      {view==='sell' && (
        <div ref={sellRef} className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6"><div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ff7a1a] text-black text-[11px] font-[800]">SELLER HUB • VALIDATED</div><h2 className="display mt-3 text-[clamp(24px,4vw,36px)] font-[800]">List your Free Fire ID</h2><div className="mt-2 mono text-[12px] text-[#777]">Step {sellStep}/6 • Validation required • Manual payment review • 5% commission • UPI QR</div>
            <div className="mt-4 w-full h-2 rounded-full bg-[#141e32] overflow-hidden"><div className="h-full bg-[#ff7a1a] transition-all" style={{width:`${(sellStep/6)*100}%`}}/></div>
          </div>
          <div className="rounded-[22px] bg-[#0f1729] border border-[#1a2540] p-5 sm:p-6">
            <div className="flex gap-2 mb-6 overflow-auto scrollbar-none">
              {[
                {n:1, t:'Basic'},
                {n:2, t:'Inventory'},
                {n:3, t:'Photos & Videos'},
                {n:4, t:'Pricing'},
                {n:5, t:'Legal'},
                {n:6, t:'Preview'},
              ].map(s=>(
                <div key={s.n} className={`flex items-center gap-2 px-3 h-[36px] rounded-full border text-[12px] font-[600] shrink-0 ${sellStep===s.n?'bg-[#ff7a1a] text-black border-[#ff7a1a]': sellStep> s.n?'bg-[#00d4ff]/15 border-[#00d4ff]/30 text-[#00d4ff]':'bg-[#141e32] border-[#222] text-[#666]'}`}><span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[11px] font-[800]">{sellStep> s.n?<Check className="w-3 h-3"/>:s.n}</span>{s.t}</div>
              ))}
            </div>

            {sellStep===1 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="space-y-1.5 col-span-2"><span className="mono text-[11px] text-[#666]">SELLER CONTACT NUMBER *</span><input type="tel" value={sellForm.sellerPhone} onChange={e=>setSellForm({...sellForm, sellerPhone:e.target.value})} placeholder="Enter a contact number for listing verification" className="w-full h-[44px] rounded-[12px] bg-[#141e32] border border-[#222] px-3 text-[13px]"/><span className="text-[10px] text-[#777]">Used for listing verification and support. Do not publish private credentials or OTPs.</span></label>
                <label className="space-y-1.5"><span className="mono text-[11px] text-[#666]">ACCOUNT LEVEL (OPTIONAL)</span><input type="number" value={sellForm.level} onChange={e=>setSellForm({...sellForm, level:parseInt(e.target.value)||0})} className="w-full h-[44px] rounded-[12px] bg-[#141e32] border border-[#222] px-3 text-[13px]"/></label>
                <label className="space-y-1.5"><span className="mono text-[11px] text-[#666]">PROFILE LIKES (OPTIONAL)</span><input type="number" value={sellForm.likes} onChange={e=>setSellForm({...sellForm, likes:parseInt(e.target.value)||0})} className="w-full h-[44px] rounded-[12px] bg-[#141e32] border border-[#222] px-3 text-[13px]"/></label>
                <label className="space-y-1.5"><span className="mono text-[11px] text-[#666]">CURRENT RANK (OPTIONAL)</span><select value={sellForm.rank} onChange={e=>setSellForm({...sellForm, rank:e.target.value as any})} className="w-full h-[44px] rounded-[12px] bg-[#141e32] border border-[#222] px-3 text-[13px]"><option>Not specified</option><option>Grandmaster</option><option>Heroic</option><option>Master</option><option>Diamond</option></select></label>
                <label className="space-y-1.5"><span className="mono text-[11px] text-[#666]">REGION *</span><select value={sellForm.region} onChange={e=>setSellForm({...sellForm, region:e.target.value as any})} className="w-full h-[44px] rounded-[12px] bg-[#141e32] border border-[#222] px-3 text-[13px]"><option>IND</option><option>BR</option><option>ID</option><option>NA</option><option>MENA</option></select></label>
                <label className="space-y-1.5 col-span-2"><span className="mono text-[11px] text-[#666]">BIO / SELLER NOTE * (min 10 chars)</span><textarea value={sellForm.bio} onChange={e=>setSellForm({...sellForm, bio:e.target.value})} rows={3} placeholder="Season veteran, all emotes, video proof available... min 10 chars" className="w-full rounded-[12px] bg-[#141e32] border border-[#222] p-3 text-[13px] resize-none"/><div className="mono text-[10px] text-[#666]">{sellForm.bio.length}/10 min</div></label>
              </div>
            )}
            {sellStep===2 && (
              <div className="space-y-4">
                <div className="rounded-[14px] bg-[#111a2e] border border-[#263650] p-4">
                  <div className="font-[800] text-[15px]">Showcase the account collection</div>
                  <p className="text-[12px] text-[#888] mt-1">Collection is the main highlight. Add exact item names and quantities where possible. Separate multiple item names with commas. Do not include login details, passwords, OTPs or recovery codes.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    ['EVO GUNS & UPGRADE LEVELS','evo','e.g. MP40 Cobra (Level 7), AK Blue Flame Draco (Level 5)'],
                    ['RARE BUNDLES & OUTFITS','bundles','e.g. Sakura, Hip Hop, Criminal Bundle'],
                    ['OTHER WEAPON SKINS','gunSkins','e.g. M1887 skins, MP40 skins, legendary skins'],
                    ['EMOTES','emotes','e.g. FFWC Throne, Top DJ, rare event emotes'],
                    ['GLOO WALLS & EFFECTS','glooWalls','e.g. Evo Gloo Wall, animated effects'],
                    ['VEHICLE & BOARD SKINS','vehicles','e.g. Sports Car skin, Jeep skin, Skyboard'],
                    ['PETS & PET SKINS','pets','e.g. Dreki, Mr. Waggor, rare pet skins'],
                    ['ELITE / BOOYAH PASSES','passes','e.g. Season name or pass collection'],
                    ['BACKPACKS, PARACHUTES & LOOT','backpacks','e.g. rare backpack, parachute, loot crate'],
                    ['OTHER RARE / LIMITED ITEMS','rareItems','e.g. collaboration items, banners, avatars']
                  ].map(([label,key,placeholder])=>(
                    <label key={key} className="space-y-1.5">
                      <span className="mono text-[10px] text-[#888]">{label}</span>
                      <textarea rows={2} value={(sellForm as any)[key]} onChange={e=>setSellForm({...sellForm,[key]:e.target.value})} placeholder={placeholder} className="w-full rounded-[10px] bg-[#141e32] border border-[#263650] p-3 text-[12px] resize-y"/>
                    </label>
                  ))}
                </div>
                <div className="rounded-[12px] bg-[#101b2b] border border-[#263650] p-3 text-[12px] text-[#b7c7dd]">
                  <strong className="text-white">Accuracy matters:</strong> list only items visible in your screenshots or videos. Administrators may request clearer proof before approving a listing. Rank is optional and is not used as the primary collection highlight.
                </div>
              </div>
            )}
            {sellStep===3 && (
              <div className="space-y-4">
                <div>
                  <div className="font-[700] flex items-center gap-2"><Camera className="w-4 h-4 text-[#ff7a1a]"/>Photos & Videos</div>
                  <p className="text-[12px] text-[#777] mt-1">Add up to 10 clear screenshots or short proof videos. Images max 10 MB each; videos max 50 MB each.</p>
                </div>
                <label className="flex flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-[#555] bg-[#111a2e] p-7 text-center cursor-pointer hover:border-[#ff7a1a]/60 transition">
                  <div className="flex gap-3"><span className="w-11 h-11 rounded-xl bg-[#ff7a1a]/10 text-[#ff7a1a] flex items-center justify-center"><ImageIcon className="w-5 h-5"/></span><span className="w-11 h-11 rounded-xl bg-[#00d4ff]/10 text-[#00d4ff] flex items-center justify-center"><Play className="w-5 h-5"/></span></div>
                  <span className="font-[700] text-[14px]">Choose photos or videos</span>
                  <span className="text-[11px] text-[#777]">JPG, PNG, WEBP, MP4, MOV • up to 10 files</span>
                  <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={e=>handleSellMediaSelect(e.target.files)}/>
                </label>
                {sellMediaPreviews.length>0 && <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {sellMediaPreviews.map((media,i)=><div key={`${media.name}-${i}`} className="relative rounded-xl overflow-hidden border border-[#263650] bg-[#0b0b0b]">
                    {media.type.startsWith('video/') ? <video src={media.url} controls className="w-full aspect-video object-cover"/> : <img src={media.url} alt={media.name} className="w-full aspect-video object-cover"/>}
                    <div className="px-2 py-1.5 text-[10px] text-[#aaa] truncate">{media.name}</div>
                    <button type="button" onClick={()=>setSellMediaFiles(prev=>prev.filter((_,idx)=>idx!==i))} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/80 text-white flex items-center justify-center" aria-label="Remove media"><X className="w-4 h-4"/></button>
                  </div>)}
                </div>}
                <div className="text-[11px] text-[#777]">{sellMediaFiles.length}/10 files selected</div>
              </div>
            )}
            {sellStep===4 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="space-y-1.5"><span className="mono text-[11px] text-[#666]">PRICE ₹ (500-15000) *</span><input type="number" value={sellForm.price} onChange={e=>setSellForm({...sellForm, price:parseInt(e.target.value)||0})} className="w-full h-[44px] rounded-[12px] bg-[#141e32] border border-[#222] px-3 text-[13px]"/></label>
                <label className="space-y-1.5"><span className="mono text-[11px] text-[#666]">DELIVERY TIME *</span><select value={sellForm.delivery} onChange={e=>setSellForm({...sellForm, delivery:e.target.value})} className="w-full h-[44px] rounded-[12px] bg-[#141e32] border border-[#222] px-3 text-[13px]"><option value="instant">Instant (10 min)</option><option value="2h">Within 2 hours</option><option value="12h">Within 12 hours</option><option value="24h">Within 24h</option></select></label>
                <div className="col-span-2 rounded-[12px] bg-[#0c1a22] border border-[#00d4ff]/20 p-3 text-[12px] leading-[1.5]"><div className="font-[700] flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#00d4ff]"/>Indicative Marketplace Fee</div><div className="text-[#777] mt-1">Indicative seller amount after 5% platform fee: ₹{(sellForm.price*0.95).toFixed(0)}. No funds are held by an escrow provider. Price must be 500-15000.</div></div>
                {(sellForm.price < 500 || sellForm.price > 15000) && <div className="col-span-2 p-2 rounded-[10px] bg-[#2a1515] border border-[#5a2222] text-[12px] text-[#ff9a9a]">Price must be 500-15000</div>}
              </div>
            )}
            {sellStep===5 && (
              <div className="space-y-4">
                <div className="font-[700] flex items-center gap-2"><FileText className="w-4 h-4"/>Legal Declaration *</div>
                <div className="rounded-[12px] bg-[#111a2e] border border-[#222] p-4 text-[12px] leading-[1.6] text-[#999]">
                  <p className="flex gap-2"><CheckCircle className="w-4 h-4 text-[#00d4ff] shrink-0"/> I am legal owner and give permission to transfer account with consent.</p>
                  <p className="mt-2 flex gap-2"><CheckCircle className="w-4 h-4 text-[#00d4ff] shrink-0"/> Account not hacked/phished. All info accurate.</p>
                  <p className="mt-2 flex gap-2"><AlertCircle className="w-4 h-4 text-[#ff7a1a] shrink-0"/> Misrepresentation may lead to account suspension and dispute review. Personal UPI QR payments are not independently escrow-protected.</p>
                </div>
                <label className="flex gap-2.5 p-3 rounded-[12px] bg-[#1f1208] border border-[rgba(255,122,26,0.25)] cursor-pointer"><input type="checkbox" checked={sellForm.legal} onChange={e=>setSellForm({...sellForm, legal:e.target.checked})} className="mt-0.5 accent-[#ff7a1a]"/><span className="text-[12px] leading-[1.4]">I accept legal terms, 5% commission, 24h dispute window, and confirm I have legal ownership to sell this ID. * Required to proceed.</span></label>
                {!sellForm.legal && <div className="p-2 rounded-[10px] bg-[#2a1515] border border-[#5a2222] text-[12px] text-[#ff9a9a]">Accept legal declaration to continue</div>}
              </div>
            )}
            {sellStep===6 && (
              <div className="space-y-4">
                <div className="font-[700]">Preview Your Listing</div>
                <div className="rounded-[16px] bg-[#141e32] border border-[#222] p-4 grid sm:grid-cols-2 gap-4">
                  <div><div className="mono text-[10px] text-[#666]">Level / Likes</div><div className="font-[700]">Lv {sellForm.level} • {sellForm.likes.toLocaleString()} likes</div></div>
                  <div><div className="mono text-[10px] text-[#666]">Region / Rank (Optional)</div><div className="font-[700]">{sellForm.region} • {sellForm.rank}</div></div>
                  <div><div className="mono text-[10px] text-[#666]">Price</div><div className="font-[700]">₹{sellForm.price.toLocaleString('en-IN')} (You get ₹{(sellForm.price*0.95).toFixed(0)})</div></div>
                  <div><div className="mono text-[10px] text-[#666]">Photos & Videos</div><div className="font-[700]">{sellMediaFiles.length} media files selected</div></div>
                  <div className="col-span-2"><div className="mono text-[10px] text-[#666]">Collection Highlights</div><div className="text-[13px]">{[...sellForm.evo,...sellForm.bundles,sellForm.gunSkins,sellForm.emotes,sellForm.glooWalls,sellForm.vehicles,sellForm.pets,sellForm.passes,sellForm.backpacks,sellForm.rareItems].filter(Boolean).join(' • ')}</div></div>
                  <div className="col-span-2"><div className="mono text-[10px] text-[#666]">Bio</div><div className="text-[13px]">{sellForm.bio||'Fresh listing'}</div></div>
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button onClick={()=>setSellStep(s=> Math.max(1, s-1))} disabled={sellStep===1} className="h-[42px] px-5 rounded-[12px] bg-[#1a2540] border border-[#222] text-[13px] font-[600] flex items-center gap-2 disabled:opacity-50"><ArrowLeft className="w-4 h-4"/>Back</button>
              {sellStep<6 ? (
                <button onClick={()=>{
                  if(sellStep===1){
                    if(!/^\+?[0-9\s-]{10,15}$/.test(sellForm.sellerPhone.trim())){ pushToast('Enter a valid seller contact number'); return }
                    if(sellForm.level < 0 || sellForm.level > 100){ pushToast('Enter a valid account level'); return }
                    if(sellForm.bio.length < 10){ pushToast('Bio min 10 chars'); return }
                  }
                  if(sellStep===2){
                    const entries = [...sellForm.evo,...sellForm.bundles,sellForm.gunSkins,sellForm.emotes,sellForm.glooWalls,sellForm.vehicles,sellForm.pets,sellForm.passes,sellForm.backpacks,sellForm.rareItems].some(v=>String(v).trim().length>0); if(!entries){ pushToast('Add at least one collection item'); return }
                  }
                  if(sellStep===3){
                    if(sellMediaFiles.length===0){ pushToast('Upload at least one photo or video'); return }
                  }
                  if(sellStep===4){
                    if(sellForm.price < 500 || sellForm.price > 15000){ pushToast('Price 500-15000'); return }
                  }
                  if(sellStep===5){
                    if(!sellForm.legal){ pushToast('Accept legal declaration'); return }
                  }
                  setSellStep(s=> Math.min(6, s+1))
                }} className="h-[42px] px-6 rounded-[12px] bg-white text-black font-[700] text-[13px] flex items-center gap-2">Next <ArrowRight className="w-4 h-4"/></button>
              ) : (
                <button disabled={busy} onClick={handleSellSubmit} className="h-[46px] px-8 rounded-[14px] bg-[#ff7a1a] text-black font-[800] text-[14px] flex items-center gap-2 disabled:opacity-60"><Zap className="w-4 h-4"/>{busy?'Uploading media...':'Submit Listing'}</button>
              )}
            </div>
          </div>
        </div>
      )}

      {view==='admin' && isAdmin && (
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
            <h2 className="display text-[22px] sm:text-[24px] font-[800] flex items-center gap-2"><Shield className="w-5 h-5 text-[#ff7a1a]"/>Admin Panel</h2>
            <div className="flex flex-wrap gap-1.5">
              {[{k:'dash',l:'Dashboard'},{k:'users',l:'Users'},{k:'listings',l:'Listings'},{k:'orders',l:'Orders'},{k:'vouchers',l:'Voucher Codes'},{k:'panels',l:'Panel Links'},{k:'qr',l:'UPI QR'}].map(t=>(
                <button key={t.k} onClick={()=>setAdminTab(t.k as any)} className={`px-3 h-[32px] rounded-full text-[11px] font-[700] border ${adminTab===t.k?'bg-white text-black':'bg-[#111a2e] border-[#222]'}`}>{t.l}</button>
              ))}
            </div>
          </div>
          {adminTab==='dash' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {k:'Total Users', v:users.length, i:Users, c:'from-[#00D4FF] to-[#6B7BFF]'},
                {k:'Active Listings', v:listings.length, i:Package, c:'from-[#00d4ff] to-[#00D4FF]'},
                {k:'Revenue 5%', v:`₹${orders.reduce((s,o)=>s+o.price*0.05,0).toFixed(0)}`, i:DollarSign, c:'from-[#FFB800] to-[#FF2D78]'},
                {k:'Pending Approval', v:listings.filter(l=>!l.approved).length, i:Clock, c:'from-[#FFE600] to-[#FFB800]'},
              ].map(card=>(
                <div key={card.k} className="rounded-[16px] bg-[#0f1729] border border-[#1a2540] p-4"><div className={`w-10 h-10 rounded-[12px] bg-gradient-to-br ${card.c} flex items-center justify-center`}><card.i className="w-5 h-5 text-black"/></div><div className="mt-3 font-[800] text-[22px]">{card.v}</div><div className="mono text-[11px] text-[#666]">{card.k}</div></div>
              ))}
              <div className="sm:col-span-2 lg:col-span-4 rounded-[16px] bg-white border border-[#222] p-4 flex gap-4 items-center">
                <img src={qrCodeAsset} alt="UPI QR" className="w-[100px] h-[100px] object-contain rounded-[12px] bg-white"/>
                <div><div className="font-[800] text-[14px] text-black">Current UPI QR</div><div className="text-[11px] text-[#666] mt-1">All UPI payments go to this QR. Changeable from QR tab.</div></div>
              </div>
            </div>
          )}
          {adminTab==='qr' && (
            <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
              <div className="rounded-[20px] bg-[#0f1729] border border-[#1a2540] p-5">
                <div className="font-[700] text-[14px] flex items-center gap-2"><QrCode className="w-4 h-4"/> Payment QR</div>
                <div className="mt-4 rounded-[18px] bg-white p-4 border-2 border-[#ff7a1a]">
                  <img src={qrCodeAsset} alt="UPI QR" className="w-full h-auto max-h-[460px] object-contain rounded-[12px] bg-white"/>
                  <div className="mt-3 text-center"><div className="font-[800] text-black">Scan the QR to pay</div><div className="mt-1 px-3 py-1 rounded-full bg-[#ff7a1a] text-black text-[11px] font-[800] inline-flex">UPI QR uploaded • Requires verification</div><div className="mono text-[10px] text-[#666] mt-2">Main QR in UPI modal • Timer 10:00 • Enter UTR below QR • Verify → FF-ORD-XXXXXX • Amount + Instructions</div></div>
                </div>
                <div className="mt-3 p-3 rounded-[12px] bg-[#141e32] border border-[#222] text-[12px] text-[#999] leading-[1.5]">QR asset is loaded from the local project assets folder. UTR submissions remain pending until an admin checks the actual bank transaction.</div>
              </div>
              <div className="rounded-[20px] bg-[#0f1729] border border-[#1a2540] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-[700] flex items-center gap-2"><Bot className="w-4 h-4 text-[#00d4ff]"/>Telegram alerts</div>
                  <div className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${tgStatus==='connected'?'bg-[#00d4ff] animate-pulse':'bg-[#555]'}`}/><span className="text-[10px] mono">{tgStatus}</span></div>
                </div>
                <div className="rounded-[14px] bg-[#141e32] border border-[#222] p-4">
                  <div className="font-[700] text-[13px] flex items-center gap-2"><Bot className="w-4 h-4"/>Telegram notifications</div>
                  <p className="mt-2 text-[12px] text-[#888] leading-[1.5]">Telegram notifications are switched off in this browser build. They can be added later through a secure server function. No bot token is stored in this website.</p>
                  <div className="mt-3 text-[11px] mono text-[#666]">Status: NOT CONFIGURED</div>
                </div>
                <div className="rounded-[14px] bg-[#141e32] border border-[#222] p-4">
                  <div className="mono text-[10px] text-[#666]">CURRENT UPI + FLOW</div>
                  <div className="mt-2 space-y-2 text-[13px]">
                                                            <div className="flex justify-between"><span className="text-[#777]">Modal</span><span className="font-[600]">QR + Timer 10:00 + UTR</span></div>
                    <div className="flex justify-between"><span className="text-[#777]">Order ID</span><span className="font-[600] mono">FF-ORD-XXXXXX auto</span></div>
                  </div>
                </div>

              </div>
            </div>
          )}
          {adminTab==='users' && (
            <div className="rounded-[16px] bg-[#0f1729] border border-[#1a2540] p-4"><div className="font-[700] mb-3">User Management</div><div className="grid gap-2">{users.map(u=>(
              <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-[12px] bg-[#141e32] border border-[#222] gap-2"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-[#ff7a1a] text-black font-[800] flex items-center justify-center text-[12px]">{u.avatar}</div><div><div className="font-[600] text-[13px]">{u.name} • {u.email}</div><div className="text-[11px] text-[#777]">{u.role} • {u.sales} sales • {u.banned?'BANNED':''}</div></div></div><div className="flex gap-1.5"><button onClick={async()=>{ const upd={...u, banned:!u.banned}; setUsers(prev=>prev.map(x=> x.id===u.id? upd:x)); try{ const recs=await apiList('users',100); const f=recs.find(r=>r.value.email===u.email); if(f) await apiReplace('users',f.id,upd); }catch{} pushToast('User status updated') }} className={`h-[32px] px-3 rounded-[8px] text-[11px] font-[700] border ${u.banned?'bg-[#00d4ff]/15 border-[#00d4ff]/30 text-[#00d4ff]':'bg-[#2a1515] border-[#5a2222] text-[#ff9a9a]'}`}>{u.banned?'Unban':'Ban'}</button><button onClick={async()=>{ const upd={...u, verified:!u.verified}; setUsers(prev=>prev.map(x=>x.email===u.email?upd:x)); try{ const recs=await apiList('users',100); const f=recs.find(r=>r.value.email===u.email); if(f) await apiReplace('users',f.id,upd); }catch{} pushToast('Verified toggled')}} className="h-[32px] px-3 rounded-[8px] bg-[#1a2540] border border-[#222] text-[11px]">{u.verified?'Unverify':'Verify'}</button></div></div>
            ))}</div></div>
          )}
          {adminTab==='listings' && (
            <div className="rounded-[16px] bg-[#0f1729] border border-[#1a2540] p-4"><div className="font-[700] mb-3">Listings Approval</div><div className="grid gap-2">{listings.map(l=>(
              <div key={l.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-[12px] bg-[#141e32] border border-[#222] gap-2"><div><div className="font-[600] text-[13px]">{l.id} • {l.bundles?.[0] || l.evoGuns?.[0] || 'Collection listing'} • ₹{l.price} • {l.seller} • {l.approved?'Live':'Pending'}</div><div className="text-[11px] text-[#777]">{l.evoGuns.slice(0,2).join(', ')}</div></div><div className="flex gap-1.5"><button onClick={async()=>{ const upd={...l, approved:true, verified:true}; setListings(prev=> prev.map(x=> x.id===l.id? upd:x)); try{ const recs=await apiList('listings',100); const f=recs.find(r=>r.value.id===l.id); if(f) await apiReplace('listings',f.id,upd); else await apiCreate('listings',upd, `listing-${l.id}`)}catch{} pushToast('Approved')}} className="h-[32px] px-3 rounded-[8px] bg-[#00d4ff]/15 border border-[#00d4ff]/30 text-[#00d4ff] text-[11px]">Approve</button><button onClick={async()=>{ setListings(prev=>prev.filter(x=>x.id!==l.id)); try{ const recs=await apiList('listings',100); const f=recs.find(r=>r.value.id===l.id); if(f) await apiDelete('listings',f.id)}catch{} pushToast('Deleted')}} className="h-[32px] px-3 rounded-[8px] bg-[#2a1515] border border-[#5a2222] text-[#ff9a9a] text-[11px]">Delete</button></div></div>
            ))}</div></div>
          )}
          {adminTab==='panels' && (
            <ApkStore adminOnly user={currentUser?{id:currentUser.id,email:currentUser.email,name:currentUser.name}:null} isAdmin={!!isAdmin} toast={pushToast} qr={qrCodeAsset} upiId={UPI_ID} upiName={UPI_NAME} onLogin={()=>setShowAuth('login')}/>
          )}
          {adminTab==='vouchers' && (
            <div className="grid xl:grid-cols-[minmax(300px,.8fr)_minmax(0,1.2fr)] gap-4">
              <section className="rounded-[18px] bg-[#0f1729] border border-[#263650] p-4 sm:p-5">
                <div className="flex items-center gap-2 text-[15px] font-[800]"><KeyRound className="w-5 h-5 text-[#ff7a1a]"/> Add Voucher Code</div>
                <p className="mt-2 text-[12px] leading-5 text-[#9aa9bd]">Only the signed-in administrator can add codes. Enter the voucher balance and your selling price separately. Use only voucher products whose issuer permits resale.</p>
                <div className="mt-4 space-y-3">
                  <label className="block text-[11px] text-[#9aa9bd]">Voucher Provider
                    <select value={voucherForm.provider} onChange={e=>setVoucherForm(v=>({...v,provider:e.target.value}))} className="mt-1 w-full h-11 rounded-[10px] bg-[#0b1020] border border-[#344660] px-3 text-[13px]">
                      <option>Voucher</option><option>Gaming Voucher (issuer-approved)</option><option>Retail Voucher (issuer-approved)</option><option>Digital Voucher (issuer-approved)</option>
                    </select>
                  </label>
                  <label className="block text-[11px] text-[#9aa9bd]">Voucher Name
                    <input value={voucherForm.title} onChange={e=>setVoucherForm(v=>({...v,title:e.target.value}))} placeholder="e.g. Gaming Wallet Voucher" maxLength={100} className="mt-1 w-full h-11 rounded-[10px] bg-[#0b1020] border border-[#344660] px-3 text-[13px]"/>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-[11px] text-[#9aa9bd]">Redeem Code Balance (₹)
                      <input type="number" min="1" value={voucherForm.balance} onChange={e=>setVoucherForm(v=>({...v,balance:e.target.value}))} placeholder="5000" className="mt-1 w-full h-11 rounded-[10px] bg-[#0b1020] border border-[#344660] px-3 text-[13px]"/>
                    </label>
                    <label className="block text-[11px] text-[#9aa9bd]">Selling Price (₹) — jo buyer dega
                      <input type="number" min="1" value={voucherForm.price} onChange={e=>setVoucherForm(v=>({...v,price:e.target.value}))} placeholder="1000" className="mt-1 w-full h-11 rounded-[10px] bg-[#0b1020] border border-[#344660] px-3 text-[13px]"/>
                    </label>
                  </div>
                  <label className="block text-[11px] text-[#9aa9bd]">Redeem Code (private)
                    <input type="password" autoComplete="off" value={voucherForm.code} onChange={e=>setVoucherForm(v=>({...v,code:e.target.value}))} placeholder="Enter the unused voucher code" className="mt-1 w-full h-11 rounded-[10px] bg-[#0b1020] border border-[#344660] px-3 text-[13px]"/>
                  </label>
                  <label className="flex items-start gap-2 text-[11px] text-[#9aa9bd]"><input type="checkbox" id="voucher-issuer-confirm" className="mt-0.5 accent-[#ff7a1a]"/> I have confirmed that the issuer permits commercial resale of this voucher.</label>
                  <button disabled={voucherBusy || !isAdmin} onClick={()=>{
                    const el=document.getElementById('voucher-issuer-confirm') as HTMLInputElement|null
                    if(!el?.checked){pushToast('Confirm issuer resale permission first');return}
                    addVoucherInventory()
                  }} className="w-full h-11 rounded-[11px] bg-[#ff7a1a] text-[#101827] font-[800] text-[13px] disabled:opacity-50">{voucherBusy?'Saving...':'Add Code to Inventory'}</button>
                </div>
                <div className="mt-4 rounded-[12px] bg-[#1b2940] border border-[#344660] p-3 text-[11px] leading-5 text-[#b7c6d9]">Security: voucher codes are stored in a private table. Customers cannot read this inventory directly. Only voucher providers that permit resale for value may be added. The database blocks known restricted gift-card providers.</div>
              </section>
              <section className="rounded-[18px] bg-[#0f1729] border border-[#263650] p-4 sm:p-5 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><div className="font-[800] text-[15px]">Private Code Inventory</div><div className="text-[11px] text-[#9aa9bd] mt-1">{voucherItems.length} stored codes • Admin access only</div></div>
                  <button onClick={()=>setShowVoucherCodes(v=>!v)} className="px-3 h-9 rounded-[9px] border border-[#344660] text-[11px]">{showVoucherCodes?'Hide codes':'Reveal codes'}</button>
                </div>
                <div className="mt-4 space-y-2">
                  {voucherItems.length===0 && <div className="rounded-[12px] border border-dashed border-[#344660] p-8 text-center text-[12px] text-[#9aa9bd]">No voucher codes uploaded yet.</div>}
                  {voucherItems.map(item=>(
                    <div key={item.id} className="rounded-[12px] bg-[#0b1020] border border-[#263650] p-3">
                      <div className="flex flex-wrap justify-between gap-2">
                        <div className="min-w-0"><div className="font-[700] text-[13px] break-words">{item.title}</div><div className="text-[10px] text-[#9aa9bd] mt-1">{item.provider} • Balance ₹{Number(item.balance).toLocaleString('en-IN')} • Price ₹{Number(item.price).toLocaleString('en-IN')}</div></div>
                        <span className={`h-fit px-2 py-1 rounded-full text-[10px] font-[700] ${item.status==='available'?'bg-[#72c6a0]/15 text-[#72c6a0]':item.status==='sold'?'bg-[#ff7a1a]/15 text-[#ff7a1a]':'bg-[#9aa9bd]/15 text-[#9aa9bd]'}`}>{item.status.toUpperCase()}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <code className="text-[11px] break-all text-[#ff7a1a]">{showVoucherCodes?item.voucher_code:'••••••••••••••••'}</code>
                        <div className="ml-auto flex flex-wrap gap-1.5">
                          {item.status!=='sold' && <button onClick={()=>updateVoucherStatus(item,item.status==='available'?'disabled':'available')} className="px-2.5 h-7 rounded-[7px] border border-[#344660] text-[10px]">{item.status==='available'?'Disable':'Enable'}</button>}
                          {item.status==='available' && <button onClick={()=>updateVoucherStatus(item,'sold')} className="px-2.5 h-7 rounded-[7px] bg-[#ff7a1a]/15 text-[#ff7a1a] text-[10px]">Mark Sold</button>}
                          <button onClick={()=>deleteVoucher(item)} className="px-2.5 h-7 rounded-[7px] bg-[#5a2222]/30 text-[#ff9a9a] text-[10px]">Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
          {adminTab==='orders' && (
            <div className="rounded-[16px] bg-[#0f1729] border border-[#1a2540] p-4"><div className="font-[700] mb-3">Payment Verification Control • UPI Orders</div><div className="space-y-2">{orders.map(o=><div key={o.id} className="p-3 rounded-[12px] bg-[#141e32] border border-[#222] flex flex-col sm:flex-row justify-between gap-2 text-[12px]"><span>{o.id} • ₹{o.price} • {o.status} • {o.paymentMethod} {o.transactionId && `• UTR ${o.transactionId}`} • {o.listingId}</span><div className="flex gap-1.5">{o.status==='pending_verification' && <button onClick={()=>handleOrderStatusUpdate(o.id,'escrow')} className="h-[28px] px-2 rounded-[6px] bg-[#00d4ff]/15 text-[#00d4ff] text-[10px]">Verify Bank Credit → Admin Hold</button>}<button onClick={()=>handleOrderStatusUpdate(o.id,'completed')} className="h-[28px] px-2 rounded-[6px] bg-[#00d4ff]/15 text-[#00d4ff] text-[10px]">Complete</button><button onClick={()=>handleOrderStatusUpdate(o.id,'disputed')} className="h-[28px] px-2 rounded-[6px] bg-[#2a1515] text-[#ff9a9a] text-[10px]">Dispute</button></div></div>)}</div></div>
          )}
        </div>
      )}

      <footer className="border-t border-[#111a2e] bg-[#050507] mt-10">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-10 grid md:grid-cols-[1.2fr_0.8fr] gap-8">
          <div>
            <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-[9px] bg-[#ff7a1a] flex items-center justify-center"><Flame className="w-4 h-4 text-black"/></div><span className="display font-[800]">RAM FF STORE</span><span className="mono text-[10px] text-[#555] ml-2">© 2026</span></div>
            <div className="mt-3 text-[13px] font-[700] text-[#ff7a1a]">Trade smart. Play bigger. Verified deals, zero stress.</div>
            <div className="mt-4 text-[12px] leading-[1.6] text-[#777] max-w-[640px]">UPI payment references are checked manually. A UTR submission is not proof of payment and this personal UPI setup is not a regulated escrow service. Never share OTPs or passwords.</div>
            <div className="mt-4 flex gap-2 flex-wrap"><span className="px-2.5 py-1 rounded-full bg-white text-black border text-[11px] font-[700] flex items-center gap-1"><img src={qrCodeAsset} alt="UPI QR" className="w-4 h-4 object-contain"/> UPI QR payments</span><span className="px-2.5 py-1 rounded-full bg-[#141e32] border border-[#222] text-[11px]">Admin review required</span><span className="px-2.5 py-1 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[11px] text-[#00d4ff]">UTR Verification</span></div>
          </div>
          <div className="grid grid-cols-2 gap-6 text-[12px]">
            <div><div className="font-[700] mb-3">Quick Links</div><div className="space-y-2 text-[#777]"><button onClick={()=>setView('home')} className="block hover:text-white">Marketplace</button><button onClick={()=>setView('sell')} className="block hover:text-white">Sell ID</button><button onClick={()=>setView('vouchers')} className="block hover:text-white">Redeem Voucher</button><button onClick={()=>setView('apk')} className="block hover:text-white">Panel Store</button><button onClick={()=>setView('cart')} className="block hover:text-white">Cart</button><button onClick={()=>setView('wishlist')} className="block hover:text-white">Wishlist</button><button onClick={()=>document.getElementById('help-centre')?.scrollIntoView({behavior:'smooth'})} className="block hover:text-white">Help Centre / FAQs</button></div></div>
            <div><div className="font-[700] mb-3">Support</div><div className="space-y-2 text-[#777]"><div>UPI QR payments</div><div>Pay → UTR → Bank verification</div><button onClick={()=>setLegalDoc('terms')} className="block hover:text-white">Terms of Service</button><button onClick={()=>setLegalDoc('privacy')} className="block hover:text-white">Privacy Policy</button><button onClick={()=>setLegalDoc('refund')} className="block hover:text-white">Refund &amp; Dispute</button><div>Manual payment verification</div></div></div>
          </div>
        </div>
      </footer>

      {legalDoc && <LegalModal doc={legalDoc} onClose={()=>setLegalDoc(null)}/>}
      {selected && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-[6px]" onClick={()=>setSelected(null)}/>
          <div className="relative w-full sm:max-w-[980px] max-h-[92vh] sm:max-h-[86vh] rounded-t-[24px] sm:rounded-[24px] bg-[#0f1729] border border-[#1a2540] overflow-hidden flex flex-col">
            <div className="h-[56px] border-b border-[#1a2540] flex items-center justify-between px-5 shrink-0">
              <div className="flex items-center gap-3"><span className="mono text-[11px] px-2.5 py-1 rounded-full bg-[#141e32] border border-[#222]">{selected.id}</span><span className="text-[13px] font-[700]">{selected.bundles?.[0] || selected.evoGuns?.[0] || 'Collection listing'} • Lv {selected.level || '—'}</span>{selected.approved && <BadgeCheck className="w-4 h-4 text-[#00d4ff]"/>}{selected.instant && <span className="px-2 py-1 rounded-full bg-[#00d4ff] text-black text-[10px] font-[800]">INSTANT</span>}</div>
              <button onClick={()=>setSelected(null)} className="w-8 h-8 rounded-[10px] bg-[#141e32] border border-[#222] flex items-center justify-center"><X className="w-4 h-4"/></button>
            </div>
            <div className="flex gap-2 px-5 py-3 border-b border-[#1a2540] overflow-auto scrollbar-none">
              {[
                {k:'overview', l:'Overview'},
                {k:'screenshots', l:`Photos & Videos • ${selected.images}`},
                {k:'stats', l:'Stats'},
                {k:'seller', l:'Seller'},
              ].map(t=>(
                <button key={t.k} onClick={()=>setDetailTab(t.k as any)} className={`px-4 h-[34px] rounded-full text-[12px] font-[600] border whitespace-nowrap ${detailTab===t.k?'bg-white text-black border-white':'bg-[#141e32] border-[#222] text-[#777]'}`}>{t.l}</button>
              ))}
            </div>
            <div className="overflow-auto p-5 grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
              <div className="space-y-4">
                {detailTab==='overview' && (
                  <>
                    <div className="rounded-[18px] bg-gradient-to-br from-[#1f1208] to-[#111] border border-[#222] p-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-[12px] bg-black/40 border border-white/5 p-3"><div className="mono text-[10px] text-[#666]">LEVEL</div><div className="text-[18px] font-[800]">{selected.level}</div></div>
                        <div className="rounded-[12px] bg-black/40 border border-white/5 p-3"><div className="mono text-[10px] text-[#666]">LIKES</div><div className="text-[18px] font-[800]">{(selected.likes/1000).toFixed(1)}K</div></div>
                        <div className="rounded-[12px] bg-black/40 border border-white/5 p-3"><div className="mono text-[10px] text-[#666]">VAULT</div><div className="text-[18px] font-[800]">{selected.vault}</div></div>
                      </div>
                      <div className="mt-4 space-y-2"><div className="mono text-[10px] text-[#666]">EVO GUNS WITH LEVELS</div><div className="flex flex-wrap gap-2">{selected.evoGuns.map(g=><span key={g} className="px-2.5 py-1.5 rounded-[10px] bg-[#ff7a1a]/10 border border-[#ff7a1a]/20 text-[12px]">{g}</span>)}</div></div>
                      <div className="mt-4 space-y-2"><div className="mono text-[10px] text-[#666]">BUNDLES & OUTFITS</div><div className="flex flex-wrap gap-2">{selected.bundles.map(b=><span key={b} className="px-2.5 py-1.5 rounded-[10px] bg-white/5 border border-white/10 text-[12px]">{b}</span>)}{(selected.rareItems||[]).map(b=><span key={b} className="px-2.5 py-1.5 rounded-[10px] bg-white/5 border border-white/10 text-[12px]">{b}</span>)}</div></div>
                      {([['OTHER WEAPON SKINS',selected.gunSkins],['EMOTES',selected.emotes],['GLOO WALLS & EFFECTS',selected.glooWalls],['VEHICLE & BOARD SKINS',selected.vehicles],['PETS & PET SKINS',selected.pets],['ELITE / BOOYAH PASSES',selected.passes],['BACKPACKS & PARACHUTES',selected.backpacks]] as [string,string[]|undefined][]).filter(([,items])=>items?.length).map(([label,items])=><div key={label} className="mt-4 space-y-2"><div className="mono text-[10px] text-[#888]">{label}</div><div className="flex flex-wrap gap-2">{items!.map(item=><span key={item} className="px-2.5 py-1.5 rounded-[10px] bg-[#182338] border border-[#2b3c57] text-[12px]">{item}</span>)}</div></div>)}
                      <div className="mt-4 space-y-2"><div className="mono text-[10px] text-[#666]">CHARACTERS</div><div className="flex flex-wrap gap-2">{selected.characters.map(c=><span key={c} className="px-2 py-1 rounded-[8px] bg-[#141e32] border border-[#222] text-[11px]">{c}</span>)}</div></div>
                    </div>
                    <div className="rounded-[16px] bg-[#141e32] border border-[#222] p-4"><div className="mono text-[10px] text-[#666]">SELLER NOTE</div><div className="mt-2 text-[13px] leading-[1.5]">{selected.bio}</div></div>
                  </>
                )}
                {detailTab==='screenshots' && (
                  <div className="space-y-3">
                    <div className="rounded-[16px] bg-[#141e32] border border-[#222] p-3">
                      <div className="aspect-[16/10] rounded-[12px] bg-[#0b1020] border border-[#222] flex items-center justify-center"><ImageIcon className="w-8 h-8 text-[#333]"/></div>
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">{selected.mediaUrls?.length ? selected.mediaUrls.map((path,i)=><div key={path} className="rounded-[10px] overflow-hidden bg-[#111a2e] border border-[#222]"><ListingMediaItem path={path} mediaType={selected.mediaTypes?.[i]} controls className="w-full aspect-video object-cover"/></div>) : Array.from({length:Math.min(selected.images||4,8)}).map((_,i)=><div key={i} className="aspect-square rounded-[8px] bg-[#111a2e] border border-[#222] flex items-center justify-center"><Camera className="w-4 h-4 text-[#444]"/></div>)}</div>
                    </div>
                    {selected.hasVideo && <div className="rounded-[12px] bg-[#00d4ff]/10 border border-[#00d4ff]/20 p-3 flex items-center gap-2 text-[12px]"><Play className="w-4 h-4 text-[#00d4ff]"/> Video proof available - ask seller in chat</div>}
                  </div>
                )}
                {detailTab==='stats' && (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {k:'Rank (Optional)', v:selected.rank==='Not specified'?'Not specified':selected.rank},
                      {k:'Likes', v:selected.likes.toLocaleString()},
                      {k:'Vault Items', v:selected.vault},
                      {k:'Evo Count', v:selected.evoGuns.length},
                      {k:'Bundles & Outfits', v:selected.bundles.length},
                      {k:'Emotes', v:(selected.emotes||[]).length},
                      {k:'Other Collection Items', v:(selected.gunSkins||[]).length+(selected.vehicles||[]).length+(selected.glooWalls||[]).length+(selected.pets||[]).length+(selected.passes||[]).length+(selected.backpacks||[]).length+(selected.rareItems||[]).length},
                      {k:'Views', v:selected.views||0},
                    ].map(s=>(
                      <div key={s.k} className="rounded-[12px] bg-[#141e32] border border-[#222] p-3"><div className="mono text-[10px] text-[#666]">{s.k}</div><div className="text-[18px] font-[800] mt-1">{s.v}</div></div>
                    ))}
                  </div>
                )}
                {detailTab==='seller' && (
                  <div className="space-y-3">
                    <div className="rounded-[16px] bg-[#141e32] border border-[#222] p-4 flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-[#ff7a1a] text-black font-[800] flex items-center justify-center text-[16px]">{selected.seller[0]}</div><div><div className="font-[700] flex items-center gap-2">{selected.seller}{selected.approved && <Verified className="w-4 h-4 text-[#00d4ff]"/>}</div><div className="flex items-center gap-2 text-[12px] text-[#777]"><Star className="w-3 h-3 fill-[#ff7a1a] text-[#ff7a1a]"/>{selected.rating} • {selected.sales} sales • {selected.region}</div></div></div>
                    <div className="rounded-[12px] bg-[#0c1a22] border border-[#00d4ff]/20 p-3 text-[12px]"><div className="font-[700] flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#00d4ff]"/>Admin-reviewed listing • Payment review • UPI QR</div><div className="text-[#777] mt-1">Seller details are user-submitted and require independent checks • Manual payment review • UPI QR</div></div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="rounded-[18px] bg-[#101010] border border-[#1a2540] p-4">
                  <div className="flex items-center justify-between"><span className="font-[700]">Buy Now • UPI payment</span><span className="text-[22px] font-[800]">₹{selected.price.toLocaleString('en-IN')}</span></div>
                  <div className="mt-3 rounded-[12px] bg-white p-2 flex gap-2 items-center border"><img src={qrCodeAsset} alt="UPI QR" className="w-[44px] h-[44px] object-contain rounded-[6px]"/><div><div className="text-[11px] font-[800] text-black">Scan the QR to pay</div></div></div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-[11px]"><Lock className="w-3.5 h-3.5 text-[#00d4ff]"/> UPI • Admin verification • UTR tracking</div>
                    <div className="flex items-center gap-2 text-[11px]"><ShieldCheck className="w-3.5 h-3.5 text-[#00d4ff]"/> Seller profile: {selected.seller}</div>
                    <div className="flex items-center gap-2 text-[11px]"><Clock3 className="w-3.5 h-3.5 text-[#ff7a1a]"/> {selected.instant?'Delivery after admin payment verification':'Delivery after admin payment verification'}</div>
                  </div>
                  <button onClick={()=>{ setSelected(null); initiateCheckout(selected)}} className="mt-4 w-full h-[46px] rounded-[12px] bg-[#ff7a1a] text-black font-[800] flex items-center justify-center gap-2 hover:brightness-110"><QrCode className="w-4 h-4"/>Pay by UPI QR • ₹{selected.price.toLocaleString('en-IN')}</button>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button onClick={()=>toggleCart(selected.id)} className="h-[42px] rounded-[12px] bg-[#1a2540] border border-[#222] font-[600] flex items-center justify-center gap-2 text-[13px]"><ShoppingCart className="w-4 h-4"/> {cart.includes(selected.id)?'In Cart ✓':'Cart'}</button>
                    <button onClick={()=>openChat(selected)} className="h-[42px] rounded-[12px] bg-[#1a2540] border border-[#222] font-[600] flex items-center justify-center gap-2 text-[13px]"><MessageCircle className="w-4 h-4"/>Chat</button>
                  </div>
                </div>
                <div className="rounded-[14px] bg-[#141e32] border border-[#222] p-3">
                  <div className="font-[700] text-[12px] mb-2">Make Offer</div>
                  <div className="flex gap-2"><input type="number" value={offerAmount||''} onChange={e=>setOfferAmount(parseInt(e.target.value)||0)} placeholder="₹ Offer" className="flex-1 h-[40px] rounded-[10px] bg-[#0f1729] border border-[#222] px-3 text-[13px]"/><button onClick={()=>{ if(!offerAmount) return; openChat(selected); setTimeout(()=>sendOffer(),100)}} className="h-[40px] px-4 rounded-[10px] bg-white text-black font-[700] text-[12px]">Send</button></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAuth && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={()=>{setShowAuth(null); setLoginError(null)}}/>
          <div className="relative w-full max-w-[440px] max-h-[92dvh] overflow-y-auto rounded-[20px] bg-[#0b1020] border border-[#222] p-0 shadow-[0_20px_80px_rgba(0,0,0,0.8)]">
            <div className="px-7 pt-7 pb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[9px] bg-[#ff7a1a] flex items-center justify-center"><Flame className="w-4 h-4 text-black"/></div>
                  <span className="font-[800] text-[15px] tracking-tight">RAM FF STORE</span>
                </div>
                <button onClick={()=>{setShowAuth(null); setLoginError(null)}} className="w-8 h-8 rounded-full bg-[#141e32] border border-[#222] flex items-center justify-center hover:bg-[#222]"><X className="w-4 h-4"/></button>
              </div>
              <h2 className="mt-6 text-[22px] font-[700] tracking-tight">{showAuth==='login' ? 'Welcome back' : 'Create account'}</h2>
              <p className="mt-1 text-[13px] text-[#777]">{showAuth==='login' ? `Sign in to your account` : 'Create your marketplace account'}</p>
            </div>

            <div className="px-7 pb-7">
              {loginError && (
                <div className="mb-4 px-3 py-2.5 rounded-[10px] bg-[#1f1212] border border-[#3a1a1a] text-[12px] text-[#ff6b6b] flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>{loginError}</div>
              )}

              <div className="space-y-3.5">
                <button onClick={handleGoogleAuth} className="w-full h-[46px] rounded-[12px] bg-white text-[#111a2e] border border-[#dedede] font-[700] text-[14px] hover:bg-[#f4f4f4] transition flex items-center justify-center gap-3">
                  <span className="font-[800] text-[18px]">G</span> Continue with Google
                </button>
                <div className="flex items-center gap-3 py-1"><div className="h-px flex-1 bg-[#263650]"/><span className="text-[10px] text-[#666] tracking-widest">OR USE EMAIL</span><div className="h-px flex-1 bg-[#263650]"/></div>
                {showAuth==='signup' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-[600] text-[#999] tracking-wide">FULL NAME</label>
                      <input value={authForm.name} onChange={e=>setAuthForm({...authForm, name:e.target.value})} placeholder="Your gaming name" className="w-full h-[44px] rounded-[12px] bg-[#111a2e] border border-[#262626] px-4 text-[14px] outline-none focus:border-[#333] focus:bg-[#141e32] transition placeholder:text-[#555]"/>
                    </div>
                  </>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-[600] text-[#999] tracking-wide">EMAIL</label>
                  <input value={authForm.email} onChange={e=>setAuthForm({...authForm, email:e.target.value})} placeholder="you@example.com" type="email" className="w-full h-[44px] rounded-[12px] bg-[#111a2e] border border-[#262626] px-4 text-[14px] outline-none focus:border-[#333] focus:bg-[#141e32] transition placeholder:text-[#555]"/>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-[600] text-[#999] tracking-wide">PASSWORD</label>
                  <input type="password" value={authForm.password} onChange={e=>setAuthForm({...authForm, password:e.target.value})} placeholder="••••••••" className="w-full h-[44px] rounded-[12px] bg-[#111a2e] border border-[#262626] px-4 text-[14px] outline-none focus:border-[#333] focus:bg-[#141e32] transition placeholder:text-[#555]"/>
                </div>

                {showAuth==='login' && <button onClick={async()=>{ if(!authForm.email){ setLoginError('Please enter your email first'); return } const {error}=await requireSupabase().auth.resetPasswordForEmail(authForm.email.trim(),{redirectTo:window.location.origin}); if(error) setLoginError(error.message); else pushToast('Password reset link sent to your email') }} className="text-[12px] text-[#9aa9bd] hover:text-white hover:underline self-start">Forgot password?</button>}
                <button onClick={()=> showAuth==='login'?handleLogin():handleSignup()} className="w-full h-[46px] rounded-[12px] bg-[#ff7a1a] text-black font-[700] text-[14px] hover:brightness-110 transition mt-2"> {showAuth==='login'?'Sign in':'Create account'} </button>

                <div className="text-center pt-4 text-[13px] text-[#666]">{showAuth==='login'?"Don't have an account?":"Already have an account?"} <button onClick={()=>{setShowAuth(showAuth==='login'?'signup':'login'); setLoginError(null)}} className="text-white font-[600] hover:underline">{showAuth==='login'?'Sign up':'Sign in'}</button></div>

                <div className="pt-3 text-center mono text-[10px] text-[#444]">UPI QR • Manual review • Admin review → Delivery</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdminPortal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={()=>setShowAdminPortal(false)}/>
          <div className="relative w-full max-w-[380px] rounded-[20px] bg-[#080c18] border border-[#1f1f1f] p-0 overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.9)]">
            <div className="px-7 pt-7 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-[10px] bg-[#141e32] border border-[#222] flex items-center justify-center"><Shield className="w-4 h-4 text-[#666]"/></div>
                  <div><div className="font-[700] text-[13px] tracking-widest text-[#666]">ADMIN PORTAL</div><div className="mono text-[10px] text-[#333]">SECURE ACCESS ONLY</div></div>
                </div>
                <button onClick={()=>setShowAdminPortal(false)} className="w-8 h-8 rounded-full bg-[#141414] border border-[#222] flex items-center justify-center hover:bg-[#141e32]"><X className="w-4 h-4 text-[#555]"/></button>
              </div>
            </div>
            <div className="px-7 pb-7 pt-4">
              <div className="space-y-3.5">
                <div className="space-y-1.5"><label className="text-[10px] font-[600] text-[#555] tracking-widest">ADMIN EMAIL</label><input value={adminForm.user} onChange={e=>setAdminForm({...adminForm, user:e.target.value})} placeholder="admin@example.com" className="w-full h-[44px] rounded-[12px] bg-[#111] border border-[#222] px-4 text-[14px] outline-none focus:border-[#333] placeholder:text-[#333] mono"/></div>
                <div className="space-y-1.5"><label className="text-[10px] font-[600] text-[#555] tracking-widest">PASSWORD</label><input type="password" value={adminForm.pass} onChange={e=>setAdminForm({...adminForm, pass:e.target.value})} placeholder="••••••••" className="w-full h-[44px] rounded-[12px] bg-[#111] border border-[#222] px-4 text-[14px] outline-none focus:border-[#333] placeholder:text-[#333]"/></div>
                <button onClick={handleAdminLogin} className="w-full h-[46px] rounded-[12px] bg-[#141e32] hover:bg-[#222] border border-[#222] text-white font-[600] text-[14px] flex items-center justify-center gap-2 transition mt-2"><Lock className="w-4 h-4"/>Authenticate</button>
                <div className="pt-3 text-center mono text-[10px] text-[#263650] leading-[1.4]">Secure admin access<br/>UPI payment reference configured</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-[90px] lg:bottom-6 left-1/2 -translate-x-1/2 z-[90] px-4 py-3 rounded-[14px] bg-[#ff7a1a] text-black font-[700] text-[13px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex items-center gap-2 max-w-[90vw]"><Zap className="w-4 h-4 shrink-0"/><span className="truncate">{toast}</span></div>
      )}

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[#141e32] bg-[rgba(7,7,9,0.96)] backdrop-blur-2xl">
        <div className="grid grid-cols-7 h-[68px]">
          <button onClick={()=>setView('home')} className={`flex flex-col items-center justify-center gap-1 ${view==='home'?'text-[#ff7a1a]':'text-[#666]'}`}><Flame className="w-5 h-5"/><span className="mono text-[8px]">HOME</span></button>
          <button onClick={()=>setView('vouchers')} className={`flex flex-col items-center justify-center gap-1 ${view==='vouchers'?'text-[#ff7a1a]':'text-[#666]'}`}><Gift className="w-5 h-5"/><span className="mono text-[8px]">REDEEM</span></button>
          <button onClick={()=>setView('apk')} className={`flex flex-col items-center justify-center gap-1 ${view==='apk'?'text-[#00d4ff]':'text-[#666]'}`}><Smartphone className="w-5 h-5"/><span className="mono text-[8px]">PANEL</span></button>
          <button onClick={()=>setShowFilters(true)} className="flex flex-col items-center justify-center gap-1 text-[#666]"><Search className="w-5 h-5"/><span className="mono text-[8px]">SEARCH</span></button>
          <button onClick={()=>setView('sell')} className="flex flex-col items-center justify-center gap-1"><div className="w-12 h-12 rounded-full bg-[#ff7a1a] text-black flex items-center justify-center -mt-3 shadow-[0_0_20px_rgba(255,122,26,0.5)]"><Plus className="w-6 h-6"/></div><span className="mono text-[8px] text-[#666]">SELL</span></button>
          <button onClick={()=>{ if(!currentUser){ setShowAuth('login'); return } setView('inbox')}} className={`flex flex-col items-center justify-center gap-1 relative ${view==='inbox'?'text-[#ff7a1a]':'text-[#666]'}`}><MessageCircle className="w-5 h-5"/><span className="mono text-[8px]">CHAT</span>{unreadChats>0 && <span className="absolute top-2 right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-[#ff7a1a] text-black text-[9px] font-[800] flex items-center justify-center">{unreadChats}</span>}</button>
          <button onClick={()=>{ if(!currentUser){ setShowAuth('login'); return } setView('cart')}} className={`flex flex-col items-center justify-center gap-1 relative ${view==='cart'?'text-[#ff7a1a]':'text-[#666]'}`}><ShoppingCart className="w-5 h-5"/><span className="mono text-[8px]">CART</span>{cart.length>0 && <span className="absolute top-2 right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-[#ff7a1a] text-black text-[9px] font-[800] flex items-center justify-center">{cart.length}</span>}</button>
          <button onClick={()=>{ if(!currentUser){ setShowAuth('login'); return } setView('profile')}} className={`flex flex-col items-center justify-center gap-1 ${['profile','settings','orders','wishlist'].includes(view)?'text-[#ff7a1a]':'text-[#666]'}`}><User className="w-5 h-5"/><span className="mono text-[8px]">PROFILE</span></button>
        </div>
      </div>
      <div className="lg:hidden h-[68px]"/>
    </div>
  )
}
