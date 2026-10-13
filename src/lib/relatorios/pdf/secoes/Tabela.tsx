import { Text, View } from '@react-pdf/renderer';
import type { EstilosDoRelatorio } from '../estilos';

interface TabelaComCabecalhoProps {
  colunas: string[];
  linhas: string[][];
  estilos: EstilosDoRelatorio;
}

function Linha({ celulas, estilos }: { celulas: string[]; estilos: EstilosDoRelatorio }) {
  return (
    <View style={estilos.linhaTabela} wrap={false}>
      {celulas.map((celula, i) => (
        <Text key={i} style={estilos.celulaCentro}>{celula}</Text>
      ))}
    </View>
  );
}

export function TabelaComCabecalho({ colunas, linhas, estilos }: TabelaComCabecalhoProps) {
  const [primeira, ...demais] = linhas;
  return (
    <>
      {/* O minPresenceAhead do react-pdf não segurou o cabeçalho: ele vai preso à primeira linha */}
      <View wrap={false}>
        <View style={estilos.linhaTabela}>
          {colunas.map((coluna) => (
            <Text key={coluna} style={estilos.celulaCabecalho}>{coluna}</Text>
          ))}
        </View>
        {primeira && <Linha celulas={primeira} estilos={estilos} />}
      </View>
      {demais.map((celulas, i) => (
        <Linha key={i} celulas={celulas} estilos={estilos} />
      ))}
    </>
  );
}
