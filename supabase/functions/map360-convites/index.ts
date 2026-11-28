// Supabase Edge Function: map360-convites (Deno).
// Deploy with --no-verify-jwt; authorization is enforced per action below.
// Requires SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY MAP360_RATE_SALT and MAP360_SITE_ORIGIN.
import { createClient } from "npm:@supabase/supabase-js@2.89.0";
const BASE = Deno.env.get("SUPABASE_URL") || "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RATE_SALT = Deno.env.get("MAP360_RATE_SALT") || "";
const SITE_ORIGIN = Deno.env.get("MAP360_SITE_ORIGIN") || "";
const service = createClient(BASE, SERVICE, {auth:{persistSession:false,autoRefreshToken:false}});
const encoder = new TextEncoder();
const cors = {
  "Access-Control-Allow-Origin": SITE_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'",
 "Vary": "Origin",
};
function reply(status:number, body:unknown){return new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});}
class BodyTooLarge extends Error {}
async function readBody(req: Request): Promise<unknown> {
  const reader = req.body?.getReader();
  if (!reader) throw new Error("Dados ausentes");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return JSON.parse(text + decoder.decode());
      bytes += value.byteLength;
      if (bytes > 20000) throw new BodyTooLarge();
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
function fail(message:string,status=400){return reply(status,{error:message});}
function base64Url(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
async function sha256(token:string){const digest=await crypto.subtle.digest("SHA-256",encoder.encode(token));return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");}
function isToken(t:unknown):t is string{return typeof t==="string"&&/^[A-Za-z0-9_-]{43}$/.test(t);}
function isUuid(x:unknown){return typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);}
function plain(x:unknown,len=120){return typeof x==="string"?x.trim().slice(0,len):"";}
async function permitted(req:Request,action:string,identity:string,limit:number){
  const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if(!ip||!RATE_SALT)return false;
  const key=await sha256(RATE_SALT+":"+action+":"+ip+":"+identity);
  const result=await service.rpc("map360_convite_permitir",{p_chave:key,p_limite:limit});
  return !result.error&&result.data===true;
}
async function authorizeAdmin(req:Request){
  const match=(req.headers.get("authorization")||"").match(/^Bearer (.+)$/i);
  if(!match)return null;
  const userClient=createClient(BASE,ANON,{global:{headers:{Authorization:"Bearer "+match[1]}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await userClient.auth.getUser();
  if(error||!data.user)return null;
  const p=await userClient.from("perfis").select("ativo,administrador").eq("id",data.user.id).maybeSingle();
  if(p.error||!p.data?.ativo||!p.data?.administrador)return null;
  return {id:data.user.id,client:userClient};
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return fail("Método indisponível",405);
 if(req.headers.get("origin")!==SITE_ORIGIN)return fail("Origem não permitida",403);
 if(!BASE||!ANON||!SERVICE||!RATE_SALT||!SITE_ORIGIN)return fail("Serviço não configurado",503);
 let body:Record<string,unknown>;
 try {
  if (Number(req.headers.get("content-length") || 0) > 20000) throw new BodyTooLarge();
  const payload = await readBody(req);
  if (!payload || Array.isArray(payload) || typeof payload !== "object") return fail("Dados inválidos");
  body = payload as Record<string, unknown>;
 } catch (error) {
  return error instanceof BodyTooLarge ? fail("Requisição muito grande", 413) : fail("JSON inválido");
 }
 const action=body.action;
 try{
  if(action==="create"){
   const admin=await authorizeAdmin(req);if(!admin)return fail("Acesso de administrador necessário",403);
   if(!await permitted(req,"create",admin.id,12))return fail("Limite de convites atingido. Tente mais tarde.",429);
   if(!isUuid(body.empresa_id))return fail("Empresa inválida");
   const empresa=await admin.client.from("empresas").select("id").eq("id",body.empresa_id).maybeSingle();
   if(empresa.error||!empresa.data)return fail("Empresa sem permissão de acesso",403);
   const nome=plain(body.participante_nome),finalidade=plain(body.finalidade,50);
   const email=plain(body.email,254),telefone=plain(body.telefone,20).replace(/\D/g,"");
   const expiry=plain(body.expira_em,40);
   if(!nome||nome.length>120||!["desenvolvimento","autoconhecimento","formacao"].includes(finalidade))return fail("Participante ou finalidade inválida");
   if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return fail("E-mail inválido");
   if(telefone&&!/^\d{10,13}$/.test(telefone))return fail("WhatsApp inválido");
   if(!email&&!telefone)return fail("Informe e-mail ou WhatsApp");
   const expiresAt=new Date(expiry),hours=(expiresAt.valueOf()-Date.now())/3600000;
   if(!Number.isFinite(hours)||hours<=0||hours>24*30)return fail("Prazo deve ser futuro e de até 30 dias");
   const tokenBytes=new Uint8Array(32);crypto.getRandomValues(tokenBytes);
   const token=base64Url(tokenBytes),tokenHash=await sha256(token);
   const insert=await service.from("map_convites").insert({
    empresa_id:body.empresa_id,criado_por:admin.id,participante_nome:nome,
    email:email||null,telefone:telefone||null,finalidade,token_hash:tokenHash,
    expira_em:expiresAt.toISOString()
   }).select("id,expira_em").single();
   if(insert.error)throw Error("Não foi possível criar convite");
   // Token is ONLY returned once. Do not log response or persist plaintext token.
   return reply(201,{id:insert.data.id,expira_em:insert.data.expira_em,
    link:new URL("/map360-participar.html#token="+token,SITE_ORIGIN).href});
  }
  if(action==="get_feedback"||action==="save_feedback"){
   const admin=await authorizeAdmin(req);if(!admin)return fail("Acesso de administrador necessário",403);
   if(!isUuid(body.empresa_id)||!isUuid(body.avaliacao_id))return fail("Identificação da avaliação inválida");
   if(!await permitted(req,action,admin.id,80))return fail("Limite de solicitações atingido",429);
   const empresa=await admin.client.from("empresas").select("id").eq("id",body.empresa_id).maybeSingle();
   if(empresa.error||!empresa.data)return fail("Empresa sem permissão de acesso",403);
   const evalu=await admin.client.from("map_avaliacoes").select("id,consentimento_registrado")
     .eq("id",body.avaliacao_id).eq("empresa_id",body.empresa_id).maybeSingle();
   if(evalu.error||!evalu.data)return fail("Avaliação não autorizada",403);
   if(!evalu.data.consentimento_registrado)return fail("Avaliação sem confirmação de privacidade",409);
   const checked=await admin.client.from("map_respostas").select("pergunta_id,nota")
     .eq("empresa_id",body.empresa_id).eq("avaliacao_id",body.avaliacao_id).limit(33);
   if(checked.error||checked.data?.length!==32||
      new Set(checked.data.map(x=>x.pergunta_id)).size!==32||
      checked.data.some(x=>!Number.isInteger(x.nota)||x.nota<1||x.nota>5))
      return fail("Esta avaliação não possui 32 respostas válidas",409);
   if(action==="get_feedback"){
    const result=await service.from("map360_devolutivas")
      .select("status,realizado_em,sintese,compromissos,responsavel,proxima_revisao,atualizado_em")
      .eq("empresa_id",body.empresa_id).eq("avaliacao_id",body.avaliacao_id).maybeSingle();
    if(result.error)throw Error("Não foi possível consultar a devolutiva");
    return reply(200,{devolutiva:result.data||null});
   }
   const status=plain(body.status,20),sintese=plain(body.sintese,4001),
     compromissos=plain(body.compromissos,4001),responsavel=plain(body.responsavel,161);
   const dateOk=(x:unknown)=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
     !Number.isNaN(new Date(x+"T12:00:00Z").valueOf())&&new Date(x+"T12:00:00Z").toISOString().slice(0,10)===x;
   const realizado=body.realizado_em||null,revisao=body.proxima_revisao||null;
   if(!["pendente","realizada","acompanhamento"].includes(status)||sintese.length>4000||
      compromissos.length>4000||responsavel.length>160||
      (realizado!==null&&!dateOk(realizado))||(revisao!==null&&!dateOk(revisao))||
      (status!=="pendente"&&!realizado)||
      (realizado&&revisao&&String(revisao)<String(realizado)))
      return fail("Confira o status, as datas e os textos da devolutiva");
   const result=await service.from("map360_devolutivas").upsert({
      empresa_id:body.empresa_id,avaliacao_id:body.avaliacao_id,status,
      realizado_em:realizado,sintese,compromissos,responsavel,proxima_revisao:revisao,
      atualizado_por:admin.id,atualizado_em:new Date().toISOString()
   },{onConflict:"avaliacao_id"}).select("atualizado_em").single();
   if(result.error)throw Error("Não foi possível salvar a devolutiva");
   return reply(200,{salvo:true,atualizado_em:result.data.atualizado_em});
  }
  if(action==="list"){
   const admin=await authorizeAdmin(req);if(!admin)return fail("Acesso de administrador necessário",403);
   if(!isUuid(body.empresa_id))return fail("Empresa inválida");
   if(!await permitted(req,"list",admin.id,100))return fail("Limite de consultas atingido",429);
   const empresa=await admin.client.from("empresas").select("id").eq("id",body.empresa_id).maybeSingle();
   if(empresa.error||!empresa.data)return fail("Empresa sem permissão de acesso",403);
   // Limita a listagem e não devolve token_hash nem contatos pessoais.
   const result=await service.from("map_convites")
    .select("id,empresa_id,participante_nome,finalidade,estado,criado_em,expira_em,concluido_em,avaliacao_id")
    .eq("empresa_id",body.empresa_id).order("criado_em",{ascending:false}).limit(200);
   if(result.error)throw Error("Não foi possível consultar convites");
   // Status do PDI é consultado apenas depois de validar administrador e empresa.
   const ids=(result.data||[]).filter(c=>c.estado==="concluido"&&c.avaliacao_id).map(c=>c.avaliacao_id);
   let devolutivas=new Map<string,string>();
   if(ids.length){
    const feedback=await service.from("map360_devolutivas")
      .select("avaliacao_id,status").eq("empresa_id",body.empresa_id).in("avaliacao_id",ids);
    if(feedback.error)throw Error("Não foi possível consultar a situação das devolutivas");
    devolutivas=new Map((feedback.data||[]).map(x=>[x.avaliacao_id,x.status]));
   }
   const convites=(result.data||[]).map(c=>({
    ...c,estado_exibicao:c.estado==="pendente"&&new Date(c.expira_em)<=new Date()?"expirado":c.estado,
    devolutiva_status:c.avaliacao_id?(devolutivas.get(c.avaliacao_id)||"pendente"):null
   }));
   return reply(200,{convites,limite:200});
  }
  if(action==="revoke"){
   const admin=await authorizeAdmin(req);if(!admin)return fail("Acesso de administrador necessário",403);
   if(!await permitted(req,"revoke",admin.id,30))return fail("Limite de solicitações atingido",429);
   if(!isUuid(body.id)||!isUuid(body.empresa_id))return fail("Solicitação inválida");
   const empresa=await admin.client.from("empresas").select("id").eq("id",body.empresa_id).maybeSingle();
   if(empresa.error||!empresa.data)return fail("Empresa sem permissão de acesso",403);
   const result=await service.from("map_convites").update({estado:"revogado"})
    .eq("id",body.id).eq("empresa_id",body.empresa_id).eq("estado","pendente").select("id");
   if(result.error)throw Error("Não foi possível revogar o convite");
   if(result.data?.length!==1)return fail("Convite não encontrado ou já encerrado",404);
   return reply(200,{revogado:true});
  }
  if(action==="view"||action==="submit"){
   if(!isToken(body.token))return fail("Link inválido ou incompleto",404);
   const hash=await sha256(body.token);
   if(!await permitted(req,action,"origem",action==="view"?100:40)||
      !await permitted(req,action,hash,action==="view"?60:10))return fail("Muitas tentativas. Tente novamente mais tarde.",429);
   const c=await service.from("map_convites").select("id,participante_nome,finalidade,estado,expira_em")
     .eq("token_hash",hash).maybeSingle();
   if(c.error||!c.data||c.data.estado!=="pendente"||new Date(c.data.expira_em)<=new Date())return fail("Convite expirado, utilizado ou indisponível",404);
   if(action==="view"){
    const qs=await service.from("map_perguntas").select("id,codigo,dimensao,enunciado,ordem")
      .eq("ativa",true).order("ordem");
    if(qs.error||qs.data?.length!==32)throw Error("Questionário indisponível");
    return reply(200,{participante_nome:c.data.participante_nome,finalidade:c.data.finalidade,
     expira_em:c.data.expira_em,perguntas:qs.data});
   }
   const answers=body.respostas;
   if(!Array.isArray(answers)||answers.length!==32||answers.some(a=>!isUuid(a?.pergunta_id)||!Number.isInteger(a.nota)||a.nota<1||a.nota>5))return fail("Responda às 32 questões com notas de 1 a 5");
   if(new Set(answers.map(x=>x.pergunta_id)).size!==32)return fail("Respostas duplicadas");
   if(body.confirmacao_privacidade!==true)return fail("Confirme a leitura do aviso de privacidade");
   const result=await service.rpc("map360_concluir_convite",{
    p_token_hash:hash,p_respostas:answers,p_confirmacao_privacidade:true
   });
   if(result.error)return fail("Não foi possível concluir a avaliação. Verifique o convite e tente novamente.",409);
   return reply(200,{concluido:true,message:"Respostas recebidas. Obrigado por participar."});
  }
  return fail("Ação inválida",404);
 }catch(err){console.error("MAP 360° falha operacional:",err instanceof Error?err.message:"erro");return fail("Serviço temporariamente indisponível",503);}
});
