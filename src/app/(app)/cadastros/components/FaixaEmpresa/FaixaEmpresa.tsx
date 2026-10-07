'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { useAppAuth } from '@/hooks/useAppAuth';
import { useFaixaDensidadeEmpresa } from '@/hooks/cadastro/useFaixaDensidadeEmpresa';
import { erroFaixaDigitada, faixaDaEmpresa, lerDensidadeDigitada, type FaixaDensidade } from '@/lib/densidade';
import tabStyles from '../Tabs/CadastrosTab.module.scss';
import styles from './FaixaEmpresa.module.scss';

interface FaixaEmpresaProps {
  companyId: string | null;
}

const formatarDensidade = (valor: number) => valor.toFixed(2).replace('.', ',');

export function FaixaEmpresa({ companyId }: FaixaEmpresaProps) {
  const { company } = useAppAuth();
  const faixa = faixaDaEmpresa(company);
  const [aberto, setAberto] = useState(false);

  return (
    <div className={styles.linha}>
      <p className={tabStyles.note}>
        Fogos sem produto são avaliados pela faixa da empresa:{' '}
        <strong className={styles.valor}>
          {formatarDensidade(faixa.min)} a {formatarDensidade(faixa.max)} g/cm³
        </strong>
      </p>
      <Button variant="ghost" icon={<Pencil size={14} />} onClick={() => setAberto(true)} disabled={!companyId}>
        Editar faixa
      </Button>
      {aberto && companyId && (
        <FaixaEmpresaModal companyId={companyId} faixaAtual={faixa} onClose={() => setAberto(false)} />
      )}
    </div>
  );
}

interface FaixaEmpresaModalProps {
  companyId: string;
  faixaAtual: FaixaDensidade;
  onClose: () => void;
}

function FaixaEmpresaModal({ companyId, faixaAtual, onClose }: FaixaEmpresaModalProps) {
  const { salvarFaixaDensidade, isSalvando } = useFaixaDensidadeEmpresa();
  const [min, setMin] = useState(formatarDensidade(faixaAtual.min));
  const [max, setMax] = useState(formatarDensidade(faixaAtual.max));
  const [erro, setErro] = useState<string | null>(null);

  const handleSalvar = async () => {
    const faixa = { min: lerDensidadeDigitada(min), max: lerDensidadeDigitada(max) };
    const erroValidacao = erroFaixaDigitada(faixa.min, faixa.max);
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }
    try {
      await salvarFaixaDensidade({ companyId, faixaDensidade: faixa });
      onClose();
    } catch {
      setErro('Não foi possível salvar a faixa. Tente novamente.');
    }
  };

  return (
    <Modal open onOpenChange={(open) => !open && !isSalvando && onClose()} title="Faixa de densidade da empresa">
      <div className={tabStyles.form}>
        <p className={tabStyles.note}>
          Vale para todo fogo sem produto, inclusive os que vêm do app, no painel, na lista de fogos e nas ocorrências.
          Fogos já verificados não geram ocorrência de novo.
        </p>
        <div className={tabStyles.row}>
          <div className={tabStyles.rowItem}>
            <Input
              id="faixa-empresa-min"
              label="Densidade mín. (g/cm³)"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              disabled={isSalvando}
            />
          </div>
          <div className={tabStyles.rowItem}>
            <Input
              id="faixa-empresa-max"
              label="Densidade máx. (g/cm³)"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              disabled={isSalvando}
            />
          </div>
        </div>
        {erro && <p className={tabStyles.formError}>{erro}</p>}
        <Button variant="ok" onClick={handleSalvar} loading={isSalvando}>
          Salvar faixa
        </Button>
      </div>
    </Modal>
  );
}
