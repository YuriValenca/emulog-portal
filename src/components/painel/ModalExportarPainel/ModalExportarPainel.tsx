'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button/Button';
import { Modal } from '@/components/ui/Modal/Modal';
import { useExportarPainel } from '@/hooks/relatorios/useExportarPainel';
import type { DadosDoRelatorioDoPainel, TemaDoRelatorio } from '@/lib/relatorios/painel';
import styles from './ModalExportarPainel.module.scss';

const OPCOES_DE_TEMA: { tema: TemaDoRelatorio; titulo: string; descricao: string }[] = [
  { tema: 'escuro', titulo: 'Escuro', descricao: 'Igual ao painel na tela.' },
  { tema: 'claro', titulo: 'Claro', descricao: 'Fundo branco, melhor para imprimir.' },
];

function MiniaturaDoTema({ tema }: { tema: TemaDoRelatorio }) {
  return (
    <span className={styles.miniatura} data-tema={tema} aria-hidden>
      <span className={styles.miniaturaCards}>
        <span className={styles.miniaturaCard} />
        <span className={styles.miniaturaCard} />
        <span className={styles.miniaturaCard} />
      </span>
      <span className={styles.miniaturaGrafico} />
    </span>
  );
}

interface ModalExportarPainelProps {
  montarDados: (tema: TemaDoRelatorio) => DadosDoRelatorioDoPainel;
  onFechar: () => void;
}

export function ModalExportarPainel({ montarDados, onFechar }: ModalExportarPainelProps) {
  const [tema, setTema] = useState<TemaDoRelatorio>('escuro');
  const { exportar, exportando } = useExportarPainel();

  const baixar = async () => {
    if (await exportar(montarDados(tema))) onFechar();
  };

  return (
    <Modal
      open
      onOpenChange={(aberto) => !aberto && !exportando && onFechar()}
      title="Exportar painel em PDF"
      description="O PDF sai igual ao painel, com os filtros aplicados agora e as listas completas."
      width={520}
      footer={
        <Button variant="brand" icon={<Download size={16} />} onClick={baixar} loading={exportando}>
          Baixar PDF
        </Button>
      }
    >
      <div role="radiogroup" aria-label="Tema do PDF" className={styles.temas}>
        {OPCOES_DE_TEMA.map((opcao) => (
          <label key={opcao.tema} className={clsx(styles.tema, tema === opcao.tema && styles.temaMarcado)}>
            <input
              type="radio"
              name="tema-do-pdf"
              className={styles.radio}
              checked={tema === opcao.tema}
              onChange={() => setTema(opcao.tema)}
            />
            <MiniaturaDoTema tema={opcao.tema} />
            <span className={styles.temaTitulo}>{opcao.titulo}</span>
            <span className={styles.temaDescricao}>{opcao.descricao}</span>
          </label>
        ))}
      </div>
    </Modal>
  );
}
