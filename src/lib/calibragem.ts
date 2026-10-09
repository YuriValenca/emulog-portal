import type { Timestamp } from 'firebase/firestore';

// Mesma regra do Emulog-app (src/helpers/calibragem.js): calibragem feita há mais de 14h da criação do fogo
const HORAS_ATE_RECALIBRAGEM = 14;
const MS_POR_HORA = 36e5;

export type SituacaoCalibragem = 'em_dia' | 'vencida' | 'sem_registro';

interface CalibragemDoFogo {
  tara: string | number;
  pesoCheio: string | number;
  timestamp: Timestamp;
}

// O cadastro manual do portal grava tara e peso cheio zerados: não houve calibragem de verdade
const semCalibragemReal = (calibragem: CalibragemDoFogo) =>
  Number(calibragem.tara) === 0 && Number(calibragem.pesoCheio) === 0;

export function situacaoCalibragem(calibragem: CalibragemDoFogo | null | undefined, dataCriacao: Timestamp): SituacaoCalibragem {
  if (!calibragem || semCalibragemReal(calibragem)) return 'sem_registro';
  const horas = Math.abs(dataCriacao.toMillis() - calibragem.timestamp.toMillis()) / MS_POR_HORA;
  return horas > HORAS_ATE_RECALIBRAGEM ? 'vencida' : 'em_dia';
}
