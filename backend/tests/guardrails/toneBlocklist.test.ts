import { checkToneBlocklist } from '../../src/guardrails/toneBlocklist';

describe('Tone Blocklist', () => {
  it('should flag prohibited phrases from blocklist', () => {
    const prohibitedText = 'You should invest in stocks';
    const result = checkToneBlocklist(prohibitedText);
    expect(result.hasProhibitedPhrase).toBe(true);
    expect(result.matchedPhrases.length).toBeGreaterThan(0);
    expect(result.matchedPhrases).toContain('you should');
  });

  it('should pass neutral phrasing that avoids prohibited phrases', () => {
    const neutralText = 'Some people find it helpful to save a portion of their income';
    const result = checkToneBlocklist(neutralText);
    expect(result.hasProhibitedPhrase).toBe(false);
    expect(result.matchedPhrases).toHaveLength(0);
  });

  it('should detect shaming language', () => {
    const shamingText = 'You are overspending on unnecessary items';
    const result = checkToneBlocklist(shamingText);
    expect(result.hasProhibitedPhrase).toBe(true);
  });
});

