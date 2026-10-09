'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { FormModal } from '@/components/layout/FormModal/FormModal';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { useAppAuth } from '@/hooks/useAppAuth';
import { useFaixaDensidadeEmpresa } from '@/hooks/cadastro/useFaixaDensidadeEmpresa';
import { erroFaixaDigitada, faixaDaEmpresa, lerDensidadeDigitada } from '@/lib/densidade';
import tabStyles from '../Tabs/CadastrosTab.module.scss';
import styles from './FaixaEmpresa.module.scss';

interface FaixaEmpresaProps {
  companyId: string | null;
}

const formatarDensidade = (valor: number) => valor.toFixed(2).replace('.', ',');

export function FaixaEmpresa({ companyId }: FaixaEmpresaProps) {
  const { company } = useAppAuth();
  const faixa = faixaDaEmpresa(company);
  const { salvarFaixaDensidade, isSalvando } = useFaixaDensidadeEmpresa();
  const [aberto, setAberto] = useState(false);
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const abrir = () => {
    setMin(formatarDensidade(faixa.min));
    setMax(formatarDensidade(faixa.max));
    setErro(null);
    setAberto(true);
  };

  const handleSalvar = async () => {
    if (!companyId) return;
    const faixaDigitada = { min: lerDensidadeDigitada(min), max: lerDensidadeDigitada(max) };
    const erroValidacao = erroFaixaDigitada(faixaDigitada.min, faixaDigitada.max);
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }
    try {
      await salvarFaixaDensidade({ companyId, faixaDensidade: faixaDigitada });
      setAberto(false);
    } catch {
      setErro('Não foi possível salvar a faixa. Tente novamente.');
    }
  };

  return (
    <div className={styles.linha}>
      <p className={tabStyles.note}>
        Fogos sem produto são avaliados pela faixa da empresa:{' '}
        <strong className={styles.valor}>
          {formatarDensidade(faixa.min)} a {formatarDensidade(faixa.max)} g/cm³
        </strong>
      </p>
      <Button variant="ghost" icon={<Pencil size={14} />} onClick={abrir} disabled={!companyId}>
        Editar faixa
      </Button>

      <FormModal
        open={aberto}
        onOpenChange={setAberto}
        title="Faixa de densidade da empresa"
        rotuloAcao="Salvar faixa"
        onAcao={handleSalvar}
        salvando={isSalvando}
        erro={erro}
      >
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
      </FormModal>
    </div>
  );
}
