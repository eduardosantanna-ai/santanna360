const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const admin=fs.readFileSync('map360-convites-homologacao.html','utf8');
const participant=fs.readFileSync('map360-participar.html','utf8');
const fn=fs.readFileSync('supabase/functions/map360-convites/index.ts','utf8');
const migration=fs.readFileSync('supabase/migrations/20261125_map360_convites_v19.sql','utf8');
for(const [name,html] of [['admin',admin],['participant',participant]]){
 const js=html.match(/<script>([\s\S]*?)<\/script>/);assert(js,name+' script ausente');new vm.Script(js[1]);
}
assert(admin.includes("action:'create'")&&admin.includes("'Authorization':'Bearer '"),'Gerar exige JWT');
assert(admin.includes('wa.me/')&&admin.includes('mailto:'),'Compartilhamento manual');
assert(!admin.includes('[LINK INDIVIDUAL AINDA NÃO IMPLEMENTADO]'),'Placeholder removido');
assert(participant.includes('history.replaceState'),'Token removido da URL visível');
assert(participant.includes("action,token,...data"),'Participante envia token');
assert(fn.includes('crypto.getRandomValues')&&fn.includes('SHA-256'),'Token aleatório e hash');
assert(fn.includes('authorizeAdmin(req)'),'Backend valida permissão');
assert(fn.includes('map360_concluir_convite')&&migration.includes('for update'),'Transação');
assert(migration.includes('revoke all on public.map_convites from anon, authenticated'),'Acesso direto restrito');
assert(migration.includes('revoke all on function public.map360_concluir_convite'),'RPC restrita');
assert(!participant.includes('SERVICE_ROLE_KEY')&&!admin.includes('SERVICE_ROLE_KEY'),'Sem segredo de service_role no HTML');
assert(fn.includes('action==="revoke"')&&fn.includes('.eq("empresa_id",body.empresa_id)'),'Revogação deve estar vinculada à empresa');
assert(fn.includes('MAP360_RATE_SALT')&&fn.includes('map360_convite_permitir'),'Rate limit obrigatório');
assert(fn.includes('req.headers.get("origin")'),'Verificação de origem');
assert(migration.includes('revoke all on public.map360_convite_limites')&&migration.includes('revoke all on function public.map360_convite_permitir'),'Rate limit restrito ao servidor');
console.log('MAP 360° v1.9: sintaxe frontend e invariantes estáticos de segurança aprovados.');
