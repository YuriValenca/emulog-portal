'use client';

import { useRef, useState, type DragEvent } from 'react';
import { ImagePlus } from 'lucide-react';
import clsx from 'clsx';
import { LIMITE_FOTOS_POR_FOGO } from '@/hooks/fogos/useMidias';
import styles from './AreaEnvioFotos.module.scss';

interface AreaEnvioFotosProps {
  vagas: number;
  motivoBloqueio?: string | null;
  onArquivos: (aceitos: File[], descartados: number) => void;
}

const ehImagem = (arquivo: File) => arquivo.type.startsWith('image/');

export function avisoDeFotosIgnoradas(descartadas: number, falhas: number): string | null {
  const partes = [
    descartadas > 0 && `${descartadas} ficaram de fora pelo limite de ${LIMITE_FOTOS_POR_FOGO} fotos por fogo.`,
    falhas > 0 && `${falhas} não puderam ser lidas como imagem.`,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(' ') : null;
}

export function AreaEnvioFotos({ vagas, motivoBloqueio, onArquivos }: AreaEnvioFotosProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const bloqueada = Boolean(motivoBloqueio) || vagas <= 0;

  const receber = (lista: FileList | null) => {
    const imagens = Array.from(lista ?? []).filter(ehImagem);
    if (imagens.length === 0) return;
    onArquivos(imagens.slice(0, vagas), Math.max(0, imagens.length - vagas));
  };

  const soltar = (evento: DragEvent<HTMLButtonElement>) => {
    evento.preventDefault();
    setArrastando(false);
    if (!bloqueada) receber(evento.dataTransfer.files);
  };

  const instrucao = vagas === 1 ? 'Cabe mais 1 foto.' : `Cabem mais ${vagas} fotos.`;

  return (
    <>
      <button
        type="button"
        className={clsx(styles.area, arrastando && styles.arrastando)}
        disabled={bloqueada}
        onClick={() => inputRef.current?.click()}
        onDragOver={(evento) => {
          evento.preventDefault();
          if (!bloqueada) setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={soltar}
      >
        <ImagePlus size={20} />
        <span>
          {motivoBloqueio ?? (vagas <= 0 ? 'Limite de fotos atingido.' : `Arraste fotos aqui ou clique para escolher. ${instrucao}`)}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(evento) => {
          receber(evento.target.files);
          evento.target.value = '';
        }}
      />
    </>
  );
}
