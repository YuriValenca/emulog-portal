import { Text, View } from '@react-pdf/renderer';
import { formatarKg } from '@/lib/fogoUtils';
import { somarCargasReais, totalPrevistoDosFuros } from '@/lib/furos';
import type { FurosEmPreenchimento } from '@/schemas/projeto';
import type { EstilosDoRelatorio } from '../estilos';
import { TabelaComCabecalho } from './Tabela';

const numero = (valor: number | null) => (valor === null ? '—' : formatarKg(valor));

export function ResumoDosFuros({ furos, estilos }: { furos: FurosEmPreenchimento; estilos: EstilosDoRelatorio }) {
  const linhas: [string, string][] = [
    ['Quantidade de furos', String(furos.itens.length)],
    ['Profundidade prevista', `${numero(furos.profundidadePrevista)} m`],
    ['Carga prevista por furo', `${numero(furos.cargaPrevista)} kg`],
    ['Total previsto', `${numero(totalPrevistoDosFuros(furos))} kg`],
    ['Total aplicado real', `${numero(somarCargasReais(furos.itens))} kg`],
  ];

  return (
    <View style={estilos.caixa} wrap={false}>
      <Text style={estilos.caixaCabecalhoCor}>Resumo dos furos</Text>
      <View style={estilos.tabela}>
        {linhas.map(([rotulo, valor]) => (
          <View key={rotulo} style={estilos.linhaTabela}>
            <Text style={estilos.celulaRotulo}>{rotulo}</Text>
            <Text style={estilos.celula}>{valor}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const COLUNAS = ['Nº do furo', 'Prof. prevista (m)', 'Prof. real (m)', 'Carga prevista (kg)', 'Carga real (kg)'];

export function TabelaDeFuros({ furos, estilos }: { furos: FurosEmPreenchimento; estilos: EstilosDoRelatorio }) {
  return (
    <>
      <Text style={estilos.tituloSecao} minPresenceAhead={60}>Furos</Text>
      <TabelaComCabecalho
        colunas={COLUNAS}
        linhas={furos.itens.map((furo, indice) => [
          String(indice + 1),
          numero(furos.profundidadePrevista),
          numero(furo.profundidadeReal),
          numero(furos.cargaPrevista),
          numero(furo.cargaReal),
        ])}
        estilos={estilos}
      />
    </>
  );
}
