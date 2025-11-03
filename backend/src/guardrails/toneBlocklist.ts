// Tone blocklist per Reqs PRD Section 6.3

export const PROHIBITED_PHRASES = [
  // Financial advice phrases
  'you should',
  'i recommend',
  'i advise',
  'i suggest you',
  'the best option is',
  'you must',
  'you need to',
  'do this',
  'make sure you',
  'definitely',
  'always',
  'never',
  'guaranteed',
  'certainly will',
  
  // Shaming language
  'overspending',
  'wasteful',
  'poor choices',
  'bad with money',
  'irresponsible',
  'careless',
  'reckless',
  'foolish',
  'mistake',
  
  // Predictions/guarantees
  'will improve',
  'this will fix',
  'promise',
  'you\'ll see results',
  
  // Mandates
  'you have to',
  'required',
  'necessary',
];

export function checkToneBlocklist(text: string): {
  hasProhibitedPhrase: boolean;
  matchedPhrases: string[];
} {
  const lowerText = text.toLowerCase();
  const matchedPhrases = PROHIBITED_PHRASES.filter((phrase) =>
    lowerText.includes(phrase)
  );
  
  return {
    hasProhibitedPhrase: matchedPhrases.length > 0,
    matchedPhrases,
  };
}

