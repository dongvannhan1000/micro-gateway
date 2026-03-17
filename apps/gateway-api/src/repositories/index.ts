import { DatabaseAdapter } from '@ms-gateway/db';
import { ProjectRepository } from './project.repository';
import { GatewayKeyRepository } from './gateway-key.repository';
import { ProviderConfigRepository } from './provider-config.repository';
import { RequestLogRepository } from './request-log.repository';
import { AlertRepository } from './alert.repository';
import { PricingRepository } from './pricing.repository';
import { WaitlistRepository } from './waitlist.repository';
import { SecurityViolationRepository } from './security-violation.repository';
import { UserRepository, SessionRepository, AuditLogRepository, UsageRepository, BillingRepository } from './user.repository';

export { D1Adapter } from './d1-adapter';

export interface Repositories {
  project: ProjectRepository;
  gatewayKey: GatewayKeyRepository;
  providerConfig: ProviderConfigRepository;
  requestLog: RequestLogRepository;
  alert: AlertRepository;
  pricing: PricingRepository;
  waitlist: WaitlistRepository;
  securityViolation: SecurityViolationRepository;
  userProfile: UserRepository;
  userSession: SessionRepository;
  auditLog: AuditLogRepository;
  userUsage: UsageRepository;
  userBilling: BillingRepository;
}

/**
 * Factory function to create all repository instances from a DatabaseAdapter.
 * Call this once per request with a D1Adapter (or future PgAdapter).
 */
export function createRepositories(db: DatabaseAdapter): Repositories {
  return {
    project: new ProjectRepository(db),
    gatewayKey: new GatewayKeyRepository(db),
    providerConfig: new ProviderConfigRepository(db),
    requestLog: new RequestLogRepository(db),
    alert: new AlertRepository(db),
    pricing: new PricingRepository(db),
    waitlist: new WaitlistRepository(db),
    securityViolation: new SecurityViolationRepository(db),
    userProfile: new UserRepository(db),
    userSession: new SessionRepository(db),
    auditLog: new AuditLogRepository(db),
    userUsage: new UsageRepository(db),
    userBilling: new BillingRepository(db),
  };
}

// Re-export individual repositories for direct import if needed
export { ProjectRepository } from './project.repository';
export { GatewayKeyRepository } from './gateway-key.repository';
export { ProviderConfigRepository } from './provider-config.repository';
export { RequestLogRepository } from './request-log.repository';
export { AlertRepository } from './alert.repository';
export { PricingRepository } from './pricing.repository';
export { WaitlistRepository } from './waitlist.repository';
export { SecurityViolationRepository } from './security-violation.repository';
export { UserRepository, SessionRepository, AuditLogRepository, UsageRepository, BillingRepository } from './user.repository';
