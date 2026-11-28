# Privacidade do MAP 360°

Eduardo Sant’Anna é o responsável pelo atendimento de privacidade da Sant’Anna 360. Canal: contato@santanna360.com.br.

## Identificação dos responsáveis

Em avaliações próprias, a Sant’Anna 360 é controladora quando decide a finalidade e os meios essenciais. Nos projetos em que a empresa cliente define esses elementos e a Sant’Anna 360 atua sob suas instruções, a empresa é controladora e a Sant’Anna 360 é operadora. Se houver decisão conjunta sobre a finalidade e os elementos essenciais, revisar os papéis conforme a operação. O convite e o aviso devem identificar a organização controladora aplicável. A caixa do questionário registra a leitura do aviso. Definir e documentar a base legal por finalidade antes de operar com dados reais.

## Prazos propostos para aprovação

| Dados | Prazo operacional proposto |
| --- | --- |
| Contato e vínculo do convite | Até 30 dias após conclusão, expiração ou revogação. Preservar somente o registro mínimo necessário para controle, sem o contato. |
| Respostas e Relatório Analítico | Até 12 meses após a conclusão, com descarte antes desse prazo se a finalidade se encerrar e não houver motivo legítimo de conservação. |
| Devolutiva e PDI | Até 12 meses após o encerramento do acompanhamento. Revisar casos sem data de encerramento e avaliar separadamente a necessidade de manter as respostas originais. |

Os prazos são propostas operacionais, sujeitos a confirmação por finalidade e por contrato. Documentar exceções legais de conservação, restringir o acesso aos dados retidos e revisar a data de descarte. A rotina de descarte foi testada com dados fictícios em homologação e só pode ser chamada pelo backend. O agendamento permanece desativado. Antes de publicar a política, definir o tratamento de cópias exportadas e backups e o registro das operações de exclusão. Para relatórios exportados, orientar o destinatário autorizado a seguir o prazo acordado e controlar o acesso ao arquivo.

## Execução e exceções

- Registrar a data de encerramento na ficha quando o acompanhamento terminar. Uma ficha em aberto ou ainda dentro do prazo mantém a avaliação vinculada. Revisar periodicamente fichas em aberto e registrar o motivo quando houver necessidade de conservar a avaliação além do prazo padrão.
- Avaliações anteriores ao fluxo de convites permanecem fora da rotina. Para convites revogados antes de existir registro da data de revogação, usa-se a expiração prevista como referência conservadora. Depois do descarte do contato de convites sem avaliação, o nome do participante é substituído por um texto neutro.
- A função `map360_aplicar_retencao()` devolve contagens de contatos removidos, fichas excluídas e avaliações excluídas. A exclusão da avaliação também remove suas respostas e o convite associado pelas chaves estrangeiras. O relatório consultado na plataforma é calculado a partir das respostas.
- Antes de agendar a execução com dados reais, revisar as exceções de conservação aplicáveis a cada operação e definir como suspender uma exclusão quando houver obrigação de preservar dados. Nenhum arquivo exportado é apagado pela função.

## Procedimento de conservação e descarte

**Responsável operacional.** Eduardo Sant’Anna coordena o registro e a revisão pelo canal contato@santanna360.com.br. Quando a empresa cliente for a controladora, registrar a decisão ou instrução dela antes de descartar ou prorrogar a conservação.

### Exceções de conservação

1. Registrar em área restrita o código da empresa e os identificadores dos registros afetados, o motivo e seu fundamento, o aprovador, a data de início e a data de revisão. Limitar a exceção aos dados necessários. Revisar a cada 90 dias ou antes, se a obrigação terminar.
2. Conferir o registro de exceções antes de cada execução. Como a função atual atua sobre todo o conjunto elegível e não consulta exceções, suspender a execução se houver registro protegido elegível. Retomar somente quando houver um filtro testado ou quando a exceção deixar de se aplicar. Revisar fichas de PDI em aberto na mesma conferência.
3. Registrar data, responsável, escopo e contagens de descarte. Guardar a evidência em área restrita, sem copiar respostas, contatos ou PDFs para o registro operacional.

### Backups

- Inventariar as cópias do Supabase e eventuais exportações manuais. Registrar prazo efetivo de rotação, acesso e responsável. Confirmar a configuração real antes de comunicar prazos aos participantes.
- Restringir os backups à recuperação autorizada. Em caso de restauração, usar ambiente isolado, conferir as exceções vigentes e reaplicar os descartes já registrados antes de reabrir o acesso. Validar a restauração com dados fictícios antes da primeira execução em produção.

### PDFs exportados

- Exportar apenas quando necessário à devolutiva. Incluir o anexo de PDI somente quando for útil ao destinatário autorizado. Usar armazenamento com acesso restrito e registrar destinatário, local da cópia e data de revisão ou descarte.
- Aplicar às cópias o prazo acordado para o conteúdo. Se um PDF combinar relatório e PDI, revisar o arquivo no primeiro vencimento. Se apenas o PDI precisar ser preservado, gerar uma versão com os dados necessários e eliminar o PDF original onde houver controle sobre a cópia.
- Para arquivos enviados à empresa cliente, encaminhar a instrução de descarte ao responsável e registrar a confirmação ou pendência. A exclusão no Supabase não remove arquivos baixados.

## Pedidos dos participantes

Receber pelo canal oficial, registrar data e assunto, confirmar a identidade com dados proporcionais, encaminhar à empresa controladora quando aplicável e registrar a resposta e as providências. Evitar solicitar respostas do questionário ou documentos pessoais por e-mail quando houver outra forma de verificação.

Referências: [LGPD](https://planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) e [Guia de agentes de tratamento da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_agentes_de_tratamento_e_encarregado___defeso_eleitoral.pdf).
