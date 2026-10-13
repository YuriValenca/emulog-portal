import { Image, Path, Svg, Text, View } from '@react-pdf/renderer';
import { conclusaoEmOutroDia } from '@/lib/fogoUtils';
import { situacaoCalibragem } from '@/lib/calibragem';
import { formatarGeradoEm } from '@/lib/relatorios/fogo';
import type { Projeto } from '@/schemas/projeto';
import type { EstilosDoRelatorio } from '../estilos';
import type { LogoVetorial } from '../logoEmulog';

export function LogoEmulog({ logo, tamanho }: { logo: LogoVetorial | null; tamanho: number }) {
  if (!logo) return null;
  return (
    <Svg viewBox={logo.viewBox} width={tamanho} height={tamanho}>
      {logo.caminhos.map((caminho, i) => (
        <Path key={i} d={caminho.d} fill={caminho.fill} fillRule="evenodd" />
      ))}
    </Svg>
  );
}

interface CabecalhoDoFogoProps {
  projeto: Projeto;
  logoEmpresa: string | null;
  logoEmulog: LogoVetorial | null;
  estilos: EstilosDoRelatorio;
}

const TEXTO_CALIBRAGEM = {
  em_dia: 'OK',
  vencida: 'Necessita recalibrar',
  sem_registro: 'Não registrada',
} as const;

export function CabecalhoDoFogo({ projeto, logoEmpresa, logoEmulog, estilos }: CabecalhoDoFogoProps) {
  const conclusao = conclusaoEmOutroDia(projeto);
  const calibragem = situacaoCalibragem(projeto.calibragem, projeto.dataCriacao);

  return (
    <View style={estilos.cabecalho}>
      {logoEmpresa ? (
        // eslint-disable-next-line jsx-a11y/alt-text -- <Image> do react-pdf, não é elemento HTML
        <Image src={logoEmpresa} style={estilos.logo} />
      ) : (
        <View style={estilos.logo}>
          <LogoEmulog logo={logoEmulog} tamanho={36} />
        </View>
      )}
      <View style={estilos.cabecalhoTextos}>
        <Text style={estilos.titulo}>Projeto: {projeto.nomeProjeto}</Text>
        {projeto.cliente && (
          <Text style={estilos.linhaCabecalho}>
            <Text style={estilos.rotulo}>Cliente:</Text> {projeto.cliente.nome}
          </Text>
        )}
        <Text style={estilos.linhaCabecalho}>
          <Text style={estilos.rotulo}>Data de Criação:</Text> {projeto.dataCriacao.toDate().toLocaleDateString('pt-BR')}
        </Text>
        {conclusao && (
          <Text style={estilos.linhaCabecalho}>
            <Text style={estilos.rotulo}>Data de Conclusão:</Text> {conclusao.toLocaleDateString('pt-BR')}
          </Text>
        )}
        <Text style={estilos.linhaCabecalho}>
          <Text style={estilos.rotulo}>Calibragem:</Text> Tara {projeto.calibragem?.tara || '—'} · Peso Cheio{' '}
          {projeto.calibragem?.pesoCheio || '—'} ·{' '}
          <Text style={calibragem === 'vencida' ? estilos.alerta : estilos.ok}>{TEXTO_CALIBRAGEM[calibragem]}</Text>
        </Text>
      </View>
    </View>
  );
}

interface RodapeProps {
  logoEmulog: LogoVetorial | null;
  geradoEm: Date;
  estilos: EstilosDoRelatorio;
}

export function Rodape({ logoEmulog, geradoEm, estilos }: RodapeProps) {
  return (
    <View style={estilos.rodape} fixed>
      <View style={estilos.rodapeMarca}>
        <View style={estilos.rodapeLogo}>
          <LogoEmulog logo={logoEmulog} tamanho={9} />
        </View>
        <Text>Emulog</Text>
      </View>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Gerado em ${formatarGeradoEm(geradoEm)} · Página ${pageNumber} de ${totalPages}`
        }
      />
    </View>
  );
}
