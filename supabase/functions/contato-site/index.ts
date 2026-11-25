// Supabase Edge Function contato-site. Precisa RESEND_API_KEY, CONTACT_RATE_SALT e CONTACT_FROM_EMAIL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const allowedOrigin="https://www.santanna360.com.br";
const cors={"Access-Control-Allow-Origin":allowedOrigin,"Access-Control-Allow-Headers":"content-type,apikey,x-client-info",
"Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store","Vary":"Origin"};
const res=(status:number,obj:unknown)=>new Response(JSON.stringify(obj),{status,headers:{...cors,"Content-Type":"application/json;charset=utf-8"}});
const env=(key:string)=>Deno.env.get(key)||"";
const field=(obj:unknown,max:number)=>typeof obj==="string"?obj.trim().slice(0,max):"";
const subjects=new Set(["Diagnóstico organizacional","Consultoria em RH","Departamento Pessoal","Controladoria e Finanças","Outros assuntos"]);
async function hash(s:string){const v=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return Array.from(new Uint8Array(v),b=>b.toString(16).padStart(2,"0")).join("")}
Deno.serve(async(request)=>{
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(request.method!=="POST")return res(405,{error:"Método não permitido"});
 if(request.headers.get("origin")!==allowedOrigin)return res(403,{error:"Origem não permitida"});
 const key=env("RESEND_API_KEY"),salt=env("CONTACT_RATE_SALT"),from=env("CONTACT_FROM_EMAIL");
 const url=env("SUPABASE_URL"),secret=env("SUPABASE_SERVICE_ROLE_KEY");
 if(!key||!salt||!from||!url||!secret)return res(503,{error:"O envio direto ainda não está disponível."});
 let data:Record<string,unknown>;
 try{if(Number(request.headers.get("content-length")||0)>6000)return res(413,{error:"Mensagem muito grande"});data=await request.json();if(!data||typeof data!=="object"||Array.isArray(data))throw Error("JSON inválido")}catch{return res(400,{error:"Dados inválidos"})}
 if(data.website)return res(200,{accepted:true});
 const nome=field(data.nome,120),email=field(data.email,180),empresa=field(data.empresa,160);
 const assunto=field(data.assunto,80),mensagem=field(data.mensagem,3000);
 if(nome.length<2||!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!subjects.has(assunto)||
 mensagem.length<10||field(data.nome,121).length>120||field(data.mensagem,3001).length>3000)
 return res(422,{error:"Confira nome, e-mail, assunto e mensagem."});
 const ip=request.headers.get("cf-connecting-ip")||request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
 if(!ip)return res(503,{error:"Não foi possível validar sua solicitação."});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const rate=await db.rpc("s360_contato_permitir",{p_hash:await hash(salt+":"+ip)});
 if(rate.error)return res(503,{error:"Não foi possível validar o envio."});
 if(rate.data!==true)return res(429,{error:"Limite de mensagens atingido. Tente mais tarde."});
 const content="Nome: "+nome+"\nE-mail: "+email+"\nEmpresa: "+(empresa||"Não informada")+"\nAssunto: "+assunto+"\n\nMensagem:\n"+mensagem;
 const response=await fetch("https://api.resend.com/emails",{method:"POST",
 headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
 body:JSON.stringify({from:from,to:["contato@santanna360.com.br"],reply_to:email,
 subject:"Sant'Anna 360 — "+assunto,text:content})});
 if(!response.ok){console.error("Provedor de e-mail indisponível",response.status);return res(502,{error:"Não foi possível encaminhar sua mensagem."})}
 const out=await response.json().catch(()=>null);
 if(!out?.id)return res(502,{error:"O provedor não confirmou o envio."});
 return res(200,{accepted:true,message:"Mensagem encaminhada com sucesso."});
});
