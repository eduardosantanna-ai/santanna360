# MAP 360° v1.9 — Implantação segura de convites

**Estado: branch de desenvolvimento. NÃO implantado no Supabase. NÃO publicado no domínio como convites reais.**

## Código preparado
- supabase/migrations/20261125_map360_convites_v19.sql: tabela protegida e conclusão transacional
- supabase/functions/map360-convites/index.ts: backend com ações create/view/submit
- map360-convites-homologacao.html: geração via backend e opção de compartilhamento manual
- map360-participar.html: questionário individual com 32 questões

## Implantação segura
1. Revisar os tipos, colunas e constraints reais de empresas, perfis, map_avaliacoes, map_respostas e map_perguntas no Supabase.
2. Aprovar o aviso de privacidade, finalidade, base legal, retenção de dados e canais de contato. O texto atual é provisório.
3. Aplicar a migração PRIMEIRO no ambiente de homologação.
4. Configurar SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY como segredos da Edge Function — nunca no HTML.
5. Implantar a função map360-convites no Supabase. A validação de JWT do administrador ocorre no backend, e participante usa token opaco.
6. Configurar rate limits, auditoria e revogação de convites; validar contra enumeração e abuso.
7. Testar duas empresas e usuários distintos: RLS, create, view, submit, expiração, duplicidade e acesso negado entre empresas.
8. Publicar interface somente depois da aprovação. Enquanto isso, manter homologação atual intacta.

## Resumo do fluxo
Administrador autenticado seleciona empresa e participante, confirma geração; servidor verifica as permissões via Supabase e emite token aleatório, guardando apenas SHA-256. Link único é compartilhado manualmente pelo administrador por WhatsApp ou e-mail. Participante lê o aviso, responde 32 perguntas e envia. Transação no banco cria avaliação e respostas e encerra o token. Relatório fica acessível somente na área restrita após testes de RLS.

## Pendências
- Verificar migração contra esquema real de produção.
- Finalizar política de privacidade e critérios de retenção.
- Rate limiting em create/view/submit e revogação administrativa.
- Testes funcionais e de segurança com duas empresas.
- Implantar Supabase Edge Function e conectar domínio.

**MAP 360° permanece um instrumento experimental, não validado para contratação ou decisões automatizadas.**
