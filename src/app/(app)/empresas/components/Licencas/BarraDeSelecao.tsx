import { Ban, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button/Button';
import { pluralLicencas, type AcaoDeLicenca } from './acoesDeLicenca';
import styles from './Licencas.module.scss';

interface BarraDeSelecaoProps {
  selecionadas: number;
  aplicaveis: Record<AcaoDeLicenca, number>;
  onAcao: (acao: AcaoDeLicenca) => void;
  onLimpar: () => void;
}

export function BarraDeSelecao({ selecionadas, aplicaveis, onAcao, onLimpar }: BarraDeSelecaoProps) {
  return (
    <div className={styles.barraSelecao}>
      <span className={styles.selecionadas}>
        {pluralLicencas(selecionadas)} {selecionadas === 1 ? 'selecionada' : 'selecionadas'}
        <button type="button" className={styles.limpar} onClick={onLimpar}>
          Limpar seleção
        </button>
      </span>
      <div className={styles.acoesEmLote}>
        <Button variant="ghost" icon={<RefreshCw size={16} />} disabled={aplicaveis.renovar === 0} onClick={() => onAcao('renovar')}>
          Renovar ({aplicaveis.renovar})
        </Button>
        <Button variant="ghost" icon={<Ban size={16} />} disabled={aplicaveis.revogar === 0} onClick={() => onAcao('revogar')}>
          Revogar ({aplicaveis.revogar})
        </Button>
        <Button variant="cancel" icon={<Trash2 size={16} />} disabled={aplicaveis.excluir === 0} onClick={() => onAcao('excluir')}>
          Excluir ({aplicaveis.excluir})
        </Button>
      </div>
    </div>
  );
}
