import { EnvironmentVariables } from './env.validation';

export interface Config {
  appEnv: string;
  port: string;
  db_host: string;
  db_port: string;
  db_username: string;
  db_password: string;
  db_name: string;
  db_schema: string;
  orderServiceBaseUrl: string;
  paymentServiceBaseUrl: string;
  internalToken: string;
}

export default (): Config => {
  const processEnv = process.env as unknown as EnvironmentVariables;
  return {
    appEnv: processEnv.ENV,
    port: processEnv.PORT || '3001',
    db_host: processEnv.DATABASE_HOST,
    db_port: processEnv.DATABASE_PORT,
    db_username: processEnv.DATABASE_USERNAME,
    db_password: processEnv.DATABASE_PASSWORD,
    db_name: processEnv.DATABASE_NAME,
    db_schema: processEnv.DATABASE_SCHEMA,
    orderServiceBaseUrl: processEnv.ORDER_SERVICE_BASE_URL,
    paymentServiceBaseUrl: processEnv.PAYMENT_SERVICE_BASE_URL,
    internalToken: processEnv.INTERNAL_TOKEN,
  };
};
