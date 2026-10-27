import { z } from 'zod';
import type { BlocosDoPainel, EstatisticasDoPainel, MetricasDosRankings } from '@/lib/dashboard';
import { COR_PADRAO } from '@/lib/relatorios/fogo';

export const TEMAS_DO_RELATORIO = ['escuro', 'claro'] as const;
export type TemaDoRelatorio = (typeof TEMAS_DO_RELATORIO)[number];

const LIMITE_LOGO = 1_500_000;
const LIMITE_TEXTO = 300;

const COR_HEX = /^#[0-9a-fA-F]{3,8}$/;

const metricaSchema = z.enum(['totalFogos', 'kgAplicado', 'totalAlertas']);

const rankingItemSchema = z.object({
  id: z.string(),
  label: z.string().max(LIMITE_TEXTO),
  totalFogos: z.number(),
  kgAplicado: z.number(),
  totalAlertas: z.number(),
  alertasDensidade: z.number(),
  alertasKg: z.number(),
  alertasDensidadeEKg: z.number(),
});

const estatisticasSchema = z.object({
  totalFogosPeriodo: z.number(),
  kgAplicadoPeriodo: z.number(),
  densidadeMediaPeriodo: z.number().nullable(),
  fogosConformesPeriodo: z.number(),
  fogosAlertaPeriodo: z.number(),
  fogosNaoConformes: z.array(
    z.object({
      id: z.string(),
      nomeProjeto: z.string().max(LIMITE_TEXTO),
      umb: z.string().max(LIMITE_TEXTO).nullable(),
      data: z.string().max(LIMITE_TEXTO),
      densidadeMedia: z.number().nullable(),
    })
  ),
  totalAlertasPeriodo: z.number(),
  fogosAgrupados: z.array(z.object({ rotulo: z.string().max(LIMITE_TEXTO), totalFogos: z.number(), kgAplicado: z.number() })),
  granularidadeGrafico: z.enum(['diaria', 'semanal', 'mensal']),
  rankingUmb: z.array(rankingItemSchema),
  rankingOperadores: z.array(rankingItemSchema),
  rankingClientes: z.array(rankingItemSchema),
  licencasAtivas: z.number(),
  licencasExpirando: z.number(),
  licencasDisponiveis: z.number(),
  licencasTotal: z.number(),
}) satisfies z.ZodType<EstatisticasDoPainel>;

// O logo é carregado pelo Chrome do servidor: só base64, nunca uma URL que ele iria buscar
export const dadosDoRelatorioDoPainelSchema = z.object({
  tema: z.enum(TEMAS_DO_RELATORIO),
  empresa: z.object({
    nome: z.string().max(LIMITE_TEXTO),
    logo: z.string().startsWith('data:image/').max(LIMITE_LOGO).nullable(),
    cor: z.string().regex(COR_HEX),
  }),
  periodoLabel: z.string().max(LIMITE_TEXTO),
  periodoDescricao: z.string().max(LIMITE_TEXTO),
  filtros: z.array(z.string().max(LIMITE_TEXTO * 10)).max(10),
  estatisticas: estatisticasSchema,
  faixa: z.object({ min: z.number(), max: z.number() }),
  ocorrenciasAbertas: z.number().nullable(),
  metricas: z.object({ umb: metricaSchema, operadores: metricaSchema, clientes: metricaSchema }) satisfies z.ZodType<MetricasDosRankings>,
  blocos: z.object({
    rankingUmb: z.boolean(),
    rankingOperadores: z.boolean(),
    rankingClientes: z.boolean(),
    ocorrencias: z.boolean(),
    licencas: z.boolean(),
  }) satisfies z.ZodType<BlocosDoPainel>,
  geradoEm: z.iso.datetime(),
});

export type DadosDoRelatorioDoPainel = z.infer<typeof dadosDoRelatorioDoPainelSchema>;

const formatarData = (data: Date) => data.toLocaleDateString('pt-BR');
const doisDigitos = (n: number) => String(n).padStart(2, '0');

export function descreverIntervalo(inicio: Date | null, fim: Date): string {
  return inicio ? `${formatarData(inicio)} a ${formatarData(fim)}` : `Desde o início até ${formatarData(fim)}`;
}

export function descreverFiltro(rotulo: string, nomes: string[]): string | null {
  return nomes.length > 0 ? `${rotulo}: ${nomes.join(', ')}` : null;
}

interface EmpresaDoUsuario {
  name: string;
  logo: string | null;
  primaryColor: string | null;
}

export function empresaDoRelatorio(empresa: EmpresaDoUsuario | null): DadosDoRelatorioDoPainel['empresa'] {
  return {
    nome: empresa?.name ?? '',
    logo: empresa?.logo?.startsWith('data:image/') ? empresa.logo : null,
    cor: empresa?.primaryColor && COR_HEX.test(empresa.primaryColor) ? empresa.primaryColor : COR_PADRAO,
  };
}

export function nomeDoArquivoDoPainel(agora: Date): string {
  return `Painel operacional - ${doisDigitos(agora.getDate())}-${doisDigitos(agora.getMonth() + 1)}-${agora.getFullYear()}.pdf`;
}
