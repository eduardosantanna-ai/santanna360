# MAP 360° — Fluxo seguro de convites individuais (proposta v1.8)

**Estado:** especificação para implantação e homologação, sem envio habilitado.

## Fluxo do gestor
1. Autenticar e escolher empresa à qual tem permissão de gestão.
2. Cadastrar finalidade da avaliação, contato e prazo de expiração.
3. Confirmar que o participante recebeu a informação de privacidade e que existe base legal adequada para tratamento de dados; não presumir consentimento pelo gestor.
4. Criar convite por função segura no servidor, que valida o papel do usuário, gera token aleatório forte e registra somente seu hash.
5. Entregar link individual por email ou WhatsApp em ação explícita do gestor (sem envio em massa nesta fase).
6. No primeiro acesso, convidado confirma identidade e lê aviso de finalidade e privacidade; se houver aceite exigido pela base legal, registrar versão e data.
7. Respostas transitam somente por endpoint seguro, com vínculo a uma única avaliação da empresa do convite.
8. Concluir somente com 32 respostas válidas. Gerar relatório pelo motor MAP 360° com revisão autorizada e acesso segregado.

## Requisitos de segurança
- Usar Supabase Edge Function ou backend equivalente; nunca colocar service_role no HTML público.
- Tokens opacos gerados no servidor com fonte criptográfica, hash armazenado, prazo curto, revogação e uso único (ou sessão restrita com controle de tentativas).
- Proteger token de vazamento em logs, analytics, cabeçalho Referer e páginas externas; política referrer=no-referrer.
- Fazer leitura e gravação sob controles de autorização vinculados ao convite, não depender só de código do frontend.
- Implementar limites de tentativas, política de retenção, exclusão e auditoria por empresa.
- Separar administradores da empresa, participantes e consultores, com teste de RLS entre empresas.
- Não aplicar o instrumento piloto como filtro eliminatório nem alegar validade psicométrica.

## Estrutura existente confirmada
- public.map_avaliacoes: id, empresa_id, colaborador_id (opcional), participante_nome, finalidade, consentimento_registrado, criado_por, criado_em.
- public.map_perguntas: id, codigo, dimensao, enunciado, ordem, ativa. 32 registros cadastrados.
- public.map_respostas: id, empresa_id, avaliacao_id, pergunta_id, nota (1 a 5).
- Políticas existentes usam s360_acesso e s360_admin, que ainda precisam de testes práticos entre duas empresas.

## Plano incremental
- Fase A: especificação e interface de convite em rascunho, sem dados reais.
- Fase B: migração de convites revisada com administrador do banco; implementar endpoint de criação/validação e testes.
- Fase C: testes end-to-end com duas empresas fictícias e usuários distintos.
- Fase D: habilitar envio individual real, sob autorização e revisão de privacidade.

## Modelo de mensagem (somente após link individual válido)
Olá! Você foi convidado(a) a participar da avaliação MAP 360° da Sant’Anna 360, um instrumento experimental de mapeamento de preferências comportamentais. O questionário contém 32 afirmações. Antes de iniciar, consulte as informações sobre finalidade, privacidade e tratamento das respostas no próprio convite. Acesse seu link individual: [LINK_SEGURO]. Em caso de dúvidas, responda a esta mensagem.

Não usar o link de demonstração pública como se fosse um convite individual com armazenamento de respostas.
