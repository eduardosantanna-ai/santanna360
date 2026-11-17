# MAP 360° — Roteiro de testes v1.3 (tabelas existentes)

**Estado:** protótipo não publicado; GitHub PR #1 em rascunho. O banco de produção **já possui** as tabelas empresas, colaboradores, map_perguntas, map_avaliacoes e map_respostas. Não executar a migração antiga `supabase/map360_schema_piloto_v1_3.sql` (arquivo desativado). Não executar `map360_verificacao_somente_leitura.sql` antigo, pois é voltado às tabelas paralelas.

## Testes sem escrita: executáveis após revisão do responsável
1. Abrir `map360-admin.html` na ramificação de desenvolvimento/ambiente de staging, sem estar logado. Esperado: redirecionamento para login.
2. Entrar com usuário autorizado, verificar a lista de empresas permitidas.
3. Verificar contagem das 32 perguntas (8 por dimensão).
4. Trocar a empresa autorizada e verificar contagem das avaliações visíveis.
5. Usuário sem vínculo deve visualizar zero empresas, nenhuma avaliação.
6. Com duas empresas fictícias e usuários de teste distintos, confirmar isolamento RLS para cada papel com testes de API (seleção, inserção, alteração e exclusão), em **ambiente de homologação**, não diretamente no banco em produção.
7. Verificar que não existem cadastros nem envio de respostas na página administrativa.
8. Testar navegador desktop e celular, visualização de erros e saída de sessão.

## Itens pendentes antes de criar avaliações reais
- Conferir todas as colunas, constraints e FKs de `map_avaliacoes`, `map_respostas` e `map_perguntas`.
- Examinar permissões RLS completas, incluindo função s360_admin e s360_acesso e testes contra acessos cruzados.
- Implementar aplicação segura de avaliação vinculada a empresa e consentimento/finalidade.
- Verificar LGPD, tempo de retenção, autorização de acesso a relatórios e aderência metodológica.
- Integrar motor de cálculo v1.3 e persistência somente após passar pelos testes.

## Status até aqui
- As 32 perguntas já foram cadastradas pelo usuário em produção, com 8 por dimensão.
- O motor de cálculo está salvo em `js/map360-motor-v1_3.js`; testes em `tests/map360-motor-v1_3.test.js`.
- Os testes unitários estão escritos, mas ainda não existe evidência de execução na CI.
- `map360-admin.html` **somente consulta** `empresas`, `map_perguntas`, `map_avaliacoes`.
- Nenhum merge, deploy ou alteração de SQL foi feita neste passo.
