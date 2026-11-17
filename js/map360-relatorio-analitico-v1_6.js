/* MAP 360°: relatório analítico demonstrativo v1.6.3.
 * Somente dados locais da avaliação, sem requisições de rede.
 */
(function(global){
'use strict';
const dims=[
 {code:'C',name:'Constância',subject:'continuidade, regularidade e persistência',strength:['regularidade nas entregas','persistência diante de dificuldades','foco em tarefas prolongadas','cumprimento de compromissos','manutenção de rotinas','dedicação quando os resultados demoram'],color:'#638d73'},
 {code:'A',name:'Ação',subject:'iniciativa, decisão e execução',strength:['iniciativa para começar','proposição de soluções','decisões sob responsabilidade','transformação de objetivos em ações','busca de alternativas','iniciativa diante de tarefas paradas'],color:'#c7794d'},
 {code:'E',name:'Estrutura',subject:'organização, planejamento e conferência',strength:['organização prévia','conferência de informações','uso de registros','planejamento de etapas','organização de documentos','verificação de critérios de qualidade'],color:'#4c7ea9'},
 {code:'X',name:'Conexão',subject:'comunicação, escuta e colaboração',strength:['compartilhamento de informações','escuta de opiniões diferentes','alinhamento de expectativas','cooperação na solução de problemas','clareza das ideias','relações respeitosas'],color:'#bf943e'}
];
const combination={
 'A,C':'Ação e Constância reúnem iniciativas com continuidade. A observação de tarefas reais pode explorar como a pessoa começa atividades e sustenta sua execução.',
 'C,E':'Constância e Estrutura reúnem regularidade com organização. Em atividades recorrentes, pode ser útil observar como são planejadas, documentadas e acompanhadas.',
 'C,X':'Constância e Conexão reúnem acompanhamento contínuo e colaboração. É útil observar como os compromissos são mantidos quando dependem de alinhamento com colegas.',
 'A,E':'Ação e Estrutura reúnem execução com planejamento. A leitura pode explorar a conciliação entre agilidade, registros e conferência.',
 'A,X':'Ação e Conexão reúnem iniciativa com comunicação. Pode ser útil observar como propostas são debatidas e convertidas em acordos e entregas.',
 'E,X':'Estrutura e Conexão reúnem organização com relacionamento. A análise pode explorar como processos claros e alinhamentos ajudam a coordenar atividades compartilhadas.'
};
const actions={
 C:['Criar registro semanal de entregas.','Dividir tarefa longa em marcos menores.','Criar rotina de acompanhamento de tarefas extensas.','Revisar compromissos e prazos semanalmente.','Definir revisão periódica de rotinas essenciais.','Acompanhar evolução de uma entrega com resultado de longo prazo.'],
 A:['Definir data para iniciar tarefa de baixo risco.','Registrar duas alternativas para problema recorrente.','Combinar limites de autonomia e praticar uma decisão.','Converter um objetivo em três entregas concretas.','Documentar alternativas para remover um obstáculo.','Propor o próximo passo de uma atividade parada.'],
 E:['Usar roteiro de etapas em atividade complexa.','Adotar checklist de conferência.','Testar registro sistemático de tarefas.','Organizar prazos intermediários.','Padronizar organização de documentos.','Registrar critérios de qualidade antes das entregas.'],
 X:['Preparar resumo de informações relevantes.','Praticar escuta e confirmar entendimento.','Registrar expectativas e responsabilidades.','Participar de uma solução cooperativa.','Estruturar comunicações com contexto e próximo passo.','Fazer alinhamentos breves com outras áreas.']
};
function elt(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;}
function para(sec,t){sec.append(elt('p','map-justificado',t));}
function section(root,title,subtitle){
 const sec=elt('section','map-analytic-section');
 sec.append(elt('h2','',title));
 if(subtitle)sec.append(elt('p','map-justificado map-lede',subtitle));
 root.append(sec);return sec;
}
function textList(sec,arr){const ul=elt('ul','map-justificado');for(const x of arr)ul.append(elt('li','',x));sec.append(ul);}
function append(container,data){
 if(!data||!data.calculo||!data.respostas)throw new Error('Relatório requer resultado completo e as 32 respostas.');
 const {calculo,respostas}=data;
 if(Object.keys(respostas).length!==32)throw new Error('São necessárias as 32 respostas.');
 const dimByName=Object.fromEntries(dims.map(d=>[d.name,d]));
 const leaders=calculo.predominancias.map(n=>dimByName[n]).filter(Boolean);
 const scores=Object.fromEntries(calculo.dimensoes.map(d=>[d.nome,d.indice]));
 const selected=leaders.map(d=>d.name).join(' + ');
 container.replaceChildren();
 container.append(elt('div','map-analytic-kicker','SANT’ANNA 360  /  MAP 360°  /  RELATÓRIO ANALÍTICO V1.6.3'));
 let sec=section(container,'1. Apresentação e objetivos','Análise técnica descritiva para reflexão sobre preferências de trabalho, com base nas 32 afirmações do MAP 360°.');
 para(sec,'Este relatório organiza as respostas nas dimensões Constância, Ação, Estrutura e Conexão. Nenhuma pontuação representa capacidade comprovada, adequação a cargo, percentil ou previsão de desempenho. Os exemplos e orientações são hipóteses de desenvolvimento e exigem contextualização com a experiência da pessoa.');
 para(sec,'A avaliação foi concluída no navegador e não é transmitida automaticamente a servidores. O relatório pode ser impresso ou salvo localmente. Recomenda-se preservar a privacidade dos resultados.');

 sec=section(container,'2. Síntese executiva','Visão integrada das frequências autorrelatadas.');
 para(sec,'Resultado principal: '+calculo.titulo+'. '+(calculo.tipo==='combinado'?'Duas dimensões ficaram próximas da maior pontuação; essa combinação orienta a leitura descritiva.':calculo.tipo==='predominante'?'Uma dimensão apresentou maior destaque relativo, sem excluir as outras.':'Três ou quatro dimensões ficaram próximas, sem predominância clara de uma ou duas.'));
 para(sec,'A regra de proximidade de 6,25 pontos foi adotada como critério experimental. Ela não constitui um limite psicométrico validado e poderá mudar nas próximas versões.');

 sec=section(container,'3. Distribuição dos resultados','Comparação das quatro dimensões na escala transformada de 0 a 100.');
 for(const d of dims){
  const line=elt('div','map-analytic-score');
  line.append(elt('strong','',d.name+' — '+scores[d.name].toLocaleString('pt-BR',{maximumFractionDigits:1})+'/100'));
  const track=elt('div','map-analytic-track'),fill=elt('div','map-analytic-fill');fill.style.background=d.color;fill.style.width=scores[d.name]+'%';track.append(fill);line.append(track);sec.append(line);
 }
 para(sec,'Pontuações maiores indicam maior frequência de respostas compatíveis com os comportamentos listados naquela dimensão. Uma pontuação relativamente menor não equivale a deficiência profissional.');

 for(const [dimensionIndex,d] of dims.entries()){
  const direct=Array.from({length:6},(_,i)=>({idx:i,n:respostas[d.code+String(i+1).padStart(2,'0')],label:d.strength[i]}));
  const high=direct.filter(x=>x.n>=4),low=direct.filter(x=>x.n<=2),mid=direct.filter(x=>x.n===3);
  const inv=[7,8].map(i=>respostas[d.code+String(i).padStart(2,'0')]);
  sec=section(container,'4.'+(dimensionIndex+1)+' Leitura da dimensão '+d.name,'Dimensão relacionada a '+d.subject+'.');
  para(sec,'Pontuação desta aplicação: '+scores[d.name].toLocaleString('pt-BR',{maximumFractionDigits:1})+' de 100. Ela é calculada a partir de oito itens, incluindo dois com pontuação invertida. Não deve ser interpretada isoladamente como diagnóstico.');
  para(sec,'Comportamentos declarados com maior frequência: '+(high.length?high.map(x=>x.label).join(', '):'nenhum dos seis itens diretos atingiu frequência elevada')+'.');
  para(sec,'Comportamentos relatados com menor frequência: '+(low.length?low.map(x=>x.label).join(', '):'não houve respostas baixas nos seis itens diretos')+'.');
  if(mid.length)para(sec,'Frequência intermediária foi registrada para: '+mid.map(x=>x.label).join(', ')+'.');
  para(sec,'Os itens de redação invertida receberam respostas '+inv.join(' e ')+'. A pontuação desses itens é corrigida antes de formar o índice. As respostas descrevem apenas situações incluídas neste instrumento.');
  para(sec,'Possível uso na conversa de desenvolvimento: compreender em quais tarefas esses comportamentos aparecem e verificar exemplos concretos, sem atribuir à pessoa um rótulo fixo.');
 }
 sec=section(container,'5. Interpretação do perfil combinado ou predominante','Integração das dimensões mais evidenciadas.');
 const pair=leaders.length===2?leaders.map(x=>x.code).sort().join(','):null;
 para(sec,pair?combination[pair]:leaders.length===1?'A dimensão de maior destaque serve como referência descritiva. As demais dimensões também podem aparecer com frequência relevante em outras situações.':'A distribuição próxima entre várias dimensões recomenda uma leitura multidimensional, evitando destacar apenas uma combinação.');
 para(sec,'Nesta aplicação, o grupo de maior destaque contém '+selected+'. A interpretação completa depende de situações de trabalho, contexto, função e outros dados independentes do questionário.');
 sec=section(container,'6. Comunicação, rotinas e tomada de decisões','Hipóteses de observação para conversas com o participante.');
 textList(sec,['Comunicação: observar exemplos de escuta, compartilhamento de informações e alinhamento de expectativas, sem inferir habilidades sociais fora das perguntas respondidas.','Rotinas: conversar sobre a organização das entregas, o acompanhamento de prazos e a continuidade das tarefas.','Decisões: investigar em quais condições a pessoa prefere agir, planejar ou consultar outras pessoas.','Colaboração: verificar como são negociados acordos e responsabilidades em atividades compartilhadas.']);
 sec=section(container,'7. Orientações ao gestor','Utilização cuidadosa do mapa para ações de desenvolvimento.');
 para(sec,'O gestor pode usar o relatório para orientar uma devolutiva e propor experiências práticas, mas não para estabelecer capacidade profissional, promoção ou eliminação de candidatos. A leitura deve ser corroborada por evidências e diálogo com o participante.');
 textList(sec,['Apresente os resultados como frequências autorrelatadas, não como características permanentes.','Solicite exemplos concretos sem presumir que o questionário revela a personalidade completa.','Combine uma ou duas ações de desenvolvimento apropriadas à função e ao contexto.','Revise o plano com o participante, respeitando confidencialidade e finalidade.']);
 sec=section(container,'8. Plano de Desenvolvimento Individual (PDI)','Sugestões iniciais vinculadas às respostas; a pactuação é opcional e requer revisão humana.');
 const table=elt('table','map-analytic-table map-pdi-table'),thead=elt('thead'),headRow=elt('tr');
 for(const t of ['Foco observado','Ação proposta','Evidência e prazo'])headRow.append(elt('th','',t));
 thead.append(headRow);table.append(thead);
 const tbody=elt('tbody');
 for(const d of leaders.slice(0,2)){
  const entries=Array.from({length:6},(_,i)=>({i,v:respostas[d.code+String(i+1).padStart(2,'0')]})).sort((a,b)=>a.v-b.v||a.i-b.i);
  const x=entries[0],tr=elt('tr');
  for(const t of [d.name+': '+d.strength[x.i]+' (relato '+x.v+'/5)',actions[d.code][x.i],'Registrar evidências em quatro semanas e revisar com o participante.'])tr.append(elt('td','',t));
  tbody.append(tr);
 }
 table.append(tbody);sec.append(table);
 para(sec,'Responsável, prazo definitivo e indicador de sucesso devem ser definidos pelo participante e por seu gestor, não determinados automaticamente pela pontuação.');
 sec=section(container,'9. Acompanhamento e devolutiva','Sugestão de conversa após a avaliação.');
 textList(sec,['Confirmar a finalidade do questionário e as limitações interpretativas.','Revisar com o participante exemplos de atividades relacionadas às dimensões mais evidenciadas.','Escolher ações específicas, factíveis e contextualizadas.','Verificar a evolução por evidências observáveis, e não pelo rótulo do perfil.','Registrar a revisão humana do plano e respeitar a privacidade dos dados.']);
 sec=section(container,'10. Critérios técnicos e limites','Documentação do funcionamento experimental.');
 para(sec,'O MAP 360° possui 32 afirmações, oito em cada dimensão. As respostas vão de 1 a 5 e os itens terminados em 07 ou 08 usam pontuação reversa (6 menos a nota). A soma por dimensão varia de 8 a 40 e é convertida pela fórmula (soma − 8) × 100 / 32.');
 para(sec,'A classificação usa provisoriamente a proximidade de até 6,25 pontos do maior índice. Esta regra não tem validade normativa demonstrada. Os resultados não são percentis e não comprovam desempenho, inteligência, saúde mental, aptidão ou probabilidade de sucesso.');
 para(sec,'Versão: MAP 360° v1.6.3 demonstrativa. Documento emitido automaticamente, sem revisão de especialista individual e sem validação científica concluída.');
 container.append(elt('p','map-analytic-footer','Sant’Anna 360 · MAP 360° · Documento experimental · Uso para desenvolvimento e demonstração'));
}
global.MAP360Analitico={render:append};
})(typeof window!=='undefined'?window:this);
