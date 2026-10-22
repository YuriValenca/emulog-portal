'use client';

import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { ArrowLeft, Download, Eye, Flame, Grid3x3, Info } from 'lucide-react';
import { useAppAuth } from '@/hooks/useAppAuth';
import { montarFogosDoRelatorio } from '@/hooks/relatorios/useFogosDoRelatorio';
import { Button } from '@/components/ui/Button/Button';
import { Modal } from '@/components/ui/Modal/Modal';
import { useToast } from '@/components/ui/Toast/Toast';
import { baixarArquivo } from '@/helpers/arquivo';
import { COR_PADRAO, nomeDoArquivo, type TipoRelatorioDeFogo } from '@/lib/relatorios/fogo';
import { carregarLogoEmulog } from '@/lib/relatorios/pdf/logoEmulog';
import { gerarPdfDeFogos } from '@/lib/relatorios/pdf/gerarPdf';
import type { Projeto } from '@/schemas/projeto';
import styles from '../page.module.scss';

const TIPOS: { id: TipoRelatorioDeFogo; titulo: string; descricao: string; icone: ReactNode }[] = [
  {
    id: 'fogo',
    titulo: 'Relatório do fogo',
    descricao: 'Informações da operação, amostras de densidade e registro fotográfico.',
    icone: <Flame size={18} />,
  },
  {
    id: 'furos',
    titulo: 'Relatório de furos',
    descricao: 'Resumo dos furos e tabela com cada furo carregado.',
    icone: <Grid3x3 size={18} />,
  },
];

const plural = (quantidade: number, singular: string, pluralizado: string) =>
  `${quantidade} ${quantidade === 1 ? singular : pluralizado}`;

type AcaoEmAndamento = 'previa' | 'baixar' | null;

interface PdfGerado {
  arquivo: Blob;
  url: string;
}

interface OpcaoDeTipoProps {
  tipo: (typeof TIPOS)[number];
  marcada: boolean;
  desabilitada: boolean;
  aviso: string | null;
  onAlternar: () => void;
}

function OpcaoDeTipo({ tipo, marcada, desabilitada, aviso, onAlternar }: OpcaoDeTipoProps) {
  return (
    <label className={clsx(styles.tipo, marcada && styles.tipoMarcado, desabilitada && styles.tipoDesabilitado)}>
      <input type="checkbox" className={styles.checkbox} checked={marcada} disabled={desabilitada} onChange={onAlternar} />
      <span className={styles.tipoIcone}>{tipo.icone}</span>
      <span className={styles.tipoTextos}>
        <span className={styles.tipoTitulo}>{tipo.titulo}</span>
        <span className={styles.tipoDescricao}>{tipo.descricao}</span>
        {aviso && (
          <span className={styles.tipoAviso}>
            <Info size={12} />
            {aviso}
          </span>
        )}
      </span>
    </label>
  );
}

function avisoDeFuros(total: number, comFuros: number): string | null {
  if (comFuros === 0) return total === 1 ? 'Este fogo não tem furos.' : 'Nenhum dos fogos selecionados tem furos.';
  const semFuros = total - comFuros;
  if (semFuros === 0) return null;
  return `${plural(semFuros, 'fogo não tem', 'fogos não têm')} furos e fica de fora deste relatório.`;
}

interface ModalGerarRelatorioProps {
  fogos: Projeto[];
  onFechar: () => void;
}

export function ModalGerarRelatorio({ fogos, onFechar }: ModalGerarRelatorioProps) {
  const { company } = useAppAuth();
  const { toast } = useToast();
  const [tipos, setTipos] = useState<TipoRelatorioDeFogo[]>(['fogo']);
  const [gerando, setGerando] = useState<AcaoEmAndamento>(null);
  const [previa, setPrevia] = useState<PdfGerado | null>(null);

  useEffect(() => () => {
    if (previa) URL.revokeObjectURL(previa.url);
  }, [previa]);

  const comFuros = fogos.filter((fogo) => fogo.furos);
  const fogosNoPdf = tipos.includes('fogo') ? fogos : comFuros;
  const podeGerar = tipos.length > 0 && fogosNoPdf.length > 0 && !gerando;

  const alternarTipo = (id: TipoRelatorioDeFogo) =>
    setTipos((atuais) => TIPOS.map((tipo) => tipo.id).filter((tipo) => (tipo === id ? !atuais.includes(id) : atuais.includes(tipo))));

  const gerar = async (acao: Exclude<AcaoEmAndamento, null>): Promise<Blob | null> => {
    setGerando(acao);
    try {
      const [fogosDoRelatorio, logoEmulog] = await Promise.all([montarFogosDoRelatorio(fogosNoPdf, tipos), carregarLogoEmulog()]);
      return await gerarPdfDeFogos({
        tipos,
        fogos: fogosDoRelatorio,
        cor: company?.primaryColor || COR_PADRAO,
        logoEmpresa: company?.logo ?? null,
        logoEmulog,
        geradoEm: new Date(),
      });
    } catch (erro) {
      console.error('[relatorios] falha ao gerar o PDF:', erro);
      toast({ title: 'Não foi possível gerar o PDF', description: 'Tente novamente com menos fogos selecionados.' });
      return null;
    } finally {
      setGerando(null);
    }
  };

  const baixar = (arquivo: Blob) =>
    baixarArquivo(arquivo, nomeDoArquivo(fogosNoPdf.map((fogo) => fogo.nomeProjeto), tipos, new Date()));

  const preVisualizar = async () => {
    const arquivo = await gerar('previa');
    if (arquivo) setPrevia({ arquivo, url: URL.createObjectURL(arquivo) });
  };

  const gerarEBaixar = async () => {
    const arquivo = await gerar('baixar');
    if (arquivo) baixar(arquivo);
  };

  const fechar = (aberto: boolean) => !aberto && onFechar();

  if (previa) {
    return (
      <Modal
        open
        onOpenChange={fechar}
        title="Pré-visualização"
        description={plural(fogosNoPdf.length, 'fogo', 'fogos')}
        width={960}
        footer={
          <>
            <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => setPrevia(null)}>
              Voltar
            </Button>
            <Button variant="brand" icon={<Download size={16} />} onClick={() => baixar(previa.arquivo)}>
              Baixar PDF
            </Button>
          </>
        }
      >
        <iframe className={styles.previa} src={previa.url} title="Pré-visualização do relatório" />
      </Modal>
    );
  }

  return (
    <Modal
      open
      onOpenChange={fechar}
      title="Gerar relatório"
      description={`${plural(fogos.length, 'fogo selecionado', 'fogos selecionados')}. Escolha o que entra no PDF.`}
      width={560}
      footer={
        <>
          <Button variant="ghost" icon={<Eye size={16} />} onClick={preVisualizar} loading={gerando === 'previa'} disabled={!podeGerar}>
            Pré-visualizar
          </Button>
          <Button variant="brand" icon={<Download size={16} />} onClick={gerarEBaixar} loading={gerando === 'baixar'} disabled={!podeGerar}>
            Baixar PDF
          </Button>
        </>
      }
    >
      <div role="group" aria-label="Tipos de relatório" className={styles.tipos}>
        {TIPOS.map((tipo) => {
          const furosIndisponiveis = tipo.id === 'furos' && comFuros.length === 0;
          return (
            <OpcaoDeTipo
              key={tipo.id}
              tipo={tipo}
              marcada={tipos.includes(tipo.id) && !furosIndisponiveis}
              desabilitada={furosIndisponiveis}
              aviso={tipo.id === 'furos' ? avisoDeFuros(fogos.length, comFuros.length) : null}
              onAlternar={() => alternarTipo(tipo.id)}
            />
          );
        })}
      </div>
    </Modal>
  );
}
