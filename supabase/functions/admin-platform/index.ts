import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'https://agenda-ya.cl','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
const specs:Record<string,{table:string;select:string;search:string[];editable:string[];create:string[];order:string}>={
 businesses:{table:'businesses',select:'id,name,slug,email,phone,description,city,comuna,logo_url,active,created_at,updated_at',search:['name','slug','email','phone','city','comuna'],editable:['name','slug','email','phone','description','city','comuna','active'],create:['name','slug','email','phone','description','city','comuna','active'],order:'created_at'},
 marketplace:{table:'business_public_profiles',select:'id,business_id,display_name,description,category_id,address,comuna,city,public_enabled,cover_url,updated_at,businesses(id,name,slug,email,phone,logo_url,active)',search:['display_name','description','city','comuna'],editable:['public_enabled'],create:[],order:'updated_at'},
 subscriptions:{table:'subscriptions',select:'id,business_id,plan_id,status,created_at',search:['status'],editable:['status'],create:[],order:'created_at'},
 payments:{table:'payments',select:'id,business_id,subscription_id,provider,provider_payment_id,provider_order_id,checkout_url,target_plan_id,amount,currency,status,created_at',search:['provider_order_id','provider_payment_id','provider','status'],editable:[],create:[],order:'created_at'},
 categories:{table:'business_categories',select:'id,name,slug,description,image_url,sort_order,active,created_at',search:['name','slug','description'],editable:['name','slug','description','image_url','sort_order','active'],create:['name','slug','description','image_url','sort_order','active'],order:'sort_order'},
 support:{table:'platform_support_tickets',select:'id,ticket_code,subject,requester_email,category,priority,status,assigned_to,resolution,description,created_at',search:['ticket_code','subject','requester_email','status'],editable:['status','priority','assigned_to','resolution'],create:['subject','requester_email','category','priority','status','description'],order:'created_at'},
 cms:{table:'platform_content',select:'id,title,slug,content_type,body,status,published_at,updated_at',search:['title','slug','content_type','status'],editable:['title','slug','content_type','body','status','published_at'],create:['title','slug','content_type','body','status'],order:'updated_at'},
 settings:{table:'platform_settings',select:'key,value,description,updated_at',search:['key','description'],editable:['value','description'],create:[],order:'key'},
 audit:{table:'audit_logs',select:'id,created_at,actor_user_id,action,entity_type,entity_id,metadata',search:['action','entity_type','entity_id'],editable:[],create:[],order:'created_at'}
};
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})}
function safeData(input:Record<string,unknown>,allow:string[]){const out:Record<string,unknown>={};for(const k of allow)if(Object.prototype.hasOwnProperty.call(input,k))out[k]=input[k];return out}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'Método no permitido'},405);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!anon||!service)return json({error:'Configuración incompleta de la función'},500);
 const auth=req.headers.get('Authorization')||'';if(!auth.startsWith('Bearer '))return json({error:'Se requiere sesión administrativa'},401);
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data:{user},error:userError}=await userClient.auth.getUser();if(userError||!user)return json({error:'Sesión inválida o vencida'},401);
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});const {data:assignment,error:roleError}=await admin.from('platform_admins').select('role,is_active').eq('user_id',user.id).maybeSingle();if(roleError||!assignment?.is_active||!['super_admin','admin','support','finance','content'].includes(assignment.role))return json({error:'No tienes permisos de administración'},403);
 let body:any;try{body=await req.json()}catch{return json({error:'JSON inválido'},400)}const action=String(body.action||'');
 try{
 if(action==='analytics'){const counts:Record<string,number|null>={};for(const [k,t] of [['businesses','businesses'],['marketplace','business_public_profiles'],['subscriptions','subscriptions'],['payments','payments'],['categories','business_categories'],['tickets','platform_support_tickets']] as const){const {count,error}=await admin.from(t).select('*',{count:'exact',head:true});counts[k]=error?null:count}let userCount=0,userPage=1;while(userPage<=100){const {data,error}=await admin.auth.admin.listUsers({page:userPage,perPage:1000});if(error){counts.users=null;break}userCount+=data.users.length;if(data.users.length<1000)break;userPage++}if(counts.users!==null)counts.users=userCount;return json({counts})}
 const key=String(body.module||''),spec=specs[key];if(!spec)return json({error:'Módulo no permitido'},400);
 if(action==='categories_overview'){
  const {data:cats,error:catError,count:catCount}=await admin.from('business_categories').select('id,active',{count:'exact'}).limit(10000);
  if(catError)return json({error:`No se pudieron consultar las categorías: ${catError.message}`},400);
  const {count:profileCount,error:profileError}=await admin.from('business_public_profiles').select('id',{count:'exact',head:true});
  const {count:coveredProfiles,error:coveredError}=await admin.from('business_public_profiles').select('id',{count:'exact',head:true}).not('cover_url','is',null);
  return json({total:catCount??cats?.length??0,active:(cats||[]).filter((c:any)=>c.active===true).length,libraryImages:96,profileCount:profileError?null:profileCount,coveredProfiles:coveredError?null:coveredProfiles});
 }
 if(action==='assign_category_cover'){
  const id=String(body.id||'');const cover=String(body.cover||'');
  if(!id||!/^\.\.\/assets\/category-covers\/[a-z0-9-]+-\d{2}\.jpg$/i.test(cover))return json({error:'Categoría o ruta de portada no válida'},400);
  const {data:category,error:categoryError}=await admin.from('business_categories').select('id,name').eq('id',id).maybeSingle();
  if(categoryError||!category)return json({error:'La categoría no existe'},404);
  const publicUrl='https://agenda-ya.cl/'+cover.replace(/^\.\.\//,'');
  const {data:profiles,error:updateError}=await admin.from('business_public_profiles').update({cover_url:publicUrl,updated_at:new Date().toISOString()}).eq('category_id',id).select('id');
  if(updateError)return json({error:`No se pudo actualizar las portadas: ${updateError.message}`},400);
  await admin.from('audit_logs').insert({actor_user_id:user.id,action:'assign_category_cover',entity_type:'business_categories',entity_id:id,metadata:{category_name:category.name,cover_url:publicUrl,updated_profiles:profiles?.length||0}});
  return json({ok:true,updated:profiles?.length||0,cover_url:publicUrl});
 }
 if(action==='subscriptions_overview'){
  const {data:subs,error:subsError}=await admin.from('subscriptions').select('id,business_id,plan_id,status,created_at').limit(10000);
  if(subsError)return json({error:`No se pudo calcular el resumen de suscripciones: ${subsError.message}`},400);
  const all=subs||[];
  const {data:planRows}=await admin.from('plans').select('id,code,name,price_monthly');
  const planMap=new Map((planRows||[]).map((p:any)=>[String(p.id),p]));
  const plans:Record<string,number>={FREE:0,PRO:0,BUSINESS:0};
  const states:Record<string,number>={};
  for(const r of all){
   const plan:any=planMap.get(String(r.plan_id||''));
   const code=String(plan?.code||plan?.name||r.plan_id||'').toUpperCase();
   if(code.includes('FREE'))plans.FREE++;else if(code.includes('BUSINESS')||code.includes('BUSINESS'))plans.BUSINESS++;else if(code.includes('PRO')||code.includes('PREMIUM'))plans.PRO++;
   const state=String(r.status||'Sin estado');states[state]=(states[state]||0)+1;
  }
  let monthRevenue:number|null=null,revenueAvailable=false;
  const now=new Date();const start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
  const {data:payments,error:paymentError}=await admin.from('payments').select('amount,status,created_at').gte('created_at',start.toISOString()).limit(10000);
  if(!paymentError&&payments){revenueAvailable=true;monthRevenue=payments.filter((x:any)=>/approved|paid|completed|success|aprobado|pagado/i.test(String(x.status||''))).reduce((sum:number,x:any)=>sum+Number(x.amount||0),0);}
  return json({total:all.length,plans,monthRevenue,revenueAvailable,statuses:Object.entries(states).map(([label,count])=>({label,count}))});
 }
 if(action==='list'){
  const page=Math.max(0,Math.min(10000,Number(body.page)||0));
  const size=Math.max(1,Math.min(100,Number(body.page_size)||20));
  const search=String(body.search||'').trim().slice(0,100).replace(/[%,()]/g,'');
  const state=String(body.status||'');
  let q=admin.from(spec.table).select(spec.select,{count:'exact'}).order(spec.order,{ascending:false,nullsFirst:false});
  if(key==='subscriptions'){
   // Resolve plan UUIDs through the real plans table; never run ILIKE against UUID columns.
   const {data:planRows}=await admin.from('plans').select('id,code,name');
   const planMap=new Map((planRows||[]).map((p:any)=>[String(p.id),p]));
   const requestedPlan=String(body.plan||'all').toUpperCase();
   if(requestedPlan!=='ALL'){
    const planIds=(planRows||[]).filter((p:any)=>String(p.code||p.name||'').toUpperCase().includes(requestedPlan)).map((p:any)=>p.id);
    q=planIds.length?q.in('plan_id',planIds):q.eq('id','00000000-0000-0000-0000-000000000000');
   }
   if(body.from)q=q.gte('created_at',String(body.from)+'T00:00:00.000Z');
   if(body.to)q=q.lte('created_at',String(body.to)+'T23:59:59.999Z');
   if(state==='active')q=q.in('status',['active','ACTIVE','activa','Activa','trialing','trial']);
   if(state==='pending')q=q.in('status',['pending','PENDING','pendiente','Pendiente','incomplete','past_due']);
   if(state==='inactive')q=q.in('status',['canceled','cancelled','suspended','inactive','cancelada','suspendida','expired']);
   if(search){
    const {data:bizMatches}=await admin.from('businesses').select('id').or(`name.ilike.%${search}%,email.ilike.%${search}%`).limit(1000);
    const businessIds=(bizMatches||[]).map((b:any)=>b.id).filter(Boolean);
    const {data:statusMatches}=await admin.from('subscriptions').select('id').ilike('status',`%${search}%`).limit(1000);
    const ids=[...new Set([...businessIds,...(statusMatches||[]).map((r:any)=>r.id)])];
    q=ids.length?q.in('id',ids):q.eq('id','00000000-0000-0000-0000-000000000000');
   }
   const payment=String(body.payment||'all');
   if(payment!=='all'){
    const patterns:Record<string,string[]>={paid:['approved','paid','completed','success','aprobado','pagado'],pending:['pending','waiting','pendiente'],failed:['failed','rejected','rechazado','failed']};
    const {data:payRows}=await admin.from('payments').select('subscription_id,status').not('subscription_id','is',null).limit(10000);
    const wanted=(payRows||[]).filter((r:any)=>patterns[payment]?.some(term=>String(r.status||'').toLowerCase().includes(term))).map((r:any)=>r.subscription_id).filter(Boolean);
    q=wanted.length?q.in('id',wanted):q.eq('id','00000000-0000-0000-0000-000000000000');
   }
  } else {
   if(search&&spec.search.length)q=q.or(spec.search.map(c=>`${c}.ilike.%${search}%`).join(','));
   if(state==='active'){if(key==='marketplace')q=q.eq('public_enabled',true);else if(['businesses','categories'].includes(key))q=q.eq('active',true);else if(key==='cms')q=q.eq('status','published');}
   if(state==='inactive'){if(key==='marketplace')q=q.eq('public_enabled',false);else if(['businesses','categories'].includes(key))q=q.eq('active',false);else if(key==='cms')q=q.in('status',['draft','archived']);}
   if(state==='pending'&&key==='support')q=q.in('status',['open','in_progress','waiting']);
  }
  const {data,error,count}=await q.range(page*size,page*size+size-1);
  if(error)return json({error:`No se pudo consultar ${key}: ${error.message}`},400);
  let result:any[]=data||[];
  if(key==='categories'&&result.length){
   result=await Promise.all(result.map(async (r:any)=>{
    const {count,error}=await admin.from('business_public_profiles').select('id',{count:'exact',head:true}).eq('category_id',r.id);
    return {...r,business_count:error?null:(count??0),view_count:null};
   }));
  }
  if(key==='subscriptions'&&result.length){
   const bizIds=[...new Set(result.map((r:any)=>r.business_id).filter(Boolean))];
   const {data:biz}=bizIds.length?await admin.from('businesses').select('id,name,email,logo_url').in('id',bizIds):{data:[]};
   const {data:planRows}=await admin.from('plans').select('id,code,name,price_monthly');
   const bizMap=new Map((biz||[]).map((b:any)=>[String(b.id),b]));
   const planMap=new Map((planRows||[]).map((p:any)=>[String(p.id),p]));
   const subIds=result.map((r:any)=>r.id);
   const {data:payRows}=await admin.from('payments').select('subscription_id,amount,status,created_at').in('subscription_id',subIds).order('created_at',{ascending:false});
   result=result.map((r:any)=>{
    const b:any=bizMap.get(String(r.business_id))||{};const p:any=planMap.get(String(r.plan_id))||{};
    const paymentsForSub=(payRows||[]).filter((x:any)=>String(x.subscription_id)===String(r.id));const latest:any=paymentsForSub[0]||null;
    return {...r,business_name:b.name||null,business_email:b.email||null,business_logo_url:b.logo_url||null,plan_name:String(p.code||p.name||'FREE').toUpperCase(),plan_code:String(p.code||'free').toUpperCase(),plan_price:p.price_monthly??null,payment_status:latest?.status||null,amount:latest?.amount??null,latest_payment_at:latest?.created_at||null};
   });
  }
  if(key==='marketplace'&&result.length){const ids=[...new Set(result.map((r:any)=>r.category_id).filter(Boolean))];if(ids.length){const {data:cats}=await admin.from('business_categories').select('id,name,slug').in('id',ids);const map=new Map((cats||[]).map((c:any)=>[c.id,c]));result=result.map((r:any)=>({...r,category_name:map.get(r.category_id)?.name||'Sin categoría',active:r.businesses?.active??false,business_logo_url:r.businesses?.logo_url||null,business_name:r.businesses?.name||null}));}else result=result.map((r:any)=>({...r,category_name:'Sin categoría',active:r.businesses?.active??false,business_logo_url:r.businesses?.logo_url||null,business_name:r.businesses?.name||null}));}
  return json({rows:result,total:count||0,page,page_size:size});
 }
 if(action==='create'){
 if(!spec.create.length)return json({error:'La creación no está habilitada en este módulo'},405);const data=safeData(body.data||{},spec.create);if(key==='businesses')data.created_by=user.id;if(key==='settings')return json({error:'Las claves de configuración se administran mediante upsert explícito'},405);const {data:row,error}=await admin.from(spec.table).insert(data).select(spec.select).single();if(error)return json({error:error.message},400);await admin.from('audit_logs').insert({actor_user_id:user.id,action:'create',entity_type:key,entity_id:row.id||null,metadata:{module:key,fields:Object.keys(data)}});return json({row});}
 if(action==='update'){
 if(!spec.editable.length)return json({error:'Este módulo es de solo lectura desde el panel'},405);const id=String(body.id||'');if(!id)return json({error:'Falta el identificador del registro'},400);const data=safeData(body.data||{},spec.editable);if(!Object.keys(data).length)return json({error:'No hay cambios válidos'},400);if(key==='settings'){const value=data.value;const {data:row,error}=await admin.from(spec.table).update({value,description:data.description,updated_by:user.id,updated_at:new Date().toISOString()}).eq('key',id).select(spec.select).single();if(error)return json({error:error.message},400);return json({row})}const {data:row,error}=await admin.from(spec.table).update(data).eq('id',id).select(spec.select).single();if(error)return json({error:error.message},400);await admin.from('audit_logs').insert({actor_user_id:user.id,action:'update',entity_type:key,entity_id:id,metadata:{module:key,fields:Object.keys(data)}});return json({row});}
 return json({error:'Acción no permitida'},400);
 }catch(e){return json({error:e instanceof Error?e.message:'Error interno'},500)}
});
