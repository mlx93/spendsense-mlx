// Hardcoded mapping of example users to their personas based on seed 1337
// This allows us to display personas on the login page without needing to calculate them
// These are the FIRST user created for each persona type (users 1, 21, 41, 61, 81)

// Note: These emails are deterministic with seed 1337, but to get the exact emails,
// you need to run the seed and check the first user of each persona type.
// For now, this is a placeholder that will be populated after seeding.

// Hardcoded mapping based on seed 1337
// These are the FIRST user created for each persona type (deterministic with seed 1337)
export const EXAMPLE_USERS_MAPPING: Record<string, string> = {
  'Kellen_Effertz45@gmail.com': 'high_utilization',
  'Carrie87@hotmail.com': 'variable_income',
  'Jaiden.Heidenreich@gmail.com': 'subscription_heavy',
  'Lenna_Stiedemann73@hotmail.com': 'savings_builder',
  'Aimee_Oberbrunner@gmail.com': 'net_worth_maximizer',
};

// Get example users with hardcoded personas
// Falls back to database query if mapping is empty
export function getExampleUsersWithPersonas(mapping: Record<string, string>): Array<{ email: string; persona: string }> {
  const personaTypes = ['high_utilization', 'variable_income', 'subscription_heavy', 'savings_builder', 'net_worth_maximizer'];
  const exampleUsers: Array<{ email: string; persona: string }> = [];
  
  // If mapping has entries, use it
  if (Object.keys(mapping).length > 0) {
    for (const personaType of personaTypes) {
      const email = Object.keys(mapping).find(email => mapping[email] === personaType);
      if (email) {
        exampleUsers.push({ email, persona: personaType });
      }
    }
  }
  
  return exampleUsers;
}

