import 'dotenv/config';
import { plainToInstance, Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

const DEV_JWT_SECRET = 'dev-sgee-portal-change-me';
const DEV_ADMIN_JWT_SECRET = 'dev-sgee-admin-change-me';
const MIN_SECRET_LENGTH = 32;

const toInt = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

class EnvironmentVariables {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: 'development' | 'production' | 'test' = 'development';

  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(100)
  DATABASE_POOL_MAX = 10;

  @IsString()
  JWT_SECRET = DEV_JWT_SECRET;

  @IsString()
  ADMIN_JWT_SECRET = DEV_ADMIN_JWT_SECRET;

  @IsString()
  @IsNotEmpty()
  AUTH_COOKIE_NAME = 'sgee_session';

  @IsString()
  @IsNotEmpty()
  ADMIN_AUTH_COOKIE_NAME = 'sgee_admin_session';

  /** Origines autorisées, séparées par des virgules. */
  @IsString()
  @IsNotEmpty()
  FRONTEND_ORIGIN = 'http://localhost:5173';

  /** Valeur Express `trust proxy` : false, true, nombre de sauts ou liste d'IP. */
  @IsOptional()
  @IsString()
  TRUST_PROXY = 'false';

  @IsString()
  @IsNotEmpty()
  UPLOAD_DIR = 'uploads/student-documents';

  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(50)
  MAX_UPLOAD_SIZE_MB = 5;
}

export type AppEnv = Readonly<
  Omit<EnvironmentVariables, 'FRONTEND_ORIGIN' | 'TRUST_PROXY'> & {
    FRONTEND_ORIGINS: string[];
    TRUST_PROXY: boolean | number | string;
    isProduction: boolean;
  }
>;

function parseTrustProxy(value: string): boolean | number | string {
  const normalized = value.trim().toLowerCase();

  if (normalized === '' || normalized === 'false') {
    return false;
  }

  if (normalized === 'true') {
    return true;
  }

  return /^\d+$/.test(normalized) ? Number(normalized) : value.trim();
}

export function validateEnv(source: NodeJS.ProcessEnv): AppEnv {
  const definedEntries = Object.entries(source).filter(
    ([, value]) => value !== undefined && value !== '',
  );
  const config = plainToInstance(
    EnvironmentVariables,
    Object.fromEntries(definedEntries),
    { exposeDefaultValues: true },
  );
  const errors = validateSync(config, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map(
        (error) =>
          `${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`,
      )
      .join('\n  ');

    throw new Error(`Configuration invalide :\n  ${details}`);
  }

  const isProduction = config.NODE_ENV === 'production';

  if (isProduction) {
    const weakSecrets = (
      [
        ['JWT_SECRET', config.JWT_SECRET, DEV_JWT_SECRET],
        ['ADMIN_JWT_SECRET', config.ADMIN_JWT_SECRET, DEV_ADMIN_JWT_SECRET],
      ] as const
    )
      .filter(
        ([, value, devValue]) =>
          value === devValue || value.length < MIN_SECRET_LENGTH,
      )
      .map(([name]) => name);

    if (weakSecrets.length > 0) {
      throw new Error(
        `Secrets faibles ou absents en production : ${weakSecrets.join(', ')}`,
      );
    }

    if (config.JWT_SECRET === config.ADMIN_JWT_SECRET) {
      throw new Error('JWT_SECRET et ADMIN_JWT_SECRET doivent être différents');
    }
  }

  const { FRONTEND_ORIGIN, TRUST_PROXY, ...rest } = config;

  return Object.freeze({
    ...rest,
    FRONTEND_ORIGINS: FRONTEND_ORIGIN.split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean),
    TRUST_PROXY: parseTrustProxy(TRUST_PROXY),
    isProduction,
  });
}

/** Configuration validée au premier import : l'application refuse de démarrer si elle est invalide. */
export const env = validateEnv(process.env);
