import { createClient as createSupabaseClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
// Somos Software CRM B10.3 — Centro Ejecutivo + Inteligencia Comercial + Social Intelligence + Attribution
// Basado en B9.4.9. Nunca usar service_role/secret key en frontend.
const localKey = 'somos_leads_pending';
const cfg = window.SOMOS_SUPABASE || {enabled:false};
let sb = null;
let authUser = null;
let authReady = false;
const listeners = new Set();
function notify(){const state={authenticated:!!authUser,email:authUser?.email||'',mode:sb?'supabase':'local'};listeners.forEach(fn=>{try{fn(state)}catch(e){console.error('CRMStore listener:',e)}})}
function makePersistentStorage(){return{getItem(k){try{return localStorage.getItem(k)}catch(e){return null}},setItem(k,v){try{localStorage.setItem(k,v)}catch(e){}},removeItem(k){try{localStorage.removeItem(k)}catch(e){}}}}
async function initSupabase(){
 if(!cfg.enabled||!cfg.url||!cfg.anonKey||cfg.anonKey.includes('YOUR_'))return false;
 try{
  const createClient=createSupabaseClient;
  if(typeof createClient!=='function')throw new Error('No se encontró createClient de Supabase.');
  sb=createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:makePersistentStorage()}});
  window.__SOMOS_SUPABASE_CLIENT__=sb;
  const {data,error}=await sb.auth.getSession();if(error)throw error;authUser=data?.session?.user||null;
  sb.auth.onAuthStateChange((_event,session)=>{authUser=session?.user||null;notify()});authReady=true;notify();return true;
 }catch(e){console.error('Supabase init error:',e);sb=null;authReady=false;notify();return false}
}
export const CRMStore={
 async init(){await initSupabase();notify();return!!sb},
 async login(email,password){if(!sb)return{ok:false,error:'Supabase no está disponible. Recarga la página e inténtalo nuevamente.'};const{data,error}=await sb.auth.signInWithPassword({email,password});if(error)return{ok:false,error:error.message,code:error.code||'',status:error.status||0};authUser=data?.user||null;notify();return{ok:true}},
 async signUp(email,password){if(!sb)return{ok:false,error:'Supabase no está disponible. Recarga la página e inténtalo nuevamente.'};const redirectTo=window.location.href.split('#')[0];const{data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:redirectTo}});if(error)return{ok:false,error:error.message,code:error.code||'',status:error.status||0};authUser=data?.session?.user||null;notify();return{ok:true,confirmed:!!data?.session,user:data?.user||null,emailConfirmationRequired:!data?.session&&!!data?.user,confirmationSentAt:data?.user?.confirmation_sent_at||null}},
 async logout(){if(sb){const{error}=await sb.auth.signOut({scope:'local'});if(error)console.warn('Supabase signOut:',error)}authUser=null;notify()},
 async list(){if(!sb||!authUser)return[];const{data,error}=await sb.from('leads').select('*').order('created_at',{ascending:false});if(error){console.error('Supabase leads:',error);return[]}return data||[]},
 async upsert(lead){if(!sb||!authUser)return null;const payload={...lead,external_id:lead.external_id||lead.id,state:lead.state||lead.status||'Nuevo',next_date:lead.next_date||lead.next_action_date||null};delete payload.id;delete payload.status;delete payload.next_action_date;const{data,error}=await sb.from('leads').upsert(payload,{onConflict:'external_id'}).select().single();if(error){console.error(error);alert('No fue posible guardar en Supabase: '+error.message);return null}return data},
 async updateLead(id,patch){if(!sb||!authUser||!id)return null;const {data,error}=await sb.from('leads').update(patch).eq('id',id).select().single();if(error){console.warn('leads update:',error);return null}return data},
 async importMany(items){if(!sb||!authUser)return false;const payload=items.map(x=>{const y={...x,external_id:x.external_id||x.id,state:x.state||x.status||'Nuevo',next_date:x.next_date||x.next_action_date||null};delete y.id;delete y.status;delete y.next_action_date;return y});const{error}=await sb.from('leads').upsert(payload,{onConflict:'external_id'});if(error){console.error(error);return false}return true},
 async saveLeadIntelligence(rows){if(!sb||!authUser||!rows?.length)return false;const payload=rows.map(x=>({...x,calculated_at:new Date().toISOString()}));const{error}=await sb.from('lead_intelligence').upsert(payload,{onConflict:'lead_id'});if(error){console.warn('lead_intelligence:',error);return false}return true},
 async listLeadIntelligence(){if(!sb||!authUser)return[];const{data,error}=await sb.from('lead_intelligence').select('*');if(error){console.warn('lead_intelligence:',error);return[]}return data||[]},
 async listSocialAccounts(){if(!sb||!authUser)return[];const{data,error}=await sb.from('social_accounts').select('*').order('platform');if(error){console.warn('social_accounts:',error);return[]}return data||[]},
 async listSocialMetrics(days=90){if(!sb||!authUser)return[];const from=new Date(Date.now()-days*86400000).toISOString().slice(0,10);const{data,error}=await sb.from('social_metrics').select('*').gte('metric_date',from).order('metric_date',{ascending:true});if(error){console.warn('social_metrics:',error);return[]}return data||[]},
 async saveSocialMetric(metric){if(!sb||!authUser)return false;const{error}=await sb.from('social_metrics').upsert(metric,{onConflict:'platform,account_id,metric_date'});if(error){console.warn('social_metrics:',error);return false}return true},
 async listEvents(days=90){if(!sb||!authUser)return[];const from=new Date(Date.now()-days*86400000).toISOString();const{data,error}=await sb.from('commercial_events').select('*').gte('created_at',from).order('created_at',{ascending:false});if(error){console.warn('commercial_events:',error);return[]}return data||[]},
 async listSocialSyncLogs(limit=20){if(!sb||!authUser)return[];const{data,error}=await sb.from('social_sync_logs').select('*').order('started_at',{ascending:false}).limit(limit);if(error){console.warn('social_sync_logs:',error);return[]}return data||[]},

 async listSocialPosts(limit=50){if(!sb||!authUser)return[];const{data,error}=await sb.from('social_posts').select('*').order('published_at',{ascending:false}).limit(limit);if(error){console.warn('social_posts:',error);return[]}return data||[]},
 async listContacts(query=''){if(!sb||!authUser)return[];let q=sb.from('contacts').select('*').order('updated_at',{ascending:false});if(query){const x=query.replace(/[,()]/g,' ');q=q.or(`name.ilike.%${x}%,phone.ilike.%${x}%,email.ilike.%${x}%,business.ilike.%${x}%`)}const{data,error}=await q.limit(200);if(error){console.warn('contacts:',error);return[]}return data||[]},
 async saveContact(contact){if(!sb||!authUser)return null;const payload={...contact};delete payload.id;const{data,error}=await sb.from('contacts').upsert(payload,{onConflict:'phone'}).select().single();if(error){console.warn('contacts save:',error);return null}return data},
 async updateContact(id,patch){if(!sb||!authUser||!id)return null;const{data,error}=await sb.from('contacts').update(patch).eq('id',id).select().single();if(error){console.warn('contacts update:',error);return null}return data},
 async deleteContact(id){if(!sb||!authUser||!id)return false;const{error}=await sb.from('contacts').delete().eq('id',id);if(error){console.warn('contacts delete:',error);return false}return true},
 async listContactActivities(contactId){if(!sb||!authUser||!contactId)return[];const{data,error}=await sb.from('contact_activities').select('*').eq('contact_id',contactId).order('activity_at',{ascending:false}).limit(100);if(error){console.warn('contact_activities:',error);return[]}return data||[]},
 async saveContactActivity(activity){if(!sb||!authUser)return null;const payload={...activity};delete payload.id;const{data,error}=await sb.from('contact_activities').insert(payload).select().single();if(error){console.warn('contact_activities save:',error);return null}return data},
 async listPublicationCalendar(month){if(!sb||!authUser)return[];const start=`${month}-01`;const d=new Date(`${month}-01T00:00:00`);d.setMonth(d.getMonth()+1);const end=d.toISOString().slice(0,10);const{data,error}=await sb.from('social_publication_calendar').select('*').gte('scheduled_at',start).lt('scheduled_at',end).order('scheduled_at',{ascending:true});if(error){console.warn('social_publication_calendar:',error);return[]}return data||[]},
 async savePublication(item){if(!sb||!authUser)return null;const payload={...item};delete payload.id;const{data,error}=await sb.from('social_publication_calendar').insert(payload).select().single();if(error){console.warn('publication calendar:',error);return null}return data},
 async updatePublication(id,patch){if(!sb||!authUser||!id)return null;const{data,error}=await sb.from('social_publication_calendar').update(patch).eq('id',id).select().single();if(error){console.warn('publication calendar update:',error);return null}return data},
 async deletePublication(id){if(!sb||!authUser||!id)return false;const{error}=await sb.from('social_publication_calendar').delete().eq('id',id);if(error){console.warn('publication calendar delete:',error);return false}return true},
 async listContactsRange(days=3650){
  if(!sb||!authUser)return[];
  const from=new Date(Date.now()-days*86400000).toISOString();
  const {data,error}=await sb.from('contacts').select('*').gte('created_at',from).order('created_at',{ascending:true}).limit(1000);
  if(error){console.warn('contacts range:',error);return[]} return data||[];
 },
 async listContactActivitiesRange(days=365){
  if(!sb||!authUser)return[];
  const from=new Date(Date.now()-days*86400000).toISOString();
  const {data,error}=await sb.from('contact_activities').select('*').gte('activity_at',from).order('activity_at',{ascending:true}).limit(2000);
  if(error){console.warn('contact_activities range:',error);return[]} return data||[];
 },
 async listLeadActivitiesRange(days=365){
  if(!sb||!authUser)return[];
  const from=new Date(Date.now()-days*86400000).toISOString();
  const {data,error}=await sb.from('lead_activities').select('*').gte('created_at',from).order('created_at',{ascending:true}).limit(2000);
  if(error){console.warn('lead_activities range:',error);return[]} return data||[];
 },
 async listWhatsAppMessagesRange(days=365){
  if(!sb||!authUser)return[];
  const from=new Date(Date.now()-days*86400000).toISOString();
  const {data,error}=await sb.from('whatsapp_messages').select('id,direction,message_type,message_timestamp,created_at').gte('message_timestamp',from).order('message_timestamp',{ascending:true}).limit(5000);
  if(error){console.warn('whatsapp_messages range:',error);return[]} return data||[];
 },
 async listPublicationCalendarRange(days=365){
  if(!sb||!authUser)return[];
  const from=new Date(Date.now()-days*86400000).toISOString();
  const to=new Date(Date.now()+86400000).toISOString();
  const {data,error}=await sb.from('social_publication_calendar').select('*').gte('scheduled_at',from).lt('scheduled_at',to).order('scheduled_at',{ascending:true}).limit(2000);
  if(error){console.warn('social_publication_calendar range:',error);return[]} return data||[];
 },
 async listSocialPostsRange(days=365){
  if(!sb||!authUser)return[];
  const from=new Date(Date.now()-days*86400000).toISOString();
  const {data,error}=await sb.from('social_posts').select('*').gte('published_at',from).order('published_at',{ascending:true}).limit(2000);
  if(error){console.warn('social_posts range:',error);return[]} return data||[];
 },
 async syncSocialPosts(){
  if(!sb||!authUser)return{ok:false,error:'Debes iniciar sesión en el CRM.'};
  try{
   const {data,error}=await sb.functions.invoke('meta-posts',{body:{}});
   if(error)return{ok:false,error:error.message||'No fue posible sincronizar publicaciones.'};
   return data||{ok:false,error:'La función de publicaciones no devolvió datos.'};
  }catch(e){return{ok:false,error:e?.message||String(e)}}
 },
 async syncMeta(){
  if(!sb||!authUser)return{ok:false,error:'Debes iniciar sesión en el CRM.'};
  try{
   const {data,error}=await sb.functions.invoke('meta-sync',{body:{}});
   if(error)return{ok:false,error:error.message||'No fue posible ejecutar la sincronización Meta.'};
   return data||{ok:false,error:'La función Meta no devolvió datos.'};
  }catch(e){return{ok:false,error:e?.message||String(e)}}
 },
 async listQuotes(){if(!sb||!authUser)return[];const{data,error}=await sb.from('crm_quotes').select('*').order('created_at',{ascending:false});if(error){console.warn('crm_quotes:',error);return[]};return data||[]},
 async getQuote(id){if(!sb||!authUser||!id)return null;const{data,error}=await sb.from('crm_quotes').select('*').eq('id',id).single();if(error){console.warn('crm_quote get:',error);return null};return data},
 async saveQuote(quote){if(!sb||!authUser)return null;const payload={...quote,created_by:authUser.id};delete payload.id;const{data,error}=await sb.from('crm_quotes').insert(payload).select().single();if(error){console.warn('crm_quote save:',error);return null};return data},
 async updateQuote(id,patch){if(!sb||!authUser||!id)return null;const payload={...patch,updated_at:new Date().toISOString()};delete payload.id;const{data,error}=await sb.from('crm_quotes').update(payload).eq('id',id).select().single();if(error){console.warn('crm_quote update:',error);return null};return data},
 async listSales(){if(!sb||!authUser)return[];const{data,error}=await sb.from('crm_sales').select('*').order('created_at',{ascending:false});if(error){console.warn('crm_sales:',error);return[]}return data||[]},
 async getSale(id){if(!sb||!authUser||!id)return null;const{data,error}=await sb.from('crm_sales').select('*').eq('id',id).single();if(error){console.warn('crm_sale get:',error);return null}return data},
 async saveSale(sale){if(!sb||!authUser)return null;const payload={...sale,created_by:authUser.id};delete payload.id;const{data,error}=await sb.from('crm_sales').insert(payload).select().single();if(error){console.warn('crm_sale save:',error);return null}return data},
 async updateSale(id,patch){if(!sb||!authUser||!id)return null;const payload={...patch,updated_at:new Date().toISOString()};delete payload.id;const{data,error}=await sb.from('crm_sales').update(payload).eq('id',id).select().single();if(error){console.warn('crm_sale update:',error);return null}return data},
 async subscribeRealtime(callback){
  if(!sb||!authUser||typeof callback!=='function')return null;
  const channel=sb.channel('somos-crm-b108')
    .on('postgres_changes',{event:'*',schema:'public',table:'leads'},payload=>callback({table:'leads',payload}))
    .on('postgres_changes',{event:'*',schema:'public',table:'contacts'},payload=>callback({table:'contacts',payload}))
    .on('postgres_changes',{event:'*',schema:'public',table:'contact_activities'},payload=>callback({table:'contact_activities',payload}))
    .on('postgres_changes',{event:'*',schema:'public',table:'social_publication_calendar'},payload=>callback({table:'social_publication_calendar',payload}))
    .on('postgres_changes',{event:'*',schema:'public',table:'social_posts'},payload=>callback({table:'social_posts',payload}))
    .on('postgres_changes',{event:'*',schema:'public',table:'social_metrics'},payload=>callback({table:'social_metrics',payload}))
    .subscribe((status,error)=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')console.warn('CRM Realtime:',status,error)});
  return channel;
 },
 get authenticated(){return!!authUser},get requiresLogin(){return!!sb},mode:'local',get ready(){return authReady},onStateChange:null
};
listeners.add(state=>{if(typeof CRMStore.onStateChange==='function')CRMStore.onStateChange(state)});
