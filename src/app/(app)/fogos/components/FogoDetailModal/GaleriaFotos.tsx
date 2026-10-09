'use client';

import { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui/Button/Button';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { ConfirmModal } from '@/components/ui/ConfirmModal/ConfirmModal';
import { useToast } from '@/components/ui/Toast/Toast';
import { useAppAuth } from '@/hooks/useAppAuth';
import {
  LIMITE_FOTOS_POR_FOGO, urlDaMidia, useApagarFoto, useEnviarFotos, useMidiasDoProjeto,
} from '@/hooks/fogos/useMidias';
import { comprimirFotos } from '@/helpers/imagem';
import type { Midia } from '@/schemas/midia';
import { AreaEnvioFotos, avisoDeFotosIgnoradas } from '../AreaEnvioFotos/AreaEnvioFotos';
import styles from './FogoDetailModal.module.scss';

interface GaleriaFotosProps {
  projetoId: string;
  companyId: string;
  nomeFogo: string;
}

export function GaleriaFotos({ projetoId, companyId, nomeFogo }: GaleriaFotosProps) {
  const { appUser } = useAppAuth();
  const { toast } = useToast();
  const { midias, isLoading, isError, recarregar } = useMidiasDoProjeto(projetoId, companyId);
  const { enviarFotos, isEnviando } = useEnviarFotos();
  const { apagarFoto, isApagando } = useApagarFoto();
  const [preparando, setPreparando] = useState(false);
  const [aberta, setAberta] = useState<number | null>(null);
  const [paraApagar, setParaApagar] = useState<Midia | null>(null);

  const vagas = LIMITE_FOTOS_POR_FOGO - midias.length;
  const fotoAberta = aberta !== null ? midias[aberta] : null;

  const receberArquivos = async (arquivos: File[], descartadas: number) => {
    if (!appUser) return;
    setPreparando(true);
    const { imagens, falhas } = await comprimirFotos(arquivos);
    setPreparando(false);

    const aviso = avisoDeFotosIgnoradas(descartadas, falhas);
    if (aviso) toast({ title: 'Algumas fotos não entraram', description: aviso });
    if (imagens.length === 0) return;

    try {
      await enviarFotos({ projetoId, companyId, enviadoPor: appUser.uid, imagens });
    } catch (erro) {
      console.error('[GaleriaFotos] falha ao enviar fotos:', erro);
      toast({ title: 'Não foi possível enviar as fotos', description: 'As que já foram enviadas continuam na galeria.' });
    }
  };

  const confirmarExclusao = async () => {
    if (!paraApagar) return;
    try {
      await apagarFoto({ projetoId, midiaId: paraApagar.id });
      setParaApagar(null);
      setAberta(null);
    } catch (erro) {
      console.error('[GaleriaFotos] falha ao apagar foto:', erro);
      toast({ title: 'Não foi possível apagar a foto', description: 'Tente novamente.' });
    }
  };

  const motivoBloqueio = preparando
    ? 'Preparando as fotos...'
    : isEnviando
      ? 'Enviando...'
      : null;

  return (
    <div className={styles.section}>
      <span className={styles.sectionTitle}>
        Fotos da operação — {isLoading || isError ? '…' : `${midias.length} de ${LIMITE_FOTOS_POR_FOGO}`}
      </span>

      {isLoading ? (
        <div className={styles.estadoGaleria}>
          <Spinner size="sm" />
        </div>
      ) : isError ? (
        <div className={styles.estadoGaleria}>
          <span>Não foi possível carregar as fotos.</span>
          <Button variant="ghost" onClick={() => recarregar()}>
            Tentar de novo
          </Button>
        </div>
      ) : (
        <>
          {midias.length === 0 ? (
            <p className={styles.semFotos}>Nenhuma foto neste fogo.</p>
          ) : (
            <div className={styles.galeria}>
              {midias.map((midia, indice) => (
                <button key={midia.id} type="button" className={styles.miniatura} onClick={() => setAberta(indice)}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- base64 do Firestore, sem otimização do next/image */}
                  <img src={urlDaMidia(midia)} alt={`Foto ${indice + 1} de ${nomeFogo}`} />
                </button>
              ))}
            </div>
          )}
          <AreaEnvioFotos vagas={vagas} motivoBloqueio={motivoBloqueio} onArquivos={receberArquivos} />
        </>
      )}

      {fotoAberta && aberta !== null && (
        <Modal
          open
          onOpenChange={(open) => !open && setAberta(null)}
          title={`Foto ${aberta + 1} de ${midias.length}`}
          description={`Enviada em ${fotoAberta.criadoEm.toDate().toLocaleString('pt-BR')}`}
          width={960}
          footer={
            <>
              <Button variant="cancel" icon={<Trash2 size={16} />} onClick={() => setParaApagar(fotoAberta)}>
                Apagar
              </Button>
              <a
                className={styles.baixar}
                href={urlDaMidia(fotoAberta)}
                download={`${nomeFogo} - foto ${aberta + 1}.jpg`}
              >
                <Download size={16} />
                Baixar
              </a>
            </>
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- base64 do Firestore, sem otimização do next/image */}
          <img className={styles.fotoAmpliada} src={urlDaMidia(fotoAberta)} alt={`Foto ${aberta + 1} de ${nomeFogo}`} />
        </Modal>
      )}

      <ConfirmModal
        open={paraApagar !== null}
        title="Apagar foto?"
        description="A foto some do portal e do app. Essa ação não pode ser desfeita."
        confirmLabel="Apagar"
        tone="danger"
        isConfirming={isApagando}
        onConfirm={confirmarExclusao}
        onCancel={() => setParaApagar(null)}
      />
    </div>
  );
}
