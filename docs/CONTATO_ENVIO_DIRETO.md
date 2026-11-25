# Sant’Anna 360 — Envio direto pelo formulário (homologação)

**Situação:** implementação preparada em branch de revisão. Não foi publicado nem implantado no Supabase.

## Arquivos
- index.html: botão Enviar mensagem, solicitação via Edge Function, mensagens de sucesso e falha.
- supabase/functions/contato-site/index.ts: processamento público com validação de origem, honeypot, limite de três tentativas por IP por hora e envio via API Resend.
- supabase/migrations/20261125_contato_limite.sql: tabela de controle de tentativas, RLS e função privilegiada.

## Pré-requisitos obrigatórios de ativação
1. Confirmar que a caixa destinatária contato@santanna360.com.br está ativa e recebendo mensagens.
2. Cadastrar/verificar o domínio de envio no Resend (SPF/DKIM conforme orientações do provedor), definindo um remetente do domínio autorizado no segredo CONTACT_FROM_EMAIL.
3. Configurar na Supabase Edge Function os segredos RESEND_API_KEY, CONTACT_RATE_SALT (valor aleatório e secreto com pelo menos 32 bytes), CONTACT_FROM_EMAIL, SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY. Nunca colocá-los no HTML ou commitar segredos.
4. Aplicar e revisar a migração em homologação; testar a função s360_contato_permitir e os privilégios.
5. Publicar a Edge Function contato-site com verificação JWT da plataforma desabilitada (--no-verify-jwt); ela é uma função pública, com controles próprios de origem e rate limit.
6. Configurar CAPTCHA/Turnstile ou controle adicional de abuso para exposição pública e revisar privacidade/retenção. Origem CORS não é proteção suficiente contra bots.
7. Testar envio real para a caixa destinatária (entrega, bounce, reply-to), além dos caminhos 422/429/502/503, em uma página de homologação.
8. Publicar o index.html **apenas após** o serviço estar funcionando; sem backend o formulário mostraria erro e prejudicaria contatos comerciais.

## Limitações
Os testes de código verificam a estrutura, não a entrega de e-mails. Não foi enviado nenhum e-mail real.
A página atual em produção permanece com mailto até a ativação segura.
