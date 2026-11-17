# MAP 360 - Roteiro de testes e ativacao do piloto v1.3

A PR numero 1 ainda esta em rascunho. Nenhuma migracao foi aplicada ao Supabase.

## Antes da implantacao
1. Confirmar ambiente e realizar backup com administrador Supabase.
2. Revisar supabase/map360_schema_piloto_v1_3.sql e executar manualmente, preferencialmente em ambiente de desenvolvimento.
3. Cadastrar empresa FICTICIA e associar usuario de TESTE autorizado com UUIDs reais pelo SQL Editor.
4. Executar supabase/map360_verificacao_somente_leitura.sql; verificar politicas RLS e permissoes.

## Testes previstos (nao executados)
| ID | Acao | Resultado esperado |
|---|---|---|
| A1 | Abrir map360-admin.html sem login | Redireciona para login |
| A2 | Login sem vinculo de empresa | Sem acesso a cadastros |
| A3 | Usuario com permissao leitura | So consulta, sem cadastro |
| A4 | Admin empresa A cadastra participante ficticio | Registra na empresa A |
| A5 | Admin empresa A cria avaliacao | Salva rascunho sem respostas |
| A6 | Usuario empresa B tenta ver dados da A (inclusive chamada direta) | Acesso negado |
| A7 | Tentar inserir respostas e pontuacoes | Negado por restricao do piloto |
| A8 | Tentar criar vinculo de acesso pela API do navegador | Acesso negado |
| A9 | Questionario demonstrativo | Sem escrita no Supabase |
| A10 | Reabrir navegador autenticado | Consulta dados do banco permitido |

## Condicoes de liberacao
- Confirmar todos os testes acima em ambiente controlado, em desktop e celular.
- Nenhum dado pessoal real nesta fase.
- Separar formulario publico e acesso administrativo; GitHub Pages NAO impede acesso direto aos arquivos publicados.
- Para convites e resultados reais, implementar servidor seguro/Edge Function, tokens unicos e fluxo de privacidade.
- O MAP 360 permanece experimental e nao deve eliminar candidatos automaticamente.
