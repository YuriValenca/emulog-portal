import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

export const zTimestamp = z.instanceof(Timestamp);
export const zTimestampOrNull = z.instanceof(Timestamp).nullable();
export const zTimestampOrString = z.union([z.instanceof(Timestamp), z.string()]);
