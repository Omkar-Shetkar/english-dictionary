import { describe, it, expect } from 'vitest';
import {
  classifyDomain,
  extractContextTags,
  extractAcronymExpansion,
  DOMAINS
} from '../../src/common/domain-detector.js';

describe('domain-detector utility', () => {
  describe('extractContextTags', () => {
    it('extracts parenthetical and bracketed context tags', () => {
      expect(extractContextTags('(computing) Artificial intelligence.')).toEqual(['computing']);
      expect(extractContextTags('(medicine, biology) An infection.')).toEqual(['medicine', 'biology']);
      expect(extractContextTags('[mathematics] An asymptote.')).toEqual(['mathematics']);
      expect(extractContextTags('Plain text without tags.')).toEqual([]);
    });
  });

  describe('classifyDomain', () => {
    it('classifies computing terms correctly', () => {
      expect(classifyDomain('(computing) A computer program or software.')).toBe(DOMAINS.COMPUTING);
      expect(classifyDomain('An algorithm for training a neural network.')).toBe(DOMAINS.COMPUTING);
      expect(classifyDomain('Related to cybersecurity and cryptography.')).toBe(DOMAINS.COMPUTING);
    });

    it('classifies mathematics terms correctly', () => {
      expect(classifyDomain('(mathematics) A vector or matrix transformation.')).toBe(DOMAINS.MATHEMATICS);
      expect(classifyDomain('In calculus, the derivative of a function.')).toBe(DOMAINS.MATHEMATICS);
      expect(classifyDomain('A statistical probability distribution.')).toBe(DOMAINS.MATHEMATICS);
    });

    it('classifies specialized scientific and biological terms correctly', () => {
      expect(classifyDomain('(biology) The process of cellular respiration in an organism.')).toBe(DOMAINS.SCIENCE);
      expect(classifyDomain('(physics) The quantum mechanics of subatomic particles.')).toBe(DOMAINS.SCIENCE);
      expect(classifyDomain('(medicine) Treatment of a pathological condition.')).toBe(DOMAINS.SCIENCE);
      expect(classifyDomain('(biochemistry) Photosynthesis in chloroplasts.')).toBe(DOMAINS.SCIENCE);
      expect(classifyDomain('(genetics) CRISPR gene editing.')).toBe(DOMAINS.SCIENCE);
      expect(classifyDomain('The maintenance of internal physiological homeostasis.')).toBe(DOMAINS.SCIENCE);
    });

    it('classifies specialized computing and software engineering terms correctly', () => {
      expect(classifyDomain('In object-oriented programming, polymorphism allows subclasses to define behaviors.')).toBe(DOMAINS.COMPUTING);
      expect(classifyDomain('(computing) A hypervisor managing virtual machines.')).toBe(DOMAINS.COMPUTING);
      expect(classifyDomain('A cloud computing microservices architecture.')).toBe(DOMAINS.COMPUTING);
    });

    it('classifies mathematical and algebraic terms correctly', () => {
      expect(classifyDomain('(linear algebra) An eigenvalue and eigenvector of a matrix.')).toBe(DOMAINS.MATHEMATICS);
      expect(classifyDomain('(geometry) The horizontal asymptote of a curve.')).toBe(DOMAINS.MATHEMATICS);
      expect(classifyDomain('Differential calculus and integral equations.')).toBe(DOMAINS.MATHEMATICS);
    });

    it('classifies business and economics terms correctly', () => {
      expect(classifyDomain('(finance) Earnings before interest, taxes, depreciation, and amortization.')).toBe(DOMAINS.BUSINESS);
      expect(classifyDomain('An economic principle of supply and demand.')).toBe(DOMAINS.BUSINESS);
      expect(classifyDomain('In accounting, an intangible asset.')).toBe(DOMAINS.BUSINESS);
    });

    it('classifies historical terms correctly', () => {
      expect(classifyDomain('(history) A cultural movement of the European Renaissance.')).toBe(DOMAINS.HISTORY);
      expect(classifyDomain('The feudalism era of medieval society.')).toBe(DOMAINS.HISTORY);
    });

    it('defaults to General for standard vocabulary', () => {
      expect(classifyDomain('A state of happiness or joy.')).toBe(DOMAINS.GENERAL);
      expect(classifyDomain('To walk casually in a park.')).toBe(DOMAINS.GENERAL);
    });
  });

  describe('extractAcronymExpansion', () => {
    it('extracts explicit acronym / initialism expansions', () => {
      expect(extractAcronymExpansion('AI', '(computing) Initialism of artificial intelligence.')).toBe('Artificial Intelligence');
      expect(extractAcronymExpansion('API', 'Acronym of application programming interface.')).toBe('Application Programming Interface');
      expect(extractAcronymExpansion('ROI', 'Abbreviation of return on investment.')).toBe('Return On Investment');
    });

    it('detects initial letter matches for uppercase queries', () => {
      expect(extractAcronymExpansion('AI', 'Artificial intelligence exhibited by machines.')).toBe('Artificial Intelligence');
      expect(extractAcronymExpansion('RAM', 'Random access memory in computing.')).toBe('Random Access Memory');
    });

    it('returns null when no expansion matches', () => {
      expect(extractAcronymExpansion('AI', 'A three-toed sloth found in Central America.')).toBeNull();
      expect(extractAcronymExpansion('word', 'A unit of language.')).toBeNull();
    });
  });
});
