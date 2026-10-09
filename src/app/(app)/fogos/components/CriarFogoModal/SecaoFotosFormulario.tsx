'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast/Toast';
import { LIMITE_FOTOS_POR_FOGO } from '@/hooks/fogos/useMidias';
import { comprimirFotos } from '@/helpers/imagem';
import { AreaEnvioFotos, avisoDeFotosIgnoradas } from '../AreaEnvioFotos/AreaEnvioFotos';
import styles from './CriarFogoModal.module.scss';

interface SecaoFotosFormularioProps {
  fotos: string[];
  setFotos: Dispatch<SetStateAction<string[]>>;
}

export function SecaoFotosFormulario({ fotos, setFotos }: SecaoFotosFormularioProps) {
  const { toast } = useToast();
  const [preparando, setPreparando] = useState(false);

  const receberArquivos = async (arquivos: File[], descartadas: number) => {
    setPreparando(true);
    const { imagens, falhas } = await comprimirFotos(arquivos);
    setPreparando(false);
    const aviso = avisoDeFotosIgnoradas(descartadas, falhas);
    if (aviso) toast({ title: 'Algumas fotos não entraram', description: aviso });
    setFotos((atuais) => [...atuais, ...imagens].slice(0, LIMITE_FOTOS_POR_FOGO));
  };

  return (
    <div className={styles.secaoFotos}>
      <span className={styles.tituloSecao}>
        Fotos da operação — {fotos.length} de {LIMITE_FOTOS_POR_FOGO}
      </span>

      {fotos.length > 0 && (
        <div className={styles.miniaturas}>
          {fotos.map((foto, indice) => (
            <div key={indice} className={styles.miniatura}>
              {/* eslint-disable-next-line @next/next/no-img-element -- base64 em memória, sem otimização do next/image */}
              <img src={foto} alt={`Foto ${indice + 1}`} />
              <button
                type="button"
                className={styles.removerFoto}
                aria-label={`Remover foto ${indice + 1}`}
                onClick={() => setFotos((atuais) => atuais.filter((_, i) => i !== indice))}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <AreaEnvioFotos
        vagas={LIMITE_FOTOS_POR_FOGO - fotos.length}
        motivoBloqueio={preparando ? 'Preparando as fotos...' : null}
        onArquivos={receberArquivos}
      />
    </div>
  );
}
