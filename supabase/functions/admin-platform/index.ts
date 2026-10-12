import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'https://agenda-ya.cl','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
const specs:Record<string,{table:string;select:string;search:string[];editable:string[];create:string[];order:string}>={
 businesses:{table:'businesses',select:'id,name,slug,email,phone,description,city,comuna,logo_url,active,created_at,updated_at',search:['name','slug','email','phone','city','comuna'],editable:['name','slug','email','phone','description','city','comuna','active'],create:['name','slug','email','phone','description','city','comuna','active'],order:'created_at'},
 marketplace:{table:'business_public_profiles',select:'id,business_id,display_name,description,category_id,address,comuna,city,public_enabled,cover_url,updated_at,businesses(id,name,slug,email,phone,logo_url,active)',search:['display_name','description','city','comuna'],editable:['public_enabled'],create:[],order:'updated_at'},
 subscriptions:{table:'subscriptions',select:'id,business_id,plan_id,status,created_at',search:['status'],editable:['status'],create:[],order:'created_at'},
 payments:{table:'payments',select:'id,business_id,subscription_id,provider,provider_payment_id,provider_order_id,checkout_url,target_plan_id,amount,currency,status,created_at',search:['provider_order_id','provider_payment_id','provider','status'],editable:[],create:[],order:'created_at'},
 categories:{table:'business_categories',select:'id,name,slug,description,image_url,sort_order,active,created_at',search:['name','slug','description'],editable:['name','slug','description','image_url','sort_order','active'],create:['name','slug','description','image_url','sort_order','active'],order:'sort_order'},
 support:{table:'platform_support_tickets',select:'id,ticket_code,subject,requester_email,category,priority,status,assigned_to,resolution,description,created_at',search:['ticket_code','subject','requester_email','status'],editable:['status','priority','assigned_to','resolution'],create:['subject','requester_email','category','priority','status','description'],order:'created_at'},
 cms:{table:'platform_content',select:'id,title,slug,section,content_type,body,status,meta_title,meta_description,featured_image,published_at,created_at,updated_at,updated_by',search:['title','slug','content_type','status','section'],editable:['title','slug','section','content_type','body','status','meta_title','meta_description','featured_image'],create:['title','slug','section','content_type','body','status','meta_title','meta_description','featured_image'],order:'updated_at'},
 settings:{table:'platform_settings',select:'key,value,description,updated_at',search:['key','description'],editable:['value','description'],create:[],order:'key'},
 audit:{table:'audit_logs',select:'id,created_at,actor_user_id,action,entity_type,entity_id,metadata',search:['action','entity_type','entity_id'],editable:[],create:[],order:'created_at'}
};
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})}
function safeData(input:Record<string,unknown>,allow:string[]){const out:Record<string,unknown>={};for(const k of allow)if(Object.prototype.hasOwnProperty.call(input,k))out[k]=input[k];return out}
const CMS_CONTENT_TYPES=['page','banner','news','faq','legal','notification','email_template'];
const CMS_STATUSES=['draft','published','archived'];
function validateCMSData(data:Record<string,unknown>,isCreate:boolean):string|null {
 if(data.content_type!==undefined&&!CMS_CONTENT_TYPES.includes(String(data.content_type)))return 'Tipo de contenido no válido';
 if(data.status!==undefined&&!CMS_STATUSES.includes(String(data.status)))return 'Estado de contenido no válido';
 if(data.title!==undefined){if(typeof data.title!=='string'||!data.title.trim()||data.title.trim().length>200)return 'El título es obligatorio y no puede superar 200 caracteres';data.title=data.title.trim();}
 if(data.slug!==undefined){if(typeof data.slug!=='string')return 'El slug no es válido';data.slug=data.slug.trim().toLowerCase().replace(/\s+/g,'-');if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(data.slug))||String(data.slug).length>180)return 'El slug debe usar minúsculas, números y guiones';}
 if(data.section!==undefined&&data.section!==null){if(typeof data.section!=='string'||data.section.trim().length>100)return 'La sección no puede superar 100 caracteres';data.section=data.section.trim()||null;}
 if(data.body!==undefined&&typeof data.body!=='string')return 'El cuerpo del contenido debe ser texto';
 if(data.meta_title!==undefined&&data.meta_title!==null&&(typeof data.meta_title!=='string'||data.meta_title.length>70))return 'El título SEO no puede superar 70 caracteres';
 if(data.meta_description!==undefined&&data.meta_description!==null&&(typeof data.meta_description!=='string'||data.meta_description.length>320))return 'La descripción SEO no puede superar 320 caracteres';
 if(data.featured_image!==undefined&&data.featured_image!==null&&(typeof data.featured_image!=='string'||data.featured_image.length>2048))return 'La URL de imagen no es válida';
 if(isCreate){if(typeof data.title!=='string'||!data.title.trim())return 'El título es obligatorio';if(typeof data.slug!=='string'||!data.slug.trim())return 'El slug es obligatorio';if(typeof data.body!=='string'||!data.body.trim())return 'El cuerpo del contenido es obligatorio';}
 return null;
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'Método no permitido'},405);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!anon||!service)return json({error:'Configuración incompleta de la función'},500);
 const auth=req.headers.get('Authorization')||'';if(!auth.startsWith('Bearer '))return json({error:'Se requiere sesión administrativa'},401);
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data:{user},error:userError}=await userClient.auth.getUser();if(userError||!user)return json({error:'Sesión inválida o vencida'},401);
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});const {data:assignment,error:roleError}=await admin.from('platform_admins').select('role,is_active').eq('user_id',user.id).maybeSingle();if(roleError||!assignment?.is_active||!['super_admin','admin','support','finance','content'].includes(assignment.role))return json({error:'No tienes permisos de administración'},403);
 let body:any;try{body=await req.json()}catch{return json({error:'JSON inválido'},400)}const action=String(body.action||'');
 // Motor de notificaciones administrativas: acceso exclusivo tras validar sesión y rol.
 if(action==='notifications_list'){
  const limit=Math.max(1,Math.min(50,Number(body.limit)||30));
  const {data:items,error}=await admin.from('admin_notifications').select('id,title,message,type,target_module,target_id,created_at,dedupe_key').order('created_at',{ascending:false}).limit(limit);
  if(error)return json({error:`No se pudieron consultar las notificaciones: ${error.message}`},400);
  const ids=(items||[]).map((n:any)=>n.id);
  let readIds=new Set<string>();
  if(ids.length){const {data:reads,error:readError}=await admin.from('admin_notification_reads').select('notification_id').eq('user_id',user.id).in('notification_id',ids);if(readError)return json({error:`No se pudo consultar el estado de lectura: ${readError.message}`},400);readIds=new Set((reads||[]).map((r:any)=>String(r.notification_id)));}
  const rows=(items||[]).map((n:any)=>({...n,is_read:readIds.has(String(n.id))}));
  return json({rows,unread:rows.filter((n:any)=>!n.is_read).length});
 }
 if(action==='notifications_mark_read'){
  const id=String(body.id||'');if(!id)return json({error:'Falta el identificador de la notificación'},400);
  const {data:exists,error:existsError}=await admin.from('admin_notifications').select('id').eq('id',id).maybeSingle();
  if(existsError)return json({error:existsError.message},400);if(!exists)return json({error:'La notificación no existe'},404);
  const {error}=await admin.from('admin_notification_reads').upsert({notification_id:id,user_id:user.id,read_at:new Date().toISOString()},{onConflict:'notification_id,user_id'});
  if(error)return json({error:`No se pudo marcar como leída: ${error.message}`},400);
  return json({ok:true});
 }
 if(action==='notifications_mark_all_read'){
  const {data:items,error}=await admin.from('admin_notifications').select('id').limit(1000);
  if(error)return json({error:error.message},400);
  if((items||[]).length){const now=new Date().toISOString();const rows=(items||[]).map((n:any)=>({notification_id:n.id,user_id:user.id,read_at:now}));const {error:writeError}=await admin.from('admin_notification_reads').upsert(rows,{onConflict:'notification_id,user_id'});if(writeError)return json({error:`No se pudieron marcar todas como leídas: ${writeError.message}`},400);}
  return json({ok:true,marked:(items||[]).length});
 }
 if(action==='notifications_create'){
  if(!['super_admin','admin'].includes(assignment.role))return json({error:'Solo un administrador principal puede emitir notificaciones'},403);
  const title=String(body.title||'').trim().slice(0,160),message=String(body.message||'').trim().slice(0,1000),type=String(body.type||'info');
  const allowedTypes=['info','success','warning','error','support','payment','subscription'];
  const allowedModules=['dashboard','users','businesses','marketplace','subscriptions','payments','categories','analytics','support','cms','settings','audit'];
  const targetModule=String(body.target_module||'dashboard');
  if(!title||!message)return json({error:'Título y mensaje son obligatorios'},400);
  if(!allowedTypes.includes(type)||!allowedModules.includes(targetModule))return json({error:'Tipo o destino de notificación no válido'},400);
  const dedupe=body.dedupe_key?String(body.dedupe_key).slice(0,220):null;
  const {data:row,error}=await admin.from('admin_notifications').insert({title,message,type,target_module:targetModule,target_id:body.target_id?String(body.target_id):null,created_by:user.id,dedupe_key:dedupe}).select('id,title,message,type,target_module,target_id,created_at,dedupe_key').single();
  if(error){if(error.code==='23505'&&dedupe)return json({ok:true,duplicate:true});return json({error:`No se pudo crear la notificación: ${error.message}`},400);}
  await admin.from('audit_logs').insert({actor_user_id:user.id,action:'notification_create',entity_type:'admin_notifications',entity_id:row.id,metadata:{title,type,target_module:targetModule}});
  return json({ok:true,row});
 }
 try{
 if(action==='analytics'){
  const counts:Record<string,number|null>={};
  for(const [k,t] of [['businesses','businesses'],['marketplace','business_public_profiles'],['subscriptions','subscriptions'],['payments','payments'],['categories','business_categories'],['tickets','platform_support_tickets']] as const){const {count,error}=await admin.from(t).select('*',{count:'exact',head:true});counts[k]=error?null:(count??0)}
  let userCount=0,userPage=1;while(userPage<=100){const {data,error}=await admin.auth.admin.listUsers({page:userPage,perPage:1000});if(error){counts.users=null;break}userCount+=data.users.length;if(data.users.length<1000)break;userPage++}if(counts.users!==null)counts.users=userCount;
  // Aggregations below use only records returned by the live database; absent/failed sources stay null.
  let cities:any[]|null=null,categories:any[]|null=null,activity:any[]|null=null;
  const {data:businessRows,error:businessRowsError}=await admin.from('businesses').select('id,name,city,comuna,created_at,active').order('created_at',{ascending:false}).limit(5000);
  if(!businessRowsError&&businessRows){const grouped=new Map<string,number>();for(const r of businessRows){const label=String(r.city||r.comuna||'Sin ciudad informada').trim();grouped.set(label,(grouped.get(label)||0)+1)}cities=[...grouped.entries()].map(([city,count])=>({city,count})).sort((a,b)=>b.count-a.count).slice(0,8)}
  const {data:profileRows,error:profileRowsError}=await admin.from('business_public_profiles').select('category_id,updated_at').limit(10000);
  const {data:categoryRows,error:categoryRowsError}=await admin.from('business_categories').select('id,name').limit(1000);
  if(!profileRowsError&&!categoryRowsError&&profileRows&&categoryRows){const names=new Map(categoryRows.map((c:any)=>[String(c.id),String(c.name||'Sin categoría')]));const grouped=new Map<string,number>();for(const r of profileRows){const label=names.get(String(r.category_id))||'Sin categoría';grouped.set(label,(grouped.get(label)||0)+1)}categories=[...grouped.entries()].map(([category,count])=>({category,count})).sort((a,b)=>b.count-a.count).slice(0,8)}
  const {data:logs,error:logsError}=await admin.from('audit_logs').select('id,created_at,actor_user_id,action,entity_type,entity_id,metadata').order('created_at',{ascending:false}).limit(10);if(!logsError&&logs)activity=logs;
  return json({counts,cities,categories,activity,availability:{cities:!!cities,categories:!!categories,activity:!!activity,historicalGrowth:false,marketplaceViews:false,reservations:false,conversion:false,revenueByPlan:false}})
}
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
  if(key==='cms'){const contentType=String(body.content_type||'all');const section=String(body.section||'all');if(contentType!=='all')q=q.eq('content_type',contentType);if(section!=='all')q=q.eq('section',section);}
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
  if(!spec.create.length)return json({error:'La creación no está habilitada en este módulo'},405);const data=safeData(body.data||{},spec.create);if(key==='businesses')data.created_by=user.id;if(key==='support'){data.ticket_code=data.ticket_code||`TCK-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;}if(key==='cms'){const validation=validateCMSData(data,true);if(validation)return json({error:validation},400);data.status=data.status||'draft';data.content_type=data.content_type||'page';data.created_by=user.id;data.updated_by=user.id;data.updated_at=new Date().toISOString();if(data.status==='published')data.published_at=new Date().toISOString();}if(key==='settings')return json({error:'Las claves de configuración se administran mediante upsert explícito'},405);const {data:row,error}=await admin.from(spec.table).insert(data).select(spec.select).single();if(error)return json({error:error.message},400);await admin.from('audit_logs').insert({actor_user_id:user.id,action:'create',entity_type:key,entity_id:row.id||null,metadata:{module:key,fields:Object.keys(data)}});return json({row});}
 if(action==='update'){
  if(!spec.editable.length)return json({error:'Este módulo es de solo lectura desde el panel'},405);const id=String(body.id||'');if(!id)return json({error:'Falta el identificador del registro'},400);const data=safeData(body.data||{},spec.editable);if(key==='cms'){const validation=validateCMSData(data,false);if(validation)return json({error:validation},400);data.updated_by=user.id;data.updated_at=new Date().toISOString();if(data.status==='published'){const {data:existing,error:existingError}=await admin.from('platform_content').select('published_at').eq('id',id).maybeSingle();if(existingError)return json({error:`No se pudo validar el contenido: ${existingError.message}`},400);if(!existing)return json({error:'El contenido no existe'},404);if(!existing.published_at)data.published_at=new Date().toISOString();}}if(!Object.keys(data).length)return json({error:'No hay cambios válidos'},400);if(key==='settings'){const value=data.value;const {data:row,error}=await admin.from(spec.table).update({value,description:data.description,updated_by:user.id,updated_at:new Date().toISOString()}).eq('key',id).select(spec.select).single();if(error)return json({error:error.message},400);return json({row})}const {data:row,error}=await admin.from(spec.table).update(data).eq('id',id).select(spec.select).single();if(error)return json({error:error.message},400);await admin.from('audit_logs').insert({actor_user_id:user.id,action:key==='cms'&&data.status==='published'?'publish':'update',entity_type:key,entity_id:id,metadata:{module:key,fields:Object.keys(data)}});return json({row});}
 return json({error:'Acción no permitida'},400);
 }catch(e){return json({error:e instanceof Error?e.message:'Error interno'},500)}
});
