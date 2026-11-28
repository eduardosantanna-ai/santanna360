# MAP 360° v1.9 — Homologação de convites

O PR #10 permanece em rascunho. O projeto principal foi consultado em modo de leitura. As duas migrações e a Edge Function foram implantadas exclusivamente no projeto Supabase separado de homologação (`reqquwehcizyzzkorhjm`), com dados fictícios.

## Banco e permissões

O banco atual tem 32 perguntas ativas com códigos válidos, oito para cada dimensão: **Constância**, **Ação**, **Estrutura** e **Conexão**. A RLS de avaliações e respostas usa `s360_acesso`. Usuários vinculados ficam limitados às empresas autorizadas e o administrador global ativo mantém acesso a todas as empresas, como previsto no modelo atual.

- `20261125_map360_convites_v19.sql` cria convites e controle de volume de requisições. A rotina transacional bloqueia o convite para validar e gravar uma avaliação, suas 32 respostas e o encerramento do link.
- `20261127_map360_devolutivas_v19.sql` cria uma ficha por avaliação. A chave estrangeira composta vincula convite concluído e devolutiva à avaliação da mesma empresa.
- A Edge Function confere o usuário e o perfil ativo no Supabase em cada ação administrativa. O acesso direto às tabelas de convites e devolutivas e às rotinas de conclusão e rate limit fica restrito ao backend.
- O participante usa um token aleatório de uso único. O servidor guarda apenas o hash. Listagem e relatórios não reapresentam o link original.
- O relatório exige uma avaliação autorizada e 32 respostas válidas. A ficha registra a situação, a data e a síntese da devolutiva, os compromissos de PDI, o responsável e a próxima revisão. É possível anexar a ficha salva ao imprimir o relatório.

## Testes locais

Na raiz do repositório, com Node.js 24:

```sh
npm ci --prefix tests
node tests/map360-convites-v1_9.test.js
node tests/map360-homologacao.test.cjs
node tests/map360-edge.test.cjs
```

A suíte aplica as duas migrações em PostgreSQL local, com o recorte de esquema e RLS em `tests/map360-schema-homologacao.sql` e dados fictícios. Verifica permissões por empresa, rejeição de convites expirados e revogados, gravação das 32 respostas, recusa à reutilização, vínculo da devolutiva/PDI e renderização das dez seções do relatório. O teste do handler simula Auth e a API de dados do Supabase. As duas tentativas locais de consumo são enfileiradas pelo cliente de teste. O teste de concorrência real requer conexões independentes no ambiente isolado.

## Homologação hospedada

O projeto principal não possui branches. Como o Supabase exige plano Pro para esse recurso, foi criado um projeto separado em São Paulo. Em homologação, foram confirmados o login real, os bloqueios entre empresas via API, a geração, listagem e revogação do convite, as 32 respostas e a gravação de devolutiva/PDI. Duas submissões HTTP simultâneas produziram uma única conclusão.

A versão de teste da Edge Function usa a origem `http://localhost:4173` e uma chave de rate limit derivada do segredo do próprio projeto de homologação. Nenhum segredo foi incluído no código versionado. Para repetir o teste hospedado, defina `MAP360_TEST_URL`, `MAP360_TEST_ORIGIN`, `MAP360_TEST_KEY` e `MAP360_TEST_CREDENTIALS` (arquivo local com administrador e dois editores fictícios) antes de rodar `node tests/map360-supabase-homologacao.test.cjs`.

Para preparar um novo ambiente ou repetir a configuração:

1. Reproduzir o esquema e as políticas no destino isolado, cadastrar duas empresas e criar contas de teste com vínculos distintos e um administrador global. Aplicar as migrações em ordem, executar os advisors e conferir as permissões de API e RPC.
2. Configurar `MAP360_SITE_ORIGIN` com a origem exata do site de homologação, na raiz do domínio, e `MAP360_RATE_SALT` com segredo forte. A função também utiliza `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` do próprio ambiente.
3. Implantar `map360-convites` com `verify_jwt=false` no gateway, pois o participante usa token de convite sem conta. A função valida JWT nas ações administrativas e o token nas ações do participante.
4. Na cópia estática de homologação, configurar `js/s360-supabase-config.js` com a URL e a chave publicável do projeto isolado e a origem da interface. Usar a mesma origem da Edge Function. A configuração versionada só permite o projeto principal nos domínios indicados no próprio arquivo.
5. Testar no navegador o login, a criação, listagem e revogação, a resposta às 32 questões, a abertura do relatório pelo convite, o PDF com e sem PDI e a recuperação da devolutiva após recarregar. Repetir com usuários de empresas distintas e duas solicitações simultâneas. Verificar o cabeçalho de IP confiável fornecido pelo gateway, a aplicação dos limites de requisições e o comportamento CORS no domínio real.

## Pendências para produção

- Confirmar a política de privacidade e retenção de contatos, respostas e devolutivas. Antes de promover para produção, repetir o teste de CORS e rate limit na origem definitiva.
- Revisar os avisos existentes do Supabase sobre exposição de `s360_admin` e `s360_acesso` via RPC e a proteção de senhas vazadas. As políticas e funções existentes não foram modificadas.
