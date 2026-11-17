/* MAP 360° — Motor de pontuação puro v1.3 (piloto)
 * Constância, Ação, Estrutura, Conexão. Sem dependências de rede.
 * Utilizar SOMENTE em avaliações experimentais; nenhum uso eliminatório.
 * Entrada: objeto {C01: 1..5, ..., X08: 1..5}.
 * Cada dimensão soma 8..40 e é transformada (soma-8)*100/32.
 * Itens 07 e 08 de cada dimensão possuem pontuação reversa.
 * Limiar ilustrativo entre dimensões: 6.25 pontos na escala 0..100.
 */
(function(global) {
  'use strict';
  const DIMENSOES=Object.freeze([
    Object.freeze({id:'constancia',nome:'Constância',prefixo:'C'}),
    Object.freeze({id:'acao',nome:'Ação',prefixo:'A'}),
    Object.freeze({id:'estrutura',nome:'Estrutura',prefixo:'E'}),
    Object.freeze({id:'conexao',nome:'Conexão',prefixo:'X'})
  ]);
  const LIMIAR_PILOTO=6.25;
  function calcular(respostas){
    if(!respostas || typeof respostas!=='object' || Array.isArray(respostas)) {
      throw new Error('Respostas devem formar um objeto com as 32 notas.');
    }
    const esperadas=new Set(DIMENSOES.flatMap(d=>Array.from({length:8},(_,i)=>d.prefixo+String(i+1).padStart(2,'0'))));
    const recebidas=Object.keys(respostas);
    if(recebidas.length!==32 || recebidas.some(k=>!esperadas.has(k))){
      throw new Error('Informe exatamente as 32 questões C01..C08, A01..A08, E01..E08, X01..X08.');
    }
    const dimensoes=DIMENSOES.map(d=>{
      const itens=Array.from({length:8},(_,i)=>{
        const codigo=d.prefixo+String(i+1).padStart(2,'0');
        const nota=respostas[codigo];
        if(!Number.isInteger(nota) || nota<1 || nota>5){
          throw new Error('Nota inválida em '+codigo+': informe um inteiro entre 1 e 5.');
        }
        const invertida=i>=6;
        return {codigo,nota,notaCorrigida:invertida?6-nota:nota,invertida};
      });
      const soma=itens.reduce((v,it)=>v+it.notaCorrigida,0);
      return {id:d.id,nome:d.nome,pontosBrutos:soma,indice:(soma-8)*100/32,itens};
    });
    const ordenadas=[...dimensoes].sort((a,b)=>b.indice-a.indice);
    const maximo=ordenadas[0].indice;
    const principais=ordenadas.filter(d=>maximo-d.indice<=LIMIAR_PILOTO);
    return {
      versao:'1.3-piloto',
      instrumento:'MAP 360°',
      dimensoes,
      tipo:principais.length===1?'predominante':principais.length===2?'combinado':'multidimensional',
      predominancias:principais.map(d=>d.nome),
      titulo:principais.length===1
       ?'Predominância em '+principais[0].nome
       : principais.length===2
       ?'Perfil combinado: '+principais.map(d=>d.nome).join(' + ')
       :'Perfil multidimensional',
      limiarPiloto:LIMIAR_PILOTO,
      observacao:'Classificação experimental, não validada. Não representa diagnóstico psicológico, percentil ou previsão de desempenho.'
    };
  }
  const api=Object.freeze({DIMENSOES,LIMIAR_PILOTO,calcular});
  if(typeof module!=='undefined' && module.exports){module.exports=api;}
  else {global.MAP360Motor=api;}
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:this);
