import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const env=(k:string)=>Deno.env.get(k)||"";
const reply=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8"}});
async function signature(params:Record<string,string>,secret:string){
 const data=Object.keys(params).sort().map(k=>k+params[k]).join("");
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const signed=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(data));
 return Array.from(new Uint8Array(signed)).map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function readToken(req:Request){
 const q=new URL(req.url).searchParams.get("token");if(q?.trim())return q.trim();
 const raw=(await req.text()).trim();if(!raw)return "";
 if(raw.startsWith("{")){try{const j=JSON.parse(raw);if(typeof j?.token==="string"||typeof j?.token==="number")return String(j.token).trim()}catch{/* form fallback */}}
 const form=new URLSearchParams(raw).get("token");return form?.trim()||raw;
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return reply({ok:false,error:"METHOD_NOT_ALLOWED"},405);
 try{
  const flowUrl=env("FLOW_API_URL").replace(/\\/+$/,"");const key=env("FLOW_API_KEY"),secret=env("FLOW_SECRET_KEY"),url=env("SUPABASE_URL"),service=env("SUPABASE_SERVICE_ROLE_KEY");
  if(!key||!secret||!url||!service)return reply({ok:false,error:"CONFIG_MISSING"},500);
  if(!["https://www.flow.cl/api","https://sandbox.flow.cl/api"].includes(flowUrl))return reply({ok:false,error:"FLOW_API_URL_NOT_ALLOWED"},500);
  const token=await readToken(req);if(!token||token.length>500)return reply({ok:false,error:"FLOW_TOKEN_REQUIRED"},400);
  const params={apiKey:key,token};const statusUrl=new URL(flowUrl+"/payment/getStatus");statusUrl.searchParams.set("apiKey",key);statusUrl.searchParams.set("token",token);statusUrl.searchParams.set("s",await signature(params,secret));
  const response=await fetch(statusUrl,{method:"GET",signal:AbortSignal.timeout(20000)});let data:Record<string,unknown>;
  try{data=await response.json()}catch{return reply({ok:false,error:"FLOW_INVALID_RESPONSE"},502)}
  if(!response.ok)return reply({ok:false,error:"FLOW_STATUS_REQUEST_FAILED",flow_http_status:response.status},502);
  const order=String(data.commerceOrder||""),status=Number(data.status),amount=Number(data.amount),currency=String(data.currency||"");
  if(!order||![1,2,3,4].includes(status)||!Number.isFinite(amount)||amount<=0||currency!=="CLP")return reply({ok:false,error:"FLOW_DATA_INVALID"},400);
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:payment,error:lookupError}=await db.from("payments").select("id,business_id,subscription_id,provider,provider_token,provider_order_id,amount,currency,status,target_plan_id").eq("provider","flow").eq("provider_token",token).maybeSingle();
  if(lookupError)return reply({ok:false,error:"PAYMENT_LOOKUP_FAILED"},500);
  if(!payment)return reply({ok:false,error:"PAYMENT_NOT_FOUND"},404);
  if(payment.provider_order_id!==order||Number(payment.amount)!==amount||payment.currency!==currency)return reply({ok:false,error:"PAYMENT_MISMATCH"},409);
  let previousPlanId:string|null=null;
  if(status===2&&payment.subscription_id){
   const {data:sub,error:subError}=await db.from("subscriptions").select("plan_id").eq("id",payment.subscription_id).maybeSingle();
   if(subError)console.error("Previous subscription plan lookup:",subError.message);
   else previousPlanId=sub?.plan_id||null;
  }
  const {data:result,error:rpcError}=await db.rpc("process_flow_payment_webhook",{p_provider_token:token,p_flow_status:status,p_payload:data});
  if(rpcError){console.error("Payment webhook RPC failed:",rpcError.message);return reply({ok:false,error:"PAYMENT_PROCESSING_FAILED"},500)}
  let notificationStatus="not_applicable";
  if(status===2){
   const {data:confirmed,error:confirmedError}=await db.from("payments").select("status").eq("id",payment.id).single();
   if(confirmedError)console.error("Payment confirmation lookup:",confirmedError.message);
   if(confirmed?.status==="approved"){
    const {error:notificationError}=await db.rpc("create_business_plan_notification",{p_payment_id:payment.id,p_previous_plan_id:previousPlanId});
    if(notificationError){notificationStatus="failed";console.error("Plan notification RPC failed:",notificationError.message)}
    else notificationStatus="created_or_exists";
   }
  } else if(status===1 || status===3 || status===4) {
   const outcome=status===1?"pending":status===3?"rejected":"cancelled";
   const {error:outcomeError}=await db.rpc("notify_flow_payment_outcome",{p_payment_id:payment.id,p_outcome:outcome});
   if(outcomeError){notificationStatus="failed";console.error("Flow outcome notification failed:",outcomeError.message)}
   else notificationStatus="created_or_exists";
  }
  return reply({ok:true,received:true,payment_id:payment.id,payment_status:result?.payment_status??payment.status,notification_status:notificationStatus});
 }catch(e){console.error("flow-webhook error:",e instanceof Error?e.message:"UNKNOWN");return reply({ok:false,error:"INTERNAL_ERROR"},500)}
});
