import { Image, Text, View } from '@react-pdf/renderer';
import { formatarKg } from '@/lib/fogoUtils';
import { descreverAmostra, kgPreenchido, temInformacoesDaOperacao } from '@/lib/relatorios/fogo';
import type { AmostraItem, InformacoesOperacao } from '@/schemas/projeto';
import type { EstilosDoRelatorio } from '../estilos';

function LinhaRotulada({ rotulo, valor, estilos }: { rotulo: string; valor: string; estilos: EstilosDoRelatorio }) {
  return (
    <View style={estilos.linhaTabela} wrap={false}>
      <Text style={estilos.celulaRotulo}>{rotulo}</Text>
      <Text style={estilos.celula}>{valor}</Text>
    </View>
  );
}

export function InformacoesDaOperacao({ info, estilos }: { info?: Partial<InformacoesOperacao>; estilos: EstilosDoRelatorio }) {
  if (!info || !temInformacoesDaOperacao(info)) return null;
  return (
    <View style={estilos.caixa}>
      <Text style={estilos.caixaCabecalhoCor}>Informações da Operação</Text>
      <View style={estilos.tabela}>
        {info.numeroNF ? <LinhaRotulada rotulo="Nota Fiscal" valor={info.numeroNF} estilos={estilos} /> : null}
        {kgPreenchido(info.kgPrevisto) && <LinhaRotulada rotulo="Kg Previsto" valor={`${formatarKg(info.kgPrevisto)} kg`} estilos={estilos} />}
        {kgPreenchido(info.kgAplicado) && <LinhaRotulada rotulo="Kg Aplicado" valor={`${formatarKg(info.kgAplicado)} kg`} estilos={estilos} />}
        {info.caminhao && <LinhaRotulada rotulo="Unidade de Bombeamento" valor={info.caminhao.placa} estilos={estilos} />}
        {(info.equipe?.length ?? 0) > 0 && (
          <LinhaRotulada rotulo="Equipe" valor={info.equipe!.map((membro) => membro.nome).join(', ')} estilos={estilos} />
        )}
      </View>
    </View>
  );
}

export function ObservacaoTecnica({ estilos }: { estilos: EstilosDoRelatorio }) {
  return (
    <View style={estilos.observacaoTecnica} wrap={false}>
      <Text style={estilos.observacaoTecnicaTitulo}>Observação Técnica:</Text>
      <Text>
        A 4ª pesagem de cada amostra deve estar com densidade na faixa de trabalho que vai de 1.00 a 1.10 g/cm³.
        Amostras fora da faixa devem ser informadas ao setor técnico da empresa.
      </Text>
    </View>
  );
}

export function ObservacaoDoProjeto({ texto, estilos }: { texto?: string; estilos: EstilosDoRelatorio }) {
  if (!texto) return null;
  return (
    <View style={estilos.caixa} wrap={false}>
      <Text style={estilos.caixaCabecalhoCinza}>Observação sobre o projeto</Text>
      <Text style={estilos.caixaTexto}>{texto}</Text>
    </View>
  );
}

interface AmostrasProps {
  amostras: AmostraItem[];
  quantidade: number;
  estilos: EstilosDoRelatorio;
}

export function Amostras({ amostras, quantidade, estilos }: AmostrasProps) {
  return (
    <>
      <Text style={estilos.tituloSecao}>Amostras — quantidade: {quantidade}</Text>
      {amostras.length === 0 ? (
        <Text>Nenhuma amostra disponível</Text>
      ) : (
        <View style={estilos.amostras}>
          {amostras.map((amostra, indice) => {
            const { titulo, linhas } = descreverAmostra(amostra, indice);
            return (
              <View key={indice} style={estilos.amostra} wrap={false}>
                <Text style={estilos.amostraTitulo}>{titulo}</Text>
                {linhas.map((linha, i) => (
                  <Text key={i} style={estilos.pesagem}>{linha}</Text>
                ))}
              </View>
            );
          })}
        </View>
      )}
    </>
  );
}

export function RegistroFotografico({ fotos, estilos }: { fotos: string[]; estilos: EstilosDoRelatorio }) {
  if (fotos.length === 0) return null;
  return (
    <>
      <Text style={estilos.tituloSecao} minPresenceAhead={120}>
        Registro fotográfico — {fotos.length} foto{fotos.length !== 1 ? 's' : ''}
      </Text>
      <View style={estilos.fotos}>
        {fotos.map((foto, indice) => (
          <View key={indice} style={estilos.foto} wrap={false}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- <Image> do react-pdf, não é elemento HTML */}
            <Image src={foto} style={estilos.fotoImagem} />
            <Text style={estilos.fotoLegenda}>Foto {indice + 1}</Text>
          </View>
        ))}
      </View>
    </>
  );
}
