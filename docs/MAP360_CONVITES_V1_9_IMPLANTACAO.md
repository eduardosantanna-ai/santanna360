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
4. Configurar SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY e MAP360_RATE_SALT (segredo aleatório forte) como segredos da Edge Function — nunca no HTML.
5. Implantar a função map360-convites no Supabase. A validação de JWT do administrador ocorre no backend, e participante usa token opaco.
6. Testar o limite de tentativas incluído na migração e na Edge Function (criação, consulta, envio e revogação). Implantar controles adicionais de borda, observabilidade e auditoria de eventos. Verificar o cabeçalho IP confiável fornecido pelo gateway.
7. Testar duas empresas e usuários distintos: RLS, create, view, submit, expiração, duplicidade e acesso negado entre empresas.
8. Publicar interface somente depois da aprovação. Enquanto isso, manter homologação atual intacta.

## Resumo do fluxo
Administrador autenticado seleciona empresa e participante, confirma geração; servidor verifica as permissões via Supabase e emite token aleatório, guardando apenas SHA-256. Link único é compartilhado manualmente pelo administrador por WhatsApp ou e-mail. Participante lê o aviso, responde 32 perguntas e envia. Transação no banco cria avaliação e respostas e encerra o token. Relatório fica acessível somente na área restrita após testes de RLS.

## Pendências
- Verificar migração contra esquema real de produção.
- Finalizar política de privacidade e critérios de retenção.
- Interface administrativa para listar convites por empresa e permitir a revogação; endpoint revoke já preparado.
- Validar o mecanismo de rate limiting com o cabeçalho de IP real do gateway e configurar mitigação para abuso distribuído.
- Testes funcionais e de segurança com duas empresas.
- Implantar a migração e a Supabase Edge Function e conectar domínio.
- Testar a correspondência dos tipos e constraints do banco real com a migração (sem acesso ao projeto nesta etapa).
- Política de contatos e descarte de dados pessoais em conformidade com a LGPD.

**MAP 360° permanece um instrumento experimental, não validado para contratação ou decisões automatizadas.**

## Painel de acompanhamento e devolutiva (incluído na homologação)
- A tela de convites permite selecionar empresa, listar até 200 convites por data e visualizar participante, finalidade, criação, vencimento e status (pendente, concluído, expirado ou revogado).
- Gestor administrador pode solicitar revogação de convite pendente via endpoint autorizado; o link é invalidado sem expor token.
- Para convites concluídos, o botão **Relatório completo** direciona à área restrita com empresa e avaliação selecionadas. A consulta exige autenticação, perfil administrador ativo, autorização de empresa via RLS e 32 respostas válidas.
- O relatório analítico preserva as dez seções (incluindo quatro dimensões, PDI e orientações de devolutiva) e identifica o participante na impressão PDF.
- Não há envio automático do relatório ao convidado; a devolutiva será conduzida pelo profissional responsável.
- A lista não fornece link original novamente; o token só é apresentado no ato da geração por segurança.
- O estado 'concluído' depende do registro transacional das 32 respostas.
- Nenhum desses recursos está implantado no Supabase ou publicado para uso real até testes de homologação.

## Registro de devolutiva e PDI — extensão da homologação

- Migração adicional: `supabase/migrations/20261127_map360_devolutivas_v19.sql`. Uma ficha por avaliação, vinculada à empresa, com situação, data da devolutiva, síntese, compromissos do PDI, responsável, próxima revisão e atualização.
- A Edge Function `map360-convites` disponibiliza `get_feedback` e `save_feedback` somente para administrador autenticado e empresa acessível. O servidor também verifica que a avaliação pertence à empresa e que existem 32 respostas válidas.
- A área restrita mostra o formulário **Registro da devolutiva e acompanhamento do PDI** após consultar o Relatório Analítico completo. O registro é separado das respostas originais: a devolutiva não modifica as pontuações.
- A funcionalidade continua **não implantada** no Supabase e **não publicada** no site principal. A migração deve ser revisada contra o esquema existente, as rotinas e permissões devem ser testadas com duas empresas, e os dados pessoais precisam de regras definidas de retenção.
- A devolutiva deve ser conduzida por responsável humano e pactuada com o participante. O MAP 360° permanece experimental, sem comprovação de aptidão ou diagnóstico.

## Impressão do relatório e anexo da devolutiva
- O Relatório Analítico mantém as dez seções existentes.
- O administrador poderá selecionar **Incluir no PDF a devolutiva e o PDI já registrados**. O anexo será gerado somente a partir de dados previamente recuperados ou salvos no Supabase para a avaliação autorizada.
- O anexo é opcional e contém situação, data, responsável, síntese, compromissos e próxima revisão. Sem dados gravados, a opção não adicionará informações fictícias.
- A opção não dispara e-mail ao participante e não altera o questionário.
