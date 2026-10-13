import { Document, Page } from '@react-pdf/renderer';
import { EMPRESA_COM_OBSERVACAO_TECNICA, type TipoRelatorioDeFogo } from '@/lib/relatorios/fogo';
import type { Projeto } from '@/schemas/projeto';
import { criarEstilos, type EstilosDoRelatorio } from './estilos';
import type { LogoVetorial } from './logoEmulog';
import { CabecalhoDoFogo, Rodape } from './secoes/Moldura';
import { Amostras, InformacoesDaOperacao, ObservacaoDoProjeto, ObservacaoTecnica, RegistroFotografico } from './secoes/SecoesDoFogo';
import { ResumoDosFuros, TabelaDeFuros } from './secoes/SecoesDeFuros';

export interface FogoDoRelatorio {
  projeto: Projeto;
  fotos: string[];
}

export interface DocumentoDeFogosProps {
  tipos: TipoRelatorioDeFogo[];
  fogos: FogoDoRelatorio[];
  cor: string;
  logoEmpresa: string | null;
  logoEmulog: LogoVetorial | null;
  geradoEm: Date;
}

function ConteudoDoFogo({ fogo, estilos }: { fogo: FogoDoRelatorio; estilos: EstilosDoRelatorio }) {
  const { projeto, fotos } = fogo;
  return (
    <>
      <InformacoesDaOperacao info={projeto.informacoesOperacao} estilos={estilos} />
      {projeto.companyId === EMPRESA_COM_OBSERVACAO_TECNICA && <ObservacaoTecnica estilos={estilos} />}
      <ObservacaoDoProjeto texto={projeto.informacoesOperacao?.informacoesGerais} estilos={estilos} />
      <Amostras amostras={projeto.amostras} quantidade={projeto.quantidadeAmostras} estilos={estilos} />
      <RegistroFotografico fotos={fotos} estilos={estilos} />
    </>
  );
}

function ConteudoDeFuros({ projeto, estilos }: { projeto: Projeto; estilos: EstilosDoRelatorio }) {
  if (!projeto.furos) return null;
  return (
    <>
      <ResumoDosFuros furos={projeto.furos} estilos={estilos} />
      <ObservacaoDoProjeto texto={projeto.informacoesOperacao?.informacoesGerais} estilos={estilos} />
      <TabelaDeFuros furos={projeto.furos} estilos={estilos} />
    </>
  );
}

export function DocumentoDeFogos({ tipos, fogos, cor, logoEmpresa, logoEmulog, geradoEm }: DocumentoDeFogosProps) {
  const estilos = criarEstilos(cor);
  return (
    <Document title={fogos.length === 1 ? fogos[0].projeto.nomeProjeto : 'Relatório de fogos'} author="Emulog">
      {fogos.flatMap((fogo) =>
        tipos
          .filter((tipo) => tipo === 'fogo' || fogo.projeto.furos)
          .map((tipo) => (
            <Page key={`${fogo.projeto.id}-${tipo}`} size="A4" style={estilos.pagina}>
              <CabecalhoDoFogo projeto={fogo.projeto} logoEmpresa={logoEmpresa} logoEmulog={logoEmulog} estilos={estilos} />
              {tipo === 'fogo' ? <ConteudoDoFogo fogo={fogo} estilos={estilos} /> : <ConteudoDeFuros projeto={fogo.projeto} estilos={estilos} />}
              <Rodape logoEmulog={logoEmulog} geradoEm={geradoEm} estilos={estilos} />
            </Page>
          ))
      )}
    </Document>
  );
}
