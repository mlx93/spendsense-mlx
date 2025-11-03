// Persona definitions per Reqs PRD Section 3.1

export type PersonaType =
  | 'high_utilization'
  | 'variable_income'
  | 'subscription_heavy'
  | 'savings_builder'
  | 'net_worth_maximizer';

export interface PersonaDefinition {
  type: PersonaType;
  criteria: PersonaCriteria;
  primaryFocus: string;
  educationalThemes: string[];
}

export interface PersonaCriteria {
  // Criteria fields vary by persona
  [key: string]: any;
}

// TODO: Implement persona definitions per PRD Section 3.1
export const personaDefinitions: Record<PersonaType, PersonaDefinition> = {
  high_utilization: {
    type: 'high_utilization',
    criteria: {},
    primaryFocus: '',
    educationalThemes: [],
  },
  variable_income: {
    type: 'variable_income',
    criteria: {},
    primaryFocus: '',
    educationalThemes: [],
  },
  subscription_heavy: {
    type: 'subscription_heavy',
    criteria: {},
    primaryFocus: '',
    educationalThemes: [],
  },
  savings_builder: {
    type: 'savings_builder',
    criteria: {},
    primaryFocus: '',
    educationalThemes: [],
  },
  net_worth_maximizer: {
    type: 'net_worth_maximizer',
    criteria: {},
    primaryFocus: '',
    educationalThemes: [],
  },
};

